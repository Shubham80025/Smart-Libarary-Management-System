import { Library, Globe, Facebook, Instagram, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MainFooter() {
  return (
    <footer id="contact" className="bg-slate-950 text-slate-300 py-16 border-t border-slate-900">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 border-b border-slate-800 pb-12 mb-8">
          <div className="space-y-6">
             <div className="flex items-center space-x-3 text-white">
                <div className="w-12 h-12 overflow-hidden flex items-center justify-center rounded-lg bg-white p-1">
                  <img src="https://upload.wikimedia.org/wikipedia/en/b/b3/Logo_of_GEC_Gopalganj.png" alt="GEC Gopalganj Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="font-bold text-xl uppercase tracking-widest block">GEC Library</span>
                  <span className="text-xs text-slate-400">GOPALGANJ, BIHAR</span>
                </div>
             </div>
             <p className="text-slate-500 leading-relaxed max-w-sm">
               Empowering the future engineers of Bihar with access to limitless knowledge and global research.
             </p>
             <div className="flex space-x-4 pt-2">
               <a href="https://www.gecgopalganj.org/" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all" aria-label="Website">
                 <Globe size={18} />
               </a>
               <a href="https://www.facebook.com/p/Government-Engineering-college-Gopalganj-100084583822008/" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-[#1877F2] hover:bg-slate-800 transition-all" aria-label="Facebook">
                 <Facebook size={18} />
               </a>
               <a href="https://www.instagram.com/gecgopalganj/" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-[#E4405F] hover:bg-slate-800 transition-all" aria-label="Instagram">
                 <Instagram size={18} />
               </a>
               <a href="https://in.linkedin.com/school/government-engineering-college-gopalganj-gecg/" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-[#0A66C2] hover:bg-slate-800 transition-all" aria-label="LinkedIn">
                 <Linkedin size={18} />
               </a>
             </div>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-white font-semibold text-lg uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="hover:text-blue-400 transition-colors inline-block">Home</Link></li>
              <li><Link to="/about" className="hover:text-blue-400 transition-colors inline-block">About Us</Link></li>
              <li><a href="#library" className="hover:text-blue-400 transition-colors inline-block">Smart Library</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors inline-block">User Login</a></li>
              <li><Link to="/admin" className="hover:text-blue-400 transition-colors inline-block">Admin Panel</Link></li>
            </ul>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-white font-semibold text-lg uppercase tracking-wider">Services</h4>
            <ul className="space-y-3">
              {['Book Requisition', 'Journal Subscriptions', 'Feedback / Suggestions', 'Library Rules', 'FAQs'].map(link => (
                <li key={link}>
                  <a href="#" className="hover:text-blue-400 transition-colors inline-block">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm">
           <p>© {new Date().getFullYear()} Smart Library Management System. Developed with dedication at Government Engineering College, Gopalganj.</p>
           <div className="mt-4 md:mt-0 flex space-x-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
           </div>
        </div>
      </div>
    </footer>
  );
}
