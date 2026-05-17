import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { CreditCard, IndianRupee, QrCode, Download, CheckCircle, Clock, AlertCircle, X, Maximize2, UserRound } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import QRCode from "react-qr-code";
import toast from 'react-hot-toast';
import PaymentReceiptModal from '../../../components/PaymentReceiptModal';
import { motion, AnimatePresence } from 'motion/react';

import LibraryQRModal from '../../../components/LibraryQRModal';

export default function MembershipDetails({ currentUser }: { currentUser: any }) {
  const [membership, setMembership] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [activeBooks, setActiveBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUser = async () => {
      try {
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists()) setUserData(uDoc.data());
      } catch(e) {}
    }
    fetchUser();

    // Listen to membership
    const mq = query(collection(db, 'memberships'), where('userId', '==', currentUser.uid));
    const mUnsub = onSnapshot(mq, (snapshot) => {
      if (!snapshot.empty) {
        setMembership({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setMembership(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'memberships');
      setLoading(false);
    });

    // Listen to requests for active books
    const reqQ = query(collection(db, 'requests'), where('userId', '==', currentUser.uid));
    const reqUnsub = onSnapshot(reqQ, async (snapshot) => {
      const issues = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((d: any) => d.type === 'Issue' && ['Pending', 'Approved', 'Return Pending'].includes(d.status));
      const populated = await Promise.all(issues.map(async (issue: any) => {
         try {
            if (issue.bookId) {
               const bDoc = await getDoc(doc(db, 'books', issue.bookId));
               if (bDoc.exists()) return { ...issue, bookName: bDoc.data().title };
            }
         } catch(e) {}
         return { ...issue, bookName: 'Unknown Book' };
      }));
      setActiveBooks(populated);
    });

    // Listen to fees
    const fq = query(collection(db, 'fees'), where('userId', '==', currentUser.uid));
    const fUnsub = onSnapshot(fq, (snapshot) => {
      setFees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _recordType: 'fee' })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fees');
    });

    // Listen to fines
    const fineq = query(collection(db, 'fines'), where('userId', '==', currentUser.uid));
    const fineUnsub = onSnapshot(fineq, async (snapshot) => {
      const dbFines = await Promise.all(snapshot.docs.map(async d => {
        const data = d.data();
        let bookName = 'Unknown Book';
        try {
          if (data.bookId) {
             const bDoc = await getDoc(doc(db, 'books', data.bookId));
             if (bDoc.exists()) bookName = bDoc.data().title;
          }
        } catch(e) {}
        return { id: d.id, ...data, bookName, _recordType: 'fine' };
      }));
      setFines(dbFines);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fines');
    });

    return () => { mUnsub(); fUnsub(); fineUnsub(); reqUnsub(); };
  }, [currentUser]);

  const generateQRText = () => {
     let overdue = 0;
     const now = Date.now();
     activeBooks.forEach(b => {
        if ((b.status === 'Approved' || b.status === 'Return Pending') && b.dueDate && b.dueDate < now) overdue++;
     });
     
     const pendingFinesAmt = fines.filter(f => f.status === 'Unpaid').reduce((acc, f) => acc + (f.fineAmount || 0), 0);
     const issueList = activeBooks.map((b, i) => {
        let text = `${i + 1}. ${b.bookName} [${b.status}]`;
        if (b.dueDate) text += ` (Due: ${new Date(b.dueDate).toLocaleDateString()})`;
        return text;
     }).join('\n');
     
     return `SMART LIBRARY SYSTEM

Name: ${membership?.name || 'N/A'}
Registration No: ${userData?.registrationNumber || 'N/A'}
Library ID: ${membership?.id?.slice(0, 10).toUpperCase() || 'N/A'}
Department: ${userData?.department || userData?.branch || 'N/A'}
Semester: ${userData?.semester || 'N/A'}

Issued Books: ${activeBooks.length}
${issueList ? issueList + '\n' : ''}
Pending Fine: ₹${pendingFinesAmt}
Overdue Books: ${overdue}
Card Validity: ${membership?.expiryDate ? new Date(membership.expiryDate).toLocaleDateString() : 'N/A'}

[Internal Token: ${currentUser.uid}]
`;
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePay = async (item: any) => {
    try {
      const now = Date.now();
      let computedLateFee = 0;
      let isLate = false;
      let amountToPay = 0;
      
      if (item._recordType === 'fee') {
        isLate = item.paidStatus === 'unpaid' && item.dueDate < now;
        const daysLate = isLate ? Math.floor((now - item.dueDate) / (1000 * 60 * 60 * 24)) : 0;
        computedLateFee = daysLate * 2;
        amountToPay = item.amount + computedLateFee;
      } else if (item._recordType === 'fine') {
        amountToPay = item.fineAmount;
      }

      const response = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountToPay })
      });
      const orderData = await response.json();

      if (!orderData.id) {
         toast.error("Failed to create payment order");
         return;
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Library Management System",
        description: `Payment for ${item.bookName ? 'Fine' : 'Fee'}`,
        order_id: orderData.id,
        handler: async function (response: any) {
           const verifyRes = await fetch('/api/razorpay/verify', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   razorpay_order_id: response.razorpay_order_id,
                   razorpay_payment_id: response.razorpay_payment_id,
                   razorpay_signature: response.razorpay_signature
               })
           });
           const verifyData = await verifyRes.json();
           
           if(verifyData.success) {
               if (item._recordType === 'fee') {
                 await updateDoc(doc(db, 'fees', item.id), {
                   paidStatus: 'paid',
                   paymentDate: Date.now(),
                   lateFee: computedLateFee,
                   paymentId: response.razorpay_payment_id,
                   orderId: response.razorpay_order_id
                 });
               } else if (item._recordType === 'fine') {
                 await updateDoc(doc(db, 'fines', item.id), {
                   status: 'Paid',
                   lastUpdated: Date.now(),
                   paymentId: response.razorpay_payment_id,
                   orderId: response.razorpay_order_id
                 });
               }
               toast.success("Payment verified and successful!");
               setReceiptData({
                   transactionId: response.razorpay_payment_id,
                   amount: amountToPay,
                   date: Date.now(),
                   item: item
               });
           } else {
               toast.error("Payment verification failed!");
           }
        },
        prefill: {
            name: currentUser?.displayName || '',
            email: currentUser?.email || '',
        },
        theme: { color: "#3B82F6" }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
          toast.error(response.error.description);
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Payment initialization failed!");
    }
  };

  const handleRenew = async () => {
    // Simulate renewal by adding 1 year to expiryDate
    if (!membership) return;
    try {
      const exp = new Date(membership.expiryDate);
      exp.setFullYear(exp.getFullYear() + 1);
      await updateDoc(doc(db, 'memberships', membership.id), {
        expiryDate: exp.getTime(),
        status: 'active'
      });
      showMessage('Membership renewed successfully! (Simulated)', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `memberships/${membership.id}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-blue-500" />
            Membership & Fees
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your library membership and view payment history.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30'}`}>
          {message.text}
        </div>
      )}

      {!membership ? (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
          <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Activate Your Membership</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6 max-w-sm mx-auto">You do not have an active membership yet. Activate it now to access library services and generate your digital ID card.</p>
          <button 
             onClick={async () => {
               try {
                 const { addDoc, collection } = await import('firebase/firestore');
                 const startDate = new Date();
                 const expiryDate = new Date();
                 expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                 
                 await addDoc(collection(db, 'memberships'), {
                   userId: currentUser.uid,
                   name: currentUser.displayName || userData?.name || 'Unknown',
                   email: currentUser.email || userData?.email || 'Unknown',
                   membershipType: 'yearly',
                   startDate: startDate.getTime(),
                   expiryDate: expiryDate.getTime(),
                   status: 'active'
                 });

                 showMessage('Membership activated successfully!', 'success');
               } catch (e) {
                 handleFirestoreError(e, OperationType.CREATE, 'memberships');
               }
             }}
             className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
             Activate Membership
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Digital ID Card (Click to enlarge / flip) */}
          <div 
            id="id-card" 
            onClick={() => setShowQRModal(true)}
            className="group cursor-pointer bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden flex flex-col justify-between h-[250px] shrink-0 transition-transform hover:scale-[1.02]"
            title="Click to Enlarge QR & Card"
          >
             {/* decorative geometry */}
             <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors"></div>
             <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-900/20 rounded-full blur-2xl"></div>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
             
             <div className="flex justify-between items-start z-10 w-full">
               <div className="flex gap-3 items-center">
                 {userData?.photoURL ? (
                    <img src={userData.photoURL} alt="Student" className="w-14 h-14 rounded-full border-2 border-white/50 object-cover shadow-sm bg-white/20" />
                 ) : (
                    <div className="w-14 h-14 rounded-full border-2 border-white/50 bg-white/20 flex items-center justify-center font-bold text-xl backdrop-blur-sm shadow-sm text-white">
                      {membership.name.charAt(0).toUpperCase()}
                    </div>
                 )}
                 <div>
                   <h2 className="text-xl font-bold font-mono tracking-wider leading-none mb-1">LIBRARY ID</h2>
                   <p className="text-[10px] text-blue-100 uppercase tracking-widest font-semibold flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                     Smart Library
                   </p>
                 </div>
               </div>
               
               <div className="bg-white p-1.5 rounded-xl flex flex-col items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform relative group/qr">
                 <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center z-10">
                   <Maximize2 className="text-white w-6 h-6" />
                 </div>
                 <QRCode
                   value={generateQRText()}
                   size={64}
                   bgColor="#FFFFFF"
                   fgColor="#1e3a8a" // deep blue matches theme
                   level="M"
                 />
               </div>
             </div>
             
             <div className="z-10 mt-auto flex justify-between items-end w-full">
               <div className="flex-1">
                 <p className="text-2xl font-bold tracking-tight mb-0.5 drop-shadow-sm line-clamp-1">{membership.name}</p>
                 <p className="text-sm font-medium text-blue-100/90 mb-2 truncate max-w-[200px]">{membership.email}</p>
                 <div className="flex items-center gap-2">
                   <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/20 backdrop-blur-md border border-white/10">{userData?.branch || 'N/A'}</span>
                   <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-black/20 backdrop-blur-md border border-black/10">Roll: {userData?.registrationNumber || 'N/A'}</span>
                 </div>
               </div>
             </div>
          </div>

          {/* Membership Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-[250px]">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Membership Status</h3>
              <div className="flex items-center gap-2 mb-4">
                {membership.status === 'active' ? (
                   <span className="inline-flex items-center gap-1 bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-bold">
                     <CheckCircle size={16} /> Active
                   </span>
                ) : (
                   <span className="inline-flex items-center gap-1 bg-rose-100/50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 px-3 py-1.5 rounded-lg text-sm font-bold">
                     <AlertCircle size={16} /> Expired
                   </span>
                )}
                <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold capitalize">
                  {membership.membershipType}
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                Your membership is valid until {new Date(membership.expiryDate).toLocaleDateString()}. Make sure to renew it before it expires to retain access to library services.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleRenew}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Renew Membership
              </button>
              <button 
                onClick={() => {
                  window.print();
                }}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0"
                title="Download/Print ID Card"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fees & Fines List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <IndianRupee className="text-emerald-500" size={20} />
          Fee & Fine History
        </h3>
        
        {fees.length === 0 && fines.length === 0 ? (
           <p className="text-slate-500 text-sm">No fee or fine records found.</p>
        ) : (
          <div className="space-y-4">
            {[...fees, ...fines]
              .sort((a, b) => {
                const dateA = a._recordType === 'fee' ? a.dueDate : (a.createdAt || 0);
                const dateB = b._recordType === 'fee' ? b.dueDate : (b.createdAt || 0);
                return dateB - dateA;
              })
              .map(item => {
              const isFee = item._recordType === 'fee';
              const isPaid = isFee ? item.paidStatus === 'paid' : item.status === 'Paid' || item.status === 'Waived';
              const isLate = isFee ? (item.paidStatus === 'unpaid' && item.dueDate < Date.now()) : false;
              const daysLate = isFee && isLate ? Math.floor((Date.now() - item.dueDate) / (1000 * 60 * 60 * 24)) : (isFee ? 0 : item.daysLate);
              const computedLateFee = isFee && isLate ? daysLate * 2 : 0; 
              
              const title = isFee ? `${item.type.replace('_', ' ')} Fee` : `Overdue Fine`;
              const subtitle = isFee 
                ? (isPaid ? `Paid on ${new Date(item.paymentDate).toLocaleDateString()}` : `Due by ${new Date(item.dueDate).toLocaleDateString()}`)
                : (isPaid ? `${item.status} on ${new Date(item.lastUpdated || Date.now()).toLocaleDateString()}` : `Overdue: ${item.bookName}`);
              
              const amount = isFee ? item.amount : item.fineAmount;

              return (
                <div key={`${item._recordType}-${item.id}`} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800/50 gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isPaid ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : (isLate || !isFee ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40')}`}>
                       {isPaid ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white capitalize">{title}</p>
                      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                    <div className="text-left sm:text-right">
                      <p className="font-bold text-lg text-slate-900 dark:text-white">₹{amount}</p>
                      {(isFee && !isPaid && isLate) && (
                        <p className="text-xs font-semibold text-rose-500">+₹{computedLateFee} Late Fee</p>
                      )}
                      {(isFee && isPaid && item.lateFee > 0) && (
                        <p className="text-xs font-semibold text-rose-500">+₹{item.lateFee} Late Fee</p>
                      )}
                      {(!isFee && !isPaid) && (
                        <p className="text-xs font-semibold text-rose-500">{daysLate} Days Late</p>
                      )}
                      {(!isFee && item.status === 'Waived') && (
                        <p className="text-xs font-semibold text-emerald-500">Waived</p>
                      )}
                    </div>
                    
                    {!isPaid && item.status !== 'Waived' ? (
                      <button 
                         onClick={() => handlePay(item)}
                         className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shrink-0"
                      >
                         Pay Now
                      </button>
                    ) : (
                      <button className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Download Invoice">
                         <Download size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <LibraryQRModal 
         isOpen={showQRModal} 
         onClose={() => setShowQRModal(false)}
         userData={userData}
         membership={membership}
         qrText={generateQRText()}
      />
      {receiptData && (
         <PaymentReceiptModal receiptData={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </div>
  );
}
