import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { SessionData, INITIAL_PRE_CHECKS, INITIAL_POST_CHECKS, EjectionLog, RejectionReason, Alert, Briefing, PeriodicLog } from '../types';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { doc, setDoc, onSnapshot, collection, addDoc, query, where, orderBy, limit, updateDoc, getDocs, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

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
  addEjection: (ejection: EjectionLog) => void;
  removeEjection: (id: string) => void;
  removePeriodicLog: (id: string) => void;
  toggleChecklist: (type: 'pre' | 'post', id: string) => void;
  logPatrol: (area: string) => void;
  logPeriodicCheck: (timeLabel: string, countIn: number, countOut: number, countTotal: number) => void;
  logPeriodicCheckAndSync: (timeLabel: string, countIn: number, countOut: number, countTotal: number) => void;
  updateBriefing: (text: string, priority: 'info' | 'alert') => void;
  sendAlert: (type: 'sos' | 'bolo' | 'info', message: string, location?: string) => void;
  dismissAlert: (id: string) => void;
  resetSession: () => void;
  resetClickers: () => void;
  clearHistory: () => void;
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

const createNewSession = (shiftDate: string, venueName: string, maxCap: number): SessionData => {
  return {
    id: shiftDate,
    date: new Date().toLocaleDateString(),
    shiftDate: shiftDate,
    startTime: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    venueName: venueName,
    currentCapacity: 0,
    maxCapacity: maxCap,
    logs: [],
    rejections: [],
    ejections: [],
    preEventChecks: INITIAL_PRE_CHECKS,
    postEventChecks: INITIAL_POST_CHECKS,
    patrolLogs: [],
    periodicLogs: [],
  };
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

  // Check for Midday Rollover (Shift Change)
  useEffect(() => {
    const checkRollover = async () => {
      const current = getShiftDate();
      if (current !== shiftId) {
        console.log("Midday rollover detected. Switching to new shift:", current);
        
        // Auto-cleanup empty session before moving on
        const prevSession = sessionRef.current;
        const profile = userProfileRef.current;

        if (prevSession && profile && prevSession.shiftDate === shiftId) {
            const hasActivity = 
                prevSession.logs.length > 0 ||
                prevSession.ejections.length > 0 ||
                prevSession.rejections.length > 0 ||
                prevSession.periodicLogs.length > 0 ||
                prevSession.patrolLogs.length > 0 ||
                prevSession.preEventChecks.some(c => c.checked) ||
                prevSession.postEventChecks.some(c => c.checked);

            if (!hasActivity) {
                console.log("Previous session was empty. Deleting...", shiftId);
                try {
                    await deleteDoc(doc(db, 'companies', profile.companyId, 'venues', profile.venueId, 'shifts', shiftId));
                } catch (e) {
                    console.error("Failed to cleanup empty shift:", e);
                }
            }
        }

        setShiftId(current);
      }
    };
    const timer = setInterval(checkRollover, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [shiftId]);

  // Sync Session Data & History
  useEffect(() => {
    if (!user || !userProfile || !venue) {
      setIsLoading(true);
      return;
    }

    // 1. Fetch History from Firestore (ensure owners see saved shifts)
    const loadHistory = async () => {
      try {
        const historyRef = collection(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts');
        // Fetch last 30 shifts
        const qHistory = query(historyRef, orderBy('shiftDate', 'desc'), limit(30));
        const snap = await getDocs(qHistory);
        const histData = snap.docs
          .map(d => d.data() as SessionData)
          .filter(d => d.shiftDate !== shiftId); // Exclude current active shift
        setHistory(histData);
      } catch (e) {
        console.error("Error loading history:", e);
        // Fallback to local storage if offline/error
        const local = localStorage.getItem(`${venue.id}_${HISTORY_KEY}`);
        if(local) setHistory(JSON.parse(local));
      }
    };
    loadHistory();

    // 2. Live Session Sync
    const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
    setIsLive(true);

    const unsubscribeSession = onSnapshot(docRef, (snapshot) => {
      setIsLoading(false);
      if (snapshot.exists()) {
        const data = snapshot.data() as SessionData;
        if (!data.ejections) data.ejections = [];
        if (!data.periodicLogs) data.periodicLogs = [];
        if (!data.startTime) data.startTime = new Date().toISOString();
        if (data.briefing) setActiveBriefing(data.briefing);
        setSession(data);
        localStorage.setItem(`${venue.id}_current_session`, JSON.stringify(data));
      } else {
        // Create new session doc if it doesn't exist (e.g. new day)
        const newSession = createNewSession(shiftId, venue.name, venue.maxCapacity);
        setDoc(docRef, newSession).then(() => {
          setSession(newSession);
        });
      }
    }, (error) => {
      console.error("Sync error:", error);
      setIsLive(false);
      const local = localStorage.getItem(`${venue.id}_current_session`);
      if (local) {
         const localData = JSON.parse(local);
         // Only use local if it matches current shift date, otherwise start fresh
         if(localData.shiftDate === shiftId) setSession(localData);
         else setSession(createNewSession(shiftId, venue.name, venue.maxCapacity));
      }
      else setSession(createNewSession(shiftId, venue.name, venue.maxCapacity));
    });

    // 3. Live Alerts Sync
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

  // Helper to push updates to Firestore reliably
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

  // Helper for Optimistic UI updates
  const optimisticUpdate = (updater: (prev: SessionData) => SessionData) => {
    setSession(prev => {
       if (!prev) return null;
       return updater(prev);
    });
  };

  const incrementCapacity = () => {
    const newLog = { timestamp: new Date().toISOString(), type: 'in' as const, count: 1 };
    
    // Optimistic
    optimisticUpdate(prev => ({
      ...prev,
      currentCapacity: prev.currentCapacity + 1,
      logs: [...prev.logs, newLog]
    }));

    // Server
    safeUpdate({
      logs: arrayUnion(newLog),
      currentCapacity: (session?.currentCapacity || 0) + 1
    });
  };

  const decrementCapacity = () => {
    const newLog = { timestamp: new Date().toISOString(), type: 'out' as const, count: 1 };

    // Optimistic
    optimisticUpdate(prev => ({
      ...prev,
      currentCapacity: Math.max(0, prev.currentCapacity - 1),
      logs: [...prev.logs, newLog]
    }));

    // Server
    safeUpdate({
      logs: arrayUnion(newLog),
      currentCapacity: Math.max(0, (session?.currentCapacity || 0) - 1)
    });
  };

  const syncLiveCounts = (inCount: number, outCount: number) => {
    // This is a bulk update, easier to overwrite the logs array or append difference
    // For simplicity/safety in this context, we will append adjustment logs
    if(!session) return;
    
    const currentIn = session.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
    const currentOut = session.logs.filter(l => l.type === 'out').reduce((acc, l) => acc + (l.count || 1), 0);
    const diffIn = inCount - currentIn;
    const diffOut = outCount - currentOut;
    
    const newLogs = [];
    if (diffIn !== 0) newLogs.push({ timestamp: new Date().toISOString(), type: 'in', count: diffIn });
    if (diffOut !== 0) newLogs.push({ timestamp: new Date().toISOString(), type: 'out', count: diffOut });

    if(newLogs.length === 0) return;

    // Optimistic
    optimisticUpdate(prev => ({
       ...prev,
       logs: [...prev.logs, ...newLogs],
       currentCapacity: inCount - outCount
    }));

    // Server
    // We can't arrayUnion multiple items easily with spread in one go if they are dynamic, 
    // but updateDoc allows passing arrayUnion(...items).
    // Note: TypeScript might complain about arrayUnion with variable args, so we do it carefully.
    
    if (isLive && userProfile) {
      const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
      updateDoc(docRef, {
         logs: arrayUnion(...newLogs),
         currentCapacity: inCount - outCount,
         lastUpdated: new Date().toISOString()
      });
    }
  };

  const setGlobalCapacity = (newCapacity: number) => {
     if(!session) return;
     const diff = newCapacity - session.currentCapacity;
     if (diff === 0) return;

     const type = diff > 0 ? 'in' : 'out';
     const count = Math.abs(diff);
     const newLog = { timestamp: new Date().toISOString(), type: type as 'in' | 'out', count };

     optimisticUpdate(prev => ({
        ...prev,
        currentCapacity: newCapacity,
        logs: [...prev.logs, newLog]
     }));

     safeUpdate({
        logs: arrayUnion(newLog),
        currentCapacity: newCapacity
     });
  };

  const resetClickers = () => {
    if(!confirm("Reset Clickers? This will clear the current In/Out count but preserve your Half-Hourly Logs.")) return;
    
    optimisticUpdate(prev => ({
      ...prev,
      currentCapacity: 0,
      logs: []
    }));

    if (isLive && userProfile) {
       // Here we actually want to wipe the logs, so we set it, not union
       const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
       updateDoc(docRef, {
         currentCapacity: 0,
         logs: []
       });
    }
  };

  const logRejection = (reason: RejectionReason) => {
    const log = { timestamp: new Date().toISOString(), reason };
    
    optimisticUpdate(prev => ({
      ...prev,
      rejections: [...prev.rejections, log]
    }));

    safeUpdate({
      rejections: arrayUnion(log)
    });
  };

  const addEjection = (ejection: EjectionLog) => {
    optimisticUpdate(prev => ({
      ...prev,
      ejections: [ejection, ...prev.ejections]
    }));

    safeUpdate({
      ejections: arrayUnion(ejection)
    });
  };

  const removeEjection = (id: string) => {
    if(!confirm("Are you sure you want to delete this incident log?")) return;
    
    // We need to find the exact object to remove it via arrayRemove, 
    // but arrayRemove needs exact equality.
    // Instead, we will filter the array locally and overwrite the array in Firestore.
    // This is safer for deletions.
    
    if (session) {
      const updatedEjections = session.ejections.filter(e => e.id !== id);
      optimisticUpdate(prev => ({
        ...prev,
        ejections: updatedEjections
      }));
      
      safeUpdate({ ejections: updatedEjections });
    }
  };

  const logPeriodicCheck = (timeLabel: string, countIn: number, countOut: number, countTotal: number) => {
    const newLog: PeriodicLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      timeLabel,
      countIn,
      countOut,
      countTotal
    };

    optimisticUpdate(prev => ({
      ...prev,
      periodicLogs: [...(prev.periodicLogs || []), newLog]
    }));

    safeUpdate({
      periodicLogs: arrayUnion(newLog)
    });
  };

  // Atomic function to Log Periodic Check AND Sync Clickers
  const logPeriodicCheckAndSync = (timeLabel: string, countIn: number, countOut: number, countTotal: number) => {
     if(!session) return;
     
     const newLog: PeriodicLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        timeLabel,
        countIn,
        countOut,
        countTotal
     };

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
        updateDoc(docRef, {
          periodicLogs: arrayUnion(newLog),
          logs: arrayUnion(...newLogs),
          currentCapacity: countIn - countOut,
          lastUpdated: new Date().toISOString()
        });
     }
  };

  const removePeriodicLog = (id: string) => {
    if(!confirm("Are you sure you want to delete this half-hourly log?")) return;
    if (session) {
       const updatedLogs = session.periodicLogs.filter(p => p.id !== id);
       optimisticUpdate(prev => ({ ...prev, periodicLogs: updatedLogs }));
       safeUpdate({ periodicLogs: updatedLogs });
    }
  };

  const toggleChecklist = (type: 'pre' | 'post', id: string) => {
    // For nested objects in arrays (checklists), we usually have to replace the whole array
    if(!session) return;

    const listKey = type === 'pre' ? 'preEventChecks' : 'postEventChecks';
    const updatedList = session[listKey].map(item => 
      item.id === id ? { ...item, checked: !item.checked, timestamp: new Date().toISOString() } : item
    );

    optimisticUpdate(prev => ({ ...prev, [listKey]: updatedList }));
    safeUpdate({ [listKey]: updatedList });
  };

  const logPatrol = (area: string) => {
    const log = { time: new Date().toISOString(), area, checked: true };
    
    optimisticUpdate(prev => ({
      ...prev,
      patrolLogs: [...prev.patrolLogs, log]
    }));

    safeUpdate({
      patrolLogs: arrayUnion(log)
    });
  };

  const updateBriefing = (text: string, priority: 'info' | 'alert') => {
     const newBriefing: Briefing = {
       id: Date.now().toString(),
       text,
       priority,
       active: true,
       setBy: userProfile?.displayName || 'Admin',
       timestamp: new Date().toISOString()
     };
     
     optimisticUpdate(prev => ({ ...prev, briefing: newBriefing }));
     safeUpdate({ briefing: newBriefing });
  };

  const sendAlert = async (type: 'sos' | 'bolo' | 'info', message: string, location?: string) => {
    if (!userProfile) return;
    const newAlert: Omit<Alert, 'id'> = {
      type,
      message,
      location: location || '',
      senderName: userProfile.displayName,
      timestamp: new Date().toISOString(),
      active: true
    };
    await addDoc(collection(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'alerts'), newAlert);
  };

  const dismissAlert = async (id: string) => {
    if (!userProfile) return;
    await updateDoc(doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'alerts', id), {
      active: false
    });
  };

  const resetSession = () => {
    if (!session || !venue) return;
    if (confirm("Manually End Session? This archives the current data and starts fresh.")) {
      // Typically we don't 'delete' the shift, we just reset the current session pointer
      // But based on the previous implementation, the user might expect a full wipe or new shift ID.
      // Since shifts are date-based, we'll just reset the data inside the current shift
      // effectively clearing it for a "fresh start" today.
      
      const empty = createNewSession(shiftId, venue.name, venue.maxCapacity);
      // Keep the ID/Date
      
      setSession(empty); // Optimistic UI
      
      if(isLive && userProfile) {
         const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', shiftId);
         setDoc(docRef, empty);
      }
    }
  };

  const clearHistory = () => {
    if (!venue) return;
    if (confirm("Clear local history cache?")) {
      setHistory([]);
      localStorage.removeItem(`${venue.id}_${HISTORY_KEY}`);
    }
  };

  if (!session) {
     return (
       <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-blue-500">
         <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
         <p className="font-mono text-sm tracking-widest animate-pulse">ESTABLISHING SECURE CONNECTION...</p>
       </div>
     );
  }

  return (
    <SecurityContext.Provider value={{ 
      session, history, alerts, activeBriefing, isLive, isLoading,
      incrementCapacity, decrementCapacity, syncLiveCounts, setGlobalCapacity,
      logRejection, addEjection, removeEjection, removePeriodicLog,
      toggleChecklist, logPatrol, updateBriefing, sendAlert, dismissAlert, resetSession, resetClickers, clearHistory, logPeriodicCheck, logPeriodicCheckAndSync
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}