import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { IndianRupee, Search, CheckCircle, Clock, FileText, AlertCircle, Plus, Wallet } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function FeeManagement() {
  const [activeTab, setActiveTab] = useState<'fees' | 'fines'>('fees');

  // Fees State
  const [fees, setFees] = useState<any[]>([]);
  const [feeSearchTerm, setFeeSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFee, setNewFee] = useState({ userId: '', amount: 500, type: 'membership', daysLate: 0 });

  // Fines State
  const [fines, setFines] = useState<any[]>([]);
  const [finesLoading, setFinesLoading] = useState(true);
  const [fineSearch, setFineSearch] = useState('');

  useEffect(() => {
    // Fetch Fees
    const qFees = query(collection(db, 'fees'));
    const unsubFees = onSnapshot(qFees, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFees(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'fees'));

    // Fetch Fines
    const qFines = query(collection(db, 'fines'));
    const unsubFines = onSnapshot(qFines, async (snap) => {
      const data = await Promise.all(snap.docs.map(async d => {
        const fData = d.data();
        let userName = 'Unknown User';
        let bookName = 'Unknown Book';

        try {
           const uDoc = await getDoc(doc(db, 'users', fData.userId));
           if (uDoc.exists()) userName = uDoc.data().name || 'Unknown User';
           
           if (fData.bookId) {
             const bDoc = await getDoc(doc(db, 'books', fData.bookId));
             if (bDoc.exists()) bookName = bDoc.data().title || 'Unknown Book';
           }
        } catch (e) {}

        return { id: d.id, ...fData, userName, bookName } as any;
      }));
      setFines(data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setFinesLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fines');
      setFinesLoading(false);
    });

    return () => {
      unsubFees();
      unsubFines();
    };
  }, []);

  // Fee Methods
  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await addDoc(collection(db, 'fees'), {
        userId: newFee.userId,
        amount: Number(newFee.amount),
        type: newFee.type,
        dueDate: dueDate.getTime(),
        paidStatus: 'unpaid',
        paymentDate: null,
        lateFee: 0
      });
      setShowAddModal(false);
      setNewFee({ userId: '', amount: 500, type: 'membership', daysLate: 0 });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'fees');
    }
  };

  const handleMarkFeePaid = async (id: string, lateFeeAmount: number) => {
    try {
      await updateDoc(doc(db, 'fees', id), {
        paidStatus: 'paid',
        paymentDate: Date.now(),
        lateFee: lateFeeAmount
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `fees/${id}`);
    }
  };

  // Fine Methods
  const handleMarkFinePaid = async (fineId: string) => {
     try {
       await updateDoc(doc(db, 'fines', fineId), {
          status: 'Paid',
          lastUpdated: Date.now()
       });
     } catch (e) {
       handleFirestoreError(e, OperationType.UPDATE, `fines/${fineId}`);
     }
  };

  const handleWaiveFine = async (fineId: string) => {
     if(!window.confirm("Are you sure you want to waive this fine?")) return;
     try {
       await updateDoc(doc(db, 'fines', fineId), {
          status: 'Waived',
          fineAmount: 0,
          lastUpdated: Date.now()
       });
     } catch (e) {
       handleFirestoreError(e, OperationType.UPDATE, `fines/${fineId}`);
     }
  };

  const filteredFees = fees.filter(f => 
    f.userId.toLowerCase().includes(feeSearchTerm.toLowerCase()) ||
    f.type.toLowerCase().includes(feeSearchTerm.toLowerCase())
  );

  const filteredFines = fines.filter(f => f.userName.toLowerCase().includes(fineSearch.toLowerCase()) || f.bookName.toLowerCase().includes(fineSearch.toLowerCase()));

  const feeTotalRevenue = fees.filter(f => f.paidStatus === 'paid').reduce((acc, curr) => acc + curr.amount + (curr.lateFee || 0), 0);
  const feePendingAmount = fees.filter(f => f.paidStatus === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0);

  const fineTotalCollected = fines.filter(f => f.status === 'Paid').reduce((acc, f) => acc + (f.fineAmount || 0), 0);
  const fineTotalPending = fines.filter(f => f.status === 'Unpaid').reduce((acc, f) => acc + (f.fineAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('fees')} 
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'fees' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <IndianRupee size={16} /> Membership Fees
        </button>
        <button 
          onClick={() => setActiveTab('fines')} 
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'fines' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <AlertCircle size={16} /> Library Fines
        </button>
      </div>

      {activeTab === 'fees' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
               <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 Fee Management
               </h2>
               <p className="text-sm text-slate-500 dark:text-slate-400">Manage membership dues and special fees</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors w-fit"
            >
              <Plus size={16} /> Add Fee Record
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
               <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">Total Revenue Collected</p>
               <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{feeTotalRevenue}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
               <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-1">Pending Due Amount</p>
               <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{feePendingAmount}</p>
            </div>
          </div>

          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 shrink-0">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by user ID or type..." 
                value={feeSearchTerm}
                onChange={(e) => setFeeSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Fee Details</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Amount</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Due Date</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFees.map(f => {
                  const now = Date.now();
                  const isLate = f.paidStatus === 'unpaid' && f.dueDate < now;
                  const daysLate = isLate ? Math.floor((now - f.dueDate) / (1000 * 60 * 60 * 24)) : 0;
                  const computedLateFee = daysLate * 2; // ₹2 per day late fee rule

                  return (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white capitalize">{f.type.replace('_', ' ')} Fee</span>
                          <span className="text-[10px] text-slate-400 mt-1 font-mono">User ID: {f.userId}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-white">₹{f.amount}</span>
                          {f.paidStatus === 'paid' && f.lateFee > 0 && <span className="text-xs text-rose-500">+ ₹{f.lateFee} late fee</span>}
                          {f.paidStatus === 'unpaid' && isLate && <span className="text-xs text-rose-500">+ ₹{computedLateFee} late fee</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {new Date(f.dueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        {f.paidStatus === 'paid' ? (
                           <span className="inline-flex items-center gap-1 bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded text-xs font-semibold w-fit">
                             <CheckCircle size={12} /> Paid on {new Date(f.paymentDate).toLocaleDateString()}
                           </span>
                        ) : (
                           <span className="flex flex-col gap-1 items-start">
                             <span className="inline-flex items-center gap-1 bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded text-xs font-semibold w-fit">
                               <Clock size={12} /> Pending
                             </span>
                             {isLate && (
                               <span className="inline-flex items-center gap-1 text-rose-500 text-xs font-semibold">
                                 <AlertCircle size={12} /> {daysLate} days overdue
                               </span>
                             )}
                           </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {f.paidStatus === 'unpaid' && (
                          <button 
                            onClick={() => handleMarkFeePaid(f.id, isLate ? computedLateFee : 0)}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Mark as Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredFees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 mb-4">
                        <IndianRupee size={24} />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">No fee records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {showAddModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create Fee Record</h3>
                <form onSubmit={handleAddFee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">User ID</label>
                    <input required type="text" value={newFee.userId} onChange={e => setNewFee({...newFee, userId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount (₹)</label>
                      <input required type="number" min="0" value={newFee.amount} onChange={e => setNewFee({...newFee, amount: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fee Type</label>
                      <select value={newFee.type} onChange={e => setNewFee({...newFee, type: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none dark:text-white">
                        <option value="membership">Membership</option>
                        <option value="late_return">Late Return</option>
                        <option value="book_loss">Lost Book</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'fines' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
             <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Fine Management
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage automated overdue return penalties</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
               <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">Total Penalties Collected</p>
               <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{fineTotalCollected}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
               <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-1">Total Unpaid Penalties</p>
               <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{fineTotalPending}</p>
            </div>
          </div>

          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 shrink-0">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by student or book..."
                value={fineSearch}
                onChange={e => setFineSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Student</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Book</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Days Late</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 mb-4">
                        <AlertCircle size={24} />
                      </div>
                      <p>No fines found.</p>
                    </td>
                  </tr>
                ) : filteredFines.map(fine => (
                   <tr key={fine.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                     <td className="p-4 font-medium text-slate-900 dark:text-white text-sm">{fine.userName}</td>
                     <td className="p-4 text-sm text-slate-600 dark:text-slate-300 line-clamp-1">{fine.bookName}</td>
                     <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{fine.daysLate} <span className="text-[10px] text-slate-400">days</span></td>
                     <td className="p-4 font-bold text-slate-900 dark:text-white">₹{fine.fineAmount}</td>
                     <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                          fine.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          fine.status === 'Waived' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                           {fine.status}
                        </span>
                     </td>
                     <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                           {fine.status === 'Unpaid' && (
                              <>
                                <button onClick={() => handleMarkFinePaid(fine.id)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors">
                                  Mark Paid
                                </button>
                                <button onClick={() => handleWaiveFine(fine.id)} className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors text-slate-900 dark:text-white">
                                  Waive
                                </button>
                              </>
                           )}
                        </div>
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
