import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Hash, Library, Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'Student' | 'Faculty' | 'Librarian' | 'Admin'>('Student');
  const [branch, setBranch] = useState('CSE');
  const [regNo, setRegNo] = useState('');
  const [faculty, setFaculty] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showResendBtn, setShowResendBtn] = useState(false);

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 7) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(score, 5);
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      setError("A new verification link has been sent to your email.");
      setShowResendBtn(false);
    } catch (e: any) {
      setError(e.message || "Failed to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  const passStrength = getPasswordStrength(password);
  const passStrengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const passStrengthColors = ['bg-slate-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600'];

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setRole('Student');
    setBranch('CSE');
    setRegNo('');
    setFaculty('');
    setAccessCode('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    let accessCodeDocId = '';

    if (!isLogin && (role === 'Admin' || role === 'Librarian')) {
      if (!accessCode.trim()) {
        setError("Access code is required for Admins and Librarians.");
        setLoading(false);
        return;
      }
      try {
        const codeDocRef = doc(db, 'accessCodes', accessCode);
        const codeDoc = await getDoc(codeDocRef);
        
        if (!codeDoc.exists()) {
          setError(`Invalid or unauthorized access code for ${role}.`);
          setLoading(false);
          return;
        }

        const codeData = codeDoc.data();
        if (codeData.role !== role || !codeData.isActive) {
          setError(`Invalid or unauthorized access code for ${role}.`);
          setLoading(false);
          return;
        }
        
        // We will mark the first matching code as used after successful creation
        accessCodeDocId = codeDoc.id;
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'accessCodes');
        setError("Failed to validate access code.");
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        setShowResendBtn(false);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (uDoc.exists()) {
          const uData = uDoc.data();
          const userRole = uData.role;

          if (userRole === 'Student') {
            if (!userCredential.user.emailVerified) {
              setError("Please verify your email first.");
              setShowResendBtn(true);
              await signOut(auth);
              setLoading(false);
              return;
            } else if (uData.isEmailVerified === false) {
              // Now we know they are verified, update the document for the Admin panel to see
              try {
                await updateDoc(doc(db, 'users', userCredential.user.uid), { isEmailVerified: true });
                uData.isEmailVerified = true;
              } catch(e) {}
            }

            if (uData.status === 'pending' || uData.isApproved === false) {
              setError("Your account is pending approval by an admin.");
              await signOut(auth);
              setLoading(false);
              return;
            }
            if (uData.status === 'rejected') {
              setError("Your account request was rejected.");
              await signOut(auth);
              setLoading(false);
              return;
            }
          }

          if (userRole === 'Student' || userRole === 'Faculty') navigate('/student');
          else if (userRole === 'Admin' || userRole === 'Librarian') navigate('/admin');
        }
        handleClose();
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update auth profile
        await updateProfile(user, { displayName: fullName });

        // Save to Firestore
        const userData: any = {
          role,
          name: fullName,
          email,
          createdAt: serverTimestamp(),
        };

        if (role === 'Student') {
          userData.branch = branch;
          userData.registrationNumber = regNo;
          userData.isEmailVerified = false;
          userData.isApproved = false;
          userData.status = 'pending';
        } else {
          userData.faculty = faculty;
        }

        try {
          await setDoc(doc(db, 'users', user.uid), userData);
          
          if (role === 'Admin' || role === 'Librarian') {
            await updateDoc(doc(db, 'accessCodes', accessCodeDocId), {
              isActive: false,
              usedBy: user.uid,
              usedAt: serverTimestamp()
            });
          }
        } catch (dbError) {
          handleFirestoreError(dbError, OperationType.CREATE, `users/${user.uid}`);
        }

        if (role === 'Student') {
          const { sendEmailVerification } = await import('firebase/auth');
          await sendEmailVerification(user);
          await signOut(auth);
          setSuccess("Registration successful! Please check your email and verify your account. It will need admin approval before you can sign in.");
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        } else {
          if (role === 'Faculty') navigate('/student');
          else if (role === 'Admin' || role === 'Librarian') navigate('/admin');
          handleClose();
        }
      }
    } catch (err: any) {
      let errorMessage = err.message || "Failed to authenticate. Please check your credentials.";
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use by another account.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }
      setError(errorMessage);
      if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/wrong-password' && err.code !== 'auth/user-not-found') {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm rounded-xl">
                <p>{error}</p>
                {showResendBtn && (
                   <button 
                     type="button" 
                     onClick={handleResendVerification}
                     className="mt-2 text-xs font-bold underline hover:text-red-700 dark:hover:text-red-300"
                   >
                     Resend Verification Email
                   </button>
                )}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl">
                <p>{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  {/* Role Selection */}
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-6">
                    {['Student', 'Faculty', 'Librarian', 'Admin'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r as any)}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          role === r
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  {role === 'Student' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1">Branch</label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={branch}
                              onChange={(e) => setBranch(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
                              placeholder="e.g. CSE"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1">Reg No</label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={regNo}
                              onChange={(e) => setRegNo(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
                              placeholder="2310xxx"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1">Faculty / Department</label>
                      <div className="relative">
                        <Library className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                          type="text"
                          required
                          value={faculty}
                          onChange={(e) => setFaculty(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
                          placeholder="CS Department"
                        />
                      </div>
                    </div>
                  )}
                  
                  {(role === 'Admin' || role === 'Librarian') && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1">Access Code (Special ID)</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
                          placeholder={`Enter ${role} Code`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 px-1 mt-1">Hint: ADMIN123 or LIB123</p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
                    placeholder="student@gecgopalganj.org"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff w-5 h-5 /> : <Eye w-5 h-5 />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 px-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {!isLogin && password && (
                <div className="px-1 space-y-2 mt-2">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full transition-colors duration-300 ${
                          passStrength >= level ? passStrengthColors[passStrength] : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Password Strength: <span className={passStrength >= 3 ? 'text-green-600' : 'text-orange-500'}>{passStrengthLabels[passStrength]}</span>
                  </p>
                </div>
              )}

              {isLogin && (
                <div className="flex justify-between items-center py-2 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                    <span>Remember me</span>
                  </label>
                  <a href="#" className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:underline">
                    Forgot Password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 mt-4"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{isLogin ? 'Sign In' : 'Create Account'}</span>}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
