import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { Users, AlertTriangle, FileText, Edit2, Save, Activity, Clock } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { session, isLive, isLoading, activeBriefing, updateBriefing } = useSecurity();
  const { userProfile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEditingBriefing, setIsEditingBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState('');
  
  const capacityPercentage = Math.round((session.currentCapacity / session.maxCapacity) * 100);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeBriefing) setBriefingText(activeBriefing.text);
  }, [activeBriefing]);

  const handleSaveBriefing = () => {
    updateBriefing(briefingText, 'info');
    setIsEditingBriefing(false);
  };

  const isManager = userProfile?.role === 'owner' || userProfile?.role === 'manager';
  
  // Status Colors
  let statusColor = 'text-emerald-500';
  let statusBg = 'bg-emerald-500';
  let ringColor = 'border-emerald-500/30';
  
  if (capacityPercentage > 80) {
    statusColor = 'text-amber-500';
    statusBg = 'bg-amber-500';
    ringColor = 'border-amber-500/30';
  }
  if (capacityPercentage >= 95) {
    statusColor = 'text-red-500';
    statusBg = 'bg-red-500';
    ringColor = 'border-red-500/30';
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-700 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 pb-32 no-scrollbar">
      
      {/* Date & Time Header */}
      <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-zinc-800 rounded-xl text-zinc-400">
             <Clock size={18} />
           </div>
           <div>
             <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
               {currentDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
             </div>
             <div className="text-xl font-mono font-bold text-white tracking-widest leading-none">
               {currentDate.toLocaleTimeString([], { hour12: false })}
             </div>
           </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-widest ${isLive ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
          {isLive ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Hero Capacity Widget */}
      <div className="relative bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl overflow-hidden group">
        <div className={`absolute top-0 left-0 w-full h-1 ${statusBg} opacity-50`}></div>
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex justify-between items-start mb-6 relative z-10">
           <div>
             <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Live Occupancy</h3>
             <p className="text-xs text-zinc-500">Max Capacity: <span className="text-zinc-300 font-mono">{session.maxCapacity}</span></p>
           </div>
           <div className={`text-xl font-bold ${statusColor} bg-zinc-950/50 px-3 py-1 rounded-full border ${ringColor}`}>
             {capacityPercentage}%
           </div>
        </div>
        
        <div className="flex items-end justify-between relative z-10">
           <div className="text-7xl font-mono font-bold text-white tracking-tighter leading-none">
             {session.currentCapacity}
           </div>
           <div className={`h-3 w-3 rounded-full ${statusBg} animate-pulse mb-4 mr-2`}></div>
        </div>
        
        <div className="w-full bg-zinc-800 rounded-full h-3 mt-6 overflow-hidden">
           <div 
             className={`h-full rounded-full transition-all duration-700 ease-out ${statusBg}`} 
             style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
           ></div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center hover:bg-zinc-800/80 transition-colors">
           <AlertTriangle className="text-amber-500 mb-2" size={24} />
           <span className="text-3xl font-bold text-white font-mono">{session.ejections.length}</span>
           <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Incidents</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center hover:bg-zinc-800/80 transition-colors">
           <Users className="text-blue-500 mb-2" size={24} />
           <span className="text-3xl font-bold text-white font-mono">
             {session.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0)}
           </span>
           <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Total Entries</span>
        </div>
      </div>

      {/* Briefing Board */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
         <div className="flex justify-between items-center mb-4">
           <h3 className="text-indigo-400 text-xs font-bold uppercase flex items-center gap-2">
             <FileText size={16} /> Briefing / Orders
           </h3>
           {isManager && (
             <button 
                onClick={() => isEditingBriefing ? handleSaveBriefing() : setIsEditingBriefing(true)}
                className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
             >
               {isEditingBriefing ? <Save size={16} className="text-emerald-500" /> : <Edit2 size={16} className="text-zinc-400" />}
             </button>
           )}
         </div>
         
         {isEditingBriefing ? (
           <textarea 
             className="form-input h-32 resize-none text-sm font-sans"
             value={briefingText}
             onChange={e => setBriefingText(e.target.value)}
             placeholder="Enter briefing notes for the team..."
             autoFocus
           />
         ) : (
           <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 min-h-[5rem]">
             <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
               {activeBriefing?.text || "No active orders for this shift."}
             </p>
             {activeBriefing && (
               <div className="mt-3 pt-3 border-t border-zinc-800/50 text-[10px] text-zinc-600 flex justify-between">
                 <span>By: {activeBriefing.setBy}</span>
                 <span>{new Date(activeBriefing.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
               </div>
             )}
           </div>
         )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden pb-2">
        <div className="bg-zinc-800/30 px-5 py-3 border-b border-zinc-800 flex items-center gap-2">
           <Activity size={14} className="text-zinc-400" />
           <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Recent Logs</span>
        </div>
        <div className="divide-y divide-zinc-800">
           {session.ejections.length === 0 && session.rejections.length === 0 ? (
             <div className="p-6 text-center text-xs text-zinc-600 font-medium">No activity recorded yet.</div>
           ) : (
             [...session.ejections.map(i => ({...i, _type: 'eject'})), ...session.rejections.map(r => ({...r, _type: 'rej'}))]
                .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((item: any) => (
                  <div key={item.timestamp} className="p-4 flex justify-between items-center hover:bg-zinc-800/30 transition-colors">
                     <div className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item._type === 'eject' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                       <div>
                         <div className="text-sm font-bold text-zinc-200">
                           {item._type === 'eject' ? item.reason : 'Entry Refused'}
                         </div>
                         <div className="text-[10px] text-zinc-500 uppercase font-bold mt-0.5">
                            {item._type === 'eject' ? item.location : item.reason}
                         </div>
                       </div>
                     </div>
                     <div className="text-xs font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded">
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