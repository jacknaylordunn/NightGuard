
import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, AlertTriangle, FileText, Edit2, Save, Activity, Clock, 
  ShieldCheck, ArrowUpRight, TrendingUp, CheckCircle2, ClipboardList, Shield, Eye
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { session, isLive, isLoading, activeBriefing, updateBriefing, triggerHaptic } = useSecurity();
  const { userProfile, venue } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEditingBriefing, setIsEditingBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState('');
  
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

  const handleNav = (tab: string) => {
    triggerHaptic(10);
    onNavigate(tab);
  };

  const isManager = userProfile?.role === 'owner' || userProfile?.role === 'manager';
  
  // Calculation
  const capacityPercentage = Math.round((session.currentCapacity / session.maxCapacity) * 100);
  const totalEntries = session.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
  const incidentsCount = session.ejections.length + session.rejections.length;
  
  // Compliance Calc
  const totalChecks = session.preEventChecks.length + session.postEventChecks.length;
  const completedChecks = session.preEventChecks.filter(c => c.checked).length + session.postEventChecks.filter(c => c.checked).length;
  const complianceScore = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

  // Status Colors
  let statusColor = 'text-emerald-400';
  let strokeColor = '#34d399'; // emerald-400
  
  if (capacityPercentage > 80) {
    statusColor = 'text-amber-400';
    strokeColor = '#fbbf24'; // amber-400
  }
  if (capacityPercentage >= 95) {
    statusColor = 'text-rose-500';
    strokeColor = '#f43f5e'; // rose-500
  }

  // SVG Gauge Calculations for Compact View
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((Math.min(capacityPercentage, 100)) / 100) * circumference;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center">
           <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
           <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest">Loading Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5 pb-32 no-scrollbar bg-slate-950">
      
      {/* Top Bar: Date & Status */}
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-xl font-bold text-white tracking-tight">{venue?.name || 'NightGuard'}</h1>
           <div className="flex items-center gap-2 text-zinc-400">
              <Clock size={12} />
              <span className="text-xs font-mono">
                {currentDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} • {currentDate.toLocaleTimeString([], { hour12: false })}
              </span>
           </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-widest flex items-center gap-1.5 ${isLive ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}></div>
          {isLive ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Main Capacity Gauge - Compact Redesign */}
      <div className="relative bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 shadow-xl flex items-center justify-between overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>
        
        <div className="flex flex-col z-10">
           <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Live Occupancy</span>
           <span className={`text-6xl font-mono font-bold tracking-tighter leading-none ${statusColor} drop-shadow-lg`}>
             {session.currentCapacity}
           </span>
           
           <div className="flex gap-6 mt-4">
              <div>
                 <p className="text-[10px] text-zinc-600 uppercase font-bold">Limit</p>
                 <p className="text-zinc-300 font-mono font-bold text-sm">{session.maxCapacity}</p>
              </div>
              <div className="w-px h-8 bg-zinc-800/50"></div>
              <div>
                 <p className="text-[10px] text-zinc-600 uppercase font-bold">Load</p>
                 <p className={`font-mono font-bold text-sm ${statusColor}`}>{capacityPercentage}%</p>
              </div>
           </div>
        </div>

        <div className="relative w-28 h-28 flex-shrink-0">
           <svg className="w-full h-full transform -rotate-90">
             <circle
               cx="50%" cy="50%" r={radius}
               stroke="#27272a" 
               strokeWidth="8"
               fill="transparent"
             />
             <circle
               cx="50%" cy="50%" r={radius}
               stroke={strokeColor}
               strokeWidth="8"
               fill="transparent"
               strokeDasharray={circumference}
               strokeDashoffset={strokeDashoffset}
               strokeLinecap="round"
               className="transition-all duration-1000 ease-out"
             />
           </svg>
           <div className="absolute inset-0 flex items-center justify-center">
              <Activity size={24} className={`${statusColor} opacity-80`} />
           </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-4 gap-2">
        <button 
          onClick={() => handleNav('ejections')}
          className="bg-red-900/10 hover:bg-red-900/20 border border-red-900/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <div className="p-2 bg-red-900/20 rounded-full text-red-400">
            <AlertTriangle size={20} />
          </div>
          <span className="text-[10px] font-bold text-red-200 text-center leading-tight">Log Ejection</span>
        </button>

        <button 
          onClick={() => handleNav('checks')}
          className="bg-indigo-900/10 hover:bg-indigo-900/20 border border-indigo-900/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <div className="p-2 bg-indigo-900/20 rounded-full text-indigo-400">
            <ShieldCheck size={20} />
          </div>
          <span className="text-[10px] font-bold text-indigo-200 text-center leading-tight">Patrol Check</span>
        </button>

        <button 
          onClick={() => handleNav('watchlist')}
          className="bg-purple-900/10 hover:bg-purple-900/20 border border-purple-900/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <div className="p-2 bg-purple-900/20 rounded-full text-purple-400">
            <Eye size={20} />
          </div>
          <span className="text-[10px] font-bold text-purple-200 text-center leading-tight">Watchlist</span>
        </button>

        <button 
          onClick={() => handleNav('reports')}
          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <div className="p-2 bg-zinc-900 rounded-full text-zinc-300">
            <FileText size={20} />
          </div>
          <span className="text-[10px] font-bold text-zinc-300 text-center leading-tight">Reports</span>
        </button>
      </div>

      {/* Stats Grid (Simplified) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between h-24 relative overflow-hidden group">
           <div className="flex items-center gap-2 text-indigo-400">
              <Users size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Entries</span>
           </div>
           <span className="text-3xl font-bold text-white font-mono">{totalEntries}</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between h-24 relative overflow-hidden group">
           <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Ejections</span>
           </div>
           <span className="text-3xl font-bold text-white font-mono">{incidentsCount}</span>
        </div>

        {/* Compliance Widget */}
        <div className="col-span-2 bg-gradient-to-r from-zinc-900 to-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
           <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500"></div>
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                 <ShieldCheck size={20} />
              </div>
              <div>
                 <h3 className="text-sm font-bold text-white">Compliance Status</h3>
                 <p className="text-xs text-zinc-400">
                    {completedChecks}/{totalChecks} Tasks • {session.patrolLogs.length} Patrols
                 </p>
              </div>
           </div>
           <div className="text-right">
              <div className="text-xl font-bold text-white font-mono">{complianceScore}%</div>
              <div className="text-[10px] text-zinc-500 uppercase">Score</div>
           </div>
        </div>
      </div>

      {/* Briefing Board */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm relative">
         <div className="flex justify-between items-center mb-3">
           <h3 className="text-indigo-200 text-xs font-bold uppercase flex items-center gap-2">
             <FileText size={14} className="text-indigo-500" /> Shift Briefing
           </h3>
           {isManager && (
             <button 
                onClick={() => isEditingBriefing ? handleSaveBriefing() : setIsEditingBriefing(true)}
                className="p-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400"
             >
               {isEditingBriefing ? <Save size={14} className="text-emerald-500" /> : <Edit2 size={14} />}
             </button>
           )}
         </div>
         
         {isEditingBriefing ? (
           <textarea 
             className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none resize-none h-24"
             value={briefingText}
             onChange={e => setBriefingText(e.target.value)}
             placeholder="Enter briefing notes..."
             autoFocus
           />
         ) : (
           <div className="bg-zinc-950/30 p-3 rounded-xl border border-zinc-800/50 min-h-[4rem]">
             <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
               {activeBriefing?.text || "No active orders for this shift."}
             </p>
             {activeBriefing && (
               <div className="mt-2 text-[10px] text-zinc-600 text-right">
                 {activeBriefing.setBy} • {new Date(activeBriefing.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
               </div>
             )}
           </div>
         )}
      </div>

      {/* Live Activity Feed */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="bg-zinc-800/30 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Activity size={14} className="text-zinc-400" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Live Log</span>
           </div>
        </div>
        <div className="divide-y divide-zinc-800">
           {session.ejections.length === 0 && session.rejections.length === 0 ? (
             <div className="p-6 text-center text-xs text-zinc-600 font-medium">No activity recorded yet.</div>
           ) : (
             [...session.ejections.map(i => ({...i, _type: 'eject'})), ...session.rejections.map(r => ({...r, _type: 'rej'}))]
                .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((item: any) => (
                  <div key={item.id} className="p-3 flex justify-between items-center hover:bg-zinc-800/30 transition-colors">
                     <div className="flex items-center gap-3">
                       <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item._type === 'eject' ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`}></div>
                       <div>
                         <div className="text-xs font-bold text-zinc-200 capitalize">
                           {item._type === 'eject' ? item.reason : 'Entry Refused'}
                         </div>
                         <div className="text-[10px] text-zinc-500 mt-0.5">
                            {item._type === 'eject' ? item.location : item.reason}
                         </div>
                       </div>
                     </div>
                     <div className="text-[10px] font-mono text-zinc-600">
                       {new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                     </div>
                  </div>
                ))
           )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
