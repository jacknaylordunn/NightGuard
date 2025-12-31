
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight, Loader2, Building2, UserPlus, User, Mail, Lock } from 'lucide-react';

interface AuthPageProps {
  initialView?: 'login' | 'register';
  onBack: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialView = 'login', onBack }) => {
  const [view, setView] = useState<'login' | 'register-business' | 'join-team'>(
    initialView === 'register' ? 'register-business' : 'login'
  );
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [companyName, setCompanyName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [shortCode, setShortCode] = useState('');
  
  const [error, setError] = useState('');
  const { login, registerBusiness, joinTeam } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for invite link parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode) {
      setView('join-team');
      setShortCode(inviteCode);
    }
  }, []);

  const validatePasswordComplexity = (pwd: string) => {
    const checks = [
        { regex: /[A-Z]/, msg: "uppercase letter" },
        { regex: /[a-z]/, msg: "lowercase letter" },
        { regex: /[0-9]/, msg: "number" },
        { regex: /[^A-Za-z0-9]/, msg: "special character" }
    ];

    const missing = checks.filter(c => !c.regex.test(pwd)).map(c => c.msg);
    if (missing.length > 0) {
        return `Password must contain at least one ${missing.join(', ')}.`;
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (view === 'login') {
        await login(email, password);
      } else {
        // Sign Up Validations
        if (!fullName.trim()) throw new Error("Full Name is required.");
        if (email.toLowerCase() !== confirmEmail.toLowerCase()) throw new Error("Email addresses do not match.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        
        const pwdError = validatePasswordComplexity(password);
        if (pwdError) throw new Error(pwdError);

        if (view === 'register-business') {
            if (!companyName || !venueName) throw new Error("Company and Venue details required");
            await registerBusiness(email, password, companyName, venueName, fullName);
        } else if (view === 'join-team') {
            if (!shortCode) throw new Error("Invite Code is required");
            await joinTeam(email, password, shortCode, fullName);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md my-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-900/30 mb-4">
            <Shield className="text-indigo-500" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {view === 'login' && 'Welcome Back'}
            {view === 'register-business' && 'Register Business'}
            {view === 'join-team' && 'Join Team'}
          </h2>
          <p className="text-slate-400">
            {view === 'login' && 'Sign in to access your security dashboard'}
            {view === 'register-business' && 'Create a new secure environment for your venue'}
            {view === 'join-team' && 'Enter your Invite Code to join your team'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        {view !== 'login' && (
          <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 mb-6">
            <button
              onClick={() => setView('register-business')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                view === 'register-business' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              New Business
            </button>
            <button
              onClick={() => setView('join-team')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                view === 'join-team' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Join Existing
            </button>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* FULL NAME - Sign Up Only */}
            {view !== 'login' && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {view === 'register-business' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input
                      type="text"
                      required
                      autoComplete="organization"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Acme Security Ltd"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Initial Venue Name</label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. The Roxy Club"
                  />
                </div>
              </>
            )}

            {view === 'join-team' && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Invite Code</label>
                <div className="relative">
                   <UserPlus className="absolute left-3 top-3 text-slate-500" size={18} />
                   <input
                    type="text"
                    required
                    autoComplete="off"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono tracking-widest uppercase"
                    placeholder="ABC123"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Ask your manager for the Invite Code or Link.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            {/* CONFIRM EMAIL - Sign Up Only */}
            {view !== 'login' && (
               <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Confirm Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Confirm your email"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  autoComplete={view === 'login' ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
              {view !== 'login' && (
                <div className="mt-2 text-[10px] text-slate-500 bg-black/20 p-2 rounded border border-slate-800/50">
                  Required: Uppercase, Lowercase, Number, Special Character.
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD - Sign Up Only */}
            {view !== 'login' && (
               <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-6"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : (
                <>
                  {view === 'login' && 'Sign In'}
                  {view === 'register-business' && 'Create Business'}
                  {view === 'join-team' && 'Join Team'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button 
              onClick={() => {
                if (view === 'login') setView('register-business');
                else setView('login');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {view === 'login' ? "New here? Register or Join" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
        
        <button onClick={onBack} className="w-full text-center mt-6 text-slate-500 hover:text-slate-400 text-sm">
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
