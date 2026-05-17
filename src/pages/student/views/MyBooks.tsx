import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { BookMarked, Clock, AlertCircle, History } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import toast from 'react-hot-toast';

export default function MyBooks({ currentUser }: { currentUser: any }) {
  const [activeTab, setActiveTab] = useState<'issued' | 'pending' | 'reservations' | 'overdue' | 'history'>('issued');
  const [requests, setRequests] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const qReq = query(collection(db, 'requests'), where('userId', '==', currentUser.uid));
    const unsubReq = onSnapshot(qReq, async (snap) => {
      const data = await Promise.all(snap.docs.map(async d => {
        const reqData = d.data();
        let bookData = { title: 'Unknown Book', author: '' };
        try {
          const bDoc = await getDoc(doc(db, 'books', reqData.bookId));
          if (bDoc.exists()) bookData = bDoc.data() as any;
        } catch (e) {}
        return { id: d.id, ...reqData, book: bookData } as any;
      }));
      setRequests(data);
    });

    const qRes = query(collection(db, 'reservations'), where('userId', '==', currentUser.uid));
    const unsubRes = onSnapshot(qRes, async (snap) => {
      const data = await Promise.all(snap.docs.map(async d => {
        const resData = d.data();
        let bookData = { title: 'Unknown Book', author: '' };
        try {
          const bDoc = await getDoc(doc(db, 'books', resData.bookId));
          if (bDoc.exists()) bookData = bDoc.data() as any;
        } catch (e) {}
        return { id: d.id, ...resData, book: bookData } as any;
      }));
      setReservations(data);
    });

    return () => {
       unsubReq();
       unsubRes();
    };
  }, [currentUser]);

  const [processing, setProcessing] = useState<string | null>(null);

  const handleCancelReservation = async (reservationId: string) => {
    if (processing === reservationId) return;
    setProcessing(reservationId);
    try {
      await updateDoc(doc(db, 'reservations', reservationId), {
        status: 'cancelled'
      });
      toast.success('Reservation cancelled.');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'reservations');
    } finally {
      setProcessing(null);
    }
  };

  const handleReturnRequest = async (issueRequestId: string, bookId: string) => {
    if (processing === issueRequestId) return;
    
    // Check if return request already exists
    const existingReturn = requests.find(r => r.type === 'Return' && r.issueRequestId === issueRequestId && (r.status === 'Pending' || r.status === 'Return Pending'));
    if (existingReturn) {
      toast.error('Return request already submitted.');
      return;
    }

    setProcessing(issueRequestId);
    try {
      await addDoc(collection(db, 'requests'), {
        userId: currentUser.uid,
        bookId: bookId,
        issueRequestId: issueRequestId,
        type: 'Return',
        requestDate: Date.now(),
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'requests', issueRequestId), {
        status: 'Return Pending'
      });

      toast.success('Return request submitted.');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'requests');
    } finally {
      setProcessing(null);
    }
  };

  const now = Date.now();
  const issued = requests.filter(r => r.type === 'Issue' && (r.status === 'Approved' || r.status === 'Return Pending') && r.dueDate >= now);
  const pending = requests.filter(r => r.status === 'Pending');
  const overdue = requests.filter(r => r.type === 'Issue' && (r.status === 'Approved' || r.status === 'Return Pending') && r.dueDate < now);
  const history = requests.filter(r => (r.type === 'Issue' && (r.status === 'Returned' || r.status === 'Completed' || r.status === 'Rejected')) || (r.type === 'Return' && (r.status === 'Completed' || r.status === 'Rejected')));

  const renderBooks = (list: any[], type: 'issued' | 'pending' | 'reservations' | 'overdue' | 'history') => {
    if (list.length === 0) {
      return <div className="p-8 text-center text-slate-500 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 border-dashed">No books/reservations in this category.</div>;
    }
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map(item => (
          <div key={item.id} className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border-l-4 shadow-sm border-t border-r border-b border-slate-200 dark:border-slate-800 ${type === 'overdue' ? 'border-l-rose-500' : type === 'pending' || type === 'reservations' ? 'border-l-amber-500' : type === 'history' ? 'border-l-slate-500' : 'border-l-emerald-500'}`}>
             <h4 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">{item.book.title}</h4>
             <p className="text-xs text-slate-500 mb-4">by {item.book.author}</p>
             
             {(type === 'issued' || type === 'overdue' || type === 'history') && (
               <div className="space-y-2 mb-4">
                 {item.issueDate && (
                   <div className="flex justify-between text-xs">
                     <span className="text-slate-500">Issued:</span>
                     <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(item.issueDate).toLocaleDateString()}</span>
                   </div>
                 )}
                 {type !== 'history' && (
                   <div className="flex justify-between text-xs">
                     <span className="text-slate-500">Due Date:</span>
                     <span className={`font-bold ${type === 'overdue' ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{new Date(item.dueDate).toLocaleDateString()}</span>
                   </div>
                 )}
                 {type === 'history' && item.returnDate && (
                   <div className="flex justify-between text-xs">
                     <span className="text-slate-500">Returned:</span>
                     <span className="font-medium text-emerald-600 dark:text-emerald-400">{new Date(item.returnDate).toLocaleDateString()}</span>
                   </div>
                 )}
                 {type === 'overdue' && (
                   <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                     <span className="text-slate-500">Estimated Fine:</span>
                     <span className="font-bold text-rose-600 dark:text-rose-400">₹{Math.ceil((now - item.dueDate) / (1000 * 60 * 60 * 24))}</span>
                   </div>
                 )}
               </div>
             )}
             
             {(type === 'pending' || type === 'reservations') && (
               <div className="flex justify-between text-xs mb-4">
                 <span className="text-slate-500">Requested:</span>
                 <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(item.requestDate).toLocaleDateString()}</span>
               </div>
             )}

             {type === 'reservations' && (
               <div className="space-y-2">
                 <div className="w-full py-2 rounded-xl text-sm font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-center border border-amber-200 dark:border-amber-800/30">
                   Waiting
                 </div>
                 <button 
                   onClick={() => handleCancelReservation(item.id)}
                   disabled={processing === item.id}
                   className="w-full py-2 rounded-xl text-sm font-semibold bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {processing === item.id ? 'Processing...' : 'Cancel Reservation'}
                 </button>
               </div>
             )}

             {(type === 'issued' || type === 'overdue') && (
               <button 
                 onClick={() => handleReturnRequest(item.id, item.bookId)}
                 disabled={processing === item.id || item.status === 'Return Pending'}
                 className="w-full py-2 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {item.status === 'Return Pending' ? 'Return Pending' : processing === item.id ? 'Processing...' : 'Return Book'}
               </button>
             )}
             {type === 'pending' && (
               <div className="w-full py-2 rounded-xl text-sm font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-center border border-amber-200 dark:border-amber-800/30">
                 {item.type === 'Return' ? 'Return Pending' : 'Issue Pending'}
               </div>
             )}
             {type === 'history' && (
               <div className="w-full py-2 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-center border border-slate-200 dark:border-slate-800/30">
                 {item.type === 'Return' && item.status === 'Rejected' ? 'Return Rejected' : item.type === 'Return' && item.status === 'Completed' ? 'Return Approved' : item.type === 'Issue' && item.status === 'Rejected' ? 'Issue Rejected' : item.status}
               </div>
             )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto pb-1 custom-scrollbar">
        <button onClick={() => setActiveTab('issued')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'issued' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <BookMarked size={18} /> Issued
        </button>
        <button onClick={() => setActiveTab('pending')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'pending' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <Clock size={18} /> Pending Requests
        </button>
        <button onClick={() => setActiveTab('reservations')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'reservations' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <BookMarked size={18} /> Reservations
        </button>
        <button onClick={() => setActiveTab('overdue')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'overdue' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <AlertCircle size={18} /> Overdue
        </button>
        <button onClick={() => setActiveTab('history')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'history' ? 'border-slate-500 text-slate-700 dark:text-slate-300' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <History size={18} /> History
        </button>
      </div>

      {activeTab === 'issued' && renderBooks(issued, 'issued')}
      {activeTab === 'pending' && renderBooks(pending, 'pending')}
      {activeTab === 'reservations' && renderBooks(reservations.filter(r => r.status === 'waiting'), 'reservations')}
      {activeTab === 'overdue' && renderBooks(overdue, 'overdue')}
      {activeTab === 'history' && renderBooks([...history, ...reservations.filter(r => r.status !== 'waiting')].sort((a,b) => b.requestDate - a.requestDate), 'history')}
    </div>
  );
}
