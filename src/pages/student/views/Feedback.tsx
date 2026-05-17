import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Star } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function Feedback({ currentUser }: { currentUser: any }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || rating === 0) return;
    setStatus('submitting');
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: currentUser.uid,
        rating,
        comments,
        createdAt: Date.now()
      });
      setStatus('success');
      setRating(0);
      setComments('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'feedback');
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Library Feedback</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Help us improve the library experience by sharing your feedback.</p>
      
      {status === 'success' && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium border border-emerald-200 dark:border-emerald-800">
          Thank you for your feedback!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="focus:outline-none"
              >
                <Star
                  size={32}
                  className={`${(hovered || rating) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'} transition-colors`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Comments</label>
          <textarea 
            required 
            value={comments} 
            onChange={e => setComments(e.target.value)} 
            rows={5} 
            placeholder="Tell us what you liked or what needs improvement..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white resize-none" 
          />
        </div>

        <button 
          disabled={status === 'submitting' || rating === 0} 
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
