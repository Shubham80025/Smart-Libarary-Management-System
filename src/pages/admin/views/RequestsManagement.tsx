import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDoc, runTransaction, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { CheckCircle, XCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
// Force Vite HMR

export default function RequestsManagement() {
  const [activeTab, setActiveTab] = useState<'issue-return' | 'new-books' | 'history'>('issue-return');
  const [requests, setRequests] = useState<any[]>([]);
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  const [newBookRequests, setNewBookRequests] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'issue-return' || activeTab === 'history') {
      const unsubRequests = onSnapshot(collection(db, 'requests'), async (snap) => {
        const data = await Promise.all(snap.docs.map(async d => {
          const reqData = d.data();
          let bookData = { title: 'Unknown Book', isbn: '' };
          let userData = { name: 'Unknown User', registrationNumber: '', hasOverdue: false, hasUnpaidFines: false };
          
          try {
            const bDoc = await getDoc(doc(db, 'books', reqData.bookId));
            if (bDoc.exists()) bookData = bDoc.data() as any;
            
            const uDoc = await getDoc(doc(db, 'users', reqData.userId));
            if (uDoc.exists()) {
              userData = uDoc.data() as any;
              
              // Find active issues for overdue check
              const userReqs = snap.docs.map(d => d.data()).filter(d => d.userId === reqData.userId && d.type === 'Issue');
              let hasOverdue = false;
              const now = Date.now();
              userReqs.forEach(d => {
                 if ((d.status === 'Approved' || d.status === 'Return Pending') && d.dueDate && d.dueDate < now) hasOverdue = true;
              });
              
              const qFines = query(collection(db, 'fines'), where('userId', '==', reqData.userId), where('status', '==', 'Unpaid'));
              const fSnap = await getDocs(qFines);
              
              userData.hasOverdue = hasOverdue;
              userData.hasUnpaidFines = !fSnap.empty;
            }
          } catch (e) {}

          return { id: d.id, ...reqData, book: bookData, user: userData } as any;
        }));
        
        setRequests(data.filter((r: any) => !['Returned', 'Completed', 'Rejected'].includes(r.status)).sort((a, b) => {
          return b.requestDate - a.requestDate;
        }));

        if (activeTab === 'history') {
          const hRequests = data.filter((r: any) => ['Returned', 'Completed', 'Rejected'].includes(r.status));
          
          // Also fetch newBookRequests for history
          getDocs(collection(db, 'newBookRequests')).then(async (newBookSnap) => {
             const newBookData = await Promise.all(newBookSnap.docs.map(async d => {
               const reqData = d.data();
               let userData = { name: 'Unknown User', registrationNumber: '' };
               try {
                 const uDoc = await getDoc(doc(db, 'users', reqData.userId));
                 if (uDoc.exists()) userData = uDoc.data() as any;
               } catch (e) {}
               return { id: d.id, ...reqData, user: userData, type: 'New Book History' } as any;
             }));
             const resolvedNewBooks = newBookData.filter((r: any) => r.status === 'Approved' || r.status === 'Rejected');
             
             setHistoryRequests([...hRequests, ...resolvedNewBooks].sort((a, b) => {
               const timeA = a.returnDate || a.issueDate || a.requestDate || 0;
               const timeB = b.returnDate || b.issueDate || b.requestDate || 0;
               return timeB - timeA;
             }));
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'requests');
      });
      return () => unsubRequests();
    } else if (activeTab === 'new-books') {
      const unsub = onSnapshot(collection(db, 'newBookRequests'), async (snap) => {
        const data = await Promise.all(snap.docs.map(async d => {
          const reqData = d.data();
          let userData = { name: 'Unknown User', registrationNumber: '' };
          try {
            const uDoc = await getDoc(doc(db, 'users', reqData.userId));
            if (uDoc.exists()) userData = uDoc.data() as any;
          } catch (e) {}
          return { id: d.id, ...reqData, user: userData } as any;
        }));

        setNewBookRequests(data.filter((r: any) => r.status === 'Pending').sort((a, b) => {
          return (b.requestDate || 0) - (a.requestDate || 0);
        }));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'newBookRequests');
      });
      return () => unsub();
    }
  }, [activeTab]);

  const handleAction = async (requestId: string, type: string, action: 'Approve' | 'Reject', bookId: string) => {
    try {
      if (activeTab === 'new-books') {
         await runTransaction(db, async (transaction) => {
            const reqRef = doc(db, 'newBookRequests', requestId);
            const reqDoc = await transaction.get(reqRef);
            if (!reqDoc.exists()) throw new Error("Request not found");
            const reqData = reqDoc.data();
            const status = action === 'Approve' ? 'Approved' : 'Rejected';
            transaction.update(reqRef, { status });
            
            const uDoc = await transaction.get(doc(db, 'users', reqData.userId));
            const userEmail = uDoc.exists() ? uDoc.data().email : '';

            const notifRef = doc(collection(db, 'notifications'));
            transaction.set(notifRef, {
              userId: reqData.userId,
              title: `New Book Request ${status}`,
              message: `Your request for the new book "${reqData.bookName}" has been ${status.toLowerCase()}.`,
              read: false,
              createdAt: Date.now()
            });

            // Need to handle side-effect after transaction
         });
         return;
      }

      let oldestResDocId: string | null = null;
      let oldestResUserId: string | null = null;
      let subscriberUserIds: string[] = [];

      if (activeTab === 'issue-return' && type === 'Return' && action === 'Approve' && bookId) {
         // Because we cannot run getDocs inside runTransaction, we find the oldest reservation beforehand.
         // In a highly concurrent system, this might have a slight race condition, but it's acceptable here.
         const { query, getDocs, where, collection } = await import('firebase/firestore');
         const resQuery = query(collection(db, 'reservations'), where('bookId', '==', bookId));
         const resSnap = await getDocs(resQuery);
         const waitingRes = resSnap.docs.map(d => ({id: d.id, ...d.data() as any})).filter(d => d.status === 'waiting');
         if (waitingRes.length > 0) {
            const sortedRes = waitingRes.sort((a,b) => a.requestDate - b.requestDate);
            oldestResDocId = sortedRes[0].id;
            oldestResUserId = sortedRes[0].userId;
         }

         const subQuery = query(collection(db, 'subscriptions'), where('bookId', '==', bookId));
         const subSnap = await getDocs(subQuery);
         subscriberUserIds = Array.from(new Set(subSnap.docs.map(d => d.data().userId)));
      }

      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, 'requests', requestId);
        let bookRef;
        let bDoc;
        let qty = 0;

        if (bookId) {
          bookRef = doc(db, 'books', bookId);
          bDoc = await transaction.get(bookRef);
          if (bDoc.exists()) {
             qty = bDoc.data().availableQuantity || 0;
          }
        }
        
        const reqDoc = await transaction.get(reqRef);
        if (!reqDoc.exists()) throw new Error("Request not found");
        const reqData = reqDoc.data();
        const userId = reqData.userId;
        const userDoc = await transaction.get(doc(db, 'users', userId));
        const userEmail = userDoc.exists() ? userDoc.data().email : '';

        let issueReqDoc: any = null;
        let issueRef: any = null;
        if (type === 'Return' && reqData.issueRequestId) {
           issueRef = doc(db, 'requests', reqData.issueRequestId);
           issueReqDoc = await transaction.get(issueRef);
        }

        let status = '';
        if (type === 'Issue') {
          if (action === 'Approve') {
            if (!bookRef || !bDoc || !bDoc.exists()) throw new Error("Book not found to issue");
            if (qty <= 0) throw new Error("Not enough copies available");
            status = 'Approved';
            transaction.update(bookRef, { availableQuantity: qty - 1 });
            transaction.update(reqRef, { 
              status, 
              issueDate: Date.now(), 
              dueDate: Date.now() + 15 * 24 * 60 * 60 * 1000 // 15 days
            });
            
            const notifRef = doc(collection(db, 'notifications'));
            transaction.set(notifRef, {
              userId,
              title: 'Book Issue Approved',
              message: `Your request for "${bDoc.data().title}" has been approved. Please collect it.`,
              read: false,
              createdAt: Date.now()
            });
          } else {
            status = 'Rejected';
            transaction.update(reqRef, { status });
            
            if (bDoc && bDoc.exists()) {
              const notifRef = doc(collection(db, 'notifications'));
              transaction.set(notifRef, {
                userId,
                title: 'Book Issue Rejected',
                message: `Your request for "${bDoc.data().title}" has been rejected.`,
                read: false,
                createdAt: Date.now()
              });
            }
          }
        } else if (type === 'Return') {
           if (action === 'Approve') {
             status = 'Completed';
             const now = Date.now();
             if (bookRef && bDoc && bDoc.exists()) {
               transaction.update(bookRef, { availableQuantity: qty + 1 });
             }
             transaction.update(reqRef, { status, returnDate: now });

             // Fine logic: ₹1 per day overdue
             if (issueReqDoc && issueReqDoc.exists()) {
                transaction.update(issueRef, { status: 'Returned', returnDate: now });
                const dueDate = issueReqDoc.data().dueDate;
                const bookIdForFine = issueReqDoc.data().bookId;
                if (dueDate && now > dueDate) {
                  const diffTime = Math.abs(now - dueDate);
                  const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const fineAmount = daysLate * 1;
                  if (fineAmount > 0) {
                    const fineRef = doc(collection(db, 'fines'));
                    transaction.set(fineRef, {
                      userId,
                      bookId: bookIdForFine || bookId,
                      requestId: reqData.issueRequestId,
                      daysLate,
                      fineAmount,
                      status: 'Unpaid',
                      lastUpdated: now,
                      createdAt: now
                    });
                  }
                }
             }

             if (bDoc && bDoc.exists()) {
               const notifRef = doc(collection(db, 'notifications'));
               transaction.set(notifRef, {
                 userId,
                 title: 'Return Approved',
                 message: `Your return of "${bDoc.data().title}" has been approved.`,
                 read: false,
                 createdAt: Date.now()
               });

               if (oldestResDocId && oldestResUserId) {
                 const resDocRef = doc(db, 'reservations', oldestResDocId);
                 transaction.update(resDocRef, {
                   status: 'fulfilled'
                 });
                 const resNotifRef = doc(collection(db, 'notifications'));
                 transaction.set(resNotifRef, {
                   userId: oldestResUserId,
                   title: 'Reserved Book Available',
                   message: `The book "${bDoc.data().title}" you reserved is now available! Go to the library to request it.`,
                   read: false,
                   createdAt: Date.now()
                 });
               }

               // Notify subscribers
               subscriberUserIds.forEach(subId => {
                 // skip notifying the resolved reservation's user if they were also subscribed
                 if (subId === oldestResUserId) return;
                 const subNotifRef = doc(collection(db, 'notifications'));
                 transaction.set(subNotifRef, {
                   userId: subId,
                   title: 'Subscribed Book Available',
                   message: `The book "${bDoc.data().title}" you subscribed to is now available!`,
                   read: false,
                   createdAt: Date.now()
                 });
               });
             }
           } else {
             status = 'Rejected';
             transaction.update(reqRef, { status });
             if (issueRef) {
                transaction.update(issueRef, { status: 'Approved' });
             }
           }
        }
      });
    } catch (e: any) {
      setErrorMsg(e.message || String(e));
      handleFirestoreError(e, OperationType.UPDATE, activeTab === 'new-books' ? 'newBookRequests' : 'requests');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
         <h2 className="text-xl font-bold text-slate-900 dark:text-white">Requests Queue</h2>
         <p className="text-sm text-slate-500 dark:text-slate-400">Manage issue/return and new book requests</p>
         
         <div className="mt-6 flex space-x-2">
            <button
               onClick={() => setActiveTab('issue-return')}
               className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'issue-return' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
               Issue & Return
            </button>
            <button
               onClick={() => setActiveTab('new-books')}
               className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'new-books' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
               New Book Requests
            </button>
            <button
               onClick={() => setActiveTab('history')}
               className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'history' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
               History
            </button>
         </div>

         {errorMsg && (
            <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg border border-rose-200 dark:border-rose-800/30 flex justify-between items-center">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded">
                 <XCircle size={16} />
              </button>
            </div>
         )}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Type</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                 {activeTab === 'issue-return' || activeTab === 'history' ? 'Student & Book' : 'Book Details'}
              </th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Status</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(activeTab === 'issue-return' ? requests : activeTab === 'history' ? historyRequests : newBookRequests).map(req => (
              <tr key={req.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                    req.type === 'Issue' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' 
                    : req.type === 'Return' ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}>
                    {req.type || 'New Book'}
                  </span>
                </td>
                <td className="p-4">
                  {req.type === 'New Book History' || activeTab === 'new-books' ? (
                     <>
                        <p className="font-semibold text-slate-900 dark:text-white">{req.bookName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Author: {req.author} {req.description ? `| Note: ${req.description}` : ''}</p>
                        <p className="text-xs text-slate-500 mt-1">Req by: <span className="font-medium text-slate-700 dark:text-slate-300">{req.user?.name}</span></p>
                     </>
                  ) : (
                     <>
                        <p className="font-semibold text-slate-900 dark:text-white">{req.book?.title}</p>
                        <p className="text-xs text-slate-500 mt-1">Req by: <span className="font-medium text-slate-700 dark:text-slate-300">{req.user?.name} ({req.user?.registrationNumber})</span></p>
                        {(req.user?.hasOverdue || req.user?.hasUnpaidFines) && req.status === 'Pending' && req.type === 'Issue' && (
                           <div className="flex flex-wrap gap-1 mt-1.5">
                              {req.user?.hasOverdue && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400">Overdue Books</span>}
                              {req.user?.hasUnpaidFines && <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">Unpaid Fines</span>}
                           </div>
                        )}
                     </>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                     req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                     req.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                     req.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                     'bg-rose-100 text-rose-700'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {req.status === 'Pending' ? (
                    <div className="flex justify-end gap-2">
                       <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(req.id, req.type || 'NewBook', 'Approve', req.bookId); }} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-colors" title="Approve">
                         <CheckCircle size={20} className="pointer-events-none" />
                       </button>
                       <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(req.id, req.type || 'NewBook', 'Reject', req.bookId); }} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors" title="Reject">
                         <XCircle size={20} className="pointer-events-none" />
                       </button>
                    </div>
                  ) : <span className="text-slate-400 text-sm italic">Resolved</span>}
                </td>
              </tr>
            ))}
            {(activeTab === 'issue-return' ? requests : activeTab === 'history' ? historyRequests : newBookRequests).length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">No requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
