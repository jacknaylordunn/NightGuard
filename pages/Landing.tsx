
import React from 'react';
import { Shield, BarChart3, Users, CheckCircle, ArrowRight, Lock, Star, ChevronDown, Check, Eye } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const Landing: React.FC<LandingProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto font-sans selection:bg-indigo-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Shield className="text-white" size={20} />
              </div>
              <span className="font-bold text-xl tracking-tight">NightGuard</span>
            </div>
            <div className="flex gap-4 items-center">
              <button onClick={onLogin} className="hidden md:block text-zinc-400 hover:text-white font-medium text-sm transition-colors">
                Log In
              </button>
              <button onClick={onGetStarted} className="bg-white text-black hover:bg-zinc-200 px-5 py-2.5 rounded-full font-bold text-sm transition-all transform hover:scale-105">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-full px-4 py-1.5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-xs font-medium text-zinc-300">New: Banned List & Watchlist Live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Secure Your Venue.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Protect Your License.
            </span>
          </h1>
          
          <p className="mt-4 text-xl text-zinc-400 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            The modern operating system for nightlife security. Ditch the paper logbooks for real-time digital tracking of capacity, ejections, and watchlists.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <button onClick={onGetStarted} className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-2">
              Create Free Account <ArrowRight size={20} />
            </button>
            <button onClick={onGetStarted} className="bg-zinc-900 text-white border border-zinc-800 px-8 py-4 rounded-full font-bold text-lg hover:bg-zinc-800 transition-all">
              Try Pro Demo
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 bg-zinc-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Professional Security Tools</h2>
            <p className="text-zinc-400">Everything you need to run a compliant and safe door.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Eye,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                title: "Digital Watchlist",
                desc: "Keep a secure, shared list of banned patrons and BOLO alerts across your security team. No more binders."
              },
              {
                icon: Shield,
                color: "text-red-400",
                bg: "bg-red-500/10",
                title: "Incident Logging",
                desc: "Legally robust ejection logs with body-cam timestamps and witness tracking."
              },
              {
                icon: Users,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
                title: "Live Capacity",
                desc: "Sync clickers across multiple devices instantly. Never breach your fire limit again."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group">
                <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={feature.color} size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Pricing that makes sense</h2>
            <p className="text-zinc-400">Less than the cost of one hour of security staffing.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800">
              <div className="mb-8">
                <h3 className="text-xl font-medium text-zinc-300 mb-2">Starter</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">Free</span>
                  <span className="text-zinc-500">/forever</span>
                </div>
                <p className="text-zinc-400 mt-4 text-sm">Perfect for small venues or single events.</p>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  '1 Venue Limit', 
                  'Up to 3 Staff Accounts', 
                  '7-Day History Retention', 
                  'Basic Reporting'
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
            <div className="p-8 rounded-3xl bg-indigo-900/10 border border-indigo-500/50 relative">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">
                BEST VALUE
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-medium text-indigo-300 mb-2">Standard</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">£19.99</span>
                  <span className="text-zinc-500">/mo</span>
                </div>
                <p className="text-indigo-200/60 mt-4 text-sm">Advanced tools for serious security teams.</p>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  'Unlimited Venues', 
                  'Unlimited Staff Accounts', 
                  'Digital Watchlist & BOLO',
                  'Risk Heatmaps & Analytics',
                  'CSV/PDF Exports', 
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white">
                    <Check size={16} className="text-indigo-400" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20">
                Start 14-Day Free Trial
              </button>
            </div>
          </div>
        </div>
      </div>

       <footer className="py-12 border-t border-zinc-900 bg-black text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="text-zinc-600" size={20} />
          <span className="font-bold text-zinc-400">NightGuard</span>
        </div>
        <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} NightGuard Security Systems Ltd.</p>
      </footer>
    </div>
  );
};

export default Landing;
