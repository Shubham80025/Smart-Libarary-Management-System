import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import { Search, FileText, Download, CheckCircle, XCircle, Trash2, ShieldCheck } from 'lucide-react';

const getFileIcon = (fileName: string) => {
  if (!fileName) return <FileText size={16} />;
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return <FileText size={16} className="text-red-500" />;
    case 'doc':
    case 'docx': return <FileText size={16} className="text-blue-500" />;
    case 'ppt':
    case 'pptx': return <FileText size={16} className="text-orange-500" />;
    default: return <FileText size={16} />;
  }
};

export default function ManageNotes() {
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'notes')), (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });
    return () => unsub();
  }, []);

  const handleApprove = async (note: any) => {
    setLoadingAction(note.id);
    try {
      await updateDoc(doc(db, 'notes', note.id), { status: 'approved' });
      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'notifications'), {
        userId: note.uploadedBy,
        title: 'Note Approved',
        message: `Your study material "${note.title}" has been approved.`,
        read: false,
        createdAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `notes/${note.id}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async (note: any) => {
    setLoadingAction(note.id);
    try {
      await updateDoc(doc(db, 'notes', note.id), { status: 'rejected' });
      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'notifications'), {
        userId: note.uploadedBy,
        title: 'Note Rejected',
        message: `Your study material "${note.title}" was rejected.`,
        read: false,
        createdAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `notes/${note.id}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete these notes?')) {
      setLoadingAction(id);
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `notes/${id}`);
      } finally {
        setLoadingAction(null);
      }
    }
  };

  const filtered = notes.filter(n => 
    n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.uploaderName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <FileText size={20} className="text-indigo-500" />
             Manage Study Materials
           </h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Review, approve, and manage uploaded notes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white min-w-[250px]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Note Details</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Branch/Subject</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Uploader</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(note => (
              <tr key={note.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-white line-clamp-1 flex items-center gap-2">
                       {getFileIcon(note.fileName)}
                       {note.title}
                    </span>
                    <a href={note.fileURL} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mt-1 ml-6"><Download size={12}/> View File</a>
                  </div>
                </td>
                <td className="p-4">
                   <div className="flex flex-col gap-1">
                     <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{note.subject}</span>
                     <span className="text-xs text-slate-500">{note.branch}</span>
                   </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                     <span className="text-sm text-slate-800 dark:text-slate-200">{note.uploaderName}</span>
                     <span className="text-xs text-slate-500">{new Date(note.createdAt?.seconds * 1000).toLocaleDateString() || 'N/A'}</span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  {note.status === 'approved' ? (
                     <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded text-xs font-semibold">
                       <CheckCircle size={12} /> Approved
                     </span>
                  ) : note.status === 'rejected' ? (
                     <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-1 rounded text-xs font-semibold">
                       <XCircle size={12} /> Rejected
                     </span>
                  ) : (
                     <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded text-xs font-semibold">
                       <ShieldCheck size={12} /> Pending
                     </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {note.status !== 'approved' && (
                       <button onClick={() => handleApprove(note)} disabled={loadingAction === note.id} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded disabled:opacity-50" title="Approve">
                         <CheckCircle size={18} />
                       </button>
                    )}
                    {note.status !== 'rejected' && (
                       <button onClick={() => handleReject(note)} disabled={loadingAction === note.id} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded disabled:opacity-50" title="Reject">
                         <XCircle size={18} />
                       </button>
                    )}
                    <button onClick={() => handleDelete(note.id)} disabled={loadingAction === note.id} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded disabled:opacity-50" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                     <FileText size={24} />
                  </div>
                  <p className="text-slate-500 font-medium">No study materials found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
