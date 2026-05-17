import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Megaphone, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function NoticeBoard({ userRole }: { userRole: string | null }) {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    // Student should only see published notices
    const q = query(collection(db, 'notices'), where('isPublished', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      const now = Date.now();
      snapshot.forEach(doc => {
        const item: any = { id: doc.id, ...doc.data() };
        // Check target
        const targetMatch = item.target === 'All' || item.target === (userRole === 'Faculty' ? 'Faculty' : 'Students');
        // Check expiry
        const notExpired = !item.expiryDate || item.expiryDate > now;
        
        if (targetMatch && notExpired) {
           data.push(item);
        }
      });
      data.sort((a, b) => b.createdAt - a.createdAt);
      setNotices(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notices');
      setLoading(false);
    });

    return () => unsub();
  }, [userRole]);

  const filteredNotices = notices.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Urgent') return n.type === 'Urgent';
    if (filter === 'Recent') return Date.now() - n.createdAt < 7 * 24 * 60 * 60 * 1000;
    return true;
  });

  if (loading) return <div>Loading Notice Board...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl">
             <Megaphone size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Notice Board</h2>
            <p className="text-slate-500">Important announcements and updates.</p>
          </div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
           <button onClick={() => setFilter('All')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === 'All' ? 'bg-white dark:bg-slate-700 shadow flex items-center' : 'text-slate-500 hover:text-slate-700'}`}>All</button>
           <button onClick={() => setFilter('Urgent')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === 'Urgent' ? 'bg-white dark:bg-slate-700 shadow flex items-center' : 'text-slate-500 hover:text-slate-700'}`}>Urgent</button>
           <button onClick={() => setFilter('Recent')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === 'Recent' ? 'bg-white dark:bg-slate-700 shadow flex items-center' : 'text-slate-500 hover:text-slate-700'}`}>Recent</button>
        </div>
      </div>

      <div className="grid gap-6">
         {filteredNotices.length === 0 && (
            <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
               <Megaphone className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
               <h3 className="text-lg font-bold">No Notices Found</h3>
               <p className="text-slate-500">There are currently no active notices for your category.</p>
            </div>
         )}
         {filteredNotices.map((n, i) => (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
               key={n.id} 
               className={`p-6 rounded-2xl border ${
                  n.type === 'Urgent' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' : 
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
               }`}
            >
               <div className="flex justify-between items-start mb-4">
                  <div className="flex space-x-3 items-center">
                     <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${
                        n.type === 'Urgent' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 
                        n.type === 'Event' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 
                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                     }`}>
                        {n.type}
                     </span>
                     <span className="text-xs font-medium text-slate-500 flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {new Date(n.createdAt).toLocaleDateString()}
                     </span>
                  </div>
               </div>
               <h3 className={`text-xl font-bold mb-2 ${n.type === 'Urgent' ? 'text-red-900 dark:text-red-100' : 'text-slate-900 dark:text-white'}`}>
                  {n.title}
               </h3>
               <p className={`whitespace-pre-wrap leading-relaxed ${n.type === 'Urgent' ? 'text-red-800 dark:text-red-200/80' : 'text-slate-600 dark:text-slate-400'}`}>
                  {n.message}
               </p>
            </motion.div>
         ))}
      </div>
    </div>
  );
}
