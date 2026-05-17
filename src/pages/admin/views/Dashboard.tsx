import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import { 
  Users, UserCheck, BookOpen, BookUp, 
  Clock, AlertCircle, Bookmark, IndianRupee, Activity 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import MostBorrowedBooks from '../../student/views/MostBorrowedBooks';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeMembers: 0,
    totalBooks: 0,
    booksIssued: 0,
    pendingRequests: 0,
    returnRequests: 0,
    overdueBooks: 0,
    totalFines: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'Student')));
        const students = usersSnap.docs.map(d => d.data());
        
        const membershipsSnap = await getDocs(query(collection(db, 'memberships'), where('status', '==', 'active')));
        
        const booksSnap = await getDocs(collection(db, 'books'));
        const books = booksSnap.docs.map(d => d.data());
        const totalBooks = books.reduce((acc, b) => acc + (b.quantity || 0), 0);
        
        const requestsSnap = await getDocs(collection(db, 'requests'));
        const requests = requestsSnap.docs.map(d => d.data());
        
        const finesSnap = await getDocs(collection(db, 'fines'));
        const totalFines = finesSnap.docs.reduce((acc, f) => acc + (f.data().fineAmount || 0), 0);

        setStats({
          totalStudents: students.length,
          activeMembers: membershipsSnap.docs.length,
          totalBooks: totalBooks,
          booksIssued: requests.filter(r => r.type === 'Issue' && (r.status === 'Approved' || r.status === 'Return Pending')).length,
          pendingRequests: requests.filter(r => r.type === 'Issue' && r.status === 'Pending').length,
          returnRequests: requests.filter(r => r.type === 'Return' && r.status === 'Pending').length,
          overdueBooks: requests.filter(r => r.type === 'Issue' && (r.status === 'Approved' || r.status === 'Return Pending') && r.dueDate && r.dueDate < Date.now()).length,
          totalFines: totalFines
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'multiple_collections_stats');
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", path: "/admin/students" },
    { title: "Total Books", value: stats.totalBooks, icon: Bookmark, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30", path: "/admin/books" },
    { title: "Pending Requests", value: stats.pendingRequests, icon: Clock, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", path: "/admin/requests" },
    { title: "Return Requests", value: stats.returnRequests, icon: BookOpen, color: "text-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-900/30", path: "/admin/requests" },
    { title: "Fines Collected", value: `₹${stats.totalFines}`, icon: IndianRupee, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-200 dark:bg-slate-800", path: "/admin/analytics" },
  ];

  return (
    <div className="space-y-8">
      {/* Key Highlights Section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="text-blue-500" size={20} />
          Key Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate('/admin/memberships')}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl text-white shadow-lg shadow-emerald-500/20 cursor-pointer hover:-translate-y-1 transition-transform relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 opacity-10">
              <UserCheck size={120} className="-mr-6 -mt-6" />
            </div>
            <div className="relative z-10">
              <h3 className="text-emerald-100 font-medium mb-1">Active Members</h3>
              <p className="text-4xl font-bold">{stats.activeMembers}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/admin/requests')}
            className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-500/20 cursor-pointer hover:-translate-y-1 transition-transform relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 opacity-10">
              <BookUp size={120} className="-mr-6 -mt-6" />
            </div>
            <div className="relative z-10">
              <h3 className="text-blue-100 font-medium mb-1">Total Books Issued</h3>
              <p className="text-4xl font-bold">{stats.booksIssued}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/admin/requests')}
            className="bg-gradient-to-br from-rose-500 to-red-600 p-6 rounded-3xl text-white shadow-lg shadow-rose-500/20 cursor-pointer hover:-translate-y-1 transition-transform relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 opacity-10">
              <AlertCircle size={120} className="-mr-6 -mt-6" />
            </div>
            <div className="relative z-10">
              <h3 className="text-rose-100 font-medium mb-1">Overdue Books</h3>
              <p className="text-4xl font-bold">{stats.overdueBooks}</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Other Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(stat.path)}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
                <h3 className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <MostBorrowedBooks />
    </div>
  );
}
