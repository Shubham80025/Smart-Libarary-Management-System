import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen, Search, User, History, ShieldAlert,
  Bell, MapPin, Phone, Mail, Library,
  GraduationCap, ArrowRight, Clock, MonitorSmartphone,
  CheckCircle2, BookCopy, LogIn
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const FadeIn = ({ children, delay = 0, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function HomePage() {
  const quickAccess = [
    { icon: Search, title: "Search Books", desc: "Find resources instantly", color: "text-blue-600 bg-blue-100", darkColor: "dark:bg-blue-900/30 dark:text-blue-400", link: "/catalog" },
    { icon: User, title: "My Account", desc: "Manage your profile", color: "text-emerald-600 bg-emerald-100", darkColor: "dark:bg-emerald-900/30 dark:text-emerald-400", link: "/profile" },
    { icon: History, title: "Issue History", desc: "Track borrowed books", color: "text-purple-600 bg-purple-100", darkColor: "dark:bg-purple-900/30 dark:text-purple-400", link: "/my-books" },
    { icon: LogIn, title: "User Login", desc: "Access your portal", color: "text-rose-600 bg-rose-100", darkColor: "dark:bg-rose-900/30 dark:text-rose-400", action: "login" }
  ];

  const features = [
    { icon: Search, title: "Book Search Workflow", desc: "Quickly locate physical and digital copies across the entire campus library catalog." },
    { icon: BookCopy, title: "Issue/Return System", desc: "Automated tracking of borrowed books with due date reminders and easy renewals." },
    { icon: MonitorSmartphone, title: "Digital Records", desc: "Maintain a seamless digital ledger of all student interactions and reading history." },
    { icon: Bell, title: "Real-time Notifications", desc: "Instant alerts for new arrivals, overdue books, and library policy updates." }
  ];

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Only fetch published notices
    const q = query(collection(db, 'notices'), where('isPublished', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      const now = Date.now();
      snapshot.forEach(doc => {
        const item: any = { id: doc.id, ...doc.data() };
        if (!item.expiryDate || item.expiryDate > now) {
           data.push(item);
        }
      });
      data.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(data);
    }, (error) => {
      console.error(error);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    // Handle scrolling to hash when navigating from another page
    if (window.location.hash) {
      setTimeout(() => {
        const id = window.location.hash.substring(1);
        const elem = document.getElementById(id);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, []);

  const galleryImages = [
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=70", 
    "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=800&q=70", 
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=70", 
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=70", 
  ];

  return (
    <>
      {/* Hero Section */}
      <section id="home" className="relative pt-20 flex items-center min-h-[85vh] lg:min-h-[80vh] bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=60"
            alt="Library background" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-slate-900/80 to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 py-20 pb-32">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center space-x-2 bg-blue-600/30 border border-blue-400/30 text-blue-200 px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <CheckCircle2 size={16} />
              <span>Digital Transformation Era</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6 tracking-tight">
              Welcome to <span className="text-blue-400">Digital Library</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 font-light flex items-center space-x-3">
              <GraduationCap className="text-blue-400" size={28} />
              <span>Government Engineering College, Gopalganj</span>
            </p>
            <p className="text-lg text-slate-400 mb-10 max-w-2xl leading-relaxed">
              Empowering students with seamless access to digital and physical resources. Discover a world of knowledge with our state-of-the-art catalog and automated tracking system.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button onClick={() => document.getElementById('library')?.scrollIntoView({behavior: 'smooth'})} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center space-x-2 group">
                <span>Explore Library</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="relative z-20 container mx-auto px-4 -mt-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {quickAccess.map((item, index) => {
            const Icon = item.icon;
            return (
              <FadeIn key={item.title} delay={index * 0.1}>
                {item.link ? (
                  <Link to={item.link} className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform duration-300 group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${item.color} ${item.darkColor}`}>
                      <Icon size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </Link>
                ) : item.action === 'login' ? (
                  <button onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))} className="w-full text-left block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform duration-300 group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${item.color} ${item.darkColor}`}>
                      <Icon size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </button>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform duration-300 cursor-pointer group">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${item.color} ${item.darkColor}`}>
                      <Icon size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                )}
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* About College Section */}
      <section id="about" className="py-24 bg-white dark:bg-slate-950 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div className="rounded-3xl overflow-hidden shadow-2xl relative">
                <img 
                  src="/campus.jpg" 
                  alt="Government Engineering College, Gopalganj" 
                  className="w-full h-[500px] object-cover" 
                  loading="lazy"
                />
              </div>
            </FadeIn>
            
            <FadeIn delay={0.2}>
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-4 text-sm">
                <GraduationCap size={20} />
                <span>ABOUT OUR INSTITUTION</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                Government Engineering College, Gopalganj
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Government Engineering College, Gopalganj is a reputed technical institute in Bihar focused on quality education, innovation, and holistic development of students. Our mission is to foster engineering excellence.
              </p>
              
              <ul className="space-y-4">
                {[
                  "Established to foster excellent technical education",
                  "Core Branches: Civil, Mechanical, Electrical, and CSE",
                  "State-of-the-art laboratory and expansive campus facilities",
                  "Dedicated placement cell and industry partnerships"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-4">
                    <div className="mt-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full p-1 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* About Library / Features */}
      <section id="library" className="py-24 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">Our Digital Infrastructure</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Transforming traditional reading into a connected digital experience. Our platform simplifies book management and empowers student learning.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <FadeIn key={feature.title} delay={idx * 0.1}>
                  <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-8 rounded-3xl h-full hover:shadow-xl dark:hover:shadow-blue-900/10 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                      <Icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                      {feature.desc}
                    </p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Gallery and Notifications Split */}
      <section className="py-24 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Gallery Section */}
            <div className="lg:col-span-2" id="gallery">
              <FadeIn>
                <div className="flex items-center space-x-3 mb-8">
                  <BookOpen className="text-blue-600 dark:text-blue-400" size={28} />
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Campus Gallery</h2>
                </div>
              </FadeIn>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {galleryImages.map((src, idx) => (
                  <FadeIn key={idx} delay={idx * 0.1}>
                    <div className="relative group rounded-3xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-800">
                      <img 
                        src={src} 
                        alt={`Library Gallery ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Search className="text-white w-8 h-8" />
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>

            {/* Notifications Section */}
            <div className="lg:col-span-1" id="notifications">
              <FadeIn>
                <div className="flex items-center space-x-3 mb-8">
                  <Bell className="text-blue-600 dark:text-blue-400" size={28} />
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Notice Board</h2>
                </div>
              </FadeIn>
              
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-[500px] flex flex-col">
                <div className="overflow-y-auto pr-2 space-y-4 flex-grow custom-scrollbar">
                  {notifications.map((note, idx) => (
                    <FadeIn key={idx} delay={idx * 0.1}>
                      <div className={`p-4 bg-white dark:bg-slate-800 border rounded-2xl shadow-sm hover:shadow-md transition-shadow group ${note.type === 'Urgent' ? 'border-red-200 dark:border-red-900/50' : 'border-slate-100 dark:border-slate-700'}`}>
                        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase mb-2">
                           {note.type === 'Urgent' && <span className="bg-red-100 text-red-600 dark:bg-red-900/30 px-2 py-0.5 rounded mr-2">Urgent</span>}
                           {note.type === 'Event' && <span className="bg-purple-100 text-purple-600 dark:bg-purple-900/30 px-2 py-0.5 rounded mr-2">Event</span>}
                          <Clock size={14} />
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className={`text-sm font-bold mb-1 ${note.type === 'Urgent' ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>{note.title}</h4>
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                          {note.message}
                        </p>
                      </div>
                    </FadeIn>
                  ))}
                  {notifications.length === 0 && (
                     <div className="text-center p-6 text-slate-500">No active notices.</div>
                  )}
                </div>
                <button className="w-full mt-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  View All Notices
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>


    </>
  );
}
