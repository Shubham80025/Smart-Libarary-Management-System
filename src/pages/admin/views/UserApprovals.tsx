import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { CheckCircle, XCircle, Search, UserCheck, ShieldAlert } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function UserApprovals() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'Student')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setPendingUsers(data.filter(u => u.status === 'pending'));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsub();
  }, []);

  const handleApprove = async (id: string) => {
    setLoadingAction(id);
    try {
      const u = pendingUsers.find(user => user.id === id);
      await updateDoc(doc(db, 'users', id), {
        isApproved: true,
        status: 'active'
      });
      
      const { addDoc } = await import('firebase/firestore');
      
      // Create membership record for 1 year
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      await addDoc(collection(db, 'memberships'), {
        userId: id,
        name: u?.name || 'Unknown',
        email: u?.email || 'Unknown',
        membershipType: 'yearly',
        startDate: startDate.getTime(),
        expiryDate: expiryDate.getTime(),
        status: 'active'
      });

      await addDoc(collection(db, 'notifications'), {
        userId: id,
        title: 'Account Approved',
        message: 'Your account has been approved. Welcome to the Library Management System. A 1-year membership has been created for you.',
        read: false,
        createdAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${id}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoadingAction(id);
    try {
      await updateDoc(doc(db, 'users', id), {
        isApproved: false,
        status: 'rejected'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${id}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const filtered = pendingUsers.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <UserCheck size={20} className="text-blue-500" />
             User Approvals
           </h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Review and approve new student signups</p>
        </div>
        <div className="flex items-center gap-3">
          {filtered.length > 0 && (
              <button
               onClick={async () => {
                 setLoadingAction('all');
                 try {
                   const { addDoc } = await import('firebase/firestore');
                   
                   const startDate = new Date();
                   const expiryDate = new Date();
                   expiryDate.setFullYear(expiryDate.getFullYear() + 1);

                   await Promise.all(filtered.map(async u => {
                     await updateDoc(doc(db, 'users', u.id), { isApproved: true, status: 'active' });
                     
                     await addDoc(collection(db, 'memberships'), {
                       userId: u.id,
                       name: u.name || 'Unknown',
                       email: u.email || 'Unknown',
                       membershipType: 'yearly',
                       startDate: startDate.getTime(),
                       expiryDate: expiryDate.getTime(),
                       status: 'active'
                     });

                     await addDoc(collection(db, 'notifications'), {
                       userId: u.id,
                       title: 'Account Approved',
                       message: 'Your account has been approved. Welcome to the Library Management System. A 1-year membership has been created for you.',
                       read: false,
                       createdAt: Date.now()
                     });
                   }));
                 } catch (e) {
                   handleFirestoreError(e, OperationType.UPDATE, 'users');
                 } finally {
                   setLoadingAction(null);
                 }
               }}
               disabled={loadingAction !== null}
               className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
             >
               Approve All
             </button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search by name, email, or Reg No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white min-w-[250px]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 border-b border-slate-200 dark:border-slate-800 z-10">
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Name</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact & Registration</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span>
                    <span className="text-xs text-slate-500">{new Date(user.createdAt?.seconds * 1000).toLocaleDateString() || 'N/A'}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-slate-700 dark:text-slate-300 text-sm">{user.email}</span>
                    <span className="text-xs text-slate-500">Reg No: {user.registrationNumber || '-'} • Branch: {user.branch || '-'}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                     <span className="inline-flex items-center gap-1 bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded text-xs font-semibold w-fit">
                       <ShieldAlert size={12} /> Pending Approval
                     </span>
                     {user.isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mt-1">
                          <CheckCircle size={12} /> Email Verified
                        </span>
                     ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs mt-1">
                          Email Unverified
                        </span>
                     )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleApprove(user.id)} 
                      disabled={loadingAction === user.id}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button 
                      onClick={() => handleReject(user.id)} 
                      disabled={loadingAction === user.id}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 mb-4">
                    <UserCheck size={24} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No pending user approvals.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
