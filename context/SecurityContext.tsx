import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SessionData, INITIAL_PRE_CHECKS, INITIAL_POST_CHECKS, EjectionLog, RejectionReason, Alert, Briefing, PeriodicLog } from '../types';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { doc, setDoc, onSnapshot, collection, addDoc, query, where, orderBy, limit, updateDoc } from 'firebase/firestore';

interface SecurityContextType {
  session: SessionData;
  history: SessionData[];
  alerts: Alert[];
  activeBriefing: Briefing | null;
  isLive: boolean;
  isLoading: boolean;
  incrementCapacity: () => void;
  decrementCapacity: () => void;
  logRejection: (reason: RejectionReason) => void;
  addEjection: (ejection: EjectionLog) => void;
  removeEjection: (id: string) => void;
  removePeriodicLog: (id: string) => void;
  toggleChecklist: (type: 'pre' | 'post', id: string) => void;
  logPatrol: (area: string) => void;
  logPeriodicCheck: (timeLabel: string, countIn: number, countOut: number, countTotal: number) => void;
  updateBriefing: (text: string, priority: 'info' | 'alert') => void;
  sendAlert: (type: 'sos' | 'bolo' | 'info', message: string, location?: string) => void;
  dismissAlert: (id: string) => void;
  resetSession: () => void;
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

  useEffect(() => {
    if (venue?.themeColor) {
      document.documentElement.style.setProperty('--theme-color', venue.themeColor);
    }
  }, [venue]);

  // Sync Session Data
  useEffect(() => {
    if (!user || !userProfile || !venue) {
      setIsLoading(true);
      return;
    }

    const currentShift = getShiftDate();
    
    // Load History
    const storedHistoryJSON = localStorage.getItem(`${venue.id}_${HISTORY_KEY}`);
    if (storedHistoryJSON) {
      try { setHistory(JSON.parse(storedHistoryJSON)); } catch (e) { console.error(e); }
    }

    // Live Session Sync
    const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', currentShift);
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
        const newSession = createNewSession(currentShift, venue.name, venue.maxCapacity);
        setDoc(docRef, newSession).then(() => {
          setSession(newSession);
        });
      }
    }, (error) => {
      console.error("Sync error:", error);
      setIsLive(false);
      const local = localStorage.getItem(`${venue.id}_current_session`);
      if (local) setSession(JSON.parse(local));
      else setSession(createNewSession(currentShift, venue.name, venue.maxCapacity));
    });

    // Live Alerts Sync
    const alertsRef = collection(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'alerts');
    const qAlerts = query(alertsRef, where('active', '==', true), orderBy('timestamp', 'desc'));
    
    const unsubscribeAlerts = onSnapshot(qAlerts, (snap) => {
      const activeAlerts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert));
      // Filter out alerts older than 12 hours automatically locally if needed
      setAlerts(activeAlerts);
    });

    return () => {
      unsubscribeSession();
      unsubscribeAlerts();
    };
  }, [user, userProfile, venue]);

  const updateSession = async (updater: (prev: SessionData) => SessionData) => {
    if (!session || !userProfile) return;

    const newState = updater(session);
    newState.lastUpdated = new Date().toISOString();
    setSession(newState);

    if (isLive) {
      const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', session.shiftDate);
      try {
        await setDoc(docRef, newState);
      } catch (e) {
        console.error("Failed to push update:", e);
      }
    }
  };

  const incrementCapacity = () => {
    updateSession(prev => ({
      ...prev,
      currentCapacity: prev.currentCapacity + 1,
      logs: [...prev.logs, { timestamp: new Date().toISOString(), type: 'in', count: 1 }]
    }));
  };

  const decrementCapacity = () => {
    updateSession(prev => ({
      ...prev,
      currentCapacity: Math.max(0, prev.currentCapacity - 1),
      logs: [...prev.logs, { timestamp: new Date().toISOString(), type: 'out', count: 1 }]
    }));
  };

  const logRejection = (reason: RejectionReason) => {
    updateSession(prev => ({
      ...prev,
      rejections: [...prev.rejections, { timestamp: new Date().toISOString(), reason }]
    }));
  };

  const addEjection = (ejection: EjectionLog) => {
    updateSession(prev => ({
      ...prev,
      ejections: [ejection, ...prev.ejections]
    }));
  };

  const removeEjection = (id: string) => {
    if(!confirm("Are you sure you want to delete this incident log?")) return;
    updateSession(prev => ({
      ...prev,
      ejections: prev.ejections.filter(e => e.id !== id)
    }));
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
    updateSession(prev => ({
      ...prev,
      periodicLogs: [...(prev.periodicLogs || []), newLog]
    }));
  };

  const removePeriodicLog = (id: string) => {
    if(!confirm("Are you sure you want to delete this half-hourly log?")) return;
    updateSession(prev => ({
      ...prev,
      periodicLogs: prev.periodicLogs.filter(p => p.id !== id)
    }));
  };

  const toggleChecklist = (type: 'pre' | 'post', id: string) => {
    updateSession(prev => {
      const listKey = type === 'pre' ? 'preEventChecks' : 'postEventChecks';
      const updatedList = prev[listKey].map(item => 
        item.id === id ? { ...item, checked: !item.checked, timestamp: new Date().toISOString() } : item
      );
      return { ...prev, [listKey]: updatedList };
    });
  };

  const logPatrol = (area: string) => {
    updateSession(prev => ({
      ...prev,
      patrolLogs: [...prev.patrolLogs, { time: new Date().toISOString(), area, checked: true }]
    }));
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
     updateSession(prev => ({ ...prev, briefing: newBriefing }));
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
    if (confirm("End Session? This archives the current shift data.")) {
      const updatedHistory = [session, ...history];
      setHistory(updatedHistory);
      localStorage.setItem(`${venue.id}_${HISTORY_KEY}`, JSON.stringify(updatedHistory));
      
      const nextSession = createNewSession(getShiftDate(), venue.name, venue.maxCapacity);
      updateSession(() => nextSession);
    }
  };

  const clearHistory = () => {
    if (!venue) return;
    if (confirm("Clear local history?")) {
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
      incrementCapacity, decrementCapacity, logRejection, addEjection, removeEjection, removePeriodicLog,
      toggleChecklist, logPatrol, updateBriefing, sendAlert, dismissAlert, resetSession, clearHistory, logPeriodicCheck
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
};