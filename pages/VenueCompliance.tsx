
import React, { useState, useRef } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  ClipboardCheck, Droplets, AlertTriangle, Wrench, Flame, 
  Camera, CheckCircle, Trash2, Check, X, MapPin, List, Plus 
} from 'lucide-react';
import { ComplianceType, ComplianceLog } from '../types';

const VenueCompliance: React.FC = () => {
  const { session, addComplianceLog, resolveComplianceLog } = useSecurity();
  const { venue } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'log' | 'active' | 'history'>('log');
  
  // Form State
  const [type, setType] = useState<ComplianceType>('toilet_check');
  const [location, setLocation] = useState(venue?.locations?.[0] || 'Toilets');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve Modal State
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Auto-fill description for standard checks if empty
    let finalDesc = description;
    if (!finalDesc) {
        if (type === 'toilet_check') finalDesc = 'Routine check completed. Clean and stocked.';
        if (type === 'fire_exit') finalDesc = 'Exit clear and unobstructed.';
    }

    try {
        await addComplianceLog(type, location, finalDesc, photo || undefined);
        // Reset
        setDescription('');
        setPhoto(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert('Log submitted successfully');
        setActiveTab('active');
    } catch (e) {
        console.error(e);
        alert('Failed to submit log');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (resolvingId) {
        resolveComplianceLog(resolvingId, resolveNotes || 'Issue resolved.');
        setResolvingId(null);
        setResolveNotes('');
    }
  };

  // Helper for Icons
  const getTypeIcon = (t: ComplianceType) => {
      switch(t) {
          case 'toilet_check': return <ClipboardCheck size={18} className="text-blue-400" />;
          case 'spill': return <Droplets size={18} className="text-cyan-400" />;
          case 'hazard': return <AlertTriangle size={18} className="text-amber-400" />;
          case 'maintenance': return <Wrench size={18} className="text-orange-400" />;
          case 'fire_exit': return <Flame size={18} className="text-red-400" />;
          default: return <CheckCircle size={18} className="text-zinc-400" />;
      }
  };

  const activeLogs = session.complianceLogs?.filter(l => l.status === 'open') || [];
  const historyLogs = session.complianceLogs?.filter(l => l.status === 'resolved') || [];

  return (
    <div className="h-full overflow-y-auto p-4 pb-32 bg-slate-950">
      <div className="flex items-center justify-between mb-6">
         <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="text-emerald-500" /> Venue Ops
         </h2>
         <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <button onClick={() => setActiveTab('log')} className={`p-2 rounded-md ${activeTab === 'log' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}><Plus size={20}/></button>
            <button onClick={() => setActiveTab('active')} className={`p-2 rounded-md relative ${activeTab === 'active' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}>
                <AlertTriangle size={20}/>
                {activeLogs.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            <button onClick={() => setActiveTab('history')} className={`p-2 rounded-md ${activeTab === 'history' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}><List size={20}/></button>
         </div>
      </div>

      {activeTab === 'log' && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-left-4">
           
           {/* Quick Type Selection */}
           <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'toilet_check', label: 'Toilet Check', icon: ClipboardCheck, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
                { id: 'spill', label: 'Spillage / Wet', icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30' },
                { id: 'hazard', label: 'Safety Hazard', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-500/30' },
                { id: 'fire_exit', label: 'Fire Exit Check', icon: Flame, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30' },
                { id: 'maintenance', label: 'Broken Item', icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
                { id: 'cleaning', label: 'Cleaning Req', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
              ].map(opt => (
                 <button
                   key={opt.id}
                   type="button"
                   onClick={() => setType(opt.id as ComplianceType)}
                   className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                     type === opt.id 
                       ? `${opt.bg} ${opt.border} ring-1 ring-white/20` 
                       : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                   }`}
                 >
                    <opt.icon className={opt.color} size={24} />
                    <span className={`text-xs font-bold ${type === opt.id ? 'text-white' : 'text-zinc-500'}`}>{opt.label}</span>
                 </button>
              ))}
           </div>

           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
              <div>
                 <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Location</label>
                 <select 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                 >
                    {venue?.locations?.map(l => <option key={l} value={l}>{l}</option>) || <option>Venue Wide</option>}
                 </select>
              </div>

              <div>
                 <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Notes / Description</label>
                 <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={type === 'toilet_check' ? "Checks passed? Stock replenished?" : "Describe the issue..."}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-24 resize-none outline-none focus:border-emerald-500"
                 />
              </div>

              <div>
                 <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Photo Evidence (Optional)</label>
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="border-2 border-dashed border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/30 transition-colors"
                 >
                    {photo ? (
                        <div className="text-center">
                            <CheckCircle className="mx-auto text-emerald-500 mb-2" />
                            <span className="text-xs text-emerald-400 font-bold">{photo.name}</span>
                            <p className="text-[10px] text-zinc-500">Click to change</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <Camera className="mx-auto text-zinc-600 mb-2" />
                            <span className="text-xs text-zinc-400">Tap to capture</span>
                        </div>
                    )}
                    <input 
                       ref={fileInputRef}
                       type="file" 
                       accept="image/*" 
                       capture="environment"
                       className="hidden"
                       onChange={handlePhotoSelect}
                    />
                 </div>
              </div>
           </div>

           <button 
             type="submit"
             disabled={isSubmitting}
             className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2"
           >
             {isSubmitting ? 'Uploading...' : 'Submit Log'}
           </button>
        </form>
      )}

      {activeTab === 'active' && (
         <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-zinc-500 text-xs font-bold uppercase">Outstanding Issues</h3>
            {activeLogs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-600">
                    <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
                    <p>All clear. No active issues.</p>
                </div>
            ) : (
                activeLogs.map(log => (
                    <div key={log.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                             <div className="flex gap-3">
                                 <div className="mt-1">{getTypeIcon(log.type)}</div>
                                 <div>
                                     <h4 className="font-bold text-white capitalize">{log.type.replace('_', ' ')}</h4>
                                     <p className="text-xs text-zinc-400 flex items-center gap-1"><MapPin size={10}/> {log.location}</p>
                                 </div>
                             </div>
                             <span className="text-[10px] font-mono text-zinc-500">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        
                        <p className="text-sm text-zinc-300 bg-zinc-950 p-2 rounded-lg border border-zinc-800/50">
                            {log.description}
                        </p>
                        
                        {log.photoUrl && (
                            <img src={log.photoUrl} alt="Evidence" className="h-32 w-full object-cover rounded-lg border border-zinc-800" />
                        )}

                        <button 
                          onClick={() => setResolvingId(log.id)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg mt-2"
                        >
                           Mark Resolved / Fixed
                        </button>
                    </div>
                ))
            )}
         </div>
      )}

      {activeTab === 'history' && (
         <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-zinc-500 text-xs font-bold uppercase">Resolved Issues (This Shift)</h3>
            {historyLogs.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 text-sm">No resolved logs yet.</div>
            ) : (
                historyLogs.map(log => (
                    <div key={log.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl opacity-75 hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-start mb-2">
                             <div className="flex gap-2 items-center">
                                 {getTypeIcon(log.type)}
                                 <span className="text-sm font-bold text-zinc-300 capitalize">{log.type.replace('_', ' ')}</span>
                             </div>
                             <span className="text-[10px] bg-emerald-900/30 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">RESOLVED</span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-2">{log.location} • {new Date(log.timestamp).toLocaleTimeString()}</p>
                        {log.resolutionNotes && (
                            <div className="text-xs text-zinc-400 border-l-2 border-emerald-500 pl-2 mt-2">
                                Fixed: {log.resolutionNotes}
                            </div>
                        )}
                    </div>
                ))
            )}
         </div>
      )}

      {/* Resolve Modal */}
      {resolvingId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-2xl p-5 animate-in slide-in-from-bottom-10">
                  <h3 className="text-white font-bold mb-4">Resolve Issue</h3>
                  <textarea 
                    value={resolveNotes}
                    onChange={e => setResolveNotes(e.target.value)}
                    placeholder="What action was taken? (e.g. Cleaned up, Sign placed, Fixed)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-24 mb-4"
                    autoFocus
                  />
                  <div className="flex gap-3">
                      <button onClick={handleResolve} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl">Confirm Fix</button>
                      <button onClick={() => setResolvingId(null)} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl">Cancel</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default VenueCompliance;
