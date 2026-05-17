import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import { PlusCircle, Trash2, Edit, FileText, Download, User as UserIcon, BookmarkPlus } from 'lucide-react';
import { auth } from '../../../lib/firebase';

export default function EBooksManagement() {
  const [ebooks, setEbooks] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    title: '', author: '', category: '', branch: '', description: ''
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'ebooks'));
    const unsub = onSnapshot(q, (snap) => {
      setEbooks(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'ebooks');
    });
    return () => unsub();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a PDF file first.');
      return;
    }
    if (file.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are allowed.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('File size must be less than 50MB.');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setErrorMsg('');

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `ebooks/${fileName}`);
      const metadata = { contentType: 'application/pdf' };
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (error) => {
          console.error("Upload error:", error);
          if (error.code?.includes('retry-limit-exceeded')) {
             setErrorMsg('Upload timed out. Is Firebase Storage enabled in your Firebase Console?');
          } else if (error.code?.includes('unauthorized')) {
             setErrorMsg('Permission denied by Firebase Storage rules.');
          } else {
             setErrorMsg(`Failed to upload file: ${error.message}`);
          }
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          try {
            await addDoc(collection(db, 'ebooks'), {
              ...formData,
              fileURL: downloadURL,
              fileName: fileName,
              uploadedBy: auth.currentUser?.uid || 'Admin',
              createdAt: serverTimestamp(),
              downloadCount: 0
            });
            setIsUploading(false);
            setFile(null);
            setFormData({ title: '', author: '', category: '', branch: '', description: '' });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'ebooks');
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.error(error);
      setIsUploading(false);
      setErrorMsg('An unexpected error occurred.');
    }
  };

  const handleDelete = async (ebookId: string, fileName: string) => {
    if (!window.confirm('Are you sure you want to delete this e-book?')) return;
    try {
      const storageRef = ref(storage, `ebooks/${fileName}`);
      await deleteObject(storageRef).catch(e => console.log('File may be already deleted or not found', e));
      await deleteDoc(doc(db, 'ebooks', ebookId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ebooks/${ebookId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Upload E-Book</h2>
        {errorMsg && <div className="p-3 mb-4 bg-rose-50 text-rose-600 rounded-lg text-sm">{errorMsg}</div>}
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Author *</label>
            <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
            <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch (Optional)</label>
            <input type="text" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white resize-none" rows={2} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">PDF File * (Max 50MB)</label>
            <input required type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
            
            {isUploading && (
              <div className="mt-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </div>
          <div className="md:col-span-2 mt-2">
            <button disabled={isUploading} type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 relative overflow-hidden">
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isUploading ? `Uploading... ${Math.round(progress)}%` : <><PlusCircle size={20}/> Upload E-Book</>}
              </span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-x-auto">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Manage E-Books</h2>
        {ebooks.length === 0 ? (
           <p className="text-slate-500 text-center py-4">No e-books uploaded yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 rounded-tl-xl">Title & Author</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Category</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Stats</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 rounded-tr-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ebooks.map(ebook => (
                <tr key={ebook.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{ebook.title}</p>
                        <p className="text-xs text-slate-500">by {ebook.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                    {ebook.category} {ebook.branch && <span className="opacity-50">/ {ebook.branch}</span>}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <Download size={14} /> {ebook.downloadCount || 0}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                       <a href={ebook.fileURL} target="_blank" rel="noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View">
                         <FileText size={18} />
                       </a>
                       <button onClick={() => handleDelete(ebook.id, ebook.fileName)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Delete">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
