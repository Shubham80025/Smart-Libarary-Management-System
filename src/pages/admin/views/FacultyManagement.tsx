import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', 'in', ['Faculty', 'Librarian', 'Admin']));
    const unsub = onSnapshot(q, (snap) => {
      setFaculty(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string, role: string) => {
    if (role === 'Admin') {
      alert("Cannot delete another Admin from this panel for safety.");
      return;
    }
    if (confirm('Are you sure you want to remove this staff access?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `users/${id}`);
      }
    }
  };

  const filtered = faculty.filter(f => 
    f.name?.toLowerCase().includes(searchTerm.toLowerCase()) && f.role !== 'Student'
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white">Staff Directory</h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Manage Librarians and Faculty</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search Name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white min-w-[200px]"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Info</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Role</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Department</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(staff => (
              <tr key={staff.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4">
                  <p className="font-semibold text-slate-900 dark:text-white">{staff.name}</p>
                  <p className="text-xs text-slate-500">{staff.email}</p>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide
                    ${staff.role === 'Admin' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}
                  `}>
                    {staff.role}
                  </span>
                </td>
                <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">{staff.faculty || '-'}</td>
                <td className="p-4 text-right">
                  {staff.role !== 'Admin' && (
                    <button onClick={() => handleDelete(staff.id, staff.role)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">No staff found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
