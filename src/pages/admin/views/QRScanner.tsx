import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import toast from 'react-hot-toast';
import { X, CheckCircle, AlertCircle, ScanLine, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function QRScanner() {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scannerRef, setScannerRef] = useState<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize Scanner on mount
    const onScanSuccess = (decodedText: string) => {
       if (decodedText.startsWith('https://library-system.app/student/')) {
          const uid = decodedText.split('/').pop();
          if (uid) fetchStudentDetails(uid);
       } else if (decodedText.includes('[Internal Token:')) {
          const match = decodedText.match(/\[Internal Token:\s*([A-Za-z0-9_-]+)\]/);
          if (match && match[1]) {
             fetchStudentDetails(match[1]);
          } else {
             toast.error('Invalid QR Token format');
          }
       } else {
          try {
             // Fallback for older JSON format
             const data = JSON.parse(decodedText);
             if (data.id) fetchStudentDetailsByMembership(data.id);
          } catch(e) {
             toast.error('Unrecognized QR Code Format');
          }
       }
    };
    
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: {width: 250, height: 250} },
      /* verbose= */ false
    );
    scanner.render(onScanSuccess, (err) => {
       // ignore periodic scan errors
    });
    setScannerRef(scanner);

    return () => {
       if (scanner) {
          scanner.clear().catch(console.error);
       }
    };
  }, []);

  const fetchStudentDetailsByMembership = async (membershipId: string) => {
     setLoading(true);
     try {
       const mDoc = await getDoc(doc(db, 'memberships', membershipId));
       if (mDoc.exists() && mDoc.data().userId) {
          await fetchStudentDetails(mDoc.data().userId);
       } else {
          toast.error("Membership not found");
          setLoading(false);
       }
     } catch (e) {
       toast.error("Error fetching data");
       setLoading(false);
     }
  };

  const fetchStudentDetails = async (uid: string) => {
     setScannedData(uid);
     setLoading(true);
     if (scannerRef) {
        scannerRef.pause(true); // Pause scanning
     }
     try {
        const uDoc = await getDoc(doc(db, 'users', uid));
        if (!uDoc.exists()) throw new Error("Student not found");
        
        const userData = uDoc.data();
        
        // Fetch active Issues
        const reqQ = query(collection(db, 'requests'), where('userId', '==', uid));
        const reqSnap = await getDocs(reqQ);
        const activeIssues = reqSnap.docs.map(d => d.data()).filter((d: any) => d.type === 'Issue' && ['Pending', 'Approved', 'Return Pending'].includes(d.status));
        
        let overdueCount = 0;
        const now = Date.now();
        activeIssues.forEach((issue: any) => {
           if ((issue.status === 'Approved' || issue.status === 'Return Pending') && issue.dueDate && issue.dueDate < now) overdueCount++;
        });

        // Fetch fines
        const fineQ = query(collection(db, 'fines'), where('userId', '==', uid), where('status', '==', 'Unpaid'));
        const fineSnap = await getDocs(fineQ);
        const pendingFines = fineSnap.docs.map(d => d.data());
        const totalFines = pendingFines.reduce((sum, f) => sum + (f.fineAmount || 0), 0);

        setStudentData({
           ...userData,
           uid,
           activeIssuesCount: activeIssues.length,
           overdueCount,
           totalFines,
           pendingFinesCount: pendingFines.length
        });
        toast.success("Student loaded");
     } catch (e: any) {
        toast.error(e.message || "Failed to fetch student details");
        handleFirestoreError(e, OperationType.GET, `users/${uid}`);
        if (scannerRef) scannerRef.resume();
     } finally {
        setLoading(false);
     }
  };

  const handleReset = () => {
     setStudentData(null);
     setScannedData(null);
     if (scannerRef) {
        scannerRef.resume();
     }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ScanLine className="text-blue-500" />
          Library ID Scanner
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Scan student ID card QR code to view their library profile</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Scanner Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               Camera Active
            </h3>
          </div>
          <div id="qr-reader" className="w-full flex-1 min-h-[300px] *:!border-0 *:!shadow-none scanner-wrapper"></div>
          {scannedData && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
               <button onClick={handleReset} className="w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 font-bold rounded-xl transition-colors text-sm">
                  Scan Another Card
               </button>
            </div>
          )}
        </div>

        {/* Student Profile Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col min-h-[400px]">
           {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                 <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                 <p className="text-slate-500 font-medium mt-4">Fetching student data...</p>
              </div>
           ) : studentData ? (
              <div className="p-6 flex flex-col h-full">
                 <div className="flex items-start gap-4 mb-6">
                    {studentData.photoURL ? (
                       <img src={studentData.photoURL} alt={studentData.name} className="w-20 h-20 rounded-2xl object-cover shadow-sm bg-slate-100" />
                    ) : (
                       <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shadow-sm">
                         <UserRound size={32} />
                       </div>
                    )}
                    <div>
                       <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{studentData.name}</h2>
                       <p className="text-slate-500 text-sm font-medium">{studentData.email}</p>
                       <div className="flex gap-2 mt-2">
                         <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                           {studentData.registrationNumber || 'N/A'}
                         </span>
                         <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                           {studentData.branch || 'N/A'}
                         </span>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                       <p className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Active Books</p>
                       <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{studentData.activeIssuesCount} <span className="text-sm font-semibold text-blue-500">/ 3</span></p>
                    </div>
                    <div className={`p-4 rounded-2xl border ${studentData.overdueCount > 0 ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/50' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50'}`}>
                       <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${studentData.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>Overdue Books</p>
                       <p className={`text-2xl font-black ${studentData.overdueCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{studentData.overdueCount}</p>
                    </div>
                 </div>
                 
                 <div className="mt-auto">
                    {studentData.totalFines > 0 ? (
                       <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/20 border-l-4 border-l-rose-500 rounded-xl rounded-l-none">
                          <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400 font-bold">
                             <AlertCircle size={24} />
                             <div>
                               <p>Pending Fines</p>
                               <p className="text-xs opacity-80">{studentData.pendingFinesCount} records</p>
                             </div>
                          </div>
                          <p className="text-2xl font-black text-rose-700 dark:text-rose-300">₹{studentData.totalFines}</p>
                       </div>
                    ) : (
                       <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-l-emerald-500 rounded-xl rounded-l-none text-emerald-700 dark:text-emerald-400 font-bold">
                          <CheckCircle size={24} />
                          <p>No Pending Fines</p>
                       </div>
                    )}
                 </div>
              </div>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                    <ScanLine size={32} className="text-slate-400" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Waiting for Scan</h3>
                 <p className="text-sm text-slate-500 max-w-[250px] mt-2">Point your camera at a student's Library ID Card to view their profile details here.</p>
              </div>
           )}
        </div>
      </div>
      <style>{`
        #qr-reader__dashboard_section_csr span { color: transparent !important; }
        #qr-reader__dashboard_section_csr span a { color: #3b82f6 !important; text-decoration: none; font-weight: bold; }
        #qr-reader__dashboard_section_swaplink { text-decoration: none; font-weight: bold; color: #3b82f6; margin-top: 10px; display: inline-block; }
        #qr-reader__scan_region img { display: none !important; }
        .scanner-wrapper button { background: #3b82f6 !important; color: white !important; font-weight: bold; border-radius: 8px !important; padding: 6px 12px !important; border: none !important; }
      `}</style>
    </div>
  );
}
