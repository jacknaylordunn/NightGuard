import React from 'react';
import { Shield, BarChart3, Users, CheckCircle, ArrowRight, Lock, Star, ChevronDown, Check, Eye, FileText, Smartphone, ClipboardCheck, Siren } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto font-sans selection:bg-indigo-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Shield className="text-white" size={20} />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">NightGuard</span>
              <span className="font-bold text-xl tracking-tight sm:hidden">NG</span>
            </div>
            <div className="flex gap-4 items-center">
              {/* Made visible on mobile */}
              <button onClick={onLogin} className="text-zinc-400 hover:text-white font-medium text-sm transition-colors px-2 py-2">
                Log In
              </button>
              <button onClick={onGetStarted} className="bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-lg shadow-white/10">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-full px-4 py-1.5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-xs font-medium text-zinc-300">Live Sync & Multi-Device Support</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            The Digital Logbook for<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Modern Venues
            </span>
          </h1>
          
          <p className="mt-4 text-xl text-zinc-400 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 leading-relaxed">
            Replace paper clickers, incident binders, and lost checklists. NightGuard gives your security team a real-time, legally compliant operating system that runs on any phone.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <button onClick={onGetStarted} className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-2">
              Start Free Account <ArrowRight size={20} />
            </button>
            <button onClick={onLogin} className="sm:hidden text-zinc-400 font-medium mt-4 underline decoration-zinc-700 underline-offset-4">
               Already have an account? Log In
            </button>
          </div>

           {/* Dashboard Preview Mockup */}
           <div className="mt-16 relative max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl -z-10"></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl overflow-hidden">
                <div className="bg-zinc-950 rounded-xl overflow-hidden aspect-[16/9] relative flex items-center justify-center border border-zinc-800/50">
                   {/* Simplified UI Representation */}
                   <div className="absolute top-4 left-4 right-4 flex gap-4">
                      <div className="w-1/3 h-32 bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                         <div className="w-8 h-8 rounded bg-indigo-500/20 mb-2"></div>
                         <div className="h-2 w-16 bg-zinc-800 rounded mb-2"></div>
                         <div className="h-8 w-12 bg-zinc-800 rounded"></div>
                      </div>
                      <div className="w-1/3 h-32 bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                         <div className="w-8 h-8 rounded bg-red-500/20 mb-2"></div>
                         <div className="h-2 w-16 bg-zinc-800 rounded mb-2"></div>
                         <div className="h-8 w-12 bg-zinc-800 rounded"></div>
                      </div>
                      <div className="w-1/3 h-32 bg-zinc-900 rounded-lg border border-zinc-800 p-4 flex flex-col justify-between">
                         <div className="space-y-2">
                           <div className="h-2 w-full bg-zinc-800 rounded"></div>
                           <div className="h-2 w-2/3 bg-zinc-800 rounded"></div>
                         </div>
                         <div className="h-6 w-full bg-indigo-600 rounded opacity-20"></div>
                      </div>
                   </div>
                   <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-zinc-950 to-transparent"></div>
                   <div className="text-zinc-500 font-mono text-sm">Interactive Dashboard Preview</div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Comprehensive Features Grid */}
      <div className="py-24 bg-zinc-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to run the door</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Designed by door supervisors, for door supervisors. Simple enough to use in the rain, powerful enough for management.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
                title: "Live Capacity Cloud",
                desc: "Sync clicker counts instantly across unlimited devices. If the front door clicks IN, the back door sees it immediately. No more radio capacity checks."
              },
              {
                icon: Shield,
                color: "text-red-400",
                bg: "bg-red-500/10",
                title: "Incident Reporting",
                desc: "Log ejections and refusals in seconds. Capture details like gender, reason, location, and badge numbers for SIA compliance."
              },
              {
                icon: Eye,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                title: "Digital Watchlist",
                desc: "Instantly check and add banned patrons. Share a secure Banned List with your entire team. Flag high-risk individuals."
              },
               {
                icon: ClipboardCheck,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                title: "Compliance Checklists",
                desc: "Pre-opening and closing checks are digitized. Prove due diligence with timestamped logs for fire exits and floor walks."
              },
              {
                icon: FileText,
                color: "text-purple-400",
                bg: "bg-purple-500/10",
                title: "One-Click Reports",
                desc: "Generate professional PDF shift reports instantly. Perfect for licensing officers, police requests, or management review."
              },
              {
                icon: Siren,
                color: "text-rose-400",
                bg: "bg-rose-500/10",
                title: "Team Alerts",
                desc: "Send silent alerts to all staff devices (e.g., 'VIP Arriving' or 'Assistance Needed in VIP'). Keep comms clear."
              }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all group">
                <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={feature.color} size={24} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Switch Section */}
      <div className="py-24 bg-black">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-12">
               <div className="flex-1 space-y-6">
                  <h2 className="text-3xl font-bold">Why switch to Digital?</h2>
                  <ul className="space-y-4">
                     {[
                        "Evidence protection for your license",
                        "No more wet, unreadable paper logs",
                        "Real-time visibility for management off-site",
                        "Standardized data for police reports",
                        "Instant history of repeat offenders"
                     ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                           <div className="mt-1 bg-indigo-500/20 p-1 rounded-full">
                              <Check size={14} className="text-indigo-400" />
                           </div>
                           <span className="text-zinc-300">{item}</span>
                        </li>
                     ))}
                  </ul>
               </div>
               <div className="flex-1 w-full max-w-sm">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl"></div>
                     <div className="relative z-10 text-center">
                        <Smartphone size={48} className="mx-auto text-zinc-600 mb-4" />
                        <p className="text-lg font-medium text-white mb-2">"The Police loved the PDF reports."</p>
                        <p className="text-zinc-500 text-sm">Head of Security, London</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-zinc-400">Start for free. Upgrade as you grow.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-medium text-zinc-300 mb-2">Starter</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">Free</span>
                  <span className="text-zinc-500">/forever</span>
                </div>
                <p className="text-zinc-400 mt-4 text-sm">Essential tools for small venues or single events.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  '1 Venue Limit', 
                  'Up to 3 Staff Accounts', 
                  '7-Day History Retention', 
                  'Real-time Capacity',
                  'Basic Incident Logging'
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                    <Check size={16} className="text-zinc-500" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full py-3 rounded-xl border border-zinc-700 font-bold hover:bg-zinc-800 transition-colors">
                Create Free Account
              </button>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-3xl bg-indigo-900/10 border border-indigo-500/50 relative flex flex-col">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">
                MOST POPULAR
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-medium text-indigo-300 mb-2">Standard</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">£19.99</span>
                  <span className="text-zinc-500">/mo</span>
                </div>
                <p className="text-indigo-200/60 mt-4 text-sm">Complete compliance toolkit for professional teams.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  'Unlimited Venues', 
                  'Unlimited Staff Accounts', 
                  'Digital Watchlist & BOLO',
                  'Full History Retention',
                  'Risk Heatmaps & Analytics',
                  'PDF & CSV Exports',
                  'Priority Support'
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white">
                    <Check size={16} className="text-indigo-400" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20">
                Start 14-Day Free Trial
              </button>
              <p className="text-center text-[10px] text-indigo-300/50 mt-2">No credit card required for trial</p>
            </div>
          </div>
        </div>
      </div>

       <footer className="py-12 border-t border-zinc-900 bg-black text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="text-zinc-600" size={20} />
          <span className="font-bold text-zinc-400">NightGuard</span>
        </div>
        <div className="flex justify-center gap-6 mb-8 text-sm text-zinc-500">
           <a href="#" className="hover:text-white">Privacy Policy</a>
           <a href="#" className="hover:text-white">Terms of Service</a>
           <a href="#" className="hover:text-white">Support</a>
        </div>
        <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} NightGuard Security Systems Ltd.</p>
      </footer>
    </div>
  );
};

export default Landing;