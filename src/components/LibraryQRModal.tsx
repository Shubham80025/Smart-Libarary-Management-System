import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'react-qr-code';
import { Download, X, UserRound } from 'lucide-react';

export default function LibraryQRModal({ 
   isOpen, 
   onClose, 
   userData, 
   membership, 
   qrText 
}: { 
   isOpen: boolean, 
   onClose: () => void, 
   userData: any, 
   membership: any, 
   qrText: string 
}) {
  return (
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-[600px] rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col md:flex-row"
            >
               <div className="absolute top-4 right-4 z-10 md:text-gray-500 text-white md:bg-white/10">
                 <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full text-slate-700 dark:text-white transition-colors">
                   <X size={18} />
                 </button>
               </div>

               {/* Student Details Panel */}
               <div className="p-8 bg-blue-600 dark:bg-blue-900 text-white flex-1 flex flex-col justify-center items-center text-center">
                  {userData?.photoURL ? (
                    <img src={userData.photoURL} alt="Student" className="w-24 h-24 rounded-full border-4 border-white/20 object-cover shadow-md mb-4" />
                  ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-white/20 bg-blue-500 flex items-center justify-center font-bold text-3xl text-white shadow-md mb-4">
                      <UserRound size={40} />
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-bold mb-1">{membership?.name}</h3>
                  <div className="flex gap-2 items-center justify-center mb-6 flex-wrap">
                    <span className="px-3 py-1 rounded-md text-xs uppercase font-bold tracking-wider bg-white/20">{userData?.registrationNumber || 'N/A'}</span>
                    <span className="px-3 py-1 rounded-md text-xs uppercase font-bold tracking-wider bg-black/20">{userData?.branch || 'N/A'}</span>
                  </div>
                  
                  <p className="text-blue-200 text-sm opacity-90 max-w-[200px]">Use this QR code for fast identification at the library desk.</p>
               </div>
               
               {/* QR Code Panel */}
               <div className="p-8 flex flex-col items-center justify-center bg-white dark:bg-slate-900 flex-1">
                  <div id="large-qr-code" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 inline-block mb-6">
                    <QRCode
                      value={qrText}
                      size={200}
                      bgColor="#FFFFFF"
                      fgColor="#1e3a8a"
                      level="Q"
                    />
                  </div>
                  
                  <button 
                      onClick={() => {
                        const svg = document.getElementById('large-qr-code')?.querySelector('svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('styled_context') || canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            if(ctx) {
                                (ctx as CanvasRenderingContext2D).fillStyle = "white";
                                (ctx as CanvasRenderingContext2D).fillRect(0, 0, canvas.width, canvas.height);
                                (ctx as CanvasRenderingContext2D).drawImage(img, 0, 0);
                            }
                            const a = document.createElement('a');
                            a.download = `QR-${userData?.registrationNumber || 'ID'}.png`;
                            a.href = canvas.toDataURL('image/png');
                            a.click();
                          };
                          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                        }
                      }}
                      className="flex-1 w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                  >
                      <Download size={16} /> QR PNG
                  </button>
                  <button 
                      onClick={() => {
                        const card = document.getElementById('id-card');
                        if (card) {
                           import('html2canvas').then(({default: html2canvas}) => {
                              import('jspdf').then(({default: jsPDF}) => {
                                html2canvas(card, { backgroundColor: null, scale: 3 }).then(canvas => {
                                   const imgData = canvas.toDataURL('image/png');
                                   const pdf = new jsPDF({
                                     orientation: 'landscape',
                                     unit: 'px',
                                     format: [canvas.width, canvas.height]
                                   });
                                   pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                                   pdf.save(`Library-Card-${userData?.registrationNumber || 'ID'}.pdf`);
                                });
                              });
                           });
                        }
                      }}
                      className="flex-1 w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 mt-2"
                  >
                      <Download size={16} /> Card PDF
                  </button>
               </div>
               
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
