import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Library, Sun, Moon, LogIn, LogOut, Menu, X, User, ShieldAlert } from 'lucide-react';
import AuthModal from './AuthModal';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function MainNavbar({ currentUser, userRole, isDark, setIsDark }: { currentUser: any, userRole: string | null, isDark: boolean, setIsDark: (val: boolean) => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const handleOpenModal = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpenModal);
    return () => window.removeEventListener('open-auth-modal', handleOpenModal);
  }, []);

  const navItems = [
    { label: "Home", href: "" },
    { label: "About College", href: "#about", pathMatches: false },
    { label: "About Us", href: "about" },
    { label: "Library", href: "#library", pathMatches: false },
    { label: "Gallery", href: "#gallery", pathMatches: false },
    { label: "Notifications", href: "#notifications", pathMatches: false },
    { label: "Contact", href: "#contact", pathMatches: false },
  ];

  const getIsActive = (href: string) => {
    if (href === "") return location.pathname === "/";
    if (href.startsWith("#")) return false; // Hash links handled differently if needed
    return location.pathname === `/${href}`;
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // We don't close menu here because desktop doesn't use it, but it's safe to call if we manage it
    
    // If we're already on the home page and clicking a hash link
    if (href.startsWith('#') && location.pathname === '/') {
      e.preventDefault();
      const targetId = href.substring(1);
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
        // Update URL hash without jumping
        window.history.pushState(null, '', `/${href}`);
      }
    } 
    // If clicking Home while already on home page
    else if (href === '' && location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 overflow-hidden flex items-center justify-center rounded-lg bg-white p-0.5">
              <img src="https://upload.wikimedia.org/wikipedia/en/b/b3/Logo_of_GEC_Gopalganj.png" alt="GEC Gopalganj Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">Digital Library</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">GEC GOPALGANJ</p>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            <ul className="flex space-x-6 text-sm font-medium">
              {navItems.map((item) => {
                const isActive = getIsActive(item.href);
                return (
                <li key={item.label}>
                  <Link 
                    to={`/${item.href}`} 
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={`${isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'} transition-colors`}
                  >
                    {item.label}
                  </Link>
                </li>
              )})}
            </ul>
            <div className="flex items-center space-x-4 border-l border-slate-200 dark:border-slate-700 pl-4">
              <button 
                onClick={() => setIsDark(!isDark)} 
                className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              {currentUser ? (
                <div className="flex items-center space-x-4">
                  {(userRole === 'Admin') && (
                    <Link to="/admin" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center space-x-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <ShieldAlert size={18} />
                      <span className="text-sm font-medium">Admin Panel</span>
                    </Link>
                  )}
                  {(userRole === 'Librarian') && (
                    <Link to="/admin" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center space-x-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <ShieldAlert size={18} />
                      <span className="text-sm font-medium">Librarian Panel</span>
                    </Link>
                  )}
                  {(userRole === 'Student') && (
                    <Link to="/student" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center space-x-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <User size={18} />
                      <span className="text-sm font-medium">Student Panel</span>
                    </Link>
                  )}
                  {(userRole === 'Faculty') && (
                    <Link to="/student" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center space-x-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <User size={18} />
                      <span className="text-sm font-medium">Faculty Panel</span>
                    </Link>
                  )}
                  <div className="flex items-center space-x-2 text-sm font-medium text-slate-700 dark:text-slate-200 pl-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      {currentUser.displayName?.charAt(0) || <User size={16} />}
                    </div>
                    <span className="hidden xl:inline-block">{currentUser.displayName || 'User'}</span>
                  </div>
                  <button 
                    onClick={() => { signOut(auth); navigate('/'); }}
                    className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-full font-medium transition-all"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-medium transition-all active:scale-95 shadow-md shadow-blue-600/20"
                >
                  <LogIn size={18} />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center space-x-4 lg:hidden">
            <button onClick={() => setIsDark(!isDark)} className="p-2 text-slate-500 dark:text-slate-400">
              {isDark ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-700 dark:text-slate-200">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <ul className="px-4 py-4 flex flex-col space-y-4 text-center">
                {navItems.map((item) => {
                  const isActive = getIsActive(item.href);
                  return (
                  <li key={item.label}>
                      <Link 
                        to={`/${item.href}`} 
                        onClick={(e) => {
                          setIsMenuOpen(false);
                          handleNavClick(e, item.href);
                        }}
                        className={`block font-medium py-2 rounded-lg ${isActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        {item.label}
                      </Link>
                  </li>
                )})}
                <li className="pt-2">
                  {currentUser ? (
                    <>
                      {(userRole === 'Admin') && (
                        <Link 
                          to="/admin" 
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full flex items-center justify-center space-x-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-5 py-3 rounded-xl font-medium transition-colors mb-2"
                        >
                          <ShieldAlert size={20} />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      {(userRole === 'Librarian') && (
                        <Link 
                          to="/admin" 
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full flex items-center justify-center space-x-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-5 py-3 rounded-xl font-medium transition-colors mb-2"
                        >
                          <ShieldAlert size={20} />
                          <span>Librarian Panel</span>
                        </Link>
                      )}
                      {(userRole === 'Student') && (
                        <Link 
                          to="/student" 
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full flex items-center justify-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-5 py-3 rounded-xl font-medium transition-colors mb-2"
                        >
                          <User size={20} />
                          <span>Student Panel</span>
                        </Link>
                      )}
                      {(userRole === 'Faculty') && (
                        <Link 
                          to="/student" 
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full flex items-center justify-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-5 py-3 rounded-xl font-medium transition-colors mb-2"
                        >
                          <User size={20} />
                          <span>Faculty Panel</span>
                        </Link>
                      )}
                      <button 
                        onClick={() => {
                          signOut(auth);
                          navigate('/');
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center space-x-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-medium transition-colors"
                      >
                        <LogOut size={20} />
                        <span>Logout ({currentUser.displayName || 'User'})</span>
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsAuthModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-medium transition-colors"
                    >
                      <LogIn size={20} />
                      <span>Login or Signup</span>
                    </button>
                  )}
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
