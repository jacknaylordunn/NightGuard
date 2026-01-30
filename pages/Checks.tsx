
import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, ScanLine, X, Search, ShieldCheck, MapPin, 
  Nfc, Radio, CheckCircle, RefreshCcw 
} from 'lucide-react';
import { ChecklistItem } from '../types';
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
      (decodedText) => {
        html5QrCode.stop().then(() => {
            onScan(decodedText);
        });
      },
      () => {}
    ).catch(err => console.error(err));

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
         <p className="text-center text-zinc-400 mt-4 text-sm font-medium">Align QR Code within frame</p>
      </div>
    </div>
  );
};

// --- NFC SCANNER OVERLAY ---
const NFCReaderOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 backdrop-blur-md animate-in fade-in" onClick={onClose}>
       <div className="bg-zinc-900 border border-indigo-500/50 p-8 rounded-3xl text-center shadow-2xl shadow-indigo-500/20 max-w-xs w-full">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
             <div className="absolute inset-0 border-4 border-indigo-500 rounded-full opacity-20 animate-ping"></div>
             <Nfc size={48} className="text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Scan</h3>
          <p className="text-zinc-400 text-sm mb-6">Hold your device near the NFC tag to verify presence.</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm font-medium">Cancel</button>
       </div>
    </div>
  );
};

// --- COMPONENT: Checklist Group ---
const ChecklistGroup: React.FC<{
  title: string;
  items: ChecklistItem[];
  type: 'pre' | 'post';
  onToggle: (type: 'pre' | 'post', id: string, verified: boolean, method: 'manual' | 'nfc' | 'qr') => void;
  onVerifyRequest: (item: ChecklistItem) => void;
}> = ({ title, items, type, onToggle, onVerifyRequest }) => {
  const completed = items.filter(i => i.checked).length;
  const total = items.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden mb-6 shadow-sm">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex-1">
          <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wide flex items-center gap-2">
            {title}
          </h3>
          <div className="h-1 w-full max-w-[120px] bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${completed === total ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400 font-bold">{completed}/{total}</span>
      </div>
      
      <div className="divide-y divide-slate-800/50">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`p-4 flex items-center gap-4 transition-colors ${item.checked ? 'bg-slate-800/20' : 'hover:bg-slate-800/30'}`}
          >
            <button
               onClick={() => {
                  if (item.checkpointId && !item.checked) {
                     onVerifyRequest(item);
                  } else {
                     onToggle(type, item.id, false, 'manual');
                  }
               }}
               className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center transition-all border ${
                 item.checked 
                  ? 'bg-emerald-600 border-emerald-600 text-white' 
                  : item.checkpointId 
                     ? 'border-indigo-500/50 bg-indigo-900/10 text-indigo-400' 
                     : 'border-slate-600 bg-slate-800 text-slate-500'
               }`}
            >
              {item.checked ? <CheckSquare size={16} /> : item.checkpointId ? <ScanLine size={16} /> : <div className="w-2 h-2 rounded-full bg-slate-500"></div>}
            </button>
            
            <div className="flex-1" onClick={() => !item.checked && !item.checkpointId && onToggle(type, item.id, false, 'manual')}>
              <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-bold ${item.checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {item.label}
                  </span>
                  {item.checkpointId && !item.checked && (
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-500/20">SCAN REQ</span>
                  )}
              </div>
              
              {item.checked && (
                <div className="flex items-center gap-2">
                   <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.timestamp!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {item.checkedBy || 'User'}
                   </span>
                   {item.verified && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold uppercase ${item.method === 'nfc' ? 'bg-blue-900/30 text-blue-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                         {item.method === 'nfc' ? <Nfc size={10}/> : <ShieldCheck size={10} />} {item.method || 'Verified'}
                      </span>
                   )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const Checks: React.FC = () => {
  const { session, toggleChecklist, logPatrol, hasNfcSupport } = useSecurity();
  const { venue } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'patrol'>('patrol');
  const [showScanner, setShowScanner] = useState(false);
  const [showNfcReader, setShowNfcReader] = useState(false);
  
  // Scan Target State
  const [scanTarget, setScanTarget] = useState<{ 
    type: 'checklist' | 'patrol', 
    itemId?: string, 
    checkType?: 'pre'|'post' 
  } | null>(null);
  
  // Manual Fallback State
  const [patrolArea, setPatrolArea] = useState(venue?.locations?.[0] || 'Perimeter');

  // Unified Handler for Scan Results (works for both QR string and NFC string)
  const processScanResult = (decodedText: string, method: 'qr' | 'nfc') => {
     setShowScanner(false);
     setShowNfcReader(false);
     
     // 1. Checklist Verification Logic
     if (scanTarget?.type === 'checklist' && scanTarget.itemId && scanTarget.checkType) {
        const list = scanTarget.checkType === 'pre' ? session.preEventChecks : session.postEventChecks;
        const item = list.find(i => i.id === scanTarget.itemId);
        
        if (item && item.checkpointId === decodedText) {
            toggleChecklist(scanTarget.checkType, item.id, true, method);
            // Play success sound or vibe?
            if(navigator.vibrate) navigator.vibrate(200);
        } else {
            alert(`Mismatch! Scanned: ${decodedText}. Expected: ${item?.checkpointId}`);
        }
     } 
     // 2. Ad-hoc Patrol Logic
     else if (scanTarget?.type === 'patrol') {
        // Look up checkpoint name if possible
        const cp = venue?.checkpoints?.find(c => c.id === decodedText);
        if (cp) {
            logPatrol(cp.name, method, cp.id);
            if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else {
            // Log unknown tag ID as area
            logPatrol(`Unknown Tag: ${decodedText}`, method);
            alert("Unknown Checkpoint ID scanned. Logged anyway.");
        }
     }
  };

  const startNfcScan = async () => {
    if (!('NDEFReader' in window)) {
        alert("NFC not supported on this device.");
        return;
    }
    
    setShowNfcReader(true);
    try {
        const ndef = new (window as any).NDEFReader();
        await ndef.scan();
        ndef.onreading = (event: any) => {
            const decoder = new TextDecoder();
            for (const record of event.message.records) {
                const text = decoder.decode(record.data);
                processScanResult(text, 'nfc');
            }
        };
        ndef.onreadingerror = () => {
            alert("Failed to read NFC tag. Try again.");
            setShowNfcReader(false);
        };
    } catch (error) {
        console.error(error);
        setShowNfcReader(false);
    }
  };

  const manualPatrolLog = () => {
     logPatrol(patrolArea, 'manual');
  };

  return (
    <div className="h-full overflow-y-auto p-4 pb-32 bg-slate-950">
      
      {/* Overlays */}
      {showScanner && (
        <ScannerModal onScan={(txt) => processScanResult(txt, 'qr')} onClose={() => setShowScanner(false)} />
      )}
      {showNfcReader && (
        <NFCReaderOverlay onClose={() => setShowNfcReader(false)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-indigo-500" /> Compliance
        </h2>
        {/* Connection Status indicator could go here */}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-6">
        <button 
            onClick={() => setActiveTab('patrol')}
            className={`py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'patrol' ? 'bg-slate-800 text-white shadow ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <Radio size={16} /> Live Patrol
        </button>
        <button 
            onClick={() => setActiveTab('tasks')}
            className={`py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'tasks' ? 'bg-slate-800 text-white shadow ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <CheckCircle size={16} /> Tasks
        </button>
      </div>

      {activeTab === 'patrol' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              
              {/* Scan Actions */}
              <div className="grid grid-cols-2 gap-4">
                 {/* NFC Button */}
                 <button 
                    onClick={() => {
                        setScanTarget({ type: 'patrol' });
                        startNfcScan();
                    }}
                    disabled={!hasNfcSupport}
                    className={`relative overflow-hidden p-6 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${hasNfcSupport ? 'bg-blue-900/20 border-blue-500/50 hover:bg-blue-900/30' : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'}`}
                 >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${hasNfcSupport ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-500'}`}>
                       <Nfc size={28} />
                    </div>
                    <span className={`font-bold text-sm ${hasNfcSupport ? 'text-blue-100' : 'text-slate-500'}`}>Tap NFC Tag</span>
                    {!hasNfcSupport && <span className="absolute bottom-2 text-[8px] text-slate-500 uppercase font-bold">Not Supported</span>}
                 </button>

                 {/* QR Button */}
                 <button 
                    onClick={() => {
                        setScanTarget({ type: 'patrol' });
                        setShowScanner(true);
                    }}
                    className="p-6 rounded-2xl border border-indigo-500/50 bg-indigo-900/20 hover:bg-indigo-900/30 flex flex-col items-center justify-center gap-3 transition-all active:scale-95"
                 >
                    <div className="w-14 h-14 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                       <ScanLine size={28} />
                    </div>
                    <span className="font-bold text-sm text-indigo-100">Scan QR Code</span>
                 </button>
              </div>

              {/* Manual Entry Fallback */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                 <h4 className="text-zinc-500 font-bold text-xs uppercase mb-3 flex items-center gap-2">
                    <MapPin size={12} /> Manual Log (No Tag)
                 </h4>
                 <div className="flex gap-2">
                    <div className="relative flex-1">
                        <select 
                            value={patrolArea}
                            onChange={(e) => setPatrolArea(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white appearance-none focus:border-indigo-500 outline-none font-medium"
                        >
                            {venue?.locations?.map(l => <option key={l} value={l}>{l}</option>) || <option>Perimeter</option>}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                    </div>
                    <button 
                        onClick={manualPatrolLog}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-5 rounded-xl font-bold border border-slate-700"
                    >
                        Log
                    </button>
                 </div>
              </div>

              {/* Recent Patrols Feed */}
              <div className="mt-2">
                 <div className="flex justify-between items-end mb-3">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase">Patrol History</h4>
                    <span className="text-[10px] text-zinc-600">{session.patrolLogs.length} logs today</span>
                 </div>
                 
                 <div className="space-y-2">
                    {[...session.patrolLogs].reverse().slice(0, 5).map((log, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-sm animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3">
                                {log.method === 'nfc' ? (
                                    <div className="p-1.5 bg-blue-900/30 rounded text-blue-400"><Nfc size={14} /></div>
                                ) : log.method === 'qr' ? (
                                    <div className="p-1.5 bg-indigo-900/30 rounded text-indigo-400"><ScanLine size={14} /></div>
                                ) : (
                                    <div className="p-1.5 bg-slate-800 rounded text-slate-400"><MapPin size={14} /></div>
                                )}
                                <div>
                                    <span className="text-slate-200 font-medium block">{log.area}</span>
                                    <span className="text-[10px] text-slate-500">{log.checkedBy}</span>
                                </div>
                            </div>
                            <span className="text-slate-500 font-mono text-xs bg-slate-950 px-2 py-1 rounded">
                                {new Date(log.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    ))}
                    {session.patrolLogs.length === 0 && (
                        <div className="text-center p-6 border border-dashed border-slate-800 rounded-xl text-zinc-600 text-sm">
                            No patrols logged yet.
                        </div>
                    )}
                 </div>
              </div>
          </div>
      )}

      {activeTab === 'tasks' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-left-4">
            <ChecklistGroup 
                title="Pre-Opening" 
                items={session.preEventChecks} 
                type="pre" 
                onToggle={toggleChecklist}
                onVerifyRequest={(item) => {
                    setScanTarget({ type: 'checklist', itemId: item.id, checkType: 'pre' });
                    // Prioritize NFC if supported and item requires specific scan
                    if(hasNfcSupport) {
                        // Ask user method? Or default to NFC?
                        // For simplicity, let's show NFC option first or toggle
                        startNfcScan(); // Or open modal with both options
                    } else {
                        setShowScanner(true);
                    }
                }}
            />
            <ChecklistGroup 
                title="Closing Checks" 
                items={session.postEventChecks} 
                type="post" 
                onToggle={toggleChecklist}
                onVerifyRequest={(item) => {
                    setScanTarget({ type: 'checklist', itemId: item.id, checkType: 'post' });
                    if(hasNfcSupport) startNfcScan(); else setShowScanner(true);
                }}
            />
          </div>
      )}

    </div>
  );
};

export default Checks;
