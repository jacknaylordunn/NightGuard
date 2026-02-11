
import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, ScanLine, X, Search, ShieldCheck, MapPin, 
  Nfc, Radio, CheckCircle, RefreshCcw, UserCheck
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

// --- MAIN PAGE ---
const Checks: React.FC = () => {
  const { session, toggleChecklist, logPatrol, hasNfcSupport, setShiftManager } = useSecurity();
  const { venue } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'patrol'>('patrol');
  const [showScanner, setShowScanner] = useState(false);
  const [showNfcReader, setShowNfcReader] = useState(false);
  const [scanTarget, setScanTarget] = useState<{ type: 'checklist' | 'patrol', itemId?: string, checkType?: 'pre'|'post' } | null>(null);
  const [patrolArea, setPatrolArea] = useState(venue?.locations?.[0] || 'Perimeter');
  
  // Shift Manager State
  const [managerName, setManagerName] = useState(session.shiftManager || '');
  const [isEditingManager, setIsEditingManager] = useState(false);

  useEffect(() => {
     if(session.shiftManager) setManagerName(session.shiftManager);
  }, [session.shiftManager]);

  const handleSaveManager = () => {
      if(managerName.trim()) {
          setShiftManager(managerName);
          setIsEditingManager(false);
      }
  };

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
     } else if (scanTarget?.type === 'patrol') {
        const cp = venue?.checkpoints?.find(c => c.id === decodedText);
        if (cp) {
            logPatrol(cp.name, method, cp.id);
            if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else {
            logPatrol(`Unknown Tag: ${decodedText}`, method);
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

  return (
    <div className="h-full overflow-y-auto p-4 pb-32 bg-slate-950">
      {showScanner && <ScannerModal onScan={(txt) => processScanResult(txt, 'qr')} onClose={() => setShowScanner(false)} />}
      {showNfcReader && <NFCReaderOverlay onClose={() => setShowNfcReader(false)} />}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheck className="text-indigo-500" /> Compliance</h2>
      </div>

      {/* SHIFT MANAGER WIDGET */}
      <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="bg-indigo-900/30 p-2 rounded-full text-indigo-400"><UserCheck size={18} /></div>
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
                      />
                  ) : (
                      <button onClick={() => setIsEditingManager(true)} className="text-white font-bold text-sm hover:text-indigo-400 text-left">
                          {session.shiftManager || "Tap to Allocate"}
                      </button>
                  )}
              </div>
          </div>
          {session.shiftManager && <CheckCircle size={16} className="text-emerald-500" />}
      </div>

      <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-6">
        <button onClick={() => setActiveTab('patrol')} className={`py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${activeTab === 'patrol' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}><Radio size={16} /> Live Patrol</button>
        <button onClick={() => setActiveTab('tasks')} className={`py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${activeTab === 'tasks' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}><CheckCircle size={16} /> Tasks</button>
      </div>

      {activeTab === 'patrol' && (
          <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => { setScanTarget({ type: 'patrol' }); startNfcScan(); }} disabled={!hasNfcSupport} className={`p-6 rounded-2xl border flex flex-col items-center gap-3 ${hasNfcSupport ? 'bg-blue-900/20 border-blue-500/50 hover:bg-blue-900/30' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
                    <Nfc size={28} className={hasNfcSupport ? 'text-blue-400' : 'text-slate-500'} />
                    <span className="font-bold text-sm text-slate-300">NFC Patrol</span>
                 </button>
                 <button onClick={() => { setScanTarget({ type: 'patrol' }); setShowScanner(true); }} className="p-6 rounded-2xl border border-indigo-500/50 bg-indigo-900/20 hover:bg-indigo-900/30 flex flex-col items-center gap-3">
                    <ScanLine size={28} className="text-indigo-400" />
                    <span className="font-bold text-sm text-indigo-100">QR Patrol</span>
                 </button>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                 <h4 className="text-zinc-500 font-bold text-xs uppercase mb-3 flex items-center gap-2"><MapPin size={12} /> Manual Log</h4>
                 <div className="flex gap-2">
                    <select value={patrolArea} onChange={(e) => setPatrolArea(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white">
                        {venue?.locations?.map(l => <option key={l} value={l}>{l}</option>) || <option>Perimeter</option>}
                    </select>
                    <button onClick={() => logPatrol(patrolArea, 'manual')} className="bg-slate-800 hover:bg-slate-700 text-white px-5 rounded-xl font-bold border border-slate-700">Log</button>
                 </div>
              </div>
              <div className="space-y-2">
                 <h4 className="text-xs font-bold text-zinc-500 uppercase">Recent Patrols</h4>
                 {[...session.patrolLogs].reverse().slice(0, 5).map((log, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-sm">
                        <span className="text-slate-200 font-medium">{log.area}</span>
                        <span className="text-slate-500 font-mono text-xs">{new Date(log.time).toLocaleTimeString()}</span>
                    </div>
                 ))}
              </div>
          </div>
      )}

      {activeTab === 'tasks' && (
          <div className="space-y-2">
            <ChecklistGroup title="Pre-Opening" items={session.preEventChecks} type="pre" onToggle={toggleChecklist} onVerifyRequest={(item) => { setScanTarget({ type: 'checklist', itemId: item.id, checkType: 'pre' }); if(hasNfcSupport) startNfcScan(); else setShowScanner(true); }} />
            <ChecklistGroup title="Closing Checks" items={session.postEventChecks} type="post" onToggle={toggleChecklist} onVerifyRequest={(item) => { setScanTarget({ type: 'checklist', itemId: item.id, checkType: 'post' }); if(hasNfcSupport) startNfcScan(); else setShowScanner(true); }} />
          </div>
      )}
    </div>
  );
};

export default Checks;
