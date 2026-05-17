import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Hash, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

interface AccessCode {
  id: string;
  code: string;
  role: string;
  isActive: boolean;
  createdAt: any;
}

export default function AccessCodesManagement() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Librarian'>('Librarian');
  const [addingCode, setAddingCode] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'accessCodes'));
    const unsub = onSnapshot(q, (snap) => {
      const data: AccessCode[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AccessCode[];
      
      // Sort by createdAt descending
      data.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
      });

      setCodes(data);
      setLoading(false);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'accessCodes');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(result);
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode) return;
    setAddingCode(true);
    try {
      const newDocRef = doc(db, 'accessCodes', newCode);
      await setDoc(newDocRef, {
        code: newCode,
        role: newRole,
        isActive: true,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewCode('');
      setNewRole('Librarian');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'accessCodes');
    } finally {
      setAddingCode(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'accessCodes', id), {
        isActive: !currentStatus
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `accessCodes/${id}`);
    }
  };

  const deleteCode = async () => {
    if (!codeToDelete) return;
    try {
      await deleteDoc(doc(db, 'accessCodes', codeToDelete));
      setCodeToDelete(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `accessCodes/${codeToDelete}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading access codes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Hash className="w-6 h-6 text-blue-600" />
            Access Codes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage special IDs for Admin & Librarian signup</p>
        </div>
        <button
          onClick={() => { setIsModalOpen(true); generateRandomCode(); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Code</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Code</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Role</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-300 select-all font-semibold">
                      {c.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      c.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {c.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(c.id, c.isActive)}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        c.isActive 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {c.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{c.isActive ? 'Active' : 'Disabled'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setCodeToDelete(c.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      title="Delete Code"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No access codes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Generate Access Code</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCode} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Code</label>
                <div className="flex gap-2">
                   <input
                     type="text"
                     value={newCode}
                     onChange={(e) => setNewCode(e.target.value)}
                     className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white font-mono"
                     required
                   />
                   <button
                     type="button"
                     onClick={generateRandomCode}
                     className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium text-sm"
                   >
                     Regen
                   </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
                >
                  <option value="Librarian">Librarian</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCode || !newCode}
                  className="flex-1 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {addingCode ? 'Saving...' : 'Save Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {codeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 text-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Access Code?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to delete this access code? This won't affect existing users but prevents new signups.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCodeToDelete(null)}
                className="flex-1 py-2.5 font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteCode}
                className="flex-1 py-2.5 font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
