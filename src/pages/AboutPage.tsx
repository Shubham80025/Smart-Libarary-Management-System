import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Search, User, CheckCircle2, ShieldAlert, MonitorSmartphone, Bell, Zap, Library, Github, Linkedin, Mail, Code, Layout, Database, Server, Smartphone, ArrowRight, ArrowLeft, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    { icon: <MonitorSmartphone size={24} />, title: 'QR-Based Library ID', desc: 'Secure digital identity card for seamless check-ins.' },
    { icon: <Zap size={24} />, title: 'AI Recommendations', desc: 'Personalized book suggestions powered by Gemini.' },
    { icon: <CheckCircle2 size={24} />, title: 'Payment Gateway', desc: 'Integrated Razorpay for memberships and fines.' },
    { icon: <Bell size={24} />, title: 'Automated Notifications', desc: 'Email alerts for dues, requests, and approvals.' },
    { icon: <BookOpen size={24} />, title: 'Smart Book Requests', desc: 'Streamlined process to issue or return books online.' },
    { icon: <Layout size={24} />, title: 'Real-Time Dashboard', desc: 'Live analytics and records for both students and admins.' },
  ];

  const technologies = [
    { icon: <Code size={24} />, name: 'React.js', role: 'Frontend UI' },
    { icon: <Code size={24} />, name: 'TypeScript', role: 'Type Safety' },
    { icon: <Database size={24} />, name: 'Firebase', role: 'Database & Auth' },
    { icon: <Layout size={24} />, name: 'Tailwind CSS', role: 'Styling' },
    { icon: <Server size={24} />, name: 'Node.js', role: 'Backend Services' },
    { icon: <Zap size={24} />, name: 'Framer Motion', role: 'Animations' },
  ];

  return (
    <div className="flex flex-col font-sans relative">
      {/* Back to Home Button */}
      <div className="absolute top-24 left-4 sm:left-8 z-50">
        <Link to="/" className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg hover:-translate-x-1">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32 bg-slate-900 text-white flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900 to-indigo-900/40"></div>
            <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-blue-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-indigo-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center object-cover opacity-10 mix-blend-overlay"></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 font-medium text-sm mb-6 border border-blue-400/20 backdrop-blur-md">
                <Library size={16} />
                <span>Next-Gen Library Platform</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight mb-8">
                AI-Powered Smart <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 drop-shadow-sm">
                  Library Management System
                </span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-300 leading-relaxed font-light">
                A modern digital library ecosystem designed to automate and simplify traditional library operations using AI-powered features, QR-based digital identity cards, automated notifications, payment gateway integration, analytics, and smart book management.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="py-20 lg:py-28 bg-white dark:bg-slate-950 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Our Vision</h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                    To transform traditional libraries into intelligent digital ecosystems using automation, AI, QR technologies, and smart analytics for a better learning experience.
                  </p>
                </div>
                
                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Our Mission</h2>
                  <ul className="space-y-4">
                    {[
                      'Simplify library operations',
                      'Improve accessibility',
                      'Reduce manual work',
                      'Enhance student experience',
                      'Enable smart digital management'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <CheckCircle2 size={14} />
                        </div>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/10 dark:shadow-blue-900/20 aspect-square md:aspect-auto md:h-full border border-slate-100 dark:border-slate-800"
              >
                <img 
                  src="https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                  alt="Library Vision" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex flex-col justify-end p-8">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                    <p className="text-white font-medium text-lg italic hover:shadow-xl transition-all">"Empowering education through seamless digital experiences."</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Core Features</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">Designed to handle every aspect of library management with efficiency and elegance.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Developers Section */}
        <section className="py-24 bg-white dark:bg-slate-950 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 dark:bg-blue-900/10 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100 dark:bg-indigo-900/10 blur-[100px] rounded-full"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Meet the Developers</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">The minds behind the architecture and UI of the Smart Library Management System.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
              {/* Shubham Kumar */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-[2.5rem] transform rotate-2 opacity-20 group-hover:rotate-3 transition-transform duration-300"></div>
                <div className="relative bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] hover:shadow-2xl hover:shadow-blue-900/10 transition-all z-10">
                  <div className="flex flex-col sm:flex-row gap-8 items-start mb-8">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-indigo-500">
                        <img 
                          src="/assets/123.jpg" 
                          alt="Shubham Kumar" 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://ui-avatars.com/api/?name=Shubham+Kumar&background=3b82f6&color=fff&size=120" }}
                          className="w-full h-full rounded-full object-cover border-4 border-white dark:border-slate-900"
                        />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 p-2 rounded-full border-4 border-white dark:border-slate-900">
                        <Code size={16} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Shubham Kumar</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-full">Frontend</span>
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-full">Backend</span>
                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full">System Architect</span>
                      </div>
                      <div className="flex gap-3 text-slate-400 dark:text-slate-500">
                        <a href="https://github.com/Shubham80025" target="_blank" rel="noopener noreferrer" aria-label="Shubham Kumar's GitHub Profile" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Github size={20} /></a>
                        <a href="https://www.linkedin.com/in/shubh0/" target="_blank" rel="noopener noreferrer" aria-label="Shubham Kumar's LinkedIn Profile" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Linkedin size={20} /></a>
                        <a href="mailto:shubh80025@gmail.com" aria-label="Email Shubham Kumar" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Mail size={20} /></a>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                    Shubham Kumar is the core developer of the Smart Library Management System responsible for designing and developing the frontend, backend architecture, Firebase integration, QR-based digital identity system, payment gateway integration, and intelligent automation features of the platform.
                  </p>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Core Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {['React.js', 'TypeScript', 'Firebase', 'Node.js', 'UI/UX Design', 'AI Integration'].map((skill, idx) => (
                        <span key={idx} className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Navin */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-400 to-purple-600 rounded-[2.5rem] transform -rotate-2 opacity-20 group-hover:-rotate-3 transition-transform duration-300"></div>
                <div className="relative bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] hover:shadow-2xl hover:shadow-indigo-900/10 transition-all z-10 h-full">
                  <div className="flex flex-col sm:flex-row gap-8 items-start mb-8">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500">
                        <img 
                          src="/assets/navin.jpg" 
                          alt="Navin" 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://ui-avatars.com/api/?name=Navin&background=6366f1&color=fff&size=120" }}
                          className="w-full h-full rounded-full object-cover border-4 border-white dark:border-slate-900"
                        />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 p-2 rounded-full border-4 border-white dark:border-slate-900">
                        <Layout size={16} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Navin</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full">Frontend Developer</span>
                      </div>
                      <div className="flex gap-3 text-slate-400 dark:text-slate-500">
                        <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Github size={20} /></a>
                        <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Linkedin size={20} /></a>
                        <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Mail size={20} /></a>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                    Navin contributed to the frontend development and UI enhancement of the Smart Library Management System, focusing on responsive design, modern interfaces, and improving user experience across the platform.
                  </p>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Core Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {['React.js', 'CSS', 'Responsive Design', 'Frontend UI'].map((skill, idx) => (
                        <span key={idx} className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Supervisor Section */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900/50 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest text-sm mb-2 block">Under the Supervision Of</span>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Academic Leadership</h2>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col md:flex-row items-center gap-10"
            >
              <div className="w-40 h-40 flex-shrink-0">
                <img 
                  src="/assets/supervisor.jpg" 
                  alt="Prof. Md Sharique Eliyas" 
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://ui-avatars.com/api/?name=Md+Sharique+Eliyas&background=0f172a&color=fff&size=160" }}
                  className="w-full h-full rounded-2xl object-cover shadow-lg border border-slate-100 dark:border-slate-800"
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Prof. Md Sharique Eliyas</h3>
                <p className="text-blue-600 dark:text-blue-400 font-medium mb-6">Project Supervisor</p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  "Prof. Md Sharique Eliyas provided valuable guidance, technical mentorship, and academic support throughout the development of the Smart Library Management System project. His supervision helped shape the project architecture, implementation strategy, and overall project quality."
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* College Info Section */}
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 p-10 md:p-16 rounded-[3rem]"
            >
              <div className="w-24 h-24 mx-auto bg-white rounded-full p-2 mb-8 shadow-2xl flex items-center justify-center">
                <img 
                  src="/assets/college-logo.png" 
                  alt="Government Engineering College, Gopalganj Logo" 
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/en/b/b3/Logo_of_GEC_Gopalganj.png" }}
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-6">Government Engineering College, Gopalganj</h2>
              <p className="text-xl text-slate-300 leading-relaxed font-light max-w-2xl mx-auto">
                Government Engineering College, Gopalganj is a premier technical institution dedicated to academic excellence, innovation, and practical engineering education. The Smart Library Management System project was developed as part of innovative academic learning and real-world software development practices.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="py-24 bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Technology Stack</h2>
              <p className="text-slate-600 dark:text-slate-400">Powered by modern web technologies</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {technologies.map((tech, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors">
                  <div className="text-slate-400 dark:text-slate-500 mb-3">
                    {tech.icon}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">{tech.name}</h4>
                  <p className="text-xs text-slate-500 text-center">{tech.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">Get In Touch</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Have questions about library access or need technical support? We are here to help.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              {/* Contact Info */}
              <div className="p-10 lg:pr-0">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Contact Information</h3>
                <div className="space-y-8">
                  <div className="flex items-start space-x-5">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-lg">College Address</h4>
                      <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        Government Engineering College,<br/>
                        Tola Sipaya, P.S.-Bishambharpur, Kuchaikote,<br/>
                        Dist.-Gopalganj, Bihar, 841501
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-5">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-lg">Phone Number</h4>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        +91 (06156) 295055 <br/>
                        (Working hours: 10AM to 5PM)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-5">
                    <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-lg">Email Address</h4>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        principal@gecgopalganj.org<br/>
                        library@gecgopalganj.org
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="h-full min-h-[400px] relative bg-slate-200 dark:bg-slate-700">
                 <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3573.744111322237!2d84.3702424750865!3d26.573284877028456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39930fb3a96d8741%3A0x859935076e167367!2sGovernment%20Engineering%20College%20(GEC)%2C%20Gopalganj!5e0!3m2!1sen!2sin!4v1714545582312!5m2!1sen!2sin" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen={false} 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 grayscale contrast-125 dark:opacity-70 dark:mix-blend-luminosity"
                    title="College Map Location"
                  ></iframe>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AboutPage;
