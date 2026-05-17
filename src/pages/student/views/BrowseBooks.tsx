import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, Book, BookmarkPlus, Filter, X, ArrowUpDown } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import useDebounce from '../../../hooks/useDebounce';
import toast from 'react-hot-toast';

export default function BrowseBooks({ currentUser }: { currentUser: any }) {
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOption, setSortOption] = useState('title-asc');
  const [processing, setProcessing] = useState<string | null>(null);
  const processingRef = React.useRef(new Set<string>());
  const [activeIssuesCount, setActiveIssuesCount] = useState(0);
  const [hasUnpaidFines, setHasUnpaidFines] = useState(false);

  useEffect(() => {
    const unsubBooks = onSnapshot(collection(db, 'books'), (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    if (currentUser) {
      const q = query(
        collection(db, 'requests'), 
        where('userId', '==', currentUser.uid)
      );
      const unsubReqs = onSnapshot(q, async (snap) => {
        let hasOverdue = false;
        const now = Date.now();
        const activeIssues = snap.docs.filter(d => {
           const data = d.data();
           return data.type === 'Issue' && ['Pending', 'Approved', 'Return Pending'].includes(data.status);
        });
        activeIssues.forEach(d => {
           const data = d.data();
           if ((data.status === 'Approved' || data.status === 'Return Pending') && data.dueDate && data.dueDate < now) hasOverdue = true;
        });

        const qFines = query(collection(db, 'fines'), where('userId', '==', currentUser.uid));
        const fSnap = await getDocs(qFines);
        const hasUnpaid = fSnap.docs.some(d => d.data().status === 'Unpaid');
        
        setHasUnpaidFines(hasOverdue || hasUnpaid);
        setActiveIssuesCount(activeIssues.length);
      });
      return () => { unsubBooks(); unsubReqs(); };
    }
    
    return () => unsubBooks();
  }, [currentUser]);

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category).filter(Boolean)))];

  const handleIssueRequest = async (book: any) => {
    if (!currentUser) return;
    
    if (activeIssuesCount >= 3) {
      toast.error("You have reached the maximum limit of 3 books. Return previously issued books to request new ones.");
      return;
    }
    if (processingRef.current.has(book.id)) return;
    
    processingRef.current.add(book.id);
    setProcessing(book.id);
    try {
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

      await addDoc(collection(db, 'notifications'), {
        userId: currentUser.uid,
        title: 'Issue Request Sent',
        message: `Your request for "${book.title}" has been sent to the librarian.`,
        read: false,
        createdAt: Date.now()
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
    if (sortOption === 'popularity') {
      const aBorrowed = (a.quantity || 0) - (a.availableQuantity || 0);
      const bBorrowed = (b.quantity || 0) - (b.availableQuantity || 0);
      return bBorrowed - aBorrowed; // Most borrowed first
    }
    if (sortOption === 'title-asc') return (a.title || '').localeCompare(b.title || '');
    if (sortOption === 'title-desc') return (b.title || '').localeCompare(a.title || '');
    if (sortOption === 'author-asc') return (a.author || '').localeCompare(b.author || '');
    if (sortOption === 'author-desc') return (b.author || '').localeCompare(a.author || '');
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
         <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl text-sm font-bold ${activeIssuesCount < 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
               {activeIssuesCount < 3 ? 'Eligible for Request' : 'Request Blocked'}
            </div>
            {hasUnpaidFines && (
               <div className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Warning: You have overdue books or pending fines.
               </div>
            )}
         </div>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by title, author, or ISBN..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-full md:w-auto min-w-[200px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select 
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="relative w-full md:w-auto min-w-[200px]">
          <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select 
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            className="w-full pl-12 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="author-asc">Author (A-Z)</option>
            <option value="author-desc">Author (Z-A)</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sorted.map(book => (
          <div key={book.id} onClick={() => navigate(`/student/book/${book.id}`)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl hover:shadow-xl dark:shadow-none hover:-translate-y-1 transition-all flex flex-col h-full group cursor-pointer">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-5">
              <Book size={24} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-2">{book.title}</h3>
            <p className="text-slate-500 text-sm mb-4">by {book.author}</p>
            
            <div className="mt-auto space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{book.category}</span>
                <span className={`${book.availableQuantity > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {book.availableQuantity} Available
                </span>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleIssueRequest(book);
                }}
                disabled={processing === book.id || book.availableQuantity <= 0 || activeIssuesCount >= 3}
                className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:border-blue-800 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={activeIssuesCount >= 3 ? "Max 3 books limit reached" : ""}
              >
                {processing === book.id ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <BookmarkPlus size={18} />
                    <span>{book.availableQuantity > 0 ? 'Request Issue' : 'Out of Stock'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500">
            No books match your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
