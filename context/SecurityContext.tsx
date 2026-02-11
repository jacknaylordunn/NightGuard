
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { SessionData, EjectionLog, RejectionReason, Alert, Briefing, PeriodicLog, CapacityLog, RejectionLog, ChecklistItem, ChecklistDefinition, PatrolLog, VerificationMethod, ComplianceLog, ComplianceType, DEFAULT_PRE_CHECKS, DEFAULT_POST_CHECKS } from '../types';
import { db, storage } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { doc, setDoc, onSnapshot, collection, addDoc, query, where, orderBy, limit, updateDoc, getDocs, deleteDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface SecurityContextType {
  session: SessionData;
  history: SessionData[];
  alerts: Alert[];
  activeBriefing: Briefing | null;
  isLive: boolean;
  isLoading: boolean;
  incrementCapacity: () => void;
  decrementCapacity: () => void;
  syncLiveCounts: (inCount: number, outCount: number) => void;
  setGlobalCapacity: (newCapacity: number) => void;
  logRejection: (reason: RejectionReason) => void;
  removeRejection: (id: string) => void;
  addEjection: (ejection: EjectionLog) => void;
  removeEjection: (id: string) => void;
  removePeriodicLog: (id: string) => void;
  toggleChecklist: (type: 'pre' | 'post', id: string, verified?: boolean, method?: VerificationMethod) => void;
  logPatrol: (area: string, method: VerificationMethod, checkpointId?: string) => void;
  logPeriodicCheck: (timeLabel: string, countIn: number, countOut: number, countTotal: number) => void;
  logPeriodicCheckAndSync: (timeLabel: string, countIn: number, countOut: number, countTotal: number) => void;
  
  // Compliance
  addComplianceLog: (type: ComplianceType, location: string, description: string, photoFile?: File) => Promise<void>;
  resolveComplianceLog: (id: string, notes: string) => void;
  
  updateBriefing: (text: string, priority: 'info' | 'alert') => void;
  sendAlert: (type: 'sos' | 'bolo' | 'info', message: string, location?: string) => void;
  dismissAlert: (id: string) => void;
  resetSession: () => void;
  resetClickers: () => void;
  clearHistory: () => void;
  deleteShift: (shiftId: string) => void;
  triggerHaptic: (pattern?: number | number[]) => void;
  
  // NFC Features
  hasNfcSupport: boolean;
  writeNfcTag: (checkpointId: string) => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const HISTORY_KEY = 'nightguard_history_v1';

const getShiftDate = (date: Date = new Date()): string => {
  const d = new Date(date);
  if (d.getHours() < 12) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split('T')[0];
};

export const SecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userProfile, venue } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [history, setHistory] = useState<SessionData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeBriefing, setActiveBriefing] = useState<Briefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [shiftId, setShiftId] = useState<string>(getShiftDate());
  
  // NFC Support Check
  const [hasNfcSupport, setHasNfcSupport] = useState(false);

  useEffect(() => {
    if ('NDEFReader' in window) {
      setHasNfcSupport(true);
    }
  }, []);

  // Refs to access latest state inside interval
  const sessionRef = useRef(session);
  const userProfileRef = useRef(userProfile);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  useEffect(() => {
    if (venue?.themeColor) {
      document.documentElement.style.setProperty('--theme-color', venue.themeColor);
    }
  }, [venue]);

  // Function to initialize a new session
  const initSession = async (currentShiftId: string, companyId: string, venueId: string, venueName: string, maxCap: number) => {
    let preDefinitions = DEFAULT_PRE_CHECKS;
    let postDefinitions = DEFAULT_POST_CHECKS;

    try {
      const configDoc = await getDoc(doc(db, 'companies', companyId, 'venues', venueId, 'config', 'checklists'));
      if (configDoc.exists()) {
         const data = configDoc.data();
         if (data.pre && Array.isArray(data.pre)) preDefinitions = data.pre;
         if (data.post && Array.isArray(data.post)) postDefinitions = data.post;
      }
    } catch (e) {
      console.warn("Using default checklists due to load error", e);
    }

    const preChecks: ChecklistItem[] = preDefinitions.map(d => {
        const item: ChecklistItem = { id: d.id, label: d.label, checked: false };
        if (d.checkpointId) item.checkpointId = d.checkpointId;
        return item;
    });

    const postChecks: ChecklistItem[] = postDefinitions.map(d => {
        const item: ChecklistItem = { id: d.id, label: d.label, checked: false };
        if (d.checkpointId) item.checkpointId = d.checkpointId;
        return item;
    });

    return {
      id: currentShiftId,
      date: new Date().toLocaleDateString(),
      shiftDate: currentShiftId,
      startTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      venueName: venueName,
      currentCapacity: 0,
      maxCapacity: maxCap,
      logs: [],
      rejections: [],
      ejections: [],
      preEventChecks: preChecks,
      postEventChecks: postChecks,
      patrolLogs: [],
      periodicLogs: [],
      complianceLogs: [] // Init compliance
    } as SessionData;
  };

  // Check for Midday Rollover
  useEffect(() => {
    const checkRollover = async () => {
      const current = getShiftDate();
      if (current !== shiftId) {
        console.log("Midday rollover detected. Switching to new shift:", current);
        setShiftId(current);
      }
    };
    const timer = setInterval(checkRollover, 60000); 
    return () => clearInterval(timer);
  }, [shiftId]);

  // Sync Session Data & History
  useEffect(() => {
    if (!user || !userProfile || !venue) {
      setIsLoading(true);
      return;
    }

    const loadHistory = async () => {
      try {
        const historyRef = collection(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts');
        const qHistory = query(historyRef, orderBy('shiftDate', 'desc'), limit(30));
        const snap = await getDocs(qHistory);
        const histData = snap.docs
          .map(d => d.data() as SessionData)
          .filter(d => d.shiftDate !== shiftId); 
        setHistory(histData);
      } catch (e) {
        console.error("Error loading history:", e);
      }
    };
    loadHistory();

    const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
    setIsLive(true);

    const unsubscribeSession = onSnapshot(docRef, async (snapshot) => {
      setIsLoading(false);
      if (snapshot.exists()) {
        const data = snapshot.data() as SessionData;
        // Ensure arrays exist for old data structures
        if (!data.ejections) data.ejections = [];
        if (!data.periodicLogs) data.periodicLogs = [];
        if (!data.rejections) data.rejections = [];
        if (!data.complianceLogs) data.complianceLogs = []; // Ensure complianceLogs exists
        if (!data.startTime) data.startTime = new Date().toISOString();
        if (data.briefing) setActiveBriefing(data.briefing);
        setSession(data);
      } else {
        const newSession = await initSession(shiftId, userProfile.companyId, userProfile.venueId, venue.name, venue.maxCapacity);
        setDoc(docRef, newSession).then(() => {
          setSession(newSession);
        });
      }
    }, (error) => {
      console.error("Sync error:", error);
      setIsLive(false);
    });

    const alertsRef = collection(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'alerts');
    const qAlerts = query(alertsRef, where('active', '==', true), orderBy('timestamp', 'desc'));
    
    const unsubscribeAlerts = onSnapshot(qAlerts, (snap) => {
      const activeAlerts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert));
      setAlerts(activeAlerts);
    });

    return () => {
      unsubscribeSession();
      unsubscribeAlerts();
    };
  }, [user, userProfile, venue, shiftId]);

  const safeUpdate = async (updates: any) => {
    if (isLive && userProfile) {
      const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
      try {
        await updateDoc(docRef, { ...updates, lastUpdated: new Date().toISOString() });
      } catch (e) {
        console.error("Firestore Update Failed:", e);
      }
    }
  };

  const optimisticUpdate = (updater: (prev: SessionData) => SessionData) => {
    setSession(prev => {
       if (!prev) return null;
       return updater(prev);
    });
  };

  const writeNfcTag = async (checkpointId: string) => {
    if (!('NDEFReader' in window)) {
      throw new Error("NFC not supported on this device/browser.");
    }
    const ndef = new (window as any).NDEFReader();
    await ndef.write(checkpointId);
  };

  const triggerHaptic = (pattern: number | number[] = 20) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // --- COMPLIANCE FUNCTIONS ---
  
  const addComplianceLog = async (type: ComplianceType, location: string, description: string, photoFile?: File) => {
    if(!userProfile || !venue) return;
    
    let photoUrl = '';
    
    if (photoFile) {
        try {
            const fileRef = ref(storage, `companies/${userProfile.companyId}/venues/${venue.id}/compliance/${Date.now()}_${photoFile.name}`);
            const snapshot = await uploadBytes(fileRef, photoFile);
            photoUrl = await getDownloadURL(snapshot.ref);
        } catch (e) {
            console.error("Upload failed", e);
            alert("Failed to upload photo, logging without it.");
        }
    }

    const newLog: ComplianceLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        type,
        location,
        description,
        photoUrl,
        status: 'open',
        loggedBy: userProfile.displayName
    };

    optimisticUpdate(prev => ({ ...prev, complianceLogs: [newLog, ...(prev.complianceLogs || [])] }));
    safeUpdate({ complianceLogs: arrayUnion(newLog) });
  };

  const resolveComplianceLog = (id: string, notes: string) => {
     if(!session || !userProfile) return;
     
     const updatedLogs = session.complianceLogs.map(log => 
        log.id === id ? {
            ...log,
            status: 'resolved' as const,
            resolvedAt: new Date().toISOString(),
            resolvedBy: userProfile.displayName,
            resolutionNotes: notes
        } : log
     );

     optimisticUpdate(prev => ({ ...prev, complianceLogs: updatedLogs }));
     safeUpdate({ complianceLogs: updatedLogs });
  };

  // ... (Other standard functions) ...
  const incrementCapacity = () => {
    triggerHaptic(15);
    const newLog = { timestamp: new Date().toISOString(), type: 'in' as const, count: 1 };
    optimisticUpdate(prev => ({
      ...prev,
      currentCapacity: prev.currentCapacity + 1,
      logs: [...prev.logs, newLog]
    }));
    safeUpdate({ logs: arrayUnion(newLog), currentCapacity: (session?.currentCapacity || 0) + 1 });
  };

  const decrementCapacity = () => {
    triggerHaptic(25);
    const newLog = { timestamp: new Date().toISOString(), type: 'out' as const, count: 1 };
    optimisticUpdate(prev => ({
      ...prev,
      currentCapacity: Math.max(0, prev.currentCapacity - 1),
      logs: [...prev.logs, newLog]
    }));
    safeUpdate({ logs: arrayUnion(newLog), currentCapacity: Math.max(0, (session?.currentCapacity || 0) - 1) });
  };

  const syncLiveCounts = (inCount: number, outCount: number) => {
    if(!session) return;
    const currentIn = session.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
    const currentOut = session.logs.filter(l => l.type === 'out').reduce((acc, l) => acc + (l.count || 1), 0);
    const diffIn = inCount - currentIn;
    const diffOut = outCount - currentOut;
    const newLogs: CapacityLog[] = [];
    if (diffIn !== 0) newLogs.push({ timestamp: new Date().toISOString(), type: 'in', count: diffIn });
    if (diffOut !== 0) newLogs.push({ timestamp: new Date().toISOString(), type: 'out', count: diffOut });
    if(newLogs.length === 0) return;
    optimisticUpdate(prev => ({ ...prev, logs: [...prev.logs, ...newLogs], currentCapacity: inCount - outCount }));
    if (isLive && userProfile) {
      const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
      updateDoc(docRef, { logs: arrayUnion(...newLogs), currentCapacity: inCount - outCount, lastUpdated: new Date().toISOString() });
    }
  };

  const setGlobalCapacity = (newCapacity: number) => {
     if(!session) return;
     const diff = newCapacity - session.currentCapacity;
     if (diff === 0) return;
     const type = diff > 0 ? 'in' : 'out';
     const count = Math.abs(diff);
     const newLog = { timestamp: new Date().toISOString(), type: type as 'in' | 'out', count };
     optimisticUpdate(prev => ({ ...prev, currentCapacity: newCapacity, logs: [...prev.logs, newLog] }));
     safeUpdate({ logs: arrayUnion(newLog), currentCapacity: newCapacity });
  };

  const resetClickers = () => {
    if(!confirm("Reset Clickers?")) return;
    optimisticUpdate(prev => ({ ...prev, currentCapacity: 0, logs: [] }));
    if (isLive && userProfile) {
       const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
       updateDoc(docRef, { currentCapacity: 0, logs: [] });
    }
  };

  const logRejection = (reason: RejectionReason) => {
    triggerHaptic(50);
    const log: RejectionLog = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), reason };
    optimisticUpdate(prev => ({ ...prev, rejections: [log, ...prev.rejections] }));
    safeUpdate({ rejections: arrayUnion(log) });
  };

  const removeRejection = (id: string) => {
    if(!session) return;
    const updatedRejections = session.rejections.filter(r => r.id !== id);
    optimisticUpdate(prev => ({ ...prev, rejections: updatedRejections }));
    safeUpdate({ rejections: updatedRejections });
  };

  const addEjection = (ejection: EjectionLog) => {
    triggerHaptic([50, 50, 50]);
    optimisticUpdate(prev => ({ ...prev, ejections: [ejection, ...prev.ejections] }));
    safeUpdate({ ejections: arrayUnion(ejection) });
  };

  const removeEjection = (id: string) => {
    if(!confirm("Delete this log?")) return;
    if (session) {
      const updatedEjections = session.ejections.filter(e => e.id !== id);
      optimisticUpdate(prev => ({ ...prev, ejections: updatedEjections }));
      safeUpdate({ ejections: updatedEjections });
    }
  };

  const logPeriodicCheck = (timeLabel: string, countIn: number, countOut: number, countTotal: number) => {
    const newLog: PeriodicLog = { id: Date.now().toString(), timestamp: new Date().toISOString(), timeLabel, countIn, countOut, countTotal };
    optimisticUpdate(prev => ({ ...prev, periodicLogs: [...(prev.periodicLogs || []), newLog] }));
    safeUpdate({ periodicLogs: arrayUnion(newLog) });
  };

  const logPeriodicCheckAndSync = (timeLabel: string, countIn: number, countOut: number, countTotal: number) => {
     if(!session) return;
     const newLog: PeriodicLog = { id: Date.now().toString(), timestamp: new Date().toISOString(), timeLabel, countIn, countOut, countTotal };
     const currentIn = session.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
     const currentOut = session.logs.filter(l => l.type === 'out').reduce((acc, l) => acc + (l.count || 1), 0);
     const diffIn = countIn - currentIn;
     const diffOut = countOut - currentOut;
     const newLogs: any[] = [];
     if (diffIn !== 0) newLogs.push({ timestamp: new Date().toISOString(), type: 'in', count: diffIn });
     if (diffOut !== 0) newLogs.push({ timestamp: new Date().toISOString(), type: 'out', count: diffOut });

     optimisticUpdate(prev => ({
       ...prev,
       periodicLogs: [...(prev.periodicLogs || []), newLog],
       logs: [...prev.logs, ...newLogs],
       currentCapacity: countIn - countOut
     }));

     if (isLive && userProfile) {
        const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
        updateDoc(docRef, { periodicLogs: arrayUnion(newLog), logs: arrayUnion(...newLogs), currentCapacity: countIn - countOut, lastUpdated: new Date().toISOString() });
     }
  };

  const removePeriodicLog = (id: string) => {
    if(!confirm("Delete log?")) return;
    if (session) {
       const updatedLogs = session.periodicLogs.filter(p => p.id !== id);
       optimisticUpdate(prev => ({ ...prev, periodicLogs: updatedLogs }));
       safeUpdate({ periodicLogs: updatedLogs });
    }
  };

  const toggleChecklist = (type: 'pre' | 'post', id: string, verified: boolean = false, method: VerificationMethod = 'manual') => {
    if(!session || !userProfile) return;
    triggerHaptic(30);

    const listKey = type === 'pre' ? 'preEventChecks' : 'postEventChecks';
    const updatedList = session[listKey].map(item => 
      item.id === id ? { 
          ...item, 
          checked: !item.checked, 
          timestamp: new Date().toISOString(),
          checkedBy: userProfile.displayName,
          verified: verified,
          method: method
      } : item
    );

    optimisticUpdate(prev => ({ ...prev, [listKey]: updatedList }));
    safeUpdate({ [listKey]: updatedList });
  };

  const logPatrol = (area: string, method: VerificationMethod, checkpointId?: string) => {
    if(!userProfile) return;
    triggerHaptic([30, 30]);
    const log: PatrolLog = { 
      id: Math.random().toString(36).substring(2,9),
      time: new Date().toISOString(), 
      area, 
      checkedBy: userProfile.displayName,
      method,
      checkpointId
    };
    if (!log.checkpointId) delete log.checkpointId;

    optimisticUpdate(prev => ({ ...prev, patrolLogs: [...prev.patrolLogs, log] }));
    safeUpdate({ patrolLogs: arrayUnion(log) });
  };

  const updateBriefing = (text: string, priority: 'info' | 'alert') => {
     const newBriefing: Briefing = { id: Date.now().toString(), text, priority, active: true, setBy: userProfile?.displayName || 'Admin', timestamp: new Date().toISOString() };
     optimisticUpdate(prev => ({ ...prev, briefing: newBriefing }));
     safeUpdate({ briefing: newBriefing });
  };

  const sendAlert = async (type: 'sos' | 'bolo' | 'info', message: string, location?: string) => {
    if (!userProfile) return;
    const newAlert: Omit<Alert, 'id'> = { type, message, location: location || '', senderName: userProfile.displayName, timestamp: new Date().toISOString(), active: true };
    await addDoc(collection(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'alerts'), newAlert);
  };

  const dismissAlert = async (id: string) => {
    if (!userProfile) return;
    await updateDoc(doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'alerts', id), { active: false });
  };

  const resetSession = async () => {
    if (!session || !venue || !userProfile) return;
    if (confirm("End Session? This archives data and starts fresh.")) {
      const empty = await initSession(shiftId, userProfile.companyId, userProfile.venueId, venue.name, venue.maxCapacity);
      setSession(empty); 
      if(isLive) {
         const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
         setDoc(docRef, empty);
      }
    }
  };

  const deleteShift = async (id: string) => {
    if (!userProfile || !venue) return;
    try {
      await deleteDoc(doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', id));
      setHistory(prev => prev.filter(s => s.shiftDate !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete.");
    }
  };

  const clearHistory = () => {
    if (!venue) return;
    if (confirm("Clear local cache?")) {
      setHistory([]);
      localStorage.removeItem(`${venue.id}_${HISTORY_KEY}`);
    }
  };

  if (!session) {
     return (
       <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-blue-500">
         <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
         <p className="font-mono text-xs tracking-widest uppercase opacity-70">Initializing Compliance Core...</p>
       </div>
     );
  }

  return (
    <SecurityContext.Provider value={{ 
      session, history, alerts, activeBriefing, isLive, isLoading, hasNfcSupport,
      incrementCapacity, decrementCapacity, syncLiveCounts, setGlobalCapacity,
      logRejection, removeRejection, addEjection, removeEjection, removePeriodicLog,
      toggleChecklist, logPatrol, updateBriefing, sendAlert, dismissAlert, resetSession, resetClickers, clearHistory, deleteShift, logPeriodicCheck, logPeriodicCheckAndSync, writeNfcTag, triggerHaptic,
      addComplianceLog, resolveComplianceLog
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) throw new Error('useSecurity must be used within a SecurityProvider');
  return context;
}
