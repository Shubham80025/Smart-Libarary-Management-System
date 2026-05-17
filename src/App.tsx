import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import {
  BookOpen, Search, User, History, ShieldAlert,
  Bell, MapPin, Phone, Mail, Menu, X, Library,
  GraduationCap, ArrowRight, Clock, MonitorSmartphone,
  CheckCircle2, Moon, Sun, BookCopy, LogIn, LogOut, LayoutDashboard, Users, UserCog, Send, FileBox, LineChart, FileText
} from 'lucide-react';
import AuthModal from './components/AuthModal';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

// Main Site Components
import MainNavbar from './components/MainNavbar';
import MainFooter from './components/MainFooter';

const HomePage = lazy(() => import('./pages/HomePage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const BookDetailsPage = lazy(() => import('./pages/BookDetailsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/views/Dashboard'));
const BooksManagement = lazy(() => import('./pages/admin/views/BooksManagement'));
const StudentManagement = lazy(() => import('./pages/admin/views/StudentManagement'));
const FacultyManagement = lazy(() => import('./pages/admin/views/FacultyManagement'));
const RequestsManagement = lazy(() => import('./pages/admin/views/RequestsManagement'));
const EBooksManagement = lazy(() => import('./pages/admin/views/EBooksManagement'));
const ReviewManagement = lazy(() => import('./pages/admin/views/ReviewManagement'));
const AccessCodesManagement = lazy(() => import('./pages/admin/views/AccessCodesManagement'));
const MembershipsManagement = lazy(() => import('./pages/admin/views/MembershipsManagement'));
const FeeManagement = lazy(() => import('./pages/admin/views/FeeManagement'));
const QRScanner = lazy(() => import('./pages/admin/views/QRScanner'));

const StudentLayout = lazy(() => import('./pages/student/StudentLayout'));
const StudentDashboard = lazy(() => import('./pages/student/views/StudentDashboard'));
const BrowseBooks = lazy(() => import('./pages/student/views/BrowseBooks'));
const ScanBook = lazy(() => import('./pages/student/views/ScanBook'));
const MyBooks = lazy(() => import('./pages/student/views/MyBooks'));
const EBooksStudent = lazy(() => import('./pages/student/views/EBooksStudent'));
const RequestNewBook = lazy(() => import('./pages/student/views/RequestNewBook'));
const Notifications = lazy(() => import('./pages/student/views/Notifications'));
const Feedback = lazy(() => import('./pages/student/views/Feedback'));
const StudyMaterials = lazy(() => import('./pages/student/views/StudyMaterials'));
const MembershipDetails = lazy(() => import('./pages/student/views/MembershipDetails'));
const AIChatAssistant = lazy(() => import('./pages/student/views/AIChatAssistant'));

const NoticeBoard = lazy(() => import('./pages/student/views/NoticeBoard'));
const NoticesManagement = lazy(() => import('./pages/admin/views/NoticesManagement'));
const UserApprovals = lazy(() => import('./pages/admin/views/UserApprovals'));
const ManageNotes = lazy(() => import('./pages/admin/views/ManageNotes'));

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'Student') {
              if (!user.emailVerified || data.isApproved === false || data.status === 'rejected') {
                await signOut(auth);
                setCurrentUser(null);
                setUserRole(null);
                setLoading(false);
                return;
              }
            }
            setUserRole(data.role);
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">Loading...</div>;
  }

  return (
    <Router>
      <Toaster position="top-center" />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
        <Routes>
          <Route path="/" element={<HomeLayout currentUser={currentUser} userRole={userRole} />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="catalog" element={<CatalogPage currentUser={currentUser} />} />
            <Route path="book/:id" element={<BookDetailsPage currentUser={currentUser} />} />
          </Route>
          
          <Route path="/student" element={<ProtectedRoute currentUser={currentUser} userRole={userRole} allowedRoles={['Student', 'Faculty']}><StudentLayout currentUser={currentUser} userRole={userRole} /></ProtectedRoute>}>
            <Route index element={<StudentDashboard currentUser={currentUser} />} />
            <Route path="profile" element={<ProfilePage currentUser={currentUser} userRole={userRole} />} />
            <Route path="browse" element={<BrowseBooks currentUser={currentUser} />} />
            <Route path="scan" element={<ScanBook currentUser={currentUser} />} />
            <Route path="book/:id" element={<BookDetailsPage currentUser={currentUser} />} />
            <Route path="my-books" element={<MyBooks currentUser={currentUser} />} />
            <Route path="request-new" element={<RequestNewBook currentUser={currentUser} />} />
            <Route path="ebooks" element={<EBooksStudent currentUser={currentUser} />} />
            <Route path="notice-board" element={<NoticeBoard userRole={userRole} />} />
            <Route path="notifications" element={<Notifications currentUser={currentUser} />} />
            <Route path="feedback" element={<Feedback currentUser={currentUser} />} />
            <Route path="study-materials" element={<StudyMaterials currentUser={currentUser} />} />
            <Route path="membership" element={<MembershipDetails currentUser={currentUser} />} />
            <Route path="ai-assistant" element={<AIChatAssistant currentUser={currentUser} />} />
          </Route>

          <Route path="/admin" element={<ProtectedRoute currentUser={currentUser} userRole={userRole} allowedRoles={['Admin', 'Librarian']}><AdminLayout currentUser={currentUser} userRole={userRole} /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<ProfilePage currentUser={currentUser} userRole={userRole} />} />
            <Route path="scanner" element={<QRScanner />} />
            <Route path="books" element={<BooksManagement />} />
            <Route path="ebooks" element={<EBooksManagement />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="faculty" element={<FacultyManagement />} />
            <Route path="requests" element={<RequestsManagement />} />
            <Route path="notices" element={<NoticesManagement currentUser={currentUser} />} />
            <Route path="reviews" element={<ReviewManagement />} />
            <Route path="access-codes" element={<AccessCodesManagement />} />
            <Route path="approvals" element={<UserApprovals />} />
            <Route path="notes" element={<ManageNotes />} />
            <Route path="memberships" element={<MembershipsManagement />} />
            <Route path="fees" element={<FeeManagement />} />
          </Route>

          <Route path="/profile" element={
            !currentUser ? <Navigate to="/" replace /> :
            (userRole === 'Admin' || userRole === 'Librarian') ? <Navigate to="/admin/profile" replace /> :
            <Navigate to="/student/profile" replace />
          } />
          
          <Route path="/my-books" element={
            !currentUser ? <Navigate to="/" replace /> :
            (userRole === 'Admin' || userRole === 'Librarian') ? <Navigate to="/admin/requests" replace /> :
            <Navigate to="/student/my-books" replace />
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function HomeLayout({ currentUser, userRole }: { currentUser: any, userRole: string | null }) {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <MainNavbar currentUser={currentUser} userRole={userRole} isDark={isDark} setIsDark={setIsDark} />
      <Outlet />
      <MainFooter />
    </div>
  );
}

function ProtectedRoute({ children, currentUser, userRole, allowedRoles }: { children: React.ReactNode, currentUser: any, userRole: string | null, allowedRoles: string[] }) {
  if (!currentUser) return <Navigate to="/" replace />;
  if (userRole && !allowedRoles.includes(userRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

