
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, limit, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile, Company, Venue } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  company: Company | null;
  venue: Venue | null;
  loading: boolean;
  features: {
    canAddVenue: boolean;
    canAddStaff: boolean;
    hasFullHistory: boolean;
    hasReports: boolean;
    isPro: boolean;
  };
  login: (email: string, pass: string) => Promise<void>;
  registerBusiness: (email: string, pass: string, companyName: string, venueName: string, fullName: string) => Promise<void>;
  joinTeam: (email: string, pass: string, shortCode: string, fullName: string) => Promise<void>;
  createVenue: (name: string, capacity: number, theme: string) => Promise<void>;
  switchVenue: (venueId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshVenue: () => Promise<void>;
  startProTrial: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateShortCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Feature flags state
  const [features, setFeatures] = useState({
    canAddVenue: false,
    canAddStaff: false,
    hasFullHistory: false,
    hasReports: false,
    isPro: false
  });

  // Calculate features whenever company changes
  useEffect(() => {
    const calculateFeatures = async () => {
      if (!company) {
        setFeatures({ canAddVenue: false, canAddStaff: false, hasFullHistory: false, hasReports: false, isPro: false });
        return;
      }

      const isProPlan = company.subscriptionPlan === 'pro' || company.subscriptionPlan === 'enterprise';
      // Use !! to ensure boolean, avoiding 'undefined' if trialEndsAt is missing
      const isTrialActive = company.subscriptionStatus === 'trial' && !!company.trialEndsAt && new Date(company.trialEndsAt) > new Date();
      const isPro = isProPlan || isTrialActive;

      // 1. Check Venue Limit
      let canAddVenue = isPro;
      if (!isPro) {
        const vRef = collection(db, 'companies', company.id, 'venues');
        const snap = await getDocs(query(vRef)); 
        canAddVenue = snap.size < 1; 
      }

      // 2. Check Staff Limit
      let canAddStaff = isPro;
      if (!isPro) {
         const uRef = collection(db, 'users');
         const q = query(uRef, where('companyId', '==', company.id));
         const snap = await getDocs(q);
         canAddStaff = snap.size < 3;
      }

      setFeatures({
        canAddVenue,
        canAddStaff,
        hasFullHistory: isPro,
        hasReports: isPro,
        isPro: isPro 
      });
    };

    calculateFeatures();
  }, [company]);


  // Sync Auth State with Firestore Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserData(firebaseUser.uid);
      } else {
        setUserProfile(null);
        setCompany(null);
        setVenue(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Inactivity Auto-Logout Timer (2 Hours)
  useEffect(() => {
    if (!user) return;
    const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000; 
    
    const updateActivity = () => {
        localStorage.setItem('nightguard_last_activity', Date.now().toString());
    };

    const checkInactivity = () => {
        const last = Number(localStorage.getItem('nightguard_last_activity') || Date.now());
        if (Date.now() - last > INACTIVITY_LIMIT) {
            console.log("Auto-logging out due to inactivity");
            logout();
        }
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);
    updateActivity();

    const interval = setInterval(checkInactivity, 60 * 1000); 

    return () => {
        window.removeEventListener('mousemove', updateActivity);
        window.removeEventListener('click', updateActivity);
        window.removeEventListener('keypress', updateActivity);
        window.removeEventListener('touchstart', updateActivity);
        window.removeEventListener('scroll', updateActivity);
        clearInterval(interval);
    };
  }, [user]);

  const fetchUserData = async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        const profileData = userSnapshot.data() as UserProfile;
        
        // SUSPENSION CHECK
        if (profileData.status === 'suspended') {
          await signOut(auth);
          throw new Error("Your account has been suspended. Please contact your administrator.");
        }

        setUserProfile(profileData);

        if (profileData.companyId) {
          const companyDoc = await getDoc(doc(db, 'companies', profileData.companyId));
          if (companyDoc.exists()) {
            setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
          }

          let targetVenueId = profileData.venueId;
          
          if (!targetVenueId) {
            // Find a venue they are allowed to access
            const venuesRef = collection(db, 'companies', profileData.companyId, 'venues');
            let q = query(venuesRef, limit(1));
            
            // If they have explicit allowedVenues, check those first
            if (profileData.allowedVenues && profileData.allowedVenues.length > 0) {
               targetVenueId = profileData.allowedVenues[0];
            } else {
               const venueSnap = await getDocs(q);
               if (!venueSnap.empty) {
                 targetVenueId = venueSnap.docs[0].id;
               }
            }
            
            if (targetVenueId) {
               await updateDoc(userDocRef, { venueId: targetVenueId });
            }
          }

          if (targetVenueId) {
            const venueDoc = await getDoc(doc(db, 'companies', profileData.companyId, 'venues', targetVenueId));
            if (venueDoc.exists()) {
              setVenue({ id: venueDoc.id, ...venueDoc.data() } as Venue);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      // If error was thrown during fetch (e.g. suspension), rethrow if possible or handle UI
      if (error.message.includes('suspended')) {
         alert(error.message);
         setUser(null);
      }
    }
  };

  const setReturningUserFlag = () => {
    localStorage.setItem('nightguard_returning_user', 'true');
  };

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    // Fetch data handles suspension check
    setReturningUserFlag();
  };

  const registerBusiness = async (email: string, pass: string, companyName: string, venueName: string, fullName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;
    const venueCode = generateShortCode();

    try {
      const companyData = {
        name: companyName,
        ownerId: uid,
        createdAt: new Date().toISOString(),
        subscriptionPlan: 'free',
        subscriptionStatus: 'active'
      };
      
      const companyRef = await addDoc(collection(db, 'companies'), companyData);

      const venueRef = await addDoc(collection(db, 'companies', companyRef.id, 'venues'), {
        name: venueName,
        companyId: companyRef.id,
        maxCapacity: 500,
        themeColor: '#6366f1',
        shortCode: venueCode,
        createdAt: new Date().toISOString(),
        locations: ['Main Door', 'Main Bar', 'Dance Floor', 'VIP', 'Toilets'] // Default locations
      });

      await setDoc(doc(db, 'invites', venueCode), {
        companyId: companyRef.id,
        venueId: venueRef.id,
        venueName: venueName
      });

      const profileData: UserProfile = {
        uid,
        email,
        displayName: fullName,
        companyId: companyRef.id,
        venueId: venueRef.id,
        role: 'owner',
        status: 'active',
        allowedVenues: [venueRef.id]
      };

      await setDoc(doc(db, 'users', uid), profileData);
      
      setUserProfile(profileData);
      setCompany({ id: companyRef.id, ...companyData } as Company);
      setVenue({ id: venueRef.id, name: venueName, companyId: companyRef.id, maxCapacity: 500, themeColor: '#6366f1', shortCode: venueCode, locations: ['Main Door', 'Main Bar', 'Dance Floor', 'VIP', 'Toilets'] });
      setReturningUserFlag();
    } catch (error) {
      console.error("Registration failed:", error);
      throw error; 
    }
  };

  const startProTrial = async () => {
    if (!company) return;
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    const companyRef = doc(db, 'companies', company.id);
    await updateDoc(companyRef, {
      subscriptionStatus: 'trial',
      trialEndsAt: trialEnds.toISOString()
    });

    setCompany(prev => prev ? { 
      ...prev, 
      subscriptionStatus: 'trial', 
      trialEndsAt: trialEnds.toISOString() 
    } : null);
  };

  const createVenue = async (name: string, capacity: number, theme: string) => {
    if (!company || !userProfile) return;
    
    if (!features.canAddVenue && !features.isPro) {
       const vRef = collection(db, 'companies', company.id, 'venues');
       const snap = await getDocs(query(vRef));
       if (snap.size >= 1) {
         throw new Error("Free Plan limit reached (1 Venue). Please upgrade to Pro.");
       }
    }

    const venueCode = generateShortCode();

    const venueRef = await addDoc(collection(db, 'companies', company.id, 'venues'), {
      name,
      companyId: company.id,
      maxCapacity: capacity,
      themeColor: theme,
      shortCode: venueCode,
      createdAt: new Date().toISOString(),
      locations: ['Main Door', 'Bar', 'Floor'] // Simple defaults
    });

    // Add this new venue to the owner's allowed list
    const updatedAllowed = [...(userProfile.allowedVenues || []), venueRef.id];
    await updateDoc(doc(db, 'users', userProfile.uid), { allowedVenues: updatedAllowed });
    setUserProfile(prev => prev ? { ...prev, allowedVenues: updatedAllowed } : null);

    await setDoc(doc(db, 'invites', venueCode), {
      companyId: company.id,
      venueId: venueRef.id,
      venueName: name
    });
  };

  const joinTeam = async (email: string, pass: string, shortCode: string, fullName: string) => {
    // 1. Validate Invite (Public Read)
    const inviteDoc = await getDoc(doc(db, 'invites', shortCode.toUpperCase()));
    
    if (!inviteDoc.exists()) {
      throw new Error("Invalid Venue Code. Please check and try again.");
    }
    const { companyId, venueId } = inviteDoc.data();

    // 2. Validate Company
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    if (!companyDoc.exists()) throw new Error("Company not found");
    const coData = companyDoc.data() as Company;

    // 3. Create Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    const uid = user.uid;

    try {
      // 4. Create Profile
      const profileData: UserProfile = {
        uid,
        email,
        displayName: fullName,
        companyId: companyId,
        venueId: venueId,
        role: 'security',
        status: 'active',
        allowedVenues: [venueId]
      };

      await setDoc(doc(db, 'users', uid), profileData);

      // 5. Check Limit (Now Authenticated & Profiled)
      const isPro = coData.subscriptionPlan === 'pro' || 
                    coData.subscriptionPlan === 'enterprise' || 
                    (coData.subscriptionStatus === 'trial' && !!coData.trialEndsAt && new Date(coData.trialEndsAt) > new Date());
      
      if (!isPro) {
         const uRef = collection(db, 'users');
         const q = query(uRef, where('companyId', '==', companyId));
         const snap = await getDocs(q);
         
         // snap includes the current user we just added. Limit is 3.
         if (snap.size > 3) {
            // ROLLBACK
            await deleteDoc(doc(db, 'users', uid));
            await user.delete(); 
            throw new Error("This venue has reached its Staff Limit (3) on the Free Plan. Please ask the owner to upgrade.");
         }
      }

      setUserProfile(profileData);
      setReturningUserFlag();
    } catch (error: any) {
      console.error("Join Team failed:", error);
      // Clean up ghost auth user if profile creation failed or if we manually threw the Limit error
      if (auth.currentUser && error.message !== "This venue has reached its Staff Limit (3) on the Free Plan. Please ask the owner to upgrade.") {
         try { await user.delete(); } catch(e) { console.error("Cleanup failed", e); }
      }
      throw error;
    }
  };

  const switchVenue = async (venueId: string) => {
    if (!user || !userProfile) return;
    
    // Check permission
    if (userProfile.role !== 'owner' && userProfile.allowedVenues && !userProfile.allowedVenues.includes(venueId)) {
        alert("You do not have permission to access this venue.");
        return;
    }
    
    const venueDoc = await getDoc(doc(db, 'companies', userProfile.companyId, 'venues', venueId));
    if (venueDoc.exists()) {
       setVenue({ id: venueDoc.id, ...venueDoc.data() } as Venue);
       
       const userDocRef = doc(db, 'users', user.uid);
       await updateDoc(userDocRef, { venueId: venueId });
       setUserProfile(prev => prev ? { ...prev, venueId } : null);
    }
  };

  const refreshVenue = async () => {
    if(userProfile && venue) {
       const venueDoc = await getDoc(doc(db, 'companies', userProfile.companyId, 'venues', venue.id));
       if (venueDoc.exists()) {
         setVenue({ id: venueDoc.id, ...venueDoc.data() } as Venue);
       }
    }
  }

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setCompany(null);
    setVenue(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, userProfile, company, venue, loading, features,
      login, registerBusiness, joinTeam, switchVenue, logout, refreshVenue, createVenue, startProTrial
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
