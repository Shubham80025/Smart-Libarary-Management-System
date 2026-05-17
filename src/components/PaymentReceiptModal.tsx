import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, CheckCircle } from 'lucide-react';

export default function PaymentReceiptModal({ receiptData, onClose }: { receiptData: any, onClose: () => void }) {
  const handleDownload = () => {
    // Basic text download for receipt
    const text = `
    LIBRARY MANAGEMENT SYSTEM
    -----------------------
    PAYMENT RECEIPT
    
    Transaction ID: ${receiptData.transactionId}
    Order ID: ${receiptData.item.orderId}
    Description: ${receiptData.item.bookName ? 'Library Fine: ' + receiptData.item.bookName : 'Membership Fee'}
    Amount Paid: ₹${receiptData.amount}
    Date: ${new Date(receiptData.date).toLocaleString()}
    
    Thank you for your payment!
    `;
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `receipt_${receiptData.transactionId}.txt`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  return (
    <AnimatePresence>
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 z-10 flex flex-col items-center"
          >
             <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={40} />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful</h2>
             <p className="text-slate-500 mb-6 text-center">Your payment has been verified and recorded.</p>
             
             <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 mb-8 space-y-3">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500">Amount Paid</span>
                   <span className="font-bold text-slate-900 dark:text-white font-mono">₹{receiptData.amount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500">Transaction ID</span>
                   <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">{receiptData.transactionId}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500">Date</span>
                   <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(receiptData.date).toLocaleDateString()}</span>
                </div>
             </div>

             <div className="w-full flex gap-3">
               <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors">
                 Close
               </button>
               <button onClick={handleDownload} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                 <Download size={18} /> Receipt
               </button>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
