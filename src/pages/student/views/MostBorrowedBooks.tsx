import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Sparkles, Book } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MostBorrowedBooks() {
  const [mostBorrowed, setMostBorrowed] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchMostBorrowed() {
      try {
        const booksSnap = await getDocs(collection(db, 'books'));
        const allBooks: any[] = booksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Score books by popularity (proxy: number of copies currently borrowed)
        const scoredBooks = allBooks.map((book: any) => {
          const popularity = (book.quantity || 0) - (book.availableQuantity || 0);
          return { ...book, popularity };
        });

        // filter out zero borrowed
        let validBooks = scoredBooks.filter(b => b.popularity > 0);

        // Sort by popularity
        validBooks.sort((a, b) => b.popularity - a.popularity);

        // If no books are currently borrowed, just show some books
        if (validBooks.length === 0) {
           validBooks = allBooks.slice(0, 4).map(b => ({ ...b, popularity: 0 }));
        }

        setMostBorrowed(validBooks.slice(0, 4));

      } catch (e) {
        console.error("Error fetching most borrowed books: ", e);
      }
    }

    fetchMostBorrowed();
  }, []);

  if (mostBorrowed.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Book className="text-blue-500 fill-blue-500/20" size={24} />
        Most Borrowed Books
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mostBorrowed.map(book => (
          <div key={book.id} onClick={() => navigate(`/book/${book.id}`)} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col h-full group hover:-translate-y-1">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 text-sm group-hover:scale-110 transition-transform">
               <Book size={20} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-2 leading-tight">{book.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">by {book.author}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                {book.category}
              </span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {book.popularity} Borrowed
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
