
import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// In a real application, this logic happens via Webhook on the server.
// For this PWA/Client-side demo, we handle the state update here.

const BillingSuccess: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { company } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tier = params.get('tier');
    const isSuccess = params.get('success');

    if (isSuccess === 'true' && tier && company) {
      updateCompanySubscription(tier as 'pro' | 'enterprise');
    } else {
      setStatus('error');
    }
  }, [company]);

  const updateCompanySubscription = async (tier: 'pro' | 'enterprise') => {
    if (!company) return;
    try {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14); // 14 Day Trial Logic

      await updateDoc(doc(db, 'companies', company.id), {
        subscriptionPlan: tier,
        subscriptionStatus: 'trial', // Start as trial in this flow
        trialEndsAt: trialEnds.toISOString(),
        stripeCustomerId: 'cus_DEMO_' + Date.now() // Simulated ID
      });
      setStatus('success');
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  if (status === 'processing') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
        <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white">Finalizing your upgrade...</h2>
        <p className="text-zinc-500 mt-2">Setting up your secure environment.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
        <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-6">
           <ArrowRight size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-zinc-500 mt-2 mb-6">We couldn't confirm your subscription details.</p>
        <button onClick={onBack} className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold">Return to Settings</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center animate-in fade-in zoom-in-95">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 relative">
         <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
         <CheckCircle size={40} className="text-emerald-500 relative z-10" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2">Upgrade Successful!</h2>
      <p className="text-zinc-400 mb-8 max-w-xs">
        You now have full access to Pro features including unlimited venues, reports, and the watchlist.
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full max-w-xs mb-8">
         <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-500">Plan</span>
            <span className="text-white font-bold uppercase">{company?.subscriptionPlan || 'PRO'}</span>
         </div>
         <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Status</span>
            <span className="text-emerald-400 font-bold">Active Trial</span>
         </div>
      </div>

      <button 
        onClick={() => {
            // Clean URL params and go back
            window.history.pushState({}, document.title, window.location.pathname);
            onBack();
        }} 
        className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2"
      >
        Go to Dashboard <ArrowRight size={18} />
      </button>
    </div>
  );
};

export default BillingSuccess;
