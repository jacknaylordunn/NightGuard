
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { Check, X, Crown, ArrowLeft, Star, Lock, Loader2 } from 'lucide-react';

interface PricingProps {
  onBack: () => void;
}

const Pricing: React.FC<PricingProps> = ({ onBack }) => {
  const { company, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // STRIPE CONFIGURATION
  const PRICE_IDS = {
    pro: {
      monthly: 'price_1Sukv41BW0GEhAp2M1upNG1l', 
      yearly: 'price_1Sukv41BW0GEhAp2M1upNG1l' // NOTE: If you create a specific Yearly price in Stripe (e.g. with discount), replace this ID with the yearly Price ID.
    },
    enterprise: {
      monthly: 'price_1SukwG1BW0GEhAp2vWi9w84e',
      yearly: 'price_1SukwG1BW0GEhAp2vWi9w84e' // NOTE: Replace with specific Enterprise Yearly Price ID if available.
    }
  };

  const handleSubscribe = async (tier: 'pro' | 'enterprise') => {
    if (!user) {
        alert("You must be logged in to subscribe.");
        return;
    }
    
    setLoading(true);

    try {
      const priceId = PRICE_IDS[tier][billingCycle];
      
      // 2. CREATE CHECKOUT SESSION IN FIRESTORE
      // The Firebase Extension listens to the `customers/{uid}/checkout_sessions` collection.
      const checkoutSessionRef = await addDoc(
        collection(db, 'customers', user.uid, 'checkout_sessions'), 
        {
          price: priceId, // Must be a valid Price ID (price_...)
          success_url: window.location.origin + `/?success=true&tier=${tier}`,
          cancel_url: window.location.origin + '/?tab=settings',
          metadata: {
             companyId: company?.id, // Pass company ID to link subscription later via webhooks
             tier: tier
          },
          // Automatic tax calculation if enabled in Stripe
          automatic_tax: true, 
          tax_id_collection: true
        }
      );

      // 3. LISTEN FOR REDIRECT URL
      // The extension will update the document with the 'url' field once created in Stripe.
      const unsubscribe = onSnapshot(doc(db, 'customers', user.uid, 'checkout_sessions', checkoutSessionRef.id), (snap) => {
        const { url, error } = snap.data() || {};
        
        if (error) {
          console.error("Stripe Extension Error:", error);
          alert(`Payment Error: ${error.message}`);
          setLoading(false);
          unsubscribe();
        }
        
        if (url) {
          // 4. REDIRECT USER TO STRIPE
          window.location.assign(url);
          unsubscribe(); // Cleanup listener
        }
      });

    } catch (error: any) {
      console.error(error);
      alert("Failed to initialize checkout: " + error.message);
      setLoading(false);
    }
  };

  const currentPlan = company?.subscriptionPlan || 'free';

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-4 pb-32">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 mb-6 hover:text-white">
        <ArrowLeft size={18} /> Back to Settings
      </button>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-3">Upgrade Your Security</h1>
        <p className="text-zinc-400 text-sm max-w-xs mx-auto">
          Unlock the full power of NightGuard. Compliant, secure, and professional.
        </p>
        
        {/* Toggle */}
        <div className="flex items-center justify-center mt-6 gap-3">
          <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
          <button 
            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
            className="w-14 h-8 bg-zinc-800 rounded-full relative border border-zinc-700 transition-colors"
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-indigo-500 transition-all ${billingCycle === 'monthly' ? 'left-1' : 'left-7'}`} />
          </button>
          <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-white' : 'text-zinc-500'}`}>Yearly <span className="text-emerald-400 text-[10px] uppercase ml-1">-20%</span></span>
        </div>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        
        {/* FREE TIER */}
        <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-900/50 opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Starter</h3>
              <p className="text-zinc-500 text-xs">For small, single events.</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">Free</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-zinc-600"/> 1 Venue Limit</li>
            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-zinc-600"/> 3 Staff Max</li>
            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-zinc-600"/> 7-Day History</li>
            <li className="flex items-center gap-2 text-sm text-zinc-500"><X size={16} /> <span className="line-through">Legal PDF Reports</span></li>
            <li className="flex items-center gap-2 text-sm text-zinc-500"><X size={16} /> <span className="line-through">Banned Watchlist</span></li>
          </ul>
          {currentPlan === 'free' ? (
            <button disabled className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-500 font-bold text-sm cursor-not-allowed border border-zinc-700">Current Plan</button>
          ) : (
            <button className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-300 font-bold text-sm hover:bg-zinc-800">Downgrade</button>
          )}
        </div>

        {/* PRO TIER */}
        <div className="relative p-6 rounded-3xl border-2 border-indigo-600 bg-zinc-900 shadow-2xl shadow-indigo-900/20 transform scale-105 z-10">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Star size={10} fill="currentColor" /> Most Popular
          </div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">Pro <Crown size={16} className="text-amber-400" fill="currentColor"/></h3>
              <p className="text-indigo-200 text-xs">Full legal compliance.</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-white">£{billingCycle === 'monthly' ? '29.99' : '299.99'}</span>
              <span className="text-zinc-500 text-xs block">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
          </div>
          <div className="h-px w-full bg-zinc-800 mb-6"></div>
          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-sm text-white font-medium"><Check size={18} className="text-indigo-500"/> Unlimited Venues</li>
            <li className="flex items-center gap-3 text-sm text-white font-medium"><Check size={18} className="text-indigo-500"/> Unlimited Staff</li>
            <li className="flex items-center gap-3 text-sm text-white font-medium"><Check size={18} className="text-indigo-500"/> Legal PDF Reports <span className="text-[10px] bg-indigo-900 text-indigo-200 px-1 rounded ml-1">ESSENTIAL</span></li>
            <li className="flex items-center gap-3 text-sm text-white font-medium"><Check size={18} className="text-indigo-500"/> Digital Watchlist & BOLO</li>
            <li className="flex items-center gap-3 text-sm text-white font-medium"><Check size={18} className="text-indigo-500"/> Full History Archive</li>
          </ul>
          {currentPlan === 'pro' ? (
             <button disabled className="w-full py-4 rounded-xl bg-indigo-900/50 text-indigo-300 font-bold border border-indigo-500/50 flex items-center justify-center gap-2"><Check size={18}/> Active Plan</button>
          ) : (
             <button 
               onClick={() => handleSubscribe('pro')}
               disabled={loading}
               className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="animate-spin" /> : 'Start 14-Day Free Trial'}
             </button>
          )}
          <p className="text-center text-[10px] text-zinc-500 mt-3 flex items-center justify-center gap-1"><Lock size={10}/> Secure payment via Stripe</p>
        </div>

        {/* ENTERPRISE TIER */}
        <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Enterprise</h3>
              <p className="text-zinc-500 text-xs">For multi-site chains.</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">£{billingCycle === 'monthly' ? '99.99' : '999.99'}</span>
              <span className="text-zinc-500 text-xs block">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-purple-500"/> Everything in Pro</li>
            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-purple-500"/> API Access</li>
            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-purple-500"/> Priority 24/7 Support</li>
            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-purple-500"/> Custom Training</li>
          </ul>
          <button 
            onClick={() => handleSubscribe('enterprise')}
            className="w-full py-3 rounded-xl border border-purple-500/30 bg-purple-900/10 text-purple-200 font-bold text-sm hover:bg-purple-900/20"
          >
            Upgrade to Enterprise
          </button>
        </div>

      </div>
    </div>
  );
};

export default Pricing;
