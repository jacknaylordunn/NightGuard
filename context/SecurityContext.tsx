import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { SessionData, INITIAL_PRE_CHECKS, INITIAL_POST_CHECKS, EjectionLog, RejectionReason, Alert, Briefing, PeriodicLog } from '../types';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { doc, setDoc, onSnapshot, collection, addDoc, query, where, orderBy, limit, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';

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

  // Refactored updateSession to use functional state update
  const updateSession = (updater: (prev: SessionData) => SessionData) => {
    setSession(prev => {
      if (!prev || !userProfile) return prev;

      const newState = updater(prev);
      newState.lastUpdated = new Date().toISOString();

      if (isLive) {
        const docRef = doc(db, 'companies', userProfile.companyId, 'venues', userProfile.venueId, 'shifts', newState.shiftDate);
        // Fire and forget Firestore update to ensure non-blocking UI
        setDoc(docRef, newState).catch(e => {
          console.error("Failed to push update:", e);
        });
      }
      return newState;
    });
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

  // Sync clickers to specific numbers (e.g. from Half-Hourly log)
  const syncLiveCounts = (inCount: number, outCount: number) => {
    updateSession(prev => {
        // Calculate current totals by summing count property
        const currentIn = prev.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
        const currentOut = prev.logs.filter(l => l.type === 'out').reduce((acc, l) => acc + (l.count || 1), 0);

        const diffIn = inCount - currentIn;
        const diffOut = outCount - currentOut;

        const newLogs = [...prev.logs];
        
        // Add adjustment logs if needed
        if (diffIn !== 0) {
            newLogs.push({ timestamp: new Date().toISOString(), type: 'in', count: diffIn });
        }
        if (diffOut !== 0) {
            newLogs.push({ timestamp: new Date().toISOString(), type: 'out', count: diffOut });
        }

        return {
            ...prev,
            logs: newLogs,
            currentCapacity: inCount - outCount
        };
    });
  };

  // Manual correction of just the capacity number
  const setGlobalCapacity = (newCapacity: number) => {
    updateSession(prev => {
        const diff = newCapacity - prev.currentCapacity;
        if (diff === 0) return prev;

        // If capacity increases, we treat it as In. If it decreases, we treat it as Out.
        const type = diff > 0 ? 'in' : 'out';
        const count = Math.abs(diff);

        return {
            ...prev,
            currentCapacity: newCapacity,
            logs: [...prev.logs, { timestamp: new Date().toISOString(), type, count }]
        };
    });
  };

  const resetClickers = () => {
    if(!confirm("Reset Clickers? This will clear the current In/Out count but preserve your Half-Hourly Logs.")) return;
    
    updateSession(prev => ({
      ...prev,
      currentCapacity: 0,
      logs: [] // Clears the admission logs
      // Preserves periodicLogs, ejections, checks, etc.
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

  // Atomic function to Log Periodic Check AND Sync Clickers in one state update
  const logPeriodicCheckAndSync = (timeLabel: string, countIn: number, countOut: number, countTotal: number) => {
    updateSession(prev => {
       // 1. Create the Periodic Log
       const newLog: PeriodicLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          timeLabel,
          countIn,
          countOut,
          countTotal
       };
       const updatedPeriodicLogs = [...(prev.periodicLogs || []), newLog];

       // 2. Calculate Corrections for Sync
       const currentIn = prev.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
       const currentOut = prev.logs.filter(l => l.type === 'out').reduce((acc, l) => acc + (l.count || 1), 0);
       
       const diffIn = countIn - currentIn;
       const diffOut = countOut - currentOut;
       
       const newLogs = [...prev.logs];
       if (diffIn !== 0) newLogs.push({ timestamp: new Date().toISOString(), type: 'in', count: diffIn });
       if (diffOut !== 0) newLogs.push({ timestamp: new Date().toISOString(), type: 'out', count: diffOut });

       // 3. Return Combined State
       return {
         ...prev,
         periodicLogs: updatedPeriodicLogs,
         logs: newLogs,
         currentCapacity: countIn - countOut
       };
    });
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
    if (confirm("Manually End Session? This archives the current data and starts fresh.")) {
      alert("Shift data is automatically saved to the cloud. Resetting clickers can be done via the Door controls.");
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