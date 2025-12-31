import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { Siren } from 'lucide-react';

const Header: React.FC = () => {
  const { venue } = useAuth();
  const { alerts, dismissAlert } = useSecurity();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeAlerts = alerts.filter(a => a.active);

  return (
    <div className="fixed top-0 w-full z-40 bg-black/90 backdrop-blur-md border-b border-white/10 pt-safe transition-all">
      {/* Alert Ticker */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-900/90 text-white text-xs font-bold py-1 px-4 flex items-center gap-4 overflow-hidden relative">
           <div className="flex-none animate-pulse flex items-center gap-1 z-10 bg-red-900 pr-2">
             <Siren size={12}/> ALERT
           </div>
           <div className="flex-1 overflow-hidden relative h-5">
             <div className="absolute top-0 left-0 whitespace-nowrap animate-marquee">
               {activeAlerts.map(a => (
                 <span key={a.id} className="inline-block mr-12 uppercase">
                   <span className="font-black text-amber-300">[{a.type}]</span> {a.message} <span className="text-zinc-300">@ {a.location}</span> ({new Date(a.timestamp).toLocaleTimeString()})
                   <button onClick={() => dismissAlert(a.id)} className="ml-2 underline opacity-50 hover:opacity-100 text-[10px]">DISMISS</button>
                 </span>
               ))}
             </div>
           </div>
        </div>
      )}

      <div className="px-4 py-2 flex justify-between items-center h-14">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            {venue?.name.substring(0,2).toUpperCase() || 'NG'}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-bold text-white leading-tight max-w-[120px] truncate">{venue?.name || 'NightGuard'}</h1>
            <p className="text-[10px] text-zinc-400 font-mono tracking-wider">{time.toLocaleTimeString()}</p>
          </div>
        </div>

        {/* SOS Button Removed */}
      </div>
    </div>
  );
};

export default Header;