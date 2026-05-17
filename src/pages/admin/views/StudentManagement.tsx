import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, ToggleLeft, ToggleRight, Download } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function StudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Only show active or implicitly active (old) students
    const q = query(collection(db, 'users'), where('role', '==', 'Student'));
    const unsub = onSnapshot(q, (snap) => {
      const allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      // Filter out pending and rejected, assume undefined status is active for backwards compatibility
      setStudents(allStudents.filter(s => s.status !== 'pending' && s.status !== 'rejected'));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsub();
  }, []);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', id), { isActive: !currentStatus });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${id}`);
    }
  };

  const filtered = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white">Student Directory</h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">View and manage registered students</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search Reg No, Name..."
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
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Student Info</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Branch</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Reg. Number</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-right">Access</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(student => {
              const active = student.isActive !== false; // Default true
              return (
              <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                      {student.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">{student.branch || '-'}</td>
                <td className="p-4">
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block text-slate-700 dark:text-slate-300">{student.registrationNumber || '-'}</span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => toggleActive(student.id, active)} className={`flex items-center gap-2 ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'}`}>
                    {active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    <span>{active ? 'Active' : 'Suspended'}</span>
                  </button>
                </td>
              </tr>
            )})}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
