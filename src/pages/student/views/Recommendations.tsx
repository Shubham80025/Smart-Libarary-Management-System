import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Sparkles, Book } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Recommendations({ currentUser }: { currentUser: any }) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRecommendations() {
      if (!currentUser) return;

      try {
        // 1. Get User Branch
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const branch = userData.branch || '';

        // 2. Get Previously Issued Books Categories
        const reqQ = query(collection(db, 'requests'), where('userId', '==', currentUser.uid));
        const reqSnap = await getDocs(reqQ);
        const issuedBookIds = new Set<string>();
        reqSnap.forEach(r => {
          if (r.data().bookId) {
             issuedBookIds.add(r.data().bookId);
          }
        });

        // 3. Fetch all books
        const booksSnap = await getDocs(collection(db, 'books'));
        const allBooks: any[] = booksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const prevCategories = new Set<string>();
        allBooks.forEach(b => {
          if (issuedBookIds.has(b.id) && b.category) {
            prevCategories.add(b.category);
          }
        });

        // 4. Branch keywords mapping
        const branchKeywords: Record<string, string[]> = {
          'CSE': ['programming', 'computer', 'software', 'data', 'algorithm', 'web', 'ai', 'machine learning', 'python', 'java', 'c++'],
          'Civil': ['construction', 'structure', 'material', 'survey', 'fluid', 'concrete'],
          'Mechanical': ['thermodynamics', 'machine', 'fluid', 'mechanics', 'manufacturing', 'kinematics'],
          'Electrical': ['circuit', 'power', 'electronics', 'signal', 'control', 'transformer'],
          'EE': ['circuit', 'power', 'electronics', 'signal', 'control', 'transformer'],
          'ECE': ['communication', 'electronics', 'signal', 'digital', 'microprocessor']
        };

        const keywords = branchKeywords[branch] || [];

        // 5. Score books
        const scoredBooks = allBooks.map((book: any) => {
          let score = 0;
          
          // Popularity metric 
          const popularity = (book.quantity - book.availableQuantity) || 0;
          score += popularity * 0.5;

          const titleStr = (book.title || '').toLowerCase();
          const categoryStr = (book.category || '').toLowerCase();

          // Branch match
          for (const kw of keywords) {
             if (titleStr.includes(kw) || categoryStr.includes(kw)) {
               score += 5;
             }
          }

          // Previous categories match
          if (prevCategories.has(book.category)) {
            score += 3;
          }

          return { ...book, score };
        });

        // filter out zero scores
        let validRecs = scoredBooks.filter(b => b.score > 0);

        // Filter out already issued books
        let finalRecs = validRecs.filter(b => !issuedBookIds.has(b.id));

        // Sort by score
        finalRecs.sort((a, b) => b.score - a.score);

        setRecommendations(finalRecs.slice(0, 4));

      } catch (e) {
        console.error("Error fetching recommendations: ", e);
      }
    }

    fetchRecommendations();
  }, [currentUser]);

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Sparkles className="text-yellow-500 fill-yellow-500/20" size={24} />
        Recommended for You
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {recommendations.map(book => (
          <div key={book.id} onClick={() => navigate(`/book/${book.id}`)} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col h-full group hover:-translate-y-1">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4 text-sm group-hover:scale-110 transition-transform">
               <Book size={20} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-2 leading-tight">{book.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">by {book.author}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                {book.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
