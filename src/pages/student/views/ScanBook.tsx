import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Book, AlertCircle, BookmarkPlus, Sparkles, Image as ImageIcon, Send, Clock, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, where, addDoc, getDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { analyzeBookImage, chatAboutBook } from '../../../lib/gemini';
import { Content } from '@google/genai';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import Markdown from 'react-markdown';
import toast from 'react-hot-toast';

export default function ScanBook({ currentUser }: { currentUser: any }) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exactMatch, setExactMatch] = useState<any | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<{ title?: string, author?: string } | null>(null);

  // New states for availability, reservations and chat
  const [expectedReturnDate, setExpectedReturnDate] = useState<number | null>(null);
  const [waitingQueueSize, setWaitingQueueSize] = useState<number>(0);
  const [hasReserved, setHasReserved] = useState<boolean>(false);
  const [isReserving, setIsReserving] = useState<boolean>(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Chat states
  const [chatHistory, setChatHistory] = useState<Content[]>([]);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const fetchAvailabilityAndQueue = async (bookId: string) => {
    try {
      // Fetch queue size
      const qRef = query(collection(db, 'reservations'), where('bookId', '==', bookId));
      const qSnap = await getDocs(qRef);
      const waitingDocs = qSnap.docs.filter(d => d.data().status === 'waiting');
      setWaitingQueueSize(waitingDocs.length);
      
      const userRes = waitingDocs.find(d => d.data().userId === currentUser.uid);
      setHasReserved(!!userRes);

      const qSub = query(collection(db, 'subscriptions'), where('bookId', '==', bookId), where('userId', '==', currentUser.uid));
      const snapSub = await getDocs(qSub);
      setHasSubscribed(!snapSub.empty);

      // Fetch issued dates
      const reqRef = query(collection(db, 'requests'), where('bookId', '==', bookId));
      const reqSnap = await getDocs(reqRef);
      let earliestReturn = Infinity;
      reqSnap.forEach(d => {
        const data = d.data();
        if (data.type === 'Issue' && ['Approved', 'Return Pending'].includes(data.status)) {
           if (data.dueDate && data.dueDate < earliestReturn) earliestReturn = data.dueDate;
        }
      });

      if (earliestReturn !== Infinity) setExpectedReturnDate(earliestReturn);
      else setExpectedReturnDate(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      stopCamera();
      setError(null);
      setExactMatch(null);
      setRelatedBooks([]);
      setScanResult(null);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Video play error:", e));
        setIsCameraActive(true);
        setImagePreview(null);
        setError(null);
        setExactMatch(null);
        setRelatedBooks([]);
        setScanResult(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('Could not access camera. Please allow camera permissions or upload an image instead.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImagePreview(dataUrl);
        stopCamera();
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const analyzeImage = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setError(null);
    setExactMatch(null);
    setRelatedBooks([]);
    setScanResult(null);

    try {
      const base64Data = imagePreview.split(',')[1];
      const mimeType = imagePreview.split(';')[0].split(':')[1];
      
      const aiResult = await analyzeBookImage(base64Data, mimeType);
      
      if (!aiResult || !aiResult.identified) {
        setError('Could not identify a book from this image. Try a clearer image of the cover or spine.');
        setIsAnalyzing(false);
        return;
      }

      setScanResult({ title: aiResult.title, author: aiResult.author });

      // Fetch all books for matching
      // Note: For a real large-scale app, we might use a dedicated search service.
      const booksSnapshot = await getDocs(query(collection(db, 'books')));
      const allBooks = booksSnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

      const extractedTitle = (aiResult.title || '').toLowerCase();
      const extractedAuthor = (aiResult.author || '').toLowerCase();
      const extractedKeywords = (aiResult.keywords || []).map((k: string) => k.toLowerCase());

      let foundExact = null;
      let foundRelated: any[] = [];

      for (const book of allBooks) {
        const bookTitle = (book.title || '').toLowerCase();
        const bookAuthor = (book.author || '').toLowerCase();
        const bookCategory = (book.category || '').toLowerCase();

        // Exact match heuristics
        if (extractedTitle && bookTitle.includes(extractedTitle) || extractedTitle.includes(bookTitle)) {
           if (!foundExact) foundExact = book;
        } else {
           // Related match heuristics
           let score = 0;
           if (extractedAuthor && (bookAuthor.includes(extractedAuthor) || extractedAuthor.includes(bookAuthor))) score += 2;
           if (extractedKeywords.some((k: string) => bookTitle.includes(k) || bookCategory.includes(k))) score += 1;
           if (score > 0) foundRelated.push({ book, score });
        }
      }

      setExactMatch(foundExact);
      setRelatedBooks(foundRelated.sort((a, b) => b.score - a.score).map(r => r.book).slice(0, 4));

      if (foundExact) {
        await fetchAvailabilityAndQueue(foundExact.id);
      }

    } catch (err) {
      console.error("Analysis Error:", err);
      setError('An error occurred while analyzing the image.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reserveBook = async () => {
    if (!exactMatch) return;
    setIsReserving(true);
    try {
      await addDoc(collection(db, 'reservations'), {
        bookId: exactMatch.id,
        userId: currentUser.uid,
        status: 'waiting',
        requestDate: Date.now()
      });

      setHasReserved(true);
      setWaitingQueueSize(prev => prev + 1);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reservations');
    } finally {
      setIsReserving(false);
    }
  };

  const cancelReservation = async () => {
    if (!exactMatch) return;
    setIsReserving(true); // Reusing the same loading state
    try {
      const qRef = query(collection(db, 'reservations'), where('bookId', '==', exactMatch.id));
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
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'reservations');
    } finally {
      setIsReserving(false);
    }
  };

  const toggleSubscription = async () => {
    if (!exactMatch) return;
    setIsSubscribing(true);
    try {
      const qSub = query(collection(db, 'subscriptions'), where('bookId', '==', exactMatch.id), where('userId', '==', currentUser.uid));
      const snapSub = await getDocs(qSub);
      
      if (!snapSub.empty) {
         import('firebase/firestore').then(async ({ deleteDoc, doc }) => {
            await deleteDoc(doc(db, 'subscriptions', snapSub.docs[0].id));
            setHasSubscribed(false);
            toast.success("You have unsubscribed from notifications for this book.");
            setIsSubscribing(false);
         });
      } else {
         await addDoc(collection(db, 'subscriptions'), {
           bookId: exactMatch.id,
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

  const handleSendMessage = async (msgText: string) => {
    if (!exactMatch && !scanResult) return;
    const text = msgText.trim();
    if (!text) return;
    
    setIsChatting(true);
    setChatMessage('');
    
    const newHistory = [...chatHistory, { role: 'user', parts: [{ text }] }] as Content[];
    setChatHistory(newHistory);

    try {
       const aiResponse = await chatAboutBook(
         {
            title: exactMatch?.title || scanResult?.title || 'Unknown Book',
            author: exactMatch?.author || scanResult?.author || 'Unknown Author',
            category: exactMatch?.category || 'Unknown Category'
         },
         newHistory,
         text
       );
       setChatHistory([...newHistory, { role: 'model', parts: [{ text: aiResponse }] }]);
    } catch (error) {
       console.error("Chat Error", error);
       setChatHistory([...newHistory, { role: 'model', parts: [{ text: "Sorry, I couldn't fetch a response at the moment." }] }]);
    } finally {
       setIsChatting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl flex items-center justify-center">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Scan a Book</h1>
          <p className="text-slate-500 dark:text-slate-400">Capture or upload an image to find it in the library.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col items-center">
          
          {!isCameraActive && !imagePreview && (
            <div className="w-full aspect-[3/4] sm:aspect-video bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-6 text-center">
               <ImageIcon size={48} className="text-slate-400 mb-4" />
               <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Upload or Capture Book Image</h3>
               <p className="text-sm text-slate-500 mb-6">Take a photo of a book cover, spine, or page to search.</p>
               <div className="flex gap-4">
                 <button onClick={startCamera} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2">
                   <Camera size={18} />
                   <span>Camera</span>
                 </button>
                 <button onClick={triggerFileInput} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold transition-colors flex items-center gap-2">
                   <Upload size={18} />
                   <span>Upload</span>
                 </button>
                 <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
               </div>
            </div>
          )}

          {isCameraActive && (
            <div className="w-full space-y-4">
              <div className="relative w-full aspect-[3/4] sm:aspect-video bg-black rounded-2xl overflow-hidden shadow-inner">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              </div>
              <div className="flex gap-4 justify-center">
                 <button onClick={captureImage} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm">
                   <Camera size={20} />
                   <span>Capture Photo</span>
                 </button>
                 <button onClick={stopCamera} className="px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold transition-colors shadow-sm">
                   Cancel
                 </button>
              </div>
            </div>
          )}

          {imagePreview && (
             <div className="w-full space-y-4">
                <div className="relative w-full aspect-[3/4] sm:aspect-video bg-black rounded-2xl overflow-hidden shadow-inner group">
                   <img src={imagePreview} alt="Captured Book Preview" className="w-full h-full object-contain" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                      <button onClick={() => { setImagePreview(null); setError(null); }} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold backdrop-blur-md transition-colors flex items-center gap-2">
                        <Upload size={18} /> Change Image
                      </button>
                   </div>
                </div>
                <div className="flex gap-4 justify-center">
                   <button 
                     onClick={analyzeImage} 
                     disabled={isAnalyzing}
                     className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                   >
                     {isAnalyzing ? (
                        <>
                           <Sparkles size={20} className="animate-spin text-indigo-300" />
                           <span>Analyzing Image...</span>
                        </>
                     ) : (
                        <>
                           <Sparkles size={20} />
                           <span>Scan & Analyze</span>
                        </>
                     )}
                   </button>
                </div>
             </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle size={20} className="text-rose-500 mt-0.5" />
              <p className="text-rose-700 dark:text-rose-300 text-sm">{error}</p>
            </div>
          )}

          {scanResult && !exactMatch && !error && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl text-center shadow-sm">
              <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/50 text-amber-600 rounded-full flex items-center justify-center mb-3">
                 <AlertCircle size={24} />
              </div>
              <h3 className="font-bold text-amber-900 dark:text-amber-100 text-lg mb-1">Exact Match Not Found</h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                We identified {scanResult.title && <strong className="font-semibold">{scanResult.title}</strong>} 
                {scanResult.author && <span> by <strong className="font-semibold">{scanResult.author}</strong></span>}, 
                but it appears we don't have it in our library.
              </p>
            </div>
          )}

          {exactMatch && (
            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-6 rounded-3xl shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
               <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-4 text-sm">
                 <Sparkles size={16} /> Exact Match Found
               </div>
               <div className="flex gap-4">
                 <div className="w-24 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 shadow-sm border border-slate-200 dark:border-slate-700">
                    {exactMatch.coverUrl ? (
                      <img src={exactMatch.coverUrl} alt={exactMatch.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Book size={32} />
                      </div>
                    )}
                 </div>
                 <div>
                    <h3 className="font-bold text-xl text-slate-900 dark:text-white leading-tight mb-1">{exactMatch.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">{exactMatch.author}</p>
                    <div className="flex items-center gap-3">
                       <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                            exactMatch.availableQuantity > 0 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                            {exactMatch.availableQuantity > 0 ? `${exactMatch.availableQuantity} Available` : 'Currently Unavailable'}
                        </span>
                        <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-lg">
                            {exactMatch.category}
                        </span>
                    </div>

                    {exactMatch.availableQuantity === 0 && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm">
                         <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold mb-1">
                           <Clock size={16} /> Expected Return: {expectedReturnDate ? new Date(expectedReturnDate).toLocaleDateString() : 'Unknown'}
                         </div>
                         <div className="text-amber-700 dark:text-amber-300 mb-3">{waitingQueueSize} people already waiting</div>
                         
                         {hasReserved ? (
                           <button 
                             onClick={cancelReservation}
                             disabled={isReserving}
                             className="w-full px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 disabled:opacity-50 disabled:bg-slate-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-400 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mb-2"
                           >
                             {isReserving ? 'Cancelling...' : 'Cancel Reservation'}
                           </button>
                         ) : (
                           <button 
                             onClick={reserveBook}
                             disabled={isReserving}
                             className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:bg-slate-400 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mb-2"
                           >
                             {isReserving ? 'Reserving...' : 'Reserve Book'}
                           </button>
                         )}
                         <button
                           onClick={toggleSubscription}
                           disabled={isSubscribing}
                           className={`w-full px-4 py-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${hasSubscribed ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'}`}
                         >
                           {isSubscribing ? 'Processing...' : hasSubscribed ? 'Subscribed to Notifications' : 'Notify Me When Available'}
                         </button>
                      </div>
                    )}
                    
                    {exactMatch.availableQuantity > 0 && (
                      <button 
                        type="button"
                        onClick={() => navigate(`/student/book/${exactMatch.id}`)}
                        className="mt-4 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl transition-colors hover:bg-slate-800 dark:hover:bg-slate-200"
                      >
                        View Details & Request
                      </button>
                    )}
                 </div>
               </div>
            </div>
          )}

          {/* AI Chat Assistant */}
          {(exactMatch || scanResult) && (
            <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 p-6 rounded-3xl shadow-sm flex flex-col h-[400px]">
               <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                 <Sparkles size={18} /> LibraryMate AI
               </div>
               
               <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
                 {chatHistory.length === 0 ? (
                   <div className="text-center text-slate-500 dark:text-slate-400 my-auto pt-8">
                     <p className="mb-4">Ask me anything about this book!</p>
                     <div className="flex flex-wrap gap-2 justify-center">
                       {['Explain this book', 'Is it good for beginners?', 'What topics does it cover?'].map(q => (
                         <button key={q} onClick={() => handleSendMessage(q)} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                           {q}
                         </button>
                       ))}
                     </div>
                   </div>
                 ) : (
                   chatHistory.map((msg, i) => {
                     // The first two messages are system context we added, so we should skip rendering them
                     if (i < 2 && msg.role !== 'user') {
                       // Actually we inject context as role: user and model.
                       // Let's just filter out the artificial context by checking text
                       const isContext = msg.parts[0]?.text?.startsWith('Context: You are answering about');
                       const isAck = msg.parts[0]?.text?.startsWith('I understand. I am ready');
                       if (isContext || isAck) return null;
                     }
                     return (
                       <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                           msg.role === 'user' 
                             ? 'bg-blue-600 text-white rounded-tr-sm' 
                             : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                         }`}>
                           <Markdown>{msg.parts[0].text}</Markdown>
                         </div>
                       </div>
                     );
                   })
                 )}
                 {isChatting && (
                   <div className="flex justify-start">
                     <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm p-3 flex gap-1 items-center">
                       <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                       <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                       <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                     </div>
                   </div>
                 )}
                 <div ref={chatEndRef} />
               </div>

               <div className="relative">
                 <input 
                   type="text" 
                   value={chatMessage}
                   onChange={e => setChatMessage(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSendMessage(chatMessage)}
                   placeholder="Ask about the book..."
                   disabled={isChatting}
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
                 />
                 <button 
                   onClick={() => handleSendMessage(chatMessage)}
                   disabled={isChatting || !chatMessage.trim()}
                   className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg transition-colors"
                 >
                   <Send size={16} />
                 </button>
               </div>
            </div>
          )}

          {relatedBooks.length > 0 && (
            <div>
               <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Suggested Books</h3>
               <div className="grid gap-3">
                 {relatedBooks.map(book => (
                   <div key={book.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex gap-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/student/book/${book.id}`)}>
                      <div className="w-16 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 shadow-sm">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Book size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                         <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{book.title}</h4>
                         <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{book.author}</p>
                         <span className={`self-start px-2 py-0.5 text-[10px] font-bold rounded border ${
                              book.availableQuantity > 0 
                                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:bg-emerald-900/20' 
                                  : 'border-rose-200 text-rose-700 bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:bg-rose-900/20'
                          }`}>
                              {book.availableQuantity > 0 ? 'Available' : 'Out of Stock'}
                          </span>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {!isAnalyzing && !exactMatch && relatedBooks.length === 0 && !error && !scanResult && (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed text-slate-400 dark:text-slate-500">
                <Sparkles size={48} className="mb-4 opacity-50" />
                <p>Upload an image to identify the book and discover related suggestions from our library.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
