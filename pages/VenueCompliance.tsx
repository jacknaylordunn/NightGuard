
import React, { useState, useRef } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  ClipboardCheck, Droplets, AlertTriangle, Wrench, Flame, 
  Camera, CheckCircle, Paperclip, Check, Trash2, Edit2, Clock, X, Save
} from 'lucide-react';
import { ComplianceType } from '../types';

const VenueCompliance: React.FC = () => {
  const { session, addComplianceLog, resolveComplianceLog, removeComplianceLog, updateComplianceLog } = useSecurity();
  const { venue } = useAuth();
  
  // -- OPS LOG STATE --
  const [opsType, setOpsType] = useState<ComplianceType>('toilet_check');
  const [opsLocation, setOpsLocation] = useState(venue?.locations?.[0] || 'Toilets');
  const [opsDescription, setOpsDescription] = useState('');
  const [opsPhoto, setOpsPhoto] = useState<File | null>(null);
  const [opsTime, setOpsTime] = useState<string>(''); // For "New Entry" time, empty implies now
  const opsFileRef = useRef<HTMLInputElement>(null);
  const [isSubmittingOps, setIsSubmittingOps] = useState(false);
  
  // Resolve State
  const [resolvingOpsId, setResolvingOpsId] = useState<string | null>(null);
  const [resolveOpsNotes, setResolveOpsNotes] = useState('');
  
  // Edit Time State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState<string>('');

  const combineDateAndTime = (timeStr: string, originalIsoStr?: string) => {
    // If we have an original time, use its date, otherwise use today
    const dateBase = originalIsoStr ? new Date(originalIsoStr) : new Date();
    
    // timeStr is HH:mm
    if (!timeStr) return dateBase.toISOString();
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    dateBase.setHours(hours, minutes, 0, 0);
    return dateBase.toISOString();
  }

  const handleOpsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOps(true);
    let finalDesc = opsDescription;
    if (!finalDesc) {
        if (opsType === 'toilet_check') finalDesc = 'Routine check completed. Clean and stocked.';
        if (opsType === 'fire_exit') finalDesc = 'Exit clear and unobstructed.';
    }
    
    const finalTime = opsTime ? combineDateAndTime(opsTime) : undefined;

    try {
        await addComplianceLog(opsType, opsLocation, finalDesc, opsPhoto || undefined, finalTime);
        setOpsDescription('');
        setOpsPhoto(null);
        setOpsTime('');
        if (opsFileRef.current) opsFileRef.current.value = '';
    } catch (e) {
        alert('Failed to submit log');
    } finally {
        setIsSubmittingOps(false);
    }
  };

  const handleResolveOps = () => {
    if (resolvingOpsId) {
        resolveComplianceLog(resolvingOpsId, resolveOpsNotes || 'Issue resolved.');
        setResolvingOpsId(null);
        setResolveOpsNotes('');
    }
  };

  const handleTimeEditSave = (logId: string, originalIso: string) => {
      const newIso = combineDateAndTime(editingTimeValue, originalIso);
      updateComplianceLog(logId, { timestamp: newIso });
      setEditingLogId(null);
  };

  const getTypeIcon = (t: ComplianceType) => {
      switch(t) {
          case 'toilet_check': return <ClipboardCheck size={20} className="text-blue-400" />;
          case 'spill': return <Droplets size={20} className="text-cyan-400" />;
          case 'hazard': return <AlertTriangle size={20} className="text-amber-400" />;
          case 'maintenance': return <Wrench size={20} className="text-orange-400" />;
          case 'fire_exit': return <Flame size={20} className="text-red-400" />;
          default: return <CheckCircle size={20} className="text-zinc-400" />;
      }
  };

  // Types that require explicit "Mark Done" resolution. 
  // Toilet checks and Fire Exits are treated as "Point in Time" records unless flagged as Hazard/Maintenance.
  const actionableTypes = ['spill', 'hazard', 'maintenance', 'cleaning', 'other'];

  return (
    <div className="h-full overflow-y-auto p-4 pb-32 bg-slate-950">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <ClipboardCheck className="text-emerald-500" /> Venue Ops Log
      </h2>

      {/* NEW ENTRY FORM */}
      <form onSubmit={handleOpsSubmit} className="space-y-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 shadow-xl mb-8">
           <div className="flex justify-between items-center mb-2">
              <h3 className="text-zinc-400 text-xs font-bold uppercase">New Log Entry</h3>
              <div className="flex items-center gap-2">
                  <Clock size={14} className="text-zinc-500" />
                  <input 
                    type="time" 
                    value={opsTime} 
                    onChange={e => setOpsTime(e.target.value)} 
                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                  />
                  {!opsTime && <span className="text-[10px] text-zinc-600">(Now)</span>}
              </div>
           </div>
           
           <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
             {[
                { id: 'toilet_check', label: 'Toilet', icon: ClipboardCheck, color: 'text-blue-400' },
                { id: 'spill', label: 'Spill', icon: Droplets, color: 'text-cyan-400' },
                { id: 'hazard', label: 'Hazard', icon: AlertTriangle, color: 'text-amber-400' },
                { id: 'fire_exit', label: 'Fire Exit', icon: Flame, color: 'text-red-400' },
                { id: 'maintenance', label: 'Fix', icon: Wrench, color: 'text-orange-400' },
              ].map(opt => (
                 <button
                   key={opt.id}
                   type="button"
                   onClick={() => setOpsType(opt.id as ComplianceType)}
                   className={`flex-shrink-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                     opsType === opt.id ? `bg-zinc-800 border-zinc-500 scale-105 shadow-lg` : 'bg-zinc-950 border-zinc-800 opacity-60'
                   }`}
                 >
                    <opt.icon className={opt.color} size={20} />
                    <span className="text-[9px] font-medium text-zinc-300">{opt.label}</span>
                 </button>
              ))}
           </div>

           <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                  <select value={opsLocation} onChange={e => setOpsLocation(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500">
                     {venue?.locations?.map(l => <option key={l} value={l}>{l}</option>) || <option>Venue Wide</option>}
                  </select>
              </div>
              <div onClick={() => opsFileRef.current?.click()} className="bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-800">
                  {opsPhoto ? <CheckCircle size={20} className="text-emerald-500" /> : <Camera size={20} className="text-zinc-500" />}
                  <input ref={opsFileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setOpsPhoto(e.target.files[0])} />
              </div>
           </div>

           <textarea 
              value={opsDescription}
              onChange={e => setOpsDescription(e.target.value)}
              placeholder={opsType === 'toilet_check' ? "Routine check completed..." : "Details of issue..."}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-20 resize-none text-sm outline-none focus:border-emerald-500"
           />

           <button type="submit" disabled={isSubmittingOps} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg transition-colors">
               {isSubmittingOps ? 'Saving...' : 'Submit Log'}
           </button>
      </form>

      {/* FEED */}
      <h3 className="text-zinc-500 text-xs font-bold uppercase mb-4">Shift Timeline</h3>
      <div className="space-y-4">
          {session.complianceLogs?.length === 0 ? (
              <div className="text-center text-zinc-600 text-sm py-4">No logs yet.</div>
          ) : (
              [...session.complianceLogs].reverse().map(log => (
                  <div key={log.id} className="relative pl-6 border-l-2 border-zinc-800">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-zinc-900 border-2 border-zinc-700"></div>
                      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-4 shadow-sm group">
                          
                          {/* DELETE BUTTON (Absolute top right) */}
                          <button 
                            onClick={() => removeComplianceLog(log.id)}
                            className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                          >
                             <Trash2 size={14} />
                          </button>

                          <div className="flex justify-between items-start mb-2 pr-6">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 shadow-inner">
                                    {getTypeIcon(log.type)}
                                 </div>
                                 <div>
                                     <span className="text-white font-bold text-sm block capitalize">{log.type.replace('_', ' ')}</span>
                                     <span className="text-xs text-zinc-500">{log.location}</span>
                                 </div>
                             </div>
                             
                             {/* Resolution Status / Button */}
                             {actionableTypes.includes(log.type) && (
                                 log.status === 'open' ? (
                                     <button onClick={() => setResolvingOpsId(log.id)} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-full font-bold">Mark Done</button>
                                 ) : (
                                     <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1"><Check size={10}/> Fixed</span>
                                 )
                             )}
                          </div>

                          <p className="text-sm text-zinc-300 mt-2 bg-zinc-950/50 p-2 rounded">{log.description}</p>
                          
                          <div className="mt-2 flex justify-between items-center text-[10px] text-zinc-500">
                              <div className="flex items-center gap-2">
                                  {editingLogId === log.id ? (
                                      <div className="flex items-center gap-1 bg-zinc-950 rounded border border-zinc-700 px-1">
                                          <input 
                                            type="time" 
                                            value={editingTimeValue} 
                                            onChange={e => setEditingTimeValue(e.target.value)}
                                            className="bg-transparent text-white w-16 focus:outline-none"
                                            autoFocus
                                          />
                                          <button onClick={() => handleTimeEditSave(log.id, log.timestamp)} className="text-emerald-500 hover:text-emerald-400 p-1"><Save size={12}/></button>
                                          <button onClick={() => setEditingLogId(null)} className="text-red-500 hover:text-red-400 p-1"><X size={12}/></button>
                                      </div>
                                  ) : (
                                      <button 
                                        onClick={() => { setEditingLogId(log.id); setEditingTimeValue(new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: false})); }}
                                        className="hover:text-white flex items-center gap-1 group/time"
                                      >
                                          {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                          <Edit2 size={10} className="opacity-0 group-hover/time:opacity-100" />
                                      </button>
                                  )}
                                  <span>• {log.loggedBy}</span>
                              </div>
                              {log.photoUrl && <span className="text-blue-400 flex items-center gap-1"><Paperclip size={10}/> Photo</span>}
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Resolve Modal */}
      {resolvingOpsId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-2xl p-5">
                  <h3 className="text-white font-bold mb-4">Resolve Issue</h3>
                  <textarea value={resolveOpsNotes} onChange={e => setResolveOpsNotes(e.target.value)} placeholder="Action taken..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-24 mb-4"/>
                  <div className="flex gap-3">
                      <button onClick={handleResolveOps} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl">Confirm</button>
                      <button onClick={() => setResolvingOpsId(null)} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default VenueCompliance;
