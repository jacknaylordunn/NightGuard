import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { CheckSquare, Clock, Zap, MapPin, Loader2 } from 'lucide-react';
import { ChecklistItem } from '../types';

const CheckListGroup: React.FC<{
  title: string;
  items: ChecklistItem[];
  type: 'pre' | 'post';
  onToggle: (type: 'pre' | 'post', id: string) => void;
}> = ({ title, items, type, onToggle }) => {
  const completed = items.filter(i => i.checked).length;
  const total = items.length;
  const progress = (completed / total) * 100;

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden mb-6 shadow-lg">
      <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex justify-between items-center backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">{title}</h3>
          <div className="h-1.5 w-32 bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${completed === total ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-lg font-mono ${completed === total ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
          {completed} / {total}
        </span>
      </div>
      
      <div className="divide-y divide-zinc-800/50">
        {items.map((item) => (
          <div 
            key={item.id} 
            onClick={() => onToggle(type, item.id)}
            className="p-4 flex items-start gap-4 active:bg-zinc-800 transition-colors cursor-pointer group select-none"
          >
            <div className={`mt-0.5 w-6 h-6 rounded-lg border flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              item.checked ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-zinc-700 bg-zinc-800/50 group-hover:border-zinc-500'
            }`}>
              {item.checked && <CheckSquare size={16} className="text-white" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium transition-colors ${item.checked ? 'text-zinc-500 line-through decoration-zinc-700' : 'text-zinc-200'}`}>
                {item.label}
              </p>
              {item.checked && item.timestamp && (
                <p className="text-[10px] text-emerald-500/80 mt-1 font-mono uppercase tracking-wide">
                  Checked at {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Checks: React.FC = () => {
  const { session, toggleChecklist, logPatrol } = useSecurity();
  const [patrolArea, setPatrolArea] = useState('External Perimeter');
  const [flashlightMode, setFlashlightMode] = useState(false);
  const [isLoggingPatrol, setIsLoggingPatrol] = useState(false);

  const handlePatrolLog = () => {
    setIsLoggingPatrol(true);
    
    // Simulate slight delay for geo interaction or just immediate if not available
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        // In a real app we would store coords. For now we just verify we got them.
        console.log("Patrol Location:", pos.coords.latitude, pos.coords.longitude);
        completeLog();
      }, (err) => {
        console.warn("Geo error:", err);
        completeLog(); // Log anyway even if GPS fails
      });
    } else {
      completeLog();
    }
  };

  const completeLog = () => {
    logPatrol(patrolArea);
    setIsLoggingPatrol(false);
    // Optional: Toast or vibration here
    if (navigator.vibrate) navigator.vibrate(50);
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 pb-32">
      
      {/* Flashlight Overlay */}
      {flashlightMode && (
        <div 
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center touch-none animate-in fade-in duration-300" 
          onClick={() => setFlashlightMode(false)}
        >
          <Zap size={64} className="text-black/10 animate-pulse mb-8" />
          <div className="text-black font-black text-3xl tracking-widest opacity-20 pointer-events-none select-none">
            ID LIGHT ACTIVE
          </div>
          <p className="text-black/30 text-sm mt-8 animate-pulse font-medium">Tap screen to turn off</p>
        </div>
      )}

      <header className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-white">Compliance</h2>
          <p className="text-zinc-500 text-xs">Patrols & Checklists</p>
        </div>
        <button 
          onClick={() => setFlashlightMode(true)}
          className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-zinc-700 active:scale-95 transition-all"
        >
          <Zap size={16} className="text-amber-400" /> Flashlight
        </button>
      </header>

      {/* Patrol Logger Card */}
      <div className="bg-gradient-to-br from-indigo-900/40 to-zinc-900 border border-indigo-500/20 p-5 rounded-3xl shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none group-hover:bg-indigo-600/30 transition-colors"></div>
        
        <div className="relative z-10">
          <h3 className="font-bold text-indigo-100 mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-indigo-400" /> Patrol Log
          </h3>
          
          <div className="flex flex-col gap-3">
            <div className="relative">
              <select 
                value={patrolArea}
                onChange={(e) => setPatrolArea(e.target.value)}
                className="w-full bg-zinc-950/50 border border-indigo-500/30 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none font-medium"
              >
                <option>External Perimeter</option>
                <option>Fire Exits</option>
                <option>Toilets</option>
                <option>Dance Floor</option>
                <option>VIP Area</option>
                <option>Bar Area</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <button 
              onClick={handlePatrolLog}
              disabled={isLoggingPatrol}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoggingPatrol ? <Loader2 className="animate-spin" /> : <Clock size={18} />}
              {isLoggingPatrol ? 'Acquiring GPS...' : 'Log Check Now'}
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-500/10 text-[10px] text-indigo-300/60 font-mono flex justify-between uppercase tracking-wider">
            <span>Last Check</span>
            <span>{session.patrolLogs.length > 0 
              ? `${session.patrolLogs[session.patrolLogs.length-1].area} • ${new Date(session.patrolLogs[session.patrolLogs.length-1].time).toLocaleTimeString()}` 
              : 'N/A'}</span>
          </div>
        </div>
      </div>

      <CheckListGroup 
        title="Pre-Opening Checks" 
        items={session.preEventChecks} 
        type="pre"
        onToggle={toggleChecklist}
      />

      <CheckListGroup 
        title="Closing Checks" 
        items={session.postEventChecks} 
        type="post"
        onToggle={toggleChecklist}
      />
    </div>
  );
};

export default Checks;