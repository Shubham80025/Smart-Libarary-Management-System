import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { BookMarked, Clock, AlertCircle, IndianRupee, Sparkles, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import Recommendations from './Recommendations';
import MostBorrowedBooks from './MostBorrowedBooks';
import toast from 'react-hot-toast';
import PaymentReceiptModal from '../../../components/PaymentReceiptModal';

export default function StudentDashboard({ currentUser }: { currentUser: any }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    issuedCount: 0,
    pendingCount: 0,
    overdueCount: 0
  });

  const [activeFines, setActiveFines] = useState<any[]>([]);
  const [recordedFines, setRecordedFines] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'requests'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, async (snap) => {
      let issued = 0;
      let pending = 0;
      let overdue = 0;
      const now = Date.now();
      const newActiveFines: any[] = [];

      for (const d of snap.docs) {
        const data = d.data();
        if (data.status === 'Pending') pending++;
        if ((data.status === 'Approved' || data.status === 'Return Pending') && data.type === 'Issue') {
          issued++;
          if (data.dueDate && data.dueDate < now) {
            overdue++;
            const daysLate = Math.ceil((now - data.dueDate) / (1000 * 60 * 60 * 24));
            let bookName = 'Unknown Book';
            try {
               const bDoc = await getDoc(doc(db, 'books', data.bookId));
               if (bDoc.exists()) bookName = bDoc.data().title || 'Unknown Book';
            } catch (e) {}

            newActiveFines.push({
               id: d.id,
               bookName,
               dueDate: data.dueDate,
               daysLate,
               fineAmount: daysLate * 1,
               status: 'Accumulating (Unpaid)'
            });
          }
        }
      }
      setStats({ issuedCount: issued, pendingCount: pending, overdueCount: overdue });
      setActiveFines(newActiveFines.sort((a,b) => a.dueDate - b.dueDate));
    }, (error) => {
       import('../../../lib/firestore-errors').then(({ handleFirestoreError, OperationType }) => {
          handleFirestoreError(error, OperationType.LIST, 'requests');
       });
    });

    const qFines = query(collection(db, 'fines'), where('userId', '==', currentUser.uid));
    const unsubFines = onSnapshot(qFines, async (snap) => {
       const finesData = await Promise.all(snap.docs.map(async d => {
          const fData = d.data();
          let bookName = 'Unknown Book';
          if (fData.bookId) {
             try {
                const bDoc = await getDoc(doc(db, 'books', fData.bookId));
                if (bDoc.exists()) bookName = bDoc.data().title || 'Unknown Book';
             } catch (e) {}
          }
          return { id: d.id, ...fData, bookName } as any;
       }));
       setRecordedFines(finesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (error) => {
       import('../../../lib/firestore-errors').then(({ handleFirestoreError, OperationType }) => {
          handleFirestoreError(error, OperationType.LIST, 'fines');
       });
    });

    return () => {
      unsub();
      unsubFines();
    };
  }, [currentUser]);

  const allFines = [...activeFines, ...recordedFines];
  const allUnpaidFines = allFines.filter(f => f.status.includes('Unpaid'));
  const totalUnpaid = allUnpaidFines.reduce((acc, f) => acc + (f.fineAmount || 0), 0);
  
  // Find earliest due date among unpaid fines
  let earliestDueDate: number | null = null;
  allUnpaidFines.forEach(f => {
     if (f.dueDate) {
        if (!earliestDueDate || f.dueDate < earliestDueDate) earliestDueDate = f.dueDate;
     }
  });

  const [receiptData, setReceiptData] = useState<any>(null);

  const handlePay = async (item: any) => {
    try {
      const response = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: item.fineAmount })
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
        description: `Payment for Fine`,
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
               await updateDoc(doc(db, 'fines', item.id), {
                 status: 'Paid',
                 lastUpdated: Date.now(),
                 paymentId: response.razorpay_payment_id,
                 orderId: response.razorpay_order_id
               });

               toast.success("Payment verified and successful!");
               setReceiptData({
                   transactionId: response.razorpay_payment_id,
                   amount: item.fineAmount,
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

  const statCards = [
    { title: "Issued Books", value: stats.issuedCount, icon: BookMarked, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", path: "/student/my-books" },
    { title: "Pending Requests", value: stats.pendingCount, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30", path: "/student/my-books" },
    { title: "Overdue Books", value: stats.overdueCount, icon: AlertCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30", path: "/student/my-books" },
  ];

  return (
    <div className="space-y-6">
      {totalUnpaid > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-start gap-4 text-rose-800 dark:text-rose-200">
            <AlertCircle className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" size={24} />
            <div>
              <h3 className="font-bold text-lg mb-1">Unpaid Fines Notice</h3>
              <p className="text-sm opacity-90">
                You have an outstanding fine balance of <span className="font-bold font-mono">₹{totalUnpaid}</span>. 
                {earliestDueDate && (
                   <span className="block mt-1">
                     The earliest due date for your overdue books was <strong>{new Date(earliestDueDate).toLocaleDateString()}</strong>.
                   </span>
                )}
                <span className="block mt-1">Please clear your dues as soon as possible to avoid restrictions on issuing new books.</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              // Scroll to fines section
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }}
            className="shrink-0 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
          >
            Review & Pay
          </button>
        </motion.div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Welcome Back!</h2>
          <p className="text-blue-800/80 dark:text-blue-200/80">
            Use the sidebar to browse the catalog, check your issued books, or request new ones.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
           <button 
             onClick={() => navigate('/student/membership')}
             className="shrink-0 px-6 py-3 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
           >
             <QrCode size={20} />
             <span>Library ID / QR</span>
           </button>
           <button 
             onClick={() => navigate('/student/scan')}
             className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
           >
             <Sparkles size={20} />
             <span>Scan a Book</span>
           </button>
        </div>
      </div>

      <MostBorrowedBooks />
      <Recommendations currentUser={currentUser} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => navigate(stat.path)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all"
            >
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">{stat.title}</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
              </div>
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                <Icon size={28} />
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {allFines.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-3xl overflow-hidden shadow-sm">
           <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-rose-50/50 dark:bg-rose-900/10">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
                    <IndianRupee size={20} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Fines</h2>
              </div>
              <div className="text-right">
                 <p className="text-sm font-semibold text-slate-500">Total Unpaid</p>
                 <p className="text-xl font-bold text-rose-600 font-mono">₹{totalUnpaid}</p>
              </div>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50 dark:bg-slate-800/50">
                 <tr>
                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Book</th>
                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-center">Days Late</th>
                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                   <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Action</th>
                 </tr>
               </thead>
               <tbody>
                 {allFines.map(fine => (
                   <tr key={fine.id} className={`border-t border-slate-100 dark:border-slate-800 ${fine.status.includes('Unpaid') ? 'bg-rose-50/20 hover:bg-rose-50 dark:hover:bg-rose-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/10'}`}>
                     <td className="p-4 text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{fine.bookName}</td>
                     <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {fine.dueDate ? new Date(fine.dueDate).toLocaleDateString() : '-'}
                     </td>
                     <td className="p-4 text-sm text-center font-mono">
                        {fine.daysLate} <span className="text-xs text-slate-400">days</span>
                     </td>
                     <td className="p-4 text-sm font-bold font-mono">₹{fine.fineAmount}</td>
                     <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                            fine.status.includes('Paid') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            fine.status.includes('Waived') ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                            'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                          {fine.status}
                        </span>
                     </td>
                     <td className="p-4 text-right">
                        {fine.status.includes('Unpaid') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePay(fine); }}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                                Pay Now
                            </button>
                        )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}
      {receiptData && (
         <PaymentReceiptModal receiptData={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </div>
  );
}
