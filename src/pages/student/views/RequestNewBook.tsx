import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import { Book, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function RequestNewBook({ currentUser }: { currentUser: any }) {
  const [formData, setFormData] = useState({ bookName: '', author: '', description: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'newBookRequests'),
      where('userId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyRequests(data.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    }, error => {
      handleFirestoreError(error, OperationType.LIST, 'newBookRequests');
    });
    return () => unsub();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setStatus('submitting');
    try {
      await addDoc(collection(db, 'newBookRequests'), {
        ...formData,
        userId: currentUser.uid,
        status: 'Pending',
        createdAt: serverTimestamp(),
        requestDate: Date.now()
      });

      setStatus('success');
      setFormData({ bookName: '', author: '', description: '' });
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'newBookRequests');
      setStatus('idle');
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Request New Book</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Can't find a book in our catalog? Request it here and the library admins will consider adding it.</p>
        
        {status === 'success' && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium border border-emerald-200 dark:border-emerald-800">
            Your request has been submitted successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Book Name *</label>
            <input required type="text" value={formData.bookName} onChange={e => setFormData({...formData, bookName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Author *</label>
            <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description / Reason (Optional)</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white resize-none" />
          </div>
          <button disabled={status === 'submitting'} className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
            {status === 'submitting' ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>

      <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">My Recent Requests</h2>
        {myRequests.length === 0 ? (
           <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Book className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400">You haven't requested any new books yet.</p>
           </div>
        ) : (
           <div className="space-y-4">
              {myRequests.map(req => (
                 <div key={req.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-4">
                    <div>
                       <h3 className="font-semibold text-slate-900 dark:text-white">{req.bookName}</h3>
                       <p className="text-sm text-slate-500 mt-1">Author: {req.author}</p>
                       <p className="text-xs text-slate-400 mt-2">Requested on: {req.createdAt ? new Date(req.createdAt.toMillis ? req.createdAt.toMillis() : req.requestDate).toLocaleDateString() : 'Just now'}</p>
                    </div>
                    <div>
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : req.status === 'Rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                       }`}>
                          {req.status === 'Approved' ? <CheckCircle size={14} /> : req.status === 'Rejected' ? <XCircle size={14} /> : <Clock size={14} />}
                          {req.status}
                       </span>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
