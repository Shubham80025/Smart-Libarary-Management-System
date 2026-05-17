import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { CreditCard, IndianRupee, Search, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function MembershipsManagement() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'memberships'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMemberships(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'memberships');
    });
    return () => unsub();
  }, []);

  const filtered = memberships.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = memberships.filter(m => m.status === 'active').length;
  const expiredCount = memberships.filter(m => m.status === 'expired').length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <CreditCard size={20} className="text-emerald-500" />
             Memberships
           </h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Manage student memberships and validity</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
           <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Memberships</p>
           <p className="text-2xl font-bold text-slate-900 dark:text-white">{memberships.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
           <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">Active</p>
           <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
           <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Expired</p>
           <p className="text-2xl font-bold text-slate-900 dark:text-white">{expiredCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email, or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Member Details</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Type</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Validity Period</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-white">{m.name}</span>
                    <span className="text-xs text-slate-500">{m.email}</span>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">ID: {m.id}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {m.membershipType}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col text-sm text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1"><Clock size={12}/>{new Date(m.startDate).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-slate-400">to {new Date(m.expiryDate).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="p-4">
                  {m.status === 'active' ? (
                     <span className="inline-flex items-center gap-1 bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded text-xs font-semibold w-fit">
                       <CheckCircle size={12} /> Active
                     </span>
                  ) : (
                     <span className="inline-flex items-center gap-1 bg-rose-100/50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-1 rounded text-xs font-semibold w-fit">
                       <XCircle size={12} /> Expired
                     </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 mb-4">
                    <CreditCard size={24} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No memberships found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
