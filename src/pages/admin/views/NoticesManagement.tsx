import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Plus, Edit2, Trash2, Megaphone, AlertCircle, Calendar, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function NoticesManagement({ currentUser }: { currentUser: any }) {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'General',
    target: 'All',
    isPublished: false,
    expiryDate: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'notices'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      data.sort((a, b) => b.createdAt - a.createdAt);
      setNotices(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notices');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        target: formData.target,
        isPublished: formData.isPublished,
      };

      if (formData.expiryDate) {
         payload.expiryDate = new Date(formData.expiryDate).getTime();
      }

      if (editingItem) {
        await updateDoc(doc(db, 'notices', editingItem.id), payload);
      } else {
        payload.createdBy = currentUser.uid;
        payload.createdAt = Date.now();
        await addDoc(collection(db, 'notices'), payload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'notices');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this notice permanently?')) {
      try {
        await deleteDoc(doc(db, 'notices', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'notices');
      }
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'notices', id), { isPublished: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notices');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'General',
      target: 'All',
      isPublished: true,
      expiryDate: ''
    });
    setEditingItem(null);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      message: item.message,
      type: item.type,
      target: item.target,
      isPublished: item.isPublished,
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : ''
    });
    setIsModalOpen(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Notice Board Management</h2>
          <p className="text-slate-500">Create and publish announcements.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 font-semibold hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>New Notice</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 font-semibold">Title</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {notices.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                    <p className="text-sm text-slate-500 truncate max-w-xs">{n.message}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      n.type === 'Urgent' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 
                      n.type === 'Event' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 
                      'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                    }`}>
                      {n.type}
                    </span>
                  </td>
                  <td className="p-4">
                     <button onClick={() => togglePublish(n.id, n.isPublished)} className="flex items-center space-x-1">
                        {n.isPublished ? (
                          <span className="flex items-center text-emerald-600 font-medium text-sm"><Eye size={16} className="mr-1"/> Published</span>
                        ) : (
                          <span className="flex items-center text-slate-500 font-medium text-sm"><EyeOff size={16} className="mr-1"/> Draft</span>
                        )}
                     </button>
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 border-l border-slate-100 dark:border-slate-800 flex items-center space-x-2">
                    <button onClick={() => openEdit(n)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(n.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {notices.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No notices created yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
          >
             <div className="p-6">
                <h3 className="text-xl font-bold mb-4">{editingItem ? 'Edit Notice' : 'Create Notice'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Title</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full p-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Message</label>
                    <textarea 
                      required 
                      rows={4}
                      value={formData.message} 
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      className="w-full p-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Type</label>
                      <select 
                        value={formData.type} 
                        onChange={e => setFormData({...formData, type: e.target.value})}
                        className="w-full p-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                      >
                         <option>General</option>
                         <option>Urgent</option>
                         <option>Event</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Target Audience</label>
                      <select 
                        value={formData.target} 
                        onChange={e => setFormData({...formData, target: e.target.value})}
                        className="w-full p-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                      >
                         <option>All</option>
                         <option>Students</option>
                         <option>Faculty</option>
                      </select>
                    </div>
                  </div>
                  <div>
                     <label className="block text-sm font-semibold mb-1">Expiry Date (optional)</label>
                     <input 
                        type="date"
                        value={formData.expiryDate}
                        onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                        className="w-full p-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                     />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                     <input 
                       type="checkbox" 
                       id="publish" 
                       checked={formData.isPublished}
                       onChange={e => setFormData({...formData, isPublished: e.target.checked})}
                       className="w-4 h-4 text-blue-600 rounded border-gray-300"
                     />
                     <label htmlFor="publish" className="font-semibold text-sm">Publish immediately</label>
                  </div>
                  <div className="flex space-x-3 pt-4">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                     <button type="submit" className="flex-1 p-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">Save</button>
                  </div>
                </form>
             </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
