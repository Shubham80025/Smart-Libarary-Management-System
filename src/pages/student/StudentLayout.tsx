import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  Book,
  BookMarked,
  Clock,
  Bell,
  MessageSquare,
  LogOut,
  Library,
  Menu,
  X,
  PlusCircle,
  Megaphone,
  CreditCard,
  Scan,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StudentLayout({ currentUser, userRole }: { currentUser: any, userRole: string | null }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const menuItems = [
    { name: 'Home Page', path: '/', icon: Home },
    { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
    { name: 'LibraryMate AI', path: '/student/ai-assistant', icon: MessageSquare },
    { name: 'Membership', path: '/student/membership', icon: CreditCard },
    { name: 'Browse Books', path: '/student/browse', icon: Book },
    { name: 'Scan Book', path: '/student/scan', icon: Scan },
    { name: 'E-Books Library', path: '/student/ebooks', icon: Book },
    { name: 'My Books', path: '/student/my-books', icon: BookMarked },
    { name: 'New Request Book', path: '/student/request-new', icon: PlusCircle },
    { name: 'Study Materials', path: '/student/study-materials', icon: Library },
    { name: 'Notice Board', path: '/student/notice-board', icon: Megaphone },
    { name: 'Notifications', path: '/student/notifications', icon: Bell },
    { name: 'Feedback', path: '/student/feedback', icon: MessageSquare },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center space-x-3 mb-2 shrink-0">
         <div className="w-14 h-14 overflow-hidden flex items-center justify-center rounded-lg bg-white p-0.5 shrink-0 shadow-sm">
          <img src="https://upload.wikimedia.org/wikipedia/en/b/b3/Logo_of_GEC_Gopalganj.png" alt="GEC Gopalganj Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight">{userRole === 'Faculty' ? 'Faculty Panel' : 'Student Panel'}</h1>
          <p className="text-xs text-blue-200 uppercase tracking-widest">{userRole}</p>
        </div>
      </div>
      
      <nav className="flex-1 min-h-0 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/student'}
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <item.icon size={20} className="shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 mt-auto shrink-0 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white h-16 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 overflow-hidden flex items-center justify-center rounded-md bg-white p-0.5 shrink-0 shadow-sm">
            <img src="https://upload.wikimedia.org/wikipedia/en/b/b3/Logo_of_GEC_Gopalganj.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold">{userRole === 'Faculty' ? 'Faculty Panel' : 'Student Panel'}</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -mr-2">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-[100dvh] w-72 bg-slate-950 border-r border-slate-800 flex flex-col z-50 overflow-hidden transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden flex flex-col min-h-screen">
        {/* Topbar (Desktop) */}
        <header className="hidden md:flex h-20 items-center justify-between px-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
          <div>
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-none">Dashboard</h2>
             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Smart Library System</p>
          </div>
          <Link to="profile" className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="text-right flex flex-col items-end">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser?.displayName || 'Student'}</p>
              <p className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-full uppercase tracking-wider mt-0.5">{userRole}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-medium rounded-full flex items-center justify-center text-lg border border-emerald-200 dark:border-emerald-800 shadow-sm relative overflow-hidden">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                currentUser?.displayName?.charAt(0) || 'S'
              )}
            </div>
          </Link>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
