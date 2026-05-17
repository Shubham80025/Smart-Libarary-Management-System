import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import { Book, Download, Eye, Search, X, FileText, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function EBooksStudent({ currentUser }: { currentUser: any }) {
  const [ebooks, setEbooks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedEbook, setSelectedEbook] = useState<any>(null); // For "Read Online" modal

  useEffect(() => {
    const q = query(collection(db, 'ebooks'));
    const unsub = onSnapshot(q, (snap) => {
      setEbooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'ebooks');
    });
    return () => unsub();
  }, []);

  const categories = ['All', ...Array.from(new Set(ebooks.map(b => b.category).filter(Boolean)))];

  const filteredEbooks = ebooks.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || b.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = async (ebook: any) => {
    try {
      await updateDoc(doc(db, 'ebooks', ebook.id), {
        downloadCount: increment(1)
      });
      // Force download if possible, or open in new tab
      const link = document.createElement('a');
      link.href = ebook.fileURL;
      link.target = '_blank';
      link.download = ebook.fileName || 'ebook.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `ebooks/${ebook.id}`);
    }
  };

  const handleReadOnline = (ebook: any) => {
    setSelectedEbook(ebook);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
             type="text" 
             placeholder="Search e-books by title or author..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select 
             value={categoryFilter}
             onChange={e => setCategoryFilter(e.target.value)}
             className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl appearance-none focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
          >
            {categories.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredEbooks.map((ebook, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={ebook.id} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl hover:shadow-xl dark:shadow-none hover:-translate-y-1 transition-all flex flex-col h-full group"
          >
            <div className="aspect-[3/4] w-full bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 overflow-hidden flex items-center justify-center relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
               <FileText size={48} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500/50 transition-colors" />
               <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">
                     {ebook.category || 'PDF'}
                  </span>
               </div>
            </div>
            
            <h3 className="font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-2 leading-tight">{ebook.title}</h3>
            <p className="text-slate-500 text-sm mb-4 line-clamp-1">by {ebook.author}</p>
            
            <div className="mt-auto pt-4 space-y-2 border-t border-slate-100 dark:border-slate-800/60">
               <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                 <span>{ebook.branch || 'All Branches'}</span>
                 <span className="flex items-center gap-1"><Download size={12}/> {ebook.downloadCount || 0}</span>
               </div>
               
               <div className="grid grid-cols-2 gap-2">
                 <button 
                   onClick={() => handleReadOnline(ebook)}
                   className="py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                 >
                   <Eye size={16} /> Read
                 </button>
                 <button 
                   onClick={() => handleDownload(ebook)}
                   className="py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                 >
                   <Download size={16} /> Get PDF
                 </button>
               </div>
            </div>
          </motion.div>
        ))}
        {filteredEbooks.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Book size={32} className="opacity-50" />
            </div>
            <p>No e-books found matching your search.</p>
          </div>
        )}
      </div>

      {/* Read Online Modal */}
      <AnimatePresence>
        {selectedEbook && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" 
               onClick={() => setSelectedEbook(null)} 
            />
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }} 
               exit={{ scale: 0.95, opacity: 0 }} 
               className="relative w-full max-w-6xl h-full max-h-[90vh] bg-slate-100 dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 pr-4">{selectedEbook.title}</h3>
                  <p className="text-xs text-slate-500 leading-none mt-1">by {selectedEbook.author}</p>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                      onClick={() => handleDownload(selectedEbook)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" 
                      title="Download"
                   >
                     <Download size={20} />
                   </button>
                   <button 
                      onClick={() => setSelectedEbook(null)} 
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                   >
                     <X size={20} />
                   </button>
                </div>
              </div>
              <div className="flex-1 w-full bg-slate-200 dark:bg-slate-950 flex flex-col p-2 md:p-4 pb-2 md:pb-4 gap-2 md:gap-4 overflow-hidden relative">
                 {/* Iframe for PDF rendering */}
                 <iframe 
                   src={`${selectedEbook.fileURL}#toolbar=0`} 
                   className="w-full h-full rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800"
                   title={selectedEbook.title}
                 />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
