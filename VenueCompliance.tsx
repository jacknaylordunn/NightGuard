
import React, { useState, useRef, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  ClipboardCheck, Droplets, AlertTriangle, Wrench, Flame, 
  Camera, CheckCircle, Paperclip, Check, Trash2, Edit2, Clock, X, Save,
  CheckSquare, ScanLine, Search, ShieldCheck, MapPin, Nfc, Radio, UserCheck,
  FileText, MessageSquare
} from 'lucide-react';
import { ComplianceType, ChecklistItem } from '../types';
import { Html5Qrcode } from "html5-qrcode";

// --- QR SCANNER MODAL ---
const ScannerModal: React.FC<{ 
  onScan: (decodedText: string) => void; 
  onClose: () => void; 
}> = ({ onScan, onClose }) => {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start(
      { facingMode: "environment" }, 
      config, 
      (decodedText: string) => {
        html5QrCode.stop().then(() => {
            onScan(decodedText);
        });
      },
      () => {}
    ).catch((err: any) => console.error(err));

    return () => {
      if(html5QrCode.isScanning) html5QrCode.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm relative">
         <button onClick={onClose} className="absolute -top-12 right-0 text-white p-2">
            <X size={24} />
         </button>
         <div id="qr-reader" className="bg-black border border-zinc-700 rounded-xl overflow-hidden shadow-2xl"></div>
      </div>
    </div>
  );
};

// --- NFC SCANNER OVERLAY ---
const NFCReaderOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 backdrop-blur-md" onClick={onClose}>
       <div className="bg-zinc-900 border border-indigo-500/50 p-8 rounded-3xl text-center shadow-2xl shadow-indigo-500/20 max-w-xs w-full">
          <Nfc size={48} className="text-indigo-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Ready to Scan</h3>
          <p className="text-zinc-400 text-sm">Hold device near NFC tag.</p>
       </div>
    </div>
  );
};

// --- COMPONENT: Checklist Group ---
const ChecklistGroup: React.FC<{
  title: string;
  items: ChecklistItem[];
  type: 'pre' | 'post';
  disabled?: boolean;
  onToggle: (type: 'pre' | 'post', id: string, verified: boolean, method: 'manual' | 'nfc' | 'qr') => void;
  onVerifyRequest: (item: ChecklistItem) => void;
}> = ({ title, items, type, disabled, onToggle, onVerifyRequest }) => {
  const completed = items.filter(i => i.checked).length;
  const total = items.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className={`bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden mb-6 shadow-sm ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex-1">
          <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wide">{title}</h3>
          <div className="h-1 w-full max-w-[120px] bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className={`h-full transition-all duration-500 ${completed === total ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400 font-bold">{completed}/{total}</span>
      </div>
      <div className="divide-y divide-slate-800/50">
        {items.map((item) => (
          <div key={item.id} className={`p-4 flex items-center gap-4 ${item.checked ? 'bg-slate-800/20' : 'hover:bg-slate-800/30'}`}>
            <button
               onClick={() => {
                  if (item.checkpointId && !item.checked) {
                     onVerifyRequest(item);
                  } else {
                     onToggle(type, item.id, false, 'manual');
                  }
               }}
               className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center transition-all border ${item.checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-600 bg-slate-800 text-slate-500'}`}
            >
              {item.checked ? <CheckSquare size={16} /> : item.checkpointId ? <ScanLine size={16} /> : <div className="w-2 h-2 rounded-full bg-slate-500"></div>}
            </button>
            <div className="flex-1" onClick={() => !item.checked && !item.checkpointId && onToggle(type, item.id, false, 'manual')}>
              <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-bold ${item.checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.label}</span>
                  {item.checkpointId && !item.checked && <span className="text-[10px] font-bold text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-500/20">SCAN REQ</span>}
              </div>
              {item.checked && <div className="text-[10px] text-slate-500 font-mono">{new Date(item.timestamp!).toLocaleTimeString()} • {item.checkedBy}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const VenueCompliance: React.FC = () => {
  const { 
    session, addComplianceLog, resolveComplianceLog, removeComplianceLog, updateComplianceLog,
    toggleChecklist, markFloorChecksComplete, hasNfcSupport,
    addComplaint, resolveComplaint, uploadTimesheet
  } = useSecurity();
  const { venue } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'ops' | 'tasks' | 'complaints' | 'timesheets'>('ops');
  
  // -- COMPLAINTS STATE --
  const [complaintSource, setComplaintSource] = useState<'in_person' | 'email' | 'phone' | 'social_media'>('in_person');
  const [complaintName, setComplaintName] = useState('');
  const [complaintContact, setComplaintContact] = useState('');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [resolvingComplaintId, setResolvingComplaintId] = useState<string | null>(null);
  const [resolveComplaintNotes, setResolveComplaintNotes] = useState('');

  // -- TIMESHEETS STATE --
  const [timesheetFile, setTimesheetFile] = useState<File | null>(null);
  const [timesheetNotes, setTimesheetNotes] = useState('');
  const [isUploadingTimesheet, setIsUploadingTimesheet] = useState(false);
  const timesheetFileRef = useRef<HTMLInputElement>(null);

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

  // Tasks State
  const [showScanner, setShowScanner] = useState(false);
  const [showNfcReader, setShowNfcReader] = useState(false);
  const [scanTarget, setScanTarget] = useState<{ type: 'checklist', itemId?: string, checkType?: 'pre'|'post' } | null>(null);

  const processScanResult = (decodedText: string, method: 'qr' | 'nfc') => {
     setShowScanner(false);
     setShowNfcReader(false);
     if (scanTarget?.type === 'checklist' && scanTarget.itemId && scanTarget.checkType) {
        const list = scanTarget.checkType === 'pre' ? session.preEventChecks : session.postEventChecks;
        const item = list.find(i => i.id === scanTarget.itemId);
        if (item && item.checkpointId === decodedText) {
            toggleChecklist(scanTarget.checkType, item.id, true, method);
            if(navigator.vibrate) navigator.vibrate(200);
        } else {
            alert(`Mismatch! Scanned: ${decodedText}.`);
        }
     }
  };

  const startNfcScan = async () => {
    if (!('NDEFReader' in window)) return;
    setShowNfcReader(true);
    try {
        const ndef = new (window as any).NDEFReader();
        await ndef.scan();
        ndef.onreading = (event: any) => {
            const decoder = new TextDecoder();
            for (const record of event.message.records) processScanResult(decoder.decode(record.data), 'nfc');
        };
    } catch (error) { setShowNfcReader(false); }
  };

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

  const handleComplaintSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!complaintDetails) return;
      setIsSubmittingComplaint(true);
      try {
          await addComplaint({
              source: complaintSource,
              complainantName: complaintName,
              contactInfo: complaintContact,
              details: complaintDetails
          });
          setComplaintName('');
          setComplaintContact('');
          setComplaintDetails('');
      } catch (err) {
          alert('Failed to log complaint');
      } finally {
          setIsSubmittingComplaint(false);
      }
  };

  const handleResolveComplaint = () => {
      if (resolvingComplaintId) {
          resolveComplaint(resolvingComplaintId, resolveComplaintNotes || 'Resolved.');
          setResolvingComplaintId(null);
          setResolveComplaintNotes('');
      }
  };

  const handleTimesheetUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!timesheetFile) return;
      setIsUploadingTimesheet(true);
      try {
          await uploadTimesheet(timesheetFile, timesheetNotes);
          setTimesheetFile(null);
          setTimesheetNotes('');
          if (timesheetFileRef.current) timesheetFileRef.current.value = '';
      } catch (err) {
          alert('Failed to upload timesheet');
      } finally {
          setIsUploadingTimesheet(false);
      }
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
      {showScanner && <ScannerModal onScan={(txt) => processScanResult(txt, 'qr')} onClose={() => setShowScanner(false)} />}
      {showNfcReader && <NFCReaderOverlay onClose={() => setShowNfcReader(false)} />}

      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <ClipboardCheck className="text-emerald-500" /> Venue Compliance
      </h2>

      <div className="grid grid-cols-4 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-6">
        <button onClick={() => setActiveTab('ops')} className={`py-3 text-xs font-bold rounded-lg flex flex-col items-center justify-center gap-1 ${activeTab === 'ops' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}><ClipboardCheck size={16} /> Ops Log</button>
        <button onClick={() => setActiveTab('tasks')} className={`py-3 text-xs font-bold rounded-lg flex flex-col items-center justify-center gap-1 ${activeTab === 'tasks' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}><CheckCircle size={16} /> Tasks</button>
        <button onClick={() => setActiveTab('complaints')} className={`py-3 text-xs font-bold rounded-lg flex flex-col items-center justify-center gap-1 ${activeTab === 'complaints' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}><AlertTriangle size={16} /> Complaints</button>
        <button onClick={() => setActiveTab('timesheets')} className={`py-3 text-xs font-bold rounded-lg flex flex-col items-center justify-center gap-1 ${activeTab === 'timesheets' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}><FileText size={16} /> Timesheets</button>
      </div>

      {activeTab === 'ops' && (
        <>
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
        </>
      )}

      {activeTab === 'tasks' && (
          <div className="space-y-2">
            <ChecklistGroup title="Pre-Opening" items={session.preEventChecks} type="pre" onToggle={toggleChecklist} onVerifyRequest={(item) => { setScanTarget({ type: 'checklist', itemId: item.id, checkType: 'pre' }); if(hasNfcSupport) startNfcScan(); else setShowScanner(true); }} />
            
            <div className={`bg-slate-900 rounded-2xl border border-slate-800 p-4 mb-6 shadow-sm ${session.preEventChecks.every(i => i.checked) ? '' : 'opacity-50 pointer-events-none'}`}>
              <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wide mb-2">Floor Checks</h3>
              <p className="text-xs text-slate-400 mb-4">Confirm that all required floor checks and patrols have been completed for this shift.</p>
              <button 
                onClick={() => markFloorChecksComplete(!session.floorChecksCompleted)}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${session.floorChecksCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {session.floorChecksCompleted ? <><CheckCircle size={18} /> Floor Checks Completed</> : 'Mark Floor Checks Complete'}
              </button>
            </div>

            <ChecklistGroup disabled={!session.floorChecksCompleted} title="Closing Checks" items={session.postEventChecks} type="post" onToggle={toggleChecklist} onVerifyRequest={(item) => { setScanTarget({ type: 'checklist', itemId: item.id, checkType: 'post' }); if(hasNfcSupport) startNfcScan(); else setShowScanner(true); }} />
          </div>
      )}

      {activeTab === 'complaints' && (
        <>
          <form onSubmit={handleComplaintSubmit} className="space-y-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 shadow-xl mb-8">
            <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2">Log Customer Complaint</h3>
            
            <div className="flex gap-3 mb-4 flex-wrap">
              {['in_person', 'email', 'phone', 'social_media'].map(src => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setComplaintSource(src as any)}
                  className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg border capitalize ${complaintSource === src ? 'bg-amber-900/30 text-amber-400 border-amber-800/50' : 'bg-zinc-950 text-zinc-500 border-zinc-800'}`}
                >
                  {src.replace('_', ' ')}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Customer Name (Optional)"
              value={complaintName}
              onChange={e => setComplaintName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
            
            <input
              type="text"
              placeholder="Contact Info (Email/Phone) (Optional)"
              value={complaintContact}
              onChange={e => setComplaintContact(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />

            <textarea
              placeholder="Complaint Details..."
              value={complaintDetails}
              onChange={e => setComplaintDetails(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white h-24 focus:outline-none focus:border-amber-500/50"
              required
            />

            <button
              type="submit"
              disabled={isSubmittingComplaint || !complaintDetails}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingComplaint ? 'Logging...' : <><MessageSquare size={18} /> Log Complaint</>}
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-zinc-400 text-xs font-bold uppercase mb-4">Logged Complaints</h3>
            {session.complaints?.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 border border-dashed border-zinc-800 rounded-2xl">
                No complaints logged.
              </div>
            ) : (
              session.complaints?.map(complaint => (
                <div key={complaint.id} className={`bg-zinc-900 border rounded-xl p-4 ${complaint.status === 'resolved' ? 'border-emerald-900/50 opacity-75' : 'border-amber-900/50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className={complaint.status === 'resolved' ? 'text-emerald-500' : 'text-amber-500'} />
                      <span className="text-xs font-bold text-white capitalize">{complaint.source.replace('_', ' ')} Complaint</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(complaint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {complaint.complainantName && (
                    <div className="text-xs text-zinc-400 mb-1">
                      <span className="font-bold">Customer:</span> {complaint.complainantName} {complaint.contactInfo && `(${complaint.contactInfo})`}
                    </div>
                  )}
                  
                  <p className="text-sm text-zinc-300 mb-3">{complaint.details}</p>
                  
                  {complaint.status === 'resolved' ? (
                    <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3 mt-3">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                        <CheckCircle size={14} /> Resolved
                      </div>
                      <p className="text-xs text-emerald-200/70">{complaint.resolution}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingComplaintId(complaint.id)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'timesheets' && (
        <>
          <form onSubmit={handleTimesheetUpload} className="space-y-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 shadow-xl mb-8">
            <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2">Upload Timesheet</h3>
            
            <div className="relative">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={e => setTimesheetFile(e.target.files?.[0] || null)}
                ref={timesheetFileRef}
                className="hidden"
                id="timesheet-upload"
              />
              <label
                htmlFor="timesheet-upload"
                className="flex items-center justify-center gap-2 w-full bg-zinc-950 border border-dashed border-zinc-700 hover:border-indigo-500/50 rounded-xl p-6 text-sm text-zinc-400 cursor-pointer transition-colors"
              >
                <Paperclip size={20} />
                {timesheetFile ? timesheetFile.name : 'Select File (Image/PDF)'}
              </label>
            </div>

            <input
              type="text"
              placeholder="Notes (e.g., Week 42, Missing John's hours)"
              value={timesheetNotes}
              onChange={e => setTimesheetNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />

            <button
              type="submit"
              disabled={isUploadingTimesheet || !timesheetFile}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploadingTimesheet ? 'Uploading...' : <><FileText size={18} /> Upload Timesheet</>}
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-zinc-400 text-xs font-bold uppercase mb-4">Uploaded Timesheets</h3>
            {session.timesheets?.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 border border-dashed border-zinc-800 rounded-2xl">
                No timesheets uploaded.
              </div>
            ) : (
              session.timesheets?.map(ts => (
                <div key={ts.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-950/50 p-2 rounded-lg text-indigo-400">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Timesheet</div>
                      <div className="text-[10px] text-zinc-500">
                        {new Date(ts.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                      {ts.notes && <div className="text-xs text-zinc-400 mt-1">{ts.notes}</div>}
                    </div>
                  </div>
                  <a
                    href={ts.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-bold px-3 py-1.5 bg-indigo-950/30 rounded-lg"
                  >
                    View
                  </a>
                </div>
              ))
            )}
          </div>
        </>
      )}

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

      {/* Resolve Complaint Modal */}
      {resolvingComplaintId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-2xl p-5">
                  <h3 className="text-white font-bold mb-4">Resolve Complaint</h3>
                  <textarea value={resolveComplaintNotes} onChange={e => setResolveComplaintNotes(e.target.value)} placeholder="Resolution details..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-24 mb-4"/>
                  <div className="flex gap-3">
                      <button onClick={handleResolveComplaint} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl">Confirm</button>
                      <button onClick={() => setResolvingComplaintId(null)} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default VenueCompliance;
