
import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, AlertTriangle, FileText, Edit2, Save, Activity, Clock, 
  ShieldCheck, ClipboardCheck, Eye, UserCheck
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { session, isLive, isLoading, activeBriefing, updateBriefing, triggerHaptic, setShiftManager } = useSecurity();
  const { userProfile, venue } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Briefing State (Top Down)
  const [isEditingBriefing, setIsEditingBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState('');
  
  // Shift Manager State
  const [managerName, setManagerName] = useState('');
  const [isEditingManager, setIsEditingManager] = useState(false);

  useEffect(() => {
    if (session?.shiftManager) setManagerName(session.shiftManager);
  }, [session]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeBriefing) setBriefingText(activeBriefing.text);
  }, [activeBriefing]);

  const handleSaveBriefing = () => {
    updateBriefing(briefingText, 'info');
    setIsEditingBriefing(false);
  };

  const handleSaveManager = () => {
      if(managerName.trim()) {
          setShiftManager(managerName);
          setIsEditingManager(false);
      }
  };

  const handleNav = (tab: string) => {
    triggerHaptic(10);
    onNavigate(tab);
  };

  const isManager = userProfile?.role === 'owner' || userProfile?.role === 'manager';
  const isFloorStaff = userProfile?.role === 'floor_staff';
  
  // Calculation
  const capacityPercentage = Math.round((session.currentCapacity / session.maxCapacity) * 100);
  const statusColor = capacityPercentage > 95 ? 'text-rose-500' : capacityPercentage > 80 ? 'text-amber-400' : 'text-emerald-400';
  const strokeColor = capacityPercentage > 95 ? '#f43f5e' : capacityPercentage > 80 ? '#fbbf24' : '#34d399';

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((Math.min(capacityPercentage, 100)) / 100) * circumference;

  if (isLoading) return <div className="h-full flex items-center justify-center bg-slate-950 text-white">Loading...</div>;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5 pb-32 no-scrollbar bg-slate-950">
      
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-xl font-bold text-white tracking-tight">{venue?.name || 'NightGuard'}</h1>
           <div className="flex items-center gap-2 text-zinc-400">
              <Clock size={12} />
              <span className="text-xs font-mono">
                {currentDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
           </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-widest flex items-center gap-1.5 ${isLive ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}></div>
          {isLive ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* SHIFT MANAGER ALLOCATION */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="bg-indigo-900/30 p-2 rounded-full text-indigo-400">
                  <UserCheck size={18} />
              </div>
              <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Person in Charge</span>
                  {isEditingManager ? (
                      <input 
                        value={managerName}
                        onChange={e => setManagerName(e.target.value)}
                        onBlur={handleSaveManager}
                        onKeyDown={e => e.key === 'Enter' && handleSaveManager()}
                        autoFocus
                        className="bg-black border border-zinc-700 rounded px-2 py-0.5 text-sm text-white w-32 focus:outline-none"
                        placeholder="Name & SIA"
                      />
                  ) : (
                      <button onClick={() => setIsEditingManager(true)} className="text-white font-bold text-sm hover:text-indigo-400 text-left">
                          {session.shiftManager || "Tap to Allocate"}
                      </button>
                  )}
              </div>
          </div>
          {session.shiftManager && <div className="text-emerald-500"><ShieldCheck size={16} /></div>}
      </div>

      {/* Main Capacity Gauge */}
      <div className="relative bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 shadow-xl flex items-center justify-between overflow-hidden">
        <div className="flex flex-col z-10">
           <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Live Occupancy</span>
           <span className={`text-6xl font-mono font-bold tracking-tighter leading-none ${statusColor} drop-shadow-lg`}>
             {session.currentCapacity}
           </span>
           <div className="flex gap-4 mt-4">
              <p className="text-[10px] text-zinc-600 font-bold">Max: <span className="text-zinc-300 font-mono">{session.maxCapacity}</span></p>
              <p className="text-[10px] text-zinc-600 font-bold">Load: <span className={`${statusColor} font-mono`}>{capacityPercentage}%</span></p>
           </div>
        </div>
        <div className="relative w-28 h-28 flex-shrink-0">
           <svg className="w-full h-full transform -rotate-90">
             <circle cx="50%" cy="50%" r={radius} stroke="#27272a" strokeWidth="8" fill="transparent" />
             <circle cx="50%" cy="50%" r={radius} stroke={strokeColor} strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
           </svg>
           <div className="absolute inset-0 flex items-center justify-center">
              <Activity size={24} className={`${statusColor} opacity-80`} />
           </div>
        </div>
      </div>

      {/* Briefing */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm relative">
         <div className="flex justify-between items-center mb-3">
           <h3 className="text-indigo-200 text-xs font-bold uppercase flex items-center gap-2">
             <FileText size={14} className="text-indigo-500" /> Shift Briefing
           </h3>
           {isManager && (
             <button onClick={() => isEditingBriefing ? handleSaveBriefing() : setIsEditingBriefing(true)} className="p-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400">
               {isEditingBriefing ? <Save size={14} className="text-emerald-500" /> : <Edit2 size={14} />}
             </button>
           )}
         </div>
         {isEditingBriefing ? (
           <textarea className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-sm text-white h-24" value={briefingText} onChange={e => setBriefingText(e.target.value)} autoFocus placeholder="Orders for the night..." />
         ) : (
           <div className="bg-zinc-950/30 p-3 rounded-xl border border-zinc-800/50 min-h-[4rem]">
             <p className="text-sm text-zinc-300 whitespace-pre-wrap">{activeBriefing?.text || "No active orders."}</p>
           </div>
         )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-4 gap-2">
        {!isFloorStaff && (
          <>
            <button onClick={() => handleNav('ejections')} className="bg-red-900/10 hover:bg-red-900/20 border border-red-900/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-2">
              <AlertTriangle size={20} className="text-red-400" />
              <span className="text-[10px] font-bold text-red-200 text-center leading-tight">Log Incident</span>
            </button>
            <button onClick={() => handleNav('checks')} className="bg-indigo-900/10 hover:bg-indigo-900/20 border border-indigo-900/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-2">
              <ShieldCheck size={20} className="text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-200 text-center leading-tight">Patrol</span>
            </button>
            <button onClick={() => handleNav('watchlist')} className="bg-purple-900/10 hover:bg-purple-900/20 border border-purple-900/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-2">
              <Eye size={20} className="text-purple-400" />
              <span className="text-[10px] font-bold text-purple-200 text-center leading-tight">Watchlist</span>
            </button>
          </>
        )}
        <button onClick={() => handleNav('compliance')} className="bg-emerald-900/10 hover:bg-emerald-900/20 border border-emerald-900/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 col-span-1">
           <ClipboardCheck size={20} className="text-emerald-400" />
           <span className="text-[10px] font-bold text-emerald-200 text-center leading-tight">Ops Logs</span>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;
