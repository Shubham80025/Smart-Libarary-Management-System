import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Star, Trash2, Search, MessageSquare } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function ReviewManagement() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userCache, setUserCache] = useState<Record<string, any>>({});

  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      
      const newCache = { ...userCache };
      let updatedCache = false;
      for (const item of data) {
        if (!newCache[item.userId]) {
           try {
             const userDoc = await getDoc(doc(db, 'users', item.userId));
             if (userDoc.exists()) {
               newCache[item.userId] = userDoc.data();
               updatedCache = true;
             }
           } catch (e) {
             console.error(e);
           }
        }
      }
      if (updatedCache) setUserCache(newCache);
      setReviews(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'feedback');
    });
    return () => unsub();
  }, [userCache]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      try {
        await deleteDoc(doc(db, 'feedback', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `feedback/${id}`);
      }
    }
  };

  const filtered = reviews.filter(r => {
    const u = userCache[r.userId];
    const name = u?.name || 'Unknown User';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (r.comments && r.comments.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <MessageSquare size={20} className="text-blue-500" />
             Review & Feedback Management
           </h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Manage student and faculty feedback</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white min-w-[200px]"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        <div className="grid gap-4">
          {filtered.map(review => {
            const user = userCache[review.userId];
            return (
              <div key={review.id} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors flex gap-6 items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                            {user?.name ? user.name.substring(0, 2).toUpperCase() : '?'}
                         </div>
                         <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{user?.name || 'Unknown User'}</p>
                            <p className="text-xs text-slate-500">{user?.role || 'Unknown Role'} • {new Date(review.createdAt).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(star => (
                             <Star key={star} size={16} className={star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700 fill-slate-300 dark:fill-slate-700'} />
                          ))}
                       </div>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-sm mt-3 leading-relaxed bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      "{review.comments}"
                    </p>
                  </div>
                  <button onClick={() => handleDelete(review.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm transition-colors mt-2">
                    <Trash2 size={18} />
                  </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center p-12 text-slate-500">
              No feedback found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
