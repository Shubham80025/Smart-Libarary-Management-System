import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { BookMarked, History, Clock, ArrowRight, Camera, Edit2, Check, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import toast from 'react-hot-toast';

export default function ProfilePage({ currentUser, userRole }: { currentUser: any, userRole: string | null }) {
  const [userData, setUserData] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editRegNo, setEditRegNo] = useState('');
  const [editFaculty, setEditFaculty] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch user details
    const fetchUser = async () => {
      const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (uDoc.exists()) {
        const data = uDoc.data();
        setUserData(data);
        setEditName(data.name || currentUser.displayName || '');
        setEditBranch(data.branch || '');
        setEditRegNo(data.registrationNumber || '');
        setEditFaculty(data.faculty || '');
        setEditPhotoUrl(data.photoURL || currentUser.photoURL || '');
      }
    };
    fetchUser();

    // Watch active requests and issued books
    const q = query(collection(db, 'requests'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const data = await Promise.all(snap.docs.map(async d => {
        const reqData = d.data();
        let bookData = { title: 'Unknown Book', author: '' };
        try {
          const bDoc = await getDoc(doc(db, 'books', reqData.bookId));
          if (bDoc.exists()) bookData = bDoc.data() as any;
        } catch (e) {}
        return { id: d.id, ...reqData, book: bookData } as any;
      }));
      setRequests(data.sort((a,b) => b.requestDate - a.requestDate));
    });

    return () => unsub();
  }, [currentUser]);

  const handleReturnRequest = async (issuedId: string, bookId: string) => {
    try {
      await addDoc(collection(db, 'requests'), {
        userId: currentUser.uid,
        bookId: bookId,
        type: 'Return',
        requestDate: Date.now(),
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      toast.success('Return request submitted.');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'requests');
    }
  };

  if (!currentUser) return null;

  const currentIssues = requests.filter(r => r.type === 'Issue' && r.status === 'Approved');
  const reqHistory = requests.filter(r => r.status !== 'Approved'); // simplified

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        updateProfilePic(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const updateProfilePic = async (dataUrl: string) => {
    setIsSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: dataUrl });
      }
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: dataUrl });
      setUserData((prev: any) => ({ ...prev, photoURL: dataUrl }));
      setEditPhotoUrl(dataUrl);
      toast.success('Profile picture updated successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update profile picture');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updates: any = { name: editName };
      if (editPhotoUrl && editPhotoUrl !== userData?.photoURL && editPhotoUrl !== currentUser.photoURL) {
        updates.photoURL = editPhotoUrl;
      }
      if (userRole === 'Student') {
        if (editBranch) updates.branch = editBranch;
        if (editRegNo) updates.registrationNumber = editRegNo;
      }
      if (userRole === 'Faculty' && editFaculty) updates.faculty = editFaculty;

      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      
      if (auth.currentUser && (editName !== currentUser.displayName || updates.photoURL)) {
        await updateProfile(auth.currentUser, { 
           displayName: editName,
           ...(updates.photoURL && { photoURL: updates.photoURL })
        });
      }

      setUserData((prev: any) => ({ ...prev, ...updates }));
      setIsEditing(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}`);
      toast.error('Failed to update profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pt-24 pb-20 min-h-[85vh] bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">My Dashboard</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm sticky top-28 relative">
               
               {/* Edit / Save Button */}
               <button 
                 onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                 disabled={isSaving}
                 className="absolute top-6 right-6 p-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-10 disabled:opacity-50"
               >
                 {isSaving ? <Loader2 size={16} className="animate-spin" /> : (isEditing ? <Check size={16} className="text-emerald-500" /> : <Edit2 size={16} />)}
               </button>

               {/* Profile Picture */}
               <div className="relative w-24 h-24 mb-4 mx-auto md:mx-0">
                 <div className="w-full h-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-4xl font-bold overflow-hidden shadow-sm border border-emerald-200 dark:border-emerald-800">
                   {userData?.photoURL || currentUser?.photoURL ? (
                     <img src={userData?.photoURL || currentUser?.photoURL} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     userData?.name?.charAt(0) || currentUser?.displayName?.charAt(0) || 'U'
                   )}
                 </div>
                 
                 {isEditing && (
                   <label className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-md transition-colors border-2 border-white dark:border-slate-900">
                     <Camera size={14} />
                     <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving} />
                   </label>
                 )}
               </div>

               {/* User Info Fields */}
               {isEditing ? (
                 <div className="space-y-4 mb-6">
                   <div>
                     <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
                     <input 
                       type="text" 
                       value={editName} 
                       onChange={e => setEditName(e.target.value)}
                       className="w-full px-3 py-1.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                     />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Photo URL (Optional)</label>
                     <input 
                       type="url" 
                       value={editPhotoUrl} 
                       onChange={e => setEditPhotoUrl(e.target.value)}
                       placeholder="https://example.com/photo.jpg"
                       className="w-full px-3 py-1.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                     />
                   </div>
                   <div className="text-sm text-slate-500 break-all">{userData?.email}</div>
                 </div>
               ) : (
                 <div className="mb-6 text-center md:text-left">
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white">{userData?.name || currentUser?.displayName}</h2>
                   <p className="text-slate-500">{userData?.email}</p>
                 </div>
               )}
               
               <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                 <div>
                   <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</p>
                   <p className="font-medium text-slate-800 dark:text-slate-200">{userRole}</p>
                 </div>
                 {userRole === 'Student' && (
                   <>
                     <div>
                       <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reg Number</p>
                       {isEditing ? (
                         <input 
                           type="text" 
                           value={editRegNo} 
                           onChange={e => setEditRegNo(e.target.value)}
                           className="w-full px-3 py-1.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                         />
                       ) : (
                         <p className="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 inline-block px-2 py-0.5 rounded mt-1">{userData?.registrationNumber || '-'}</p>
                       )}
                     </div>
                     <div>
                       <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch</p>
                       {isEditing ? (
                         <input 
                           type="text" 
                           value={editBranch} 
                           onChange={e => setEditBranch(e.target.value)}
                           className="w-full px-3 py-1.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                         />
                       ) : (
                         <p className="font-medium text-slate-800 dark:text-slate-200">{userData?.branch || '-'}</p>
                       )}
                     </div>
                   </>
                 )}
                 {userRole === 'Faculty' && (
                   <div>
                     <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faculty / Dept</p>
                     {isEditing ? (
                       <input 
                         type="text" 
                         value={editFaculty} 
                         onChange={e => setEditFaculty(e.target.value)}
                         className="w-full px-3 py-1.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                       />
                     ) : (
                       <p className="font-medium text-slate-800 dark:text-slate-200">{userData?.faculty || '-'}</p>
                     )}
                   </div>
                 )}
               </div>
            </div>
          </div>

          {/* User Activity */}
          <div className="lg:col-span-2 space-y-8">
             
            {/* Currently Issued Books */}
            <div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                 <BookMarked className="text-blue-600" />
                 <span>Currently Reading</span>
               </h3>
               {currentIssues.length > 0 ? (
                 <div className="grid sm:grid-cols-2 gap-4">
                   {currentIssues.map(issue => (
                     <div key={issue.id} className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-500 border-t border-r border-b border-slate-200 dark:border-slate-800 p-5 rounded-r-2xl rounded-l-md shadow-sm relative overflow-hidden">
                       <h4 className="font-bold text-slate-900 dark:text-white pr-4">{issue.book?.title}</h4>
                       <p className="text-xs text-slate-500 mt-1 mb-4">By {issue.book?.author}</p>
                       
                       <div className="flex items-center justify-between mt-auto">
                          <div className="text-xs font-semibold">
                            <span className="text-slate-400">Due: </span>
                            <span className={issue.dueDate < Date.now() ? "text-rose-500 font-bold" : "text-slate-700 dark:text-slate-300"}>
                              {new Date(issue.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleReturnRequest(issue.id, issue.bookId)}
                            className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Return Book
                          </button>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl p-8 text-center">
                    <p className="text-slate-500 mb-4">You haven't issued any books yet.</p>
                    <Link to="/catalog" className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline">
                      <span>Browse Catalog</span>
                      <ArrowRight size={16} />
                    </Link>
                 </div>
               )}
            </div>

            {/* Request History */}
            <div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                 <History className="text-slate-400" />
                 <span>Request History</span>
               </h3>
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-800/50">
                     <tr>
                       <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Book</th>
                       <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                       <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                       <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     {reqHistory.map(req => (
                       <tr key={req.id} className="border-t border-slate-100 dark:border-slate-800/60">
                         <td className="p-4 font-medium text-slate-900 dark:text-white text-sm">{req.book?.title}</td>
                         <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{req.type}</td>
                         <td className="p-4 text-sm text-slate-500">{new Date(req.requestDate).toLocaleDateString()}</td>
                         <td className="p-4">
                           <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                              req.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              req.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                           }`}>
                             {req.status}
                           </span>
                         </td>
                       </tr>
                     ))}
                     {reqHistory.length === 0 && (
                       <tr><td colSpan={4} className="p-6 text-center text-slate-500 text-sm">No past requests found.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
