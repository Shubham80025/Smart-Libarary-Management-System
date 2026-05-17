import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, Plus, Edit2, Trash2, X, Upload, Download, Book } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function BooksManagement() {
  const [books, setBooks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '', author: '', category: '', isbn: '', quantity: 1, availableQuantity: 1, dueDate: '', keywords: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'books'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBooks(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'books');
    });
    return () => unsub();
  }, []);

  const openModal = (book: any = null) => {
    if (book) {
      setFormData({
        title: book.title, author: book.author, category: book.category,
        isbn: book.isbn, quantity: book.quantity, availableQuantity: book.availableQuantity, dueDate: book.dueDate || '',
        keywords: book.keywords ? book.keywords.join(', ') : ''
      });
      setEditingId(book.id);
    } else {
      setFormData({ title: '', author: '', category: '', isbn: '', quantity: 1, availableQuantity: 1, dueDate: '', keywords: '' });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const keywordsArray = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);
      const dataToSave = { ...formData, keywords: keywordsArray };
      
      if (editingId) {
        await updateDoc(doc(db, 'books', editingId), dataToSave);
      } else {
        await addDoc(collection(db, 'books'), { ...dataToSave, createdAt: serverTimestamp() });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'books');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        await deleteDoc(doc(db, 'books', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `books/${id}`);
      }
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(books.map(b => ({
      title: b.title,
      author: b.author,
      category: b.category,
      isbn: b.isbn,
      quantity: b.quantity,
      availableQuantity: b.availableQuantity
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books_catalog.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validData = (results.data as any[]).map(row => {
          const normalizedRow: any = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim().toLowerCase().replace(/^\ufeff/, '');
            normalizedRow[cleanKey] = row[key];
          });
          
          return {
            title: normalizedRow.title || normalizedRow['book title'] || '',
            author: normalizedRow.author || '',
            category: normalizedRow.category || normalizedRow.genre || '',
            isbn: normalizedRow.isbn || '',
            quantity: parseInt(normalizedRow.quantity || normalizedRow['total quantity'] || '1') || 1,
            availableQuantity: parseInt(normalizedRow.availablequantity || normalizedRow.available || normalizedRow.quantity || '1') || 1,
          };
        }).filter(row => row.title && row.author);
        
        setImportData(validData);
        setIsImportModalOpen(true);
        if (e.target) e.target.value = '';
      }
    });
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      for (const row of importData) {
        const formData = {
          ...row,
          createdAt: serverTimestamp()
        };
        const newDocRef = doc(collection(db, 'books'));
        batch.set(newDocRef, formData);
      }
      await batch.commit();
      
      setIsImportModalOpen(false);
      setImportData([]);
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'books');
    } finally {
      setLoading(false);
    }
  };

  const filtered = books.filter(b => 
    b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.author?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900 dark:text-white">Books Management</h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Manage the library catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search books..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white min-w-[200px]"
            />
          </div>
          
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button 
              onClick={handleExport}
              title="Export to CSV"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <Download size={18} />
            </button>
            <label 
              title="Import from CSV"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
            >
              <Upload size={18} />
              <input type="file" accept=".csv" className="hidden" onChange={handleImportSelect} disabled={loading} />
            </label>
          </div>

          <button 
            onClick={() => openModal()}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
          >
            <Plus size={18} />
            <span>Add Book</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Title</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Author</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Category</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Due Date</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Available / Total</th>
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(book => {
              const isOutOfStock = book.availableQuantity === 0;
              const availabilityRatio = book.availableQuantity / book.quantity;
              
              return (
              <tr key={book.id} className={`border-b transition-colors group ${isOutOfStock ? 'border-rose-100 dark:border-rose-900/30 bg-rose-50/20 dark:bg-rose-900/10 hover:bg-rose-50/50 dark:hover:bg-rose-900/20' : 'border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isOutOfStock ? 'bg-rose-100 text-rose-500 dark:bg-rose-900/50 dark:text-rose-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      <Book size={20} />
                    </div>
                    <div>
                      <p className={`font-semibold ${isOutOfStock ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{book.title}</p>
                      <p className="text-xs text-slate-500">ISBN: {book.isbn}</p>
                    </div>
                  </div>
                </td>
                <td className={`p-4 ${isOutOfStock ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{book.author}</td>
                <td className={`p-4 ${isOutOfStock ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                   <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${isOutOfStock ? 'bg-slate-200/50 dark:bg-slate-800/50' : 'bg-slate-100 dark:bg-slate-800'}`}>{book.category}</span>
                </td>
                <td className={`p-4 ${isOutOfStock ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                   {book.dueDate ? new Date(book.dueDate).toLocaleDateString() : <span className="text-slate-400 italic text-xs">Not Set</span>}
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1.5 w-32">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-semibold ${isOutOfStock ? 'text-rose-500' : availabilityRatio <= 0.2 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {isOutOfStock ? 'Out of stock' : `${book.availableQuantity} left`}
                      </span>
                      <span className="text-slate-400">{book.quantity} total</span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isOutOfStock ? 'bg-rose-100 dark:bg-rose-950/50' : 'bg-slate-100 dark:bg-slate-800'}`}>
                       <div 
                         className={`h-full rounded-full transition-all duration-500 ${isOutOfStock ? 'bg-rose-500' : availabilityRatio <= 0.2 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                         style={{ width: `${availabilityRatio * 100}%` }}
                       />
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => openModal(book)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(book.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors ml-2">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            )})}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No books found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Book' : 'Add New Book'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                 <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Book Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Author</label>
                  <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Category</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">ISBN</label>
                <input required type="text" value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Keywords (Comma separated)</label>
                <input type="text" value={formData.keywords} onChange={e => setFormData({...formData, keywords: e.target.value})} placeholder="e.g. data structures, algorithms, c++" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Due Date (For Borrowed Books)</label>
                <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Total Quantity</label>
                  <input required type="number" min="1" value={formData.quantity} onChange={e => {
                    const q = parseInt(e.target.value) || 1;
                    setFormData({...formData, quantity: q, availableQuantity: q});
                  }} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Available</label>
                  <input type="number" disabled value={formData.availableQuantity} className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 opacity-70 rounded-xl text-sm text-slate-900 dark:text-white cursor-not-allowed" />
                </div>
              </div>
              <button disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold mt-4 transition-colors">
                {loading ? 'Saving...' : 'Save Book'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Import Preview Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
               <div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Import Books Preview</h3>
                 <p className="text-sm text-slate-500">{importData.length} books ready to import</p>
               </div>
               <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                 <X size={20} />
               </button>
            </div>
            <div className="p-0 overflow-auto flex-1 custom-scrollbar">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
                     <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                     <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Author</th>
                     <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                     <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Qty</th>
                   </tr>
                 </thead>
                 <tbody>
                   {importData.map((row, idx) => (
                     <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                       <td className="p-4 text-sm text-slate-900 dark:text-white font-medium">{row.title}</td>
                       <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{row.author}</td>
                       <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                         {row.category ? <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">{row.category}</span> : <span className="text-slate-400 italic text-xs">None</span>}
                       </td>
                       <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{row.quantity}</td>
                     </tr>
                   ))}
                   {importData.length === 0 && (
                     <tr>
                       <td colSpan={4} className="p-8 text-center text-slate-500">No valid books found in the CSV.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
               <button 
                 onClick={() => setIsImportModalOpen(false)}
                 disabled={loading}
                 className="px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleConfirmImport}
                 disabled={loading || importData.length === 0}
                 className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
               >
                 {loading ? 'Importing...' : `Import ${importData.length} Books`}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
