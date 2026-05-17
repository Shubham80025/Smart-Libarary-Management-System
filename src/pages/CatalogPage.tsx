import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Search, Book, BookmarkPlus, Filter, X, ArrowUpDown } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import useDebounce from '../hooks/useDebounce';
import toast from 'react-hot-toast';

export default function CatalogPage({ currentUser }: { currentUser: any }) {
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOption, setSortOption] = useState('title-asc');
  const [processing, setProcessing] = useState<string | null>(null);
  const processingRef = React.useRef(new Set<string>());
  const [activeIssuesCount, setActiveIssuesCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'books'), (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
       import('../lib/firestore-errors').then(({ handleFirestoreError, OperationType }) => {
          handleFirestoreError(error, OperationType.LIST, 'books');
       });
    });
    
    if (currentUser) {
      const q = query(
        collection(db, 'requests'), 
        where('userId', '==', currentUser.uid)
      );
      const unsubReqs = onSnapshot(q, (snap) => {
        const activeIssues = snap.docs.filter(d => {
           const data = d.data();
           return data.type === 'Issue' && ['Pending', 'Approved', 'Return Pending'].includes(data.status);
        });
        setActiveIssuesCount(activeIssues.length);
      });
      return () => { unsub(); unsubReqs(); };
    }
    
    return () => unsub();
  }, [currentUser]);

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category).filter(Boolean)))];

  const handleIssueRequest = async (book: any) => {
    if (!currentUser) {
      toast.error("Please login first to request books.");
      return;
    }
    if (activeIssuesCount >= 3) {
      toast.error("You have reached the maximum limit of 3 books. Return previously issued books to request new ones.");
      return;
    }
    if (processingRef.current.has(book.id)) return;
    
    processingRef.current.add(book.id);
    setProcessing(book.id);
    try {
      // Check if already requested or issued
      const q = query(
        collection(db, 'requests'),
        where('userId', '==', currentUser.uid)
      );
      const docs = await getDocs(q);
      const activeReq = docs.docs.find(d => {
         const data = d.data();
         return data.bookId === book.id && ['Pending', 'Approved', 'Return Pending'].includes(data.status);
      });

      if (activeReq) {
        toast.error("You already have an active request or have issued this book.");
        processingRef.current.delete(book.id);
        setProcessing(null);
        return;
      }
      
      await addDoc(collection(db, 'requests'), {
        userId: currentUser.uid,
        bookId: book.id,
        type: 'Issue',
        requestDate: Date.now(),
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      toast.success(`Issue request sent for "${book.title}".`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'requests');
    } finally {
      processingRef.current.delete(book.id);
      setProcessing(null);
    }
  };

  const filtered = books.filter(b => 
    (b.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
     b.author?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) &&
    (categoryFilter === 'All' || b.category === categoryFilter)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortOption === 'title-asc') return (a.title || '').localeCompare(b.title || '');
    if (sortOption === 'title-desc') return (b.title || '').localeCompare(a.title || '');
    if (sortOption === 'author-asc') return (a.author || '').localeCompare(b.author || '');
    if (sortOption === 'author-desc') return (b.author || '').localeCompare(a.author || '');
    return 0;
  });

  return (
    <div className="pt-24 pb-20 min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="bg-blue-600 rounded-3xl p-8 mb-8 text-white flex flex-col md:flex-row items-center justify-between shadow-xl shadow-blue-600/20">
           <div>
             <h1 className="text-3xl lg:text-4xl font-bold mb-2">Digital Catalog</h1>
             <p className="text-blue-100 max-w-lg">Discover our extensive collection of technical and literary resources.</p>
           </div>
           <Book size={80} className="text-blue-400 opacity-20 -mt-20 -mb-20 rotate-12 hidden md:block" />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
           <div className="relative flex-1 w-full">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search by title, author, or ISBN..."
               className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white shadow-sm"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="relative w-full md:w-auto min-w-[200px]">
             <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
             <select 
               value={categoryFilter}
               onChange={e => setCategoryFilter(e.target.value)}
               className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
             >
               {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>
           <div className="relative w-full md:w-auto min-w-[200px]">
             <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
             <select 
               value={sortOption}
               onChange={e => setSortOption(e.target.value)}
               className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
             >
               <option value="title-asc">Title (A-Z)</option>
               <option value="title-desc">Title (Z-A)</option>
               <option value="author-asc">Author (A-Z)</option>
               <option value="author-desc">Author (Z-A)</option>
             </select>
           </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sorted.map(book => (
            <div key={book.id} onClick={() => navigate(`/book/${book.id}`)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl hover:shadow-xl dark:shadow-none hover:-translate-y-1 transition-all flex flex-col h-full group cursor-pointer overflow-hidden relative">
              
              <div className="aspect-[3/4] w-full bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 overflow-hidden flex items-center justify-center relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                 {book.coverUrl || book.imageUrl ? (
                    <img src={book.coverUrl || book.imageUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900 group-hover:scale-105 transition-transform duration-500 gap-3">
                       <Book size={48} className="opacity-50" />
                       <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">{book.category || 'Book'}</span>
                    </div>
                 )}
                 
                 {/* Availability Badge Overlay */}
                 <div className="absolute top-3 right-3">
                    {book.availableQuantity > 0 ? (
                       <span className="px-2.5 py-1 bg-emerald-500/90 backdrop-blur-md text-white border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">
                          {book.availableQuantity} Left
                       </span>
                    ) : (
                       <span className="px-2.5 py-1 bg-rose-500/90 backdrop-blur-md text-white border border-rose-400/30 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">
                          Out of Stock
                       </span>
                    )}
                 </div>
              </div>

              <div className="px-2 flex-grow flex flex-col">
                 <h3 className="font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-2 leading-tight">{book.title}</h3>
                 <p className="text-slate-500 text-sm mb-4 line-clamp-1">by {book.author}</p>
                 
                 <div className="mt-auto pt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       handleIssueRequest(book);
                     }}
                     disabled={processing === book.id || book.availableQuantity <= 0 || activeIssuesCount >= 3}
                     title={activeIssuesCount >= 3 ? "Max 3 books limit reached" : ""}
                     className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        book.availableQuantity > 0 && processing !== book.id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                     }`}
                   >
                     {processing === book.id ? (
                       <span>Processing...</span>
                     ) : (
                       <>
                         <BookmarkPlus size={18} />
                         <span>{book.availableQuantity > 0 ? 'Request Issue' : 'Unavailable'}</span>
                       </>
                     )}
                   </button>
                 </div>
              </div>
            </div>
          ))}

          {sorted.length === 0 && (
            <div className="col-span-full py-20 text-center">
               <div className="inline-flex w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 items-center justify-center rounded-full mb-4">
                 <X size={32} />
               </div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No books found</h3>
               <p className="text-slate-500 max-w-sm mx-auto">Try adjusting your search or filter requirements to find what you are looking for.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
