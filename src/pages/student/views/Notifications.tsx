import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Bell, CheckCircle2, Info } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';

export default function Notifications({ currentUser }: { currentUser: any }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    // 1. Fetch standard requests (Issue/Return)
    const qReq = query(collection(db, 'requests'), where('userId', '==', currentUser.uid));
    const unsubReq = onSnapshot(qReq, async (snap) => {
      const dataReq = await Promise.all(snap.docs.map(async d => {
        const rData = d.data();
        let title = 'Unknown Book';
        try {
          if (rData.bookId) {
             const bDoc = await getDoc(doc(db, 'books', rData.bookId));
             if (bDoc.exists()) title = bDoc.data().title;
          }
        } catch (e) {}

        let notifTitle = '';
        let message = '';
        if (rData.type === 'Issue') {
          if (rData.status === 'Approved') {
            notifTitle = 'Book Issue Approved';
            message = `Your request for "${title}" has been approved. Please collect it.`;
          } else if (rData.status === 'Rejected') {
            notifTitle = 'Book Issue Rejected';
            message = `Your request for "${title}" has been rejected.`;
          } else if (rData.status === 'Returned') {
            notifTitle = 'Book Returned Successfully';
            message = `Your issued book "${title}" has been returned and completed.`;
          }
        } else if (rData.type === 'Return') {
          if (rData.status === 'Completed' || rData.status === 'Approved') {
            notifTitle = 'Return Approved';
            message = `Your return of "${title}" has been approved.`;
          } else if (rData.status === 'Rejected') {
            notifTitle = 'Return Rejected';
            message = `Your return request for "${title}" has been rejected. Please check with the librarian.`;
          }
        }

        if (!notifTitle) return null;

        return {
          id: d.id,
          title: notifTitle,
          message,
          createdAt: rData.returnDate || rData.issueDate || rData.requestDate || Date.now(),
          read: true // Since these are derived from requests, we could treat them as read or give them a fixed status
        };
      }));

      // 2. Fetch new book requests
      const qNew = query(collection(db, 'newBookRequests'), where('userId', '==', currentUser.uid));
      const unsubNew = onSnapshot(qNew, (snapNew) => {
         const dataNew = snapNew.docs.map(d => {
            const rData = d.data();
            let notifTitle = '';
            let message = '';
            if (rData.status === 'Approved') {
               notifTitle = 'New Book Request Approved';
               message = `Your request for the new book "${rData.bookName}" has been approved.`;
            } else if (rData.status === 'Rejected') {
               notifTitle = 'New Book Request Rejected';
               message = `Your request for the new book "${rData.bookName}" has been rejected.`;
            }

            if (!notifTitle) return null;

            return {
              id: d.id,
              title: notifTitle,
              message,
              createdAt: rData.requestDate || Date.now(),
              read: true
            };
         });

         // Also fetch normal notifications mapping
         const qNotif = query(collection(db, 'notifications'), where('userId', '==', currentUser.uid));
         const unsubNotif = onSnapshot(qNotif, (snapNotif) => {
            const dataNotif = snapNotif.docs.map(d => ({ id: d.id, ...d.data() }));

            const combined = [
                ...dataReq.filter(Boolean), 
                ...dataNew.filter(Boolean),
                ...dataNotif
            ] as any[];
            
            // Deduplicate by message to avoid showing double if both generated and stored exist
            const uniqueNotifs = Array.from(new Map(combined.map(item => [item.message, item])).values());
            
            uniqueNotifs.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
            setNotifications(uniqueNotifs);
         }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'notifications');
         });

         return () => unsubNotif();
      }, (error) => {
         handleFirestoreError(error, OperationType.LIST, 'newBookRequests');
      });

      return () => unsubNew();
    }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'requests');
    });

    return () => unsubReq();
  }, [currentUser]);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Bell size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
        <p>No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white flex items-center">
        <Bell className="mr-3 text-blue-500" /> Notifications
      </h2>
      {notifications.map(notif => (
        <div key={notif.id} className={`p-4 rounded-2xl flex items-start gap-4 border ${notif.read ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50'}`}>
          <div className={`mt-1 rounded-full p-1.5 ${notif.read ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
            <Info size={16} />
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-semibold mb-1 ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{notif.title}</h4>
            <p className="text-xs text-slate-500 mb-2">{notif.message}</p>
            <span className="text-[10px] text-slate-400 font-medium">{new Date(notif.createdAt).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
