import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit, addDoc, serverTimestamp, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Book as BookIcon, User, Layers, Hash, BookmarkPlus, ArrowLeft, Star, MessageSquare } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import toast from 'react-hot-toast';

export default function BookDetailsPage({ currentUser }: { currentUser: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isStudentRoute = location.pathname.includes('/student/book/');
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedBooks, setRelatedBooks] = useState<any[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [hasBorrowed, setHasBorrowed] = useState(false);
  const [myReview, setMyReview] = useState<any>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasUnpaidFines, setHasUnpaidFines] = useState(false);
  const [activeIssuesCount, setActiveIssuesCount] = useState(0);
  const [relatedSortBy, setRelatedSortBy] = useState<'popularity' | 'title'>('popularity');
  const [hasReserved, setHasReserved] = useState(false);
  const [waitingQueueSize, setWaitingQueueSize] = useState(0);
  const [isReserving, setIsReserving] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchBook = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'books', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const bookData: any = { id: docSnap.id, ...docSnap.data() };
          setBook(bookData);
          
          if (bookData.category) {
            const relatedQuery = query(
              collection(db, 'books'),
              where('category', '==', bookData.category)
            );
            const relatedSnap = await getDocs(relatedQuery);
            const related = relatedSnap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter(b => b.id !== id);
            setRelatedBooks(related);
          }
        } else {
          setBook(null);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `books/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();

    // Fetch Reviews
    const qReviews = query(collection(db, 'bookReviews'), where('bookId', '==', id));
    const unsubReviews = onSnapshot(qReviews, async (snap) => {
        const revs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        revs.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setReviews(revs);
        if (currentUser) {
            const userReview = revs.find((r: any) => r.userId === currentUser.uid);
            setMyReview(userReview || null);
        }
    });

    return () => unsubReviews();
  }, [id, currentUser]);

  useEffect(() => {
     if (!currentUser || !id) return;
     const checkBorrowed = async () => {
        try {
           const q = query(collection(db, 'requests'), where('userId', '==', currentUser.uid), where('type', '==', 'Issue'));
           const snap = await getDocs(q);
           const hasIssued = snap.docs.some(d => d.data().bookId === id && (d.data().status === 'Approved' || d.data().status === 'Returned'));
           setHasBorrowed(hasIssued);

           let hasOverdue = false;
           let activeCount = 0;
           const now = Date.now();
           snap.docs.forEach(d => {
             const data = d.data();
             if (data.status === 'Approved' || data.status === 'Return Pending' || data.status === 'Pending') {
               activeCount++;
             }
             if ((data.status === 'Approved' || data.status === 'Return Pending') && data.dueDate && data.dueDate < now) hasOverdue = true;
           });
           
           setActiveIssuesCount(activeCount);

           const qFines = query(collection(db, 'fines'), where('userId', '==', currentUser.uid), where('status', '==', 'Unpaid'));
           const fSnap = await getDocs(qFines);
           setHasUnpaidFines(hasOverdue || !fSnap.empty);

           // Fetch reservations queue size for this book
           const qRes = query(collection(db, 'reservations'), where('bookId', '==', id));
           const snapRes = await getDocs(qRes);
           const waitingDocs = snapRes.docs.filter(d => d.data().status === 'waiting');
           setWaitingQueueSize(waitingDocs.length);
           
           const userRes = waitingDocs.find(d => d.data().userId === currentUser.uid);
           setHasReserved(!!userRes);

           // Fetch subscription status
           const qSub = query(collection(db, 'subscriptions'), where('bookId', '==', id), where('userId', '==', currentUser.uid));
           const snapSub = await getDocs(qSub);
           setHasSubscribed(!snapSub.empty);

        } catch(e) {}
     };
     checkBorrowed();
  }, [id, currentUser]);

  const handleIssueRequest = async () => {
    if (!currentUser) {
      toast.error("Please login first to request books.");
      return;
    }
    if (activeIssuesCount >= 3) {
      toast.error("You have reached the maximum limit of 3 books. Return previously issued books to request new ones.");
      return;
    }
    if (processing || !book) return;
    
    setProcessing(true);
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
        setProcessing(false);
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
      setProcessing(false);
    }
  };

  const reserveBook = async () => {
    if (!currentUser || !book) {
       toast.error("Please login first to reserve books.");
       return;
    }
    setIsReserving(true);
    try {
      await addDoc(collection(db, 'reservations'), {
        bookId: book.id,
        userId: currentUser.uid,
        status: 'waiting',
        requestDate: Date.now()
      });

      setHasReserved(true);
      setWaitingQueueSize(prev => prev + 1);
      toast.success(`You have been added to the reservation queue for "${book.title}".`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reservations');
    } finally {
      setIsReserving(false);
    }
  };

  const cancelReservation = async () => {
    if (!currentUser || !book) return;
    setIsReserving(true);
    try {
      const qRef = query(collection(db, 'reservations'), where('bookId', '==', book.id));
      const qSnap = await getDocs(qRef);
      const activeRes = qSnap.docs.find(d => {
         const data = d.data();
         return data.userId === currentUser.uid && data.status === 'waiting';
      });
      if (activeRes) {
        await updateDoc(doc(db, 'reservations', activeRes.id), {
          status: 'cancelled'
        });
        setHasReserved(false);
        setWaitingQueueSize(prev => Math.max(0, prev - 1));
        toast.success("Reservation cancelled.");
      }
      setIsReserving(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'reservations');
      setIsReserving(false);
    }
  };

  const toggleSubscription = async () => {
    if (!currentUser || !book) {
       toast.error("Please login first to subscribe.");
       return;
    }
    setIsSubscribing(true);
    try {
      const qSub = query(collection(db, 'subscriptions'), where('bookId', '==', book.id), where('userId', '==', currentUser.uid));
      const snapSub = await getDocs(qSub);
      
      if (!snapSub.empty) {
         // Unsubscribe
         import('firebase/firestore').then(async ({ deleteDoc, doc }) => {
            await deleteDoc(doc(db, 'subscriptions', snapSub.docs[0].id));
            setHasSubscribed(false);
            toast.success("You have unsubscribed from notifications for this book.");
            setIsSubscribing(false);
         });
      } else {
         // Subscribe
         await addDoc(collection(db, 'subscriptions'), {
           bookId: book.id,
           userId: currentUser.uid,
           createdAt: Date.now()
         });
         setHasSubscribed(true);
         toast.success("You will be notified when this book becomes available.");
         setIsSubscribing(false);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subscriptions');
      setIsSubscribing(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!currentUser || reviewRating === 0) return;
     setSubmittingReview(true);
     
     let currentUserName = 'Anonymous';
     try {
       const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
       if (userDoc.exists()) {
         currentUserName = userDoc.data().name || 'Anonymous';
       }
     } catch (err) {}

     try {
       await addDoc(collection(db, 'bookReviews'), {
         bookId: book.id,
         userId: currentUser.uid,
         userName: currentUserName,
         rating: reviewRating,
         comment: reviewText,
         createdAt: Date.now()
       });
       setReviewText('');
       setReviewRating(0);
       setSubmittingReview(false);
     } catch (e) {
       handleFirestoreError(e, OperationType.CREATE, 'bookReviews');
       setSubmittingReview(false);
     }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const sortedRelatedBooks = [...relatedBooks].sort((a, b) => {
    if (relatedSortBy === 'popularity') {
      const aBorrowed = (a.quantity || 0) - (a.availableQuantity || 0);
      const bBorrowed = (b.quantity || 0) - (b.availableQuantity || 0);
      if (bBorrowed !== aBorrowed) {
        return bBorrowed - aBorrowed;
      }
    }
    return (a.title || '').localeCompare(b.title || '');
  }).slice(0, 3);

  if (loading) {
    return <div className={`${isStudentRoute ? 'p-6' : 'pt-32 pb-20'} text-center min-h-screen ${isStudentRoute ? '' : 'bg-slate-50 dark:bg-slate-950'} text-slate-500`}>Loading book details...</div>;
  }

  if (!book) {
    return (
      <div className={`${isStudentRoute ? 'p-6' : 'pt-32 pb-20'} text-center min-h-screen ${isStudentRoute ? '' : 'bg-slate-50 dark:bg-slate-950'} text-slate-500`}>
        <h2 className="text-2xl font-bold mb-4">Book not found</h2>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline flex items-center justify-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className={`${isStudentRoute ? 'p-6' : 'pt-32 pb-20 min-h-screen bg-slate-50 dark:bg-slate-950'}`}>
      <div className="container mx-auto px-4 max-w-4xl">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-8 mb-8">
          <div className="w-full md:w-1/3 flex flex-col items-center flex-shrink-0">
            <div className="w-full aspect-[3/4] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
              <BookIcon size={80} className="opacity-50" />
            </div>
            <div className="w-full space-y-3">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-sm font-medium">
                <span className="text-slate-500 dark:text-slate-400">Available copies</span>
                <span className={`text-lg font-bold ${book.availableQuantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {book.availableQuantity > 0 ? book.availableQuantity : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-6">
            <div className={`px-4 py-3 rounded-xl text-sm font-bold flex flex-col gap-1 ${activeIssuesCount < 3 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30'}`}>
               <div>Status: {activeIssuesCount < 3 ? 'Eligible for Request' : 'Request Blocked (Max 3 books)'}</div>
               {hasUnpaidFines && (
                 <div className="text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-2">
                   Warning: You have overdue books or pending fines.
                 </div>
               )}
            </div>
            <div>
              <div className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider rounded-lg mb-3">
                {book.category || 'Uncategorized'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                {book.title}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-lg text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <User size={20} className="text-slate-400" />
                  {book.author}
                </span>
                {reviews.length > 0 && (
                   <>
                      <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                      <span className="flex items-center gap-1">
                        <Star size={18} className="fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-900 dark:text-white">{averageRating}</span>
                        <span className="text-sm text-slate-500">({reviews.length} reviews)</span>
                      </span>
                   </>
                )}
              </div>
            </div>
            
            <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ISBN</p>
                <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                  <Hash size={16} className="text-slate-400" />
                  {book.isbn}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Copies</p>
                <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                  <Layers size={16} className="text-slate-400" />
                  {book.totalQuantity}
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-4">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Description</h3>
               <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                 {book.description || "No description available for this book."}
               </p>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center gap-4">
              {book.availableQuantity > 0 ? (
                <button 
                  onClick={handleIssueRequest}
                  disabled={processing || activeIssuesCount >= 3}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  title={activeIssuesCount >= 3 ? "Max 3 books limit reached" : ""}
                >
                  {processing ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <BookmarkPlus size={20} />
                      <span>Request Issue</span>
                    </>
                  )}
                </button>
              ) : (
                <>
                <button 
                  onClick={hasReserved ? cancelReservation : reserveBook}
                  disabled={isReserving}
                  className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${hasReserved ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800' : 'bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600'}`}
                >
                  {isReserving ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <BookmarkPlus size={20} />
                      <span>{hasReserved ? 'Cancel Reservation' : 'Reserve Book'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={toggleSubscription}
                  disabled={isSubscribing}
                  className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${hasSubscribed ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'}`}
                >
                  {isSubscribing ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <MessageSquare size={20} />
                      <span>{hasSubscribed ? 'Subscribed to Notifications' : 'Notify Me When Available'}</span>
                    </>
                  )}
                </button>
                </>
              )}
              {waitingQueueSize > 0 && book.availableQuantity <= 0 && (
                <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {waitingQueueSize} person(s) currently waiting
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Reviews & Ratings</h2>
          
          {hasBorrowed && !myReview && currentUser && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl mb-8 shadow-sm">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Write a Review</h3>
               <form onSubmit={handleSubmitReview} className="space-y-4">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            size={28}
                            className={`${(hoveredRating || reviewRating) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'} transition-colors`}
                          />
                        </button>
                      ))}
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Comment</label>
                    <textarea 
                      required 
                      value={reviewText} 
                      onChange={e => setReviewText(e.target.value)} 
                      rows={4} 
                      placeholder="Share your thoughts about this book..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white resize-none" 
                    />
                 </div>
                 <button 
                    disabled={submittingReview || reviewRating === 0} 
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Post Review'}
                 </button>
               </form>
            </div>
          )}

          {reviews.length > 0 ? (
            <div className="grid gap-4">
              {reviews.map(review => (
                <div key={review.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {review.userName ? review.userName.substring(0, 2).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{review.userName}</p>
                        <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(star => (
                          <Star key={star} size={16} className={star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700 fill-slate-300 dark:fill-slate-700'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed text-slate-500">
               <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
               <p>No reviews yet. {hasBorrowed ? 'Be the first to share your thoughts!' : 'Borrow this book to leave a review.'}</p>
            </div>
          )}
        </div>

        {relatedBooks.length > 0 && (
          <div className="mt-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Related Books</h2>
              <select
                value={relatedSortBy}
                onChange={(e) => setRelatedSortBy(e.target.value as 'popularity' | 'title')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm rounded-xl px-4 py-2 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="popularity">Sort by Popularity</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {sortedRelatedBooks.map(relatedBook => (
                <Link key={relatedBook.id} to={`/book/${relatedBook.id}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-all flex items-start gap-4 h-full cursor-pointer">
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <BookIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 mb-1">{relatedBook.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{relatedBook.author}</p>
                    <p className="text-xs font-semibold mt-2 text-blue-600 dark:text-blue-400">{relatedBook.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
