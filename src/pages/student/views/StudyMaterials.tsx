import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import { Search, Upload, Filter, FileText, Download, User as UserIcon, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

const getFileIcon = (fileName: string) => {
  if (!fileName) return <FileText size={24} />;
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return <FileText size={24} className="text-red-500" />;
    case 'doc':
    case 'docx': return <FileText size={24} className="text-blue-500" />;
    case 'ppt':
    case 'pptx': return <FileText size={24} className="text-orange-500" />;
    default: return <FileText size={24} />;
  }
};

export default function StudyMaterials({ currentUser }: { currentUser: any }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    branch: 'CSE',
    subject: '',
    file: null as File | null
  });

  const branches = ['All', 'CSE', 'Civil', 'Mechanical', 'Electrical', 'EE', 'ECE'];
  
  // Get dynamic subjects from notes mapping
  const allSubjects = Array.from(new Set(notes.map(n => n.subject).filter(Boolean)));

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'notes')), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setNotes(data.filter(n => n.status === 'approved' || n.status === undefined)); // Assuming we want some approval flow, but for now show all or approved. Let's just show all for simplicity, or make default 'approved'. Let's use status 'approved'.
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });
    return () => unsub();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type. Only PDF, DOC, and PPT are allowed.");
        setFormData({ ...formData, file: null });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File is too large. Maximum size is 10MB.");
        setFormData({ ...formData, file: null });
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !currentUser) return;

    // Check for duplicate title
    const duplicate = notes.some(n => n.title.toLowerCase() === formData.title.toLowerCase() && n.subject.toLowerCase() === formData.subject.toLowerCase());
    if (duplicate) {
      toast.error("A note with this title and subject already exists.");
      return;
    }

    setUploading(true);
    const storageRef = ref(storage, `notes/${Date.now()}_${formData.file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, formData.file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error: ", error);
        if (error.code?.includes('retry-limit-exceeded')) {
           toast.error("Upload timed out. Is Firebase Storage enabled in your Firebase Console?");
        } else if (error.code?.includes('unauthorized')) {
           toast.error("Permission denied by Firebase Storage rules.");
        } else {
           toast.error(`Failed to upload file: ${error.message}`);
        }
        setUploading(false);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'notes'), {
            title: formData.title,
            description: formData.description,
            branch: formData.branch,
            subject: formData.subject,
            fileURL: downloadURL,
            fileName: formData.file?.name,
            uploadedBy: currentUser.uid,
            uploaderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
            createdAt: serverTimestamp(),
            downloadsCount: 0,
            status: 'pending' // Admin approval required
          });
          toast.success("Notes uploaded successfully! Waiting for admin approval.");
          setShowUploadModal(false);
          setFormData({ title: '', description: '', branch: 'CSE', subject: '', file: null });
          setUploadProgress(0);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'notes');
        } finally {
          setUploading(false);
        }
      }
    );
  };

  const handleDownload = async (note: any) => {
    try {
      // Increment download count
      const noteRef = doc(db, 'notes', note.id);
      await updateDoc(noteRef, { downloadsCount: increment(1) });
      window.open(note.fileURL, '_blank');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `notes/${note.id}`);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || n.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === 'All' || n.branch === branchFilter;
    const matchesSubject = subjectFilter === 'All' || n.subject === subjectFilter;
    return matchesSearch && matchesBranch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search notes..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto overflow-x-auto">
          <div className="relative min-w-[150px]">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <select 
               value={branchFilter}
               onChange={e => setBranchFilter(e.target.value)}
               className="w-full pl-9 pr-8 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500 text-sm"
             >
               {branches.map(b => <option key={b} value={b}>{b}</option>)}
             </select>
          </div>
          <div className="relative min-w-[150px]">
             <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <select 
               value={subjectFilter}
               onChange={e => setSubjectFilter(e.target.value)}
               className="w-full pl-9 pr-8 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500 text-sm"
             >
               <option value="All">All Subjects</option>
               {allSubjects.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
             </select>
          </div>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <Upload size={18} />
            <span>Upload Notes</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={note.id} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                {getFileIcon(note.fileName)}
              </div>
              <div className="flex items-center gap-1 text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg text-xs font-medium">
                <Download size={12} />
                <span>{note.downloadsCount || 0}</span>
              </div>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 mb-2 leading-tight">{note.title}</h3>
            {note.description && (
              <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-4">{note.description}</p>
            )}
            
            <div className="mt-auto space-y-4">
               <div className="flex flex-wrap gap-2 text-xs font-semibold">
                 <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md">{note.branch}</span>
                 <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md line-clamp-1">{note.subject}</span>
               </div>
               <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <UserIcon size={14} />
                  <span>{note.uploaderName}</span>
               </div>
               <button 
                 onClick={() => handleDownload(note)}
                 className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700 text-sm"
               >
                 <Download size={18} />
                 Download
               </button>
            </div>
          </motion.div>
        ))}
        {filteredNotes.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
               <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No study materials found</h3>
            <p className="text-slate-500">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Study Material</h3>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Branch</label>
                <select required value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white">
                  {branches.filter(b => b !== 'All').map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                <input required type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" placeholder="e.g. Data Structures" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description (Optional)</label>
                <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none custom-scrollbar text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">File</label>
                <input required type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <p className="text-[10px] text-slate-500 mt-1">Accepts PDF, DOC, PPT up to 10MB.</p>
              </div>
              
              {uploading && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-4 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowUploadModal(false)} disabled={uploading} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={uploading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold text-sm disabled:opacity-50 min-w-[120px]">
                  {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Notes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
