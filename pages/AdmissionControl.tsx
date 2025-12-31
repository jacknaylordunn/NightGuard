import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Plus, Minus, Ban, Calculator, RotateCcw, X, Check } from 'lucide-react';
import { RejectionReason } from '../types';

const AdmissionControl: React.FC = () => {
  const { session, incrementCapacity, decrementCapacity, logRejection } = useSecurity();
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  // Correction State
  const [manualCap, setManualCap] = useState<string>('');

  const handleSyncSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate difference to sync
    const target = parseInt(manualCap);
    if (isNaN(target)) return;

    const current = session.currentCapacity;
    const diff = target - current;

    if (diff > 0) {
      for(let i=0; i<diff; i++) incrementCapacity();
    } else if (diff < 0) {
      for(let i=0; i<Math.abs(diff); i++) decrementCapacity();
    }
    
    setShowSyncModal(false);
    setManualCap('');
  };

  const capacityPercentage = Math.round((session.currentCapacity / session.maxCapacity) * 100);
  let statusColor = "text-emerald-500";
  if (capacityPercentage > 80) statusColor = "text-amber-500";
  if (capacityPercentage > 95) statusColor = "text-red-500";

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto overflow-y-auto no-scrollbar">
      <div className="flex flex-col flex-1 p-4 space-y-4 pb-40"> {/* Increased padding for scroll clearance */}
        
        {/* Capacity Header Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-xl relative overflow-hidden shrink-0">
          <button 
            onClick={() => setShowSyncModal(true)}
            className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
          >
            <Calculator size={20} />
          </button>

          <h2 className="text-zinc-500 uppercase text-[10px] font-bold tracking-[0.2em] mb-2">Current Capacity</h2>
          <div className={`text-8xl font-mono font-bold tracking-tighter ${statusColor} drop-shadow-2xl transition-all duration-300 scale-100 active:scale-95`}>
            {session.currentCapacity}
          </div>
          <div className="flex justify-center items-center gap-3 mt-4">
            <span className="bg-zinc-800/50 border border-zinc-700/50 px-3 py-1 rounded-full text-xs font-mono text-zinc-400">
              Max: <span className="text-white">{session.maxCapacity}</span>
            </span>
            <span className={`bg-zinc-800/50 border border-zinc-700/50 px-3 py-1 rounded-full text-xs font-mono font-bold ${capacityPercentage > 90 ? 'text-red-400' : 'text-emerald-400'}`}>
              {capacityPercentage}%
            </span>
          </div>
        </div>

        {/* Main Controls - Split View */}
        <div className="grid grid-cols-2 gap-4 min-h-[300px] shrink-0">
          {/* OUT Button */}
          <button
            onClick={decrementCapacity}
            className="group relative bg-zinc-900 hover:bg-zinc-800 active:bg-red-900/20 border border-zinc-800 active:border-red-500/50 rounded-3xl flex flex-col items-center justify-center p-4 transition-all duration-100 shadow-lg active:shadow-inner active:scale-[0.98]"
          >
            <div className="w-20 h-20 rounded-full bg-zinc-800 group-active:bg-red-500/20 flex items-center justify-center mb-4 transition-colors">
               <Minus size={40} className="text-red-500 group-active:text-red-400" />
            </div>
            <span className="font-black text-2xl text-zinc-400 group-active:text-red-400 tracking-wider">OUT</span>
            <span className="absolute bottom-6 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Left Clicker</span>
          </button>
          
          {/* IN Button */}
          <button
            onClick={incrementCapacity}
            className="group relative bg-zinc-900 hover:bg-zinc-800 active:bg-emerald-900/20 border border-zinc-800 active:border-emerald-500/50 rounded-3xl flex flex-col items-center justify-center p-4 transition-all duration-100 shadow-lg active:shadow-inner active:scale-[0.98]"
          >
            <div className="w-20 h-20 rounded-full bg-zinc-800 group-active:bg-emerald-500/20 flex items-center justify-center mb-4 transition-colors">
               <Plus size={40} className="text-emerald-500 group-active:text-emerald-400" />
            </div>
            <span className="font-black text-2xl text-zinc-400 group-active:text-emerald-400 tracking-wider">IN</span>
            <span className="absolute bottom-6 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Right Clicker</span>
          </button>
        </div>

        {/* Quick Rejections */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shrink-0">
          <h3 className="text-zinc-500 uppercase text-[10px] font-bold tracking-wider mb-3 flex items-center gap-2">
            <Ban size={12} className="text-red-500" /> Log Refusal
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {(['Dress Code', 'Intoxicated', 'No ID', 'Banned', 'Attitude', 'Other'] as RejectionReason[]).map((reason) => (
              <button
                key={reason}
                onClick={() => logRejection(reason)}
                className="bg-zinc-800 hover:bg-zinc-700 active:bg-red-900/30 text-zinc-300 py-3 px-2 rounded-xl text-xs font-bold transition-all border border-transparent hover:border-zinc-600 active:border-red-500/30"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl mb-4 sm:mb-0 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calculator size={20} className="text-indigo-500" /> Manual Correction
              </h3>
              <button onClick={() => setShowSyncModal(false)} className="bg-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSyncSubmit} className="space-y-6">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-center">
                 <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Adjust Total To</p>
                 <input 
                  type="number" 
                  inputMode="numeric"
                  value={manualCap}
                  onChange={e => setManualCap(e.target.value)}
                  className="w-full bg-transparent text-center text-4xl font-mono font-bold text-white focus:outline-none placeholder:text-zinc-800"
                  placeholder={session.currentCapacity.toString()}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowSyncModal(false)} className="flex-1 py-4 bg-zinc-800 rounded-xl font-bold text-zinc-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-900/20">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdmissionControl;