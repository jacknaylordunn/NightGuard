
import React, { useState, useRef, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  ClipboardCheck, Droplets, AlertTriangle, Wrench, Flame, 
  Camera, CheckCircle, List, Plus, User, Megaphone, 
  FileText, Upload, Paperclip, Check
} from 'lucide-react';
import { ComplianceType, Complaint } from '../types';

const VenueCompliance: React.FC = () => {
  const { 
      session, addComplianceLog, resolveComplianceLog, 
      setShiftManager, addComplaint, resolveComplaint, uploadTimesheet 
  } = useSecurity();
  const { venue, userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'ops' | 'complaints' | 'timesheets'>('ops');
  
  // -- OPS LOG STATE --
  const [opsType, setOpsType] = useState<ComplianceType>('toilet_check');
  const [opsLocation, setOpsLocation] = useState(venue?.locations?.[0] || 'Toilets');
  const [opsDescription, setOpsDescription] = useState('');
  const [opsPhoto, setOpsPhoto] = useState<File | null>(null);
  const opsFileRef = useRef<HTMLInputElement>(null);
  const [isSubmittingOps, setIsSubmittingOps] = useState(false);
  const [resolvingOpsId, setResolvingOpsId] = useState<string | null>(null);
  const [resolveOpsNotes, setResolveOpsNotes] = useState('');

  // -- MANAGER STATE --
  const [managerName, setManagerName] = useState(session.shiftManager || userProfile?.displayName || '');
  const [isEditingManager, setIsEditingManager] = useState(false);

  useEffect(() => {
     if (session.shiftManager) setManagerName(session.shiftManager);
  }, [session.shiftManager]);

  // -- COMPLAINTS STATE --
  const [compSource, setCompSource] = useState<'in_person'|'email'|'phone'>('in_person');
  const [compName, setCompName] = useState('');
  const [compDetails, setCompDetails] = useState('');
  const [compContact, setCompContact] = useState('');
  const [isSubmittingComp, setIsSubmittingComp] = useState(false);
  const [resolvingCompId, setResolvingCompId] = useState<string|null>(null);
  const [resolveCompNotes, setResolveCompNotes] = useState('');

  // -- TIMESHEET STATE --
  const [tsFile, setTsFile] = useState<File | null>(null);
  const [tsNotes, setTsNotes] = useState('');
  const tsFileRef = useRef<HTMLInputElement>(null);
  const [isSubmittingTs, setIsSubmittingTs] = useState(false);


  // --- HANDLERS ---

  const handleManagerSave = () => {
      setShiftManager(managerName);
      setIsEditingManager(false);
  };

  const handleOpsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOps(true);
    let finalDesc = opsDescription;
    if (!finalDesc) {
        if (opsType === 'toilet_check') finalDesc = 'Routine check completed. Clean and stocked.';
        if (opsType === 'fire_exit') finalDesc = 'Exit clear and unobstructed.';
    }
    try {
        await addComplianceLog(opsType, opsLocation, finalDesc, opsPhoto || undefined);
        setOpsDescription('');
        setOpsPhoto(null);
        if (opsFileRef.current) opsFileRef.current.value = '';
        alert('Log submitted');
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

  const handleComplaintSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!compDetails) return;
      setIsSubmittingComp(true);
      try {
          await addComplaint({
              source: compSource,
              complainantName: compName,
              contactInfo: compContact,
              details: compDetails
          });
          setCompName('');
          setCompDetails('');
          setCompContact('');
          alert("Complaint Logged");
      } catch (e) {
          alert("Failed");
      } finally {
          setIsSubmittingComp(false);
      }
  };

  const handleResolveComplaint = () => {
      if (resolvingCompId) {
          resolveComplaint(resolvingCompId, resolveCompNotes || 'Resolved');
          setResolvingCompId(null);
          setResolveCompNotes('');
      }
  };

  const handleTimesheetSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tsFile) return;
      setIsSubmittingTs(true);
      try {
          await uploadTimesheet(tsFile, tsNotes);
          setTsFile(null);
          setTsNotes('');
          if(tsFileRef.current) tsFileRef.current.value = '';
          alert("Timesheet Uploaded Successfully");
      } catch (e) {
          alert("Upload failed");
      } finally {
          setIsSubmittingTs(false);
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

  return (
    <div className="h-full overflow-y-auto p-4 pb-32 bg-slate-950">
      
      {/* Header & Shift Manager */}
      <div className="mb-6 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="bg-indigo-900/30 p-2 rounded-full text-indigo-400">
                  <User size={20} />
              </div>
              <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Shift Manager</span>
                  {isEditingManager ? (
                      <input 
                        value={managerName} 
                        onChange={e => setManagerName(e.target.value)}
                        onBlur={handleManagerSave}
                        autoFocus
                        placeholder="Name & SIA No."
                        className="bg-black border border-zinc-700 rounded px-2 py-0.5 text-sm text-white w-40 focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                      />
                  ) : (
                      <button onClick={() => setIsEditingManager(true)} className="text-white font-bold text-sm text-left hover:text-indigo-400">
                          {session.shiftManager || "Tap to set name"}
                      </button>
                  )}
              </div>
          </div>
          {session.shiftManager && <CheckCircle size={16} className="text-emerald-500" />}
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 bg-zinc-900 rounded-xl border border-zinc-800 p-1 mb-6">
          <button onClick={() => setActiveTab('ops')} className={`py-2 text-xs font-bold rounded-lg ${activeTab === 'ops' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>
              Ops Logs
          </button>
          <button onClick={() => setActiveTab('complaints')} className={`py-2 text-xs font-bold rounded-lg ${activeTab === 'complaints' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>
              Complaints
          </button>
          <button onClick={() => setActiveTab('timesheets')} className={`py-2 text-xs font-bold rounded-lg ${activeTab === 'timesheets' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>
              Timesheets
          </button>
      </div>

      {/* --- TAB: OPS LOGS --- */}
      {activeTab === 'ops' && (
        <div className="animate-in fade-in slide-in-from-left-4 space-y-6">
           {/* Add Log Form */}
           <form onSubmit={handleOpsSubmit} className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
               <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2">New Entry</h3>
               
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                 {[
                    { id: 'toilet_check', icon: ClipboardCheck, color: 'text-blue-400' },
                    { id: 'spill', icon: Droplets, color: 'text-cyan-400' },
                    { id: 'hazard', icon: AlertTriangle, color: 'text-amber-400' },
                    { id: 'fire_exit', icon: Flame, color: 'text-red-400' },
                    { id: 'maintenance', icon: Wrench, color: 'text-orange-400' },
                    { id: 'cleaning', icon: CheckCircle, color: 'text-emerald-400' },
                  ].map(opt => (
                     <button
                       key={opt.id}
                       type="button"
                       onClick={() => setOpsType(opt.id as ComplianceType)}
                       className={`flex-shrink-0 p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                         opsType === opt.id ? `bg-zinc-800 border-zinc-600` : 'bg-zinc-950 border-zinc-800 opacity-60'
                       }`}
                     >
                        <opt.icon className={opt.color} size={20} />
                     </button>
                  ))}
               </div>

               <div className="grid grid-cols-2 gap-2">
                  <select value={opsLocation} onChange={e => setOpsLocation(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none">
                     {venue?.locations?.map(l => <option key={l} value={l}>{l}</option>) || <option>Venue Wide</option>}
                  </select>
                  <div onClick={() => opsFileRef.current?.click()} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-center cursor-pointer hover:bg-zinc-800">
                      {opsPhoto ? <CheckCircle size={18} className="text-emerald-500" /> : <Camera size={18} className="text-zinc-500" />}
                      <input ref={opsFileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setOpsPhoto(e.target.files[0])} />
                  </div>
               </div>

               <textarea 
                  value={opsDescription}
                  onChange={e => setOpsDescription(e.target.value)}
                  placeholder={opsType === 'toilet_check' ? "Check complete..." : "Details..."}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-20 resize-none text-sm outline-none"
               />

               <button type="submit" disabled={isSubmittingOps} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold shadow-lg">
                   {isSubmittingOps ? 'Saving...' : 'Log Entry'}
               </button>
           </form>

           {/* Active Logs */}
           <div className="space-y-3">
              <h3 className="text-zinc-500 text-xs font-bold uppercase">Active Issues</h3>
              {session.complianceLogs?.filter(l => l.status === 'open').length === 0 ? (
                  <div className="text-center text-zinc-600 text-sm py-4">No active issues</div>
              ) : (
                  session.complianceLogs?.filter(l => l.status === 'open').map(log => (
                      <div key={log.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                          <div className="flex justify-between items-start">
                             <div className="flex gap-2">
                                 {getTypeIcon(log.type)}
                                 <span className="text-white font-bold text-sm capitalize">{log.type.replace('_', ' ')}</span>
                             </div>
                             <button onClick={() => setResolvingOpsId(log.id)} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded">Resolve</button>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">{log.location} • {log.description}</p>
                          {log.photoUrl && <div className="mt-2 text-[10px] text-blue-400 flex items-center gap-1"><Paperclip size={10}/> Photo Attached</div>}
                      </div>
                  ))
              )}
           </div>
        </div>
      )}

      {/* --- TAB: COMPLAINTS --- */}
      {activeTab === 'complaints' && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
              <form onSubmit={handleComplaintSubmit} className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                  <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                      <Megaphone size={14}/> Log Complaint
                  </h3>
                  
                  <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                      {(['in_person', 'email', 'phone'] as const).map(s => (
                          <button 
                            key={s} 
                            type="button" 
                            onClick={() => setCompSource(s)}
                            className={`flex-1 py-1 text-[10px] font-bold uppercase rounded ${compSource === s ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                          >
                              {s.replace('_', ' ')}
                          </button>
                      ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                      <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Complainant Name" className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none" />
                      <input value={compContact} onChange={e => setCompContact(e.target.value)} placeholder="Phone/Email" className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none" />
                  </div>

                  <textarea 
                    value={compDetails} 
                    onChange={e => setCompDetails(e.target.value)} 
                    placeholder={compSource === 'email' ? "Paste email body here..." : "Nature of complaint..."} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-24 resize-none text-sm outline-none" 
                  />
                  
                  <button type="submit" disabled={isSubmittingComp} className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold shadow-lg">
                     {isSubmittingComp ? 'Logging...' : 'Log Complaint'}
                  </button>
              </form>

              <div className="space-y-3">
                  {session.complaints?.map(c => (
                      <div key={c.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <h4 className="text-white font-bold text-sm">{c.complainantName || 'Anonymous'}</h4>
                                  <span className="text-[10px] text-zinc-500 uppercase">{c.source.replace('_', ' ')}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${c.status === 'resolved' ? 'bg-emerald-900 text-emerald-400' : 'bg-red-900 text-red-400'}`}>
                                  {c.status}
                              </span>
                          </div>
                          <p className="text-xs text-zinc-300 bg-zinc-950 p-2 rounded mb-2">{c.details}</p>
                          {c.status === 'open' && (
                              <button onClick={() => setResolvingCompId(c.id)} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded">
                                  Mark Resolved
                              </button>
                          )}
                          {c.resolution && (
                              <div className="text-[10px] text-emerald-400 border-l-2 border-emerald-500 pl-2">
                                  Resolution: {c.resolution}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- TAB: TIMESHEETS --- */}
      {activeTab === 'timesheets' && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
               <form onSubmit={handleTimesheetSubmit} className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                  <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                      <FileText size={14}/> Upload Sheet
                  </h3>
                  
                  <div 
                     onClick={() => tsFileRef.current?.click()}
                     className="border-2 border-dashed border-zinc-800 bg-zinc-950 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-900"
                  >
                      {tsFile ? (
                          <>
                             <FileText size={32} className="text-emerald-500 mb-2"/>
                             <span className="text-xs text-emerald-400 font-bold">{tsFile.name}</span>
                          </>
                      ) : (
                          <>
                             <Upload size={32} className="text-zinc-600 mb-2"/>
                             <span className="text-xs text-zinc-500">Tap to upload photo/PDF</span>
                          </>
                      )}
                      <input ref={tsFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => e.target.files && setTsFile(e.target.files[0])} />
                  </div>

                  <input value={tsNotes} onChange={e => setTsNotes(e.target.value)} placeholder="Notes (Optional)" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none" />
                  
                  <button type="submit" disabled={isSubmittingTs} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg">
                      {isSubmittingTs ? 'Uploading...' : 'Save Timesheet'}
                  </button>
               </form>

               <div className="space-y-3">
                   {session.timesheets?.map(ts => (
                       <div key={ts.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                           <div className="flex items-center gap-3">
                               <div className="bg-zinc-800 p-2 rounded text-zinc-400">
                                   <FileText size={20} />
                               </div>
                               <div>
                                   <span className="text-white font-bold text-sm block">Timesheet</span>
                                   <span className="text-[10px] text-zinc-500">{new Date(ts.timestamp).toLocaleTimeString()} • {ts.uploadedBy}</span>
                               </div>
                           </div>
                           <a href={ts.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-xs font-bold hover:underline">
                               View
                           </a>
                       </div>
                   ))}
                   {(!session.timesheets || session.timesheets.length === 0) && (
                       <div className="text-center text-zinc-600 text-sm py-4">No timesheets uploaded tonight.</div>
                   )}
               </div>
          </div>
      )}

      {/* --- MODALS --- */}
      
      {/* Resolve Ops Modal */}
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

      {/* Resolve Complaint Modal */}
      {resolvingCompId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-2xl p-5">
                  <h3 className="text-white font-bold mb-4">Resolve Complaint</h3>
                  <textarea value={resolveCompNotes} onChange={e => setResolveCompNotes(e.target.value)} placeholder="Outcome..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-24 mb-4"/>
                  <div className="flex gap-3">
                      <button onClick={handleResolveComplaint} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl">Close Case</button>
                      <button onClick={() => setResolvingCompId(null)} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default VenueCompliance;
