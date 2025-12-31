import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { 
  Building2, Users, Plus, Share2, Copy, Check, AlertCircle, Crown, ChevronsUpDown, Edit2, X, Save
} from 'lucide-react';
import { Venue, UserProfile } from '../types';

const getShiftDate = (date: Date = new Date()): string => {
  const d = new Date(date);
  if (d.getHours() < 12) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split('T')[0];
};

const AdminDashboard: React.FC = () => {
  const { userProfile, company, venue, switchVenue, createVenue, features, startProTrial, refreshVenue } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [view, setView] = useState<'overview' | 'venues' | 'staff'>('overview');
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [showVenueSwitcher, setShowVenueSwitcher] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Edit Venue State
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState<number>(0);

  useEffect(() => {
    if (!company) return;

    const loadData = async () => {
      setError(null);
      try {
        // Venues
        const vRef = collection(db, 'companies', company.id, 'venues');
        const vSnap = await getDocs(vRef);
        const allVenues = vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
        
        // Filter based on allowedVenues if not owner
        let accessibleVenues = allVenues;
        if (userProfile?.role !== 'owner' && userProfile?.allowedVenues) {
           accessibleVenues = allVenues.filter(v => userProfile.allowedVenues?.includes(v.id));
        }
        setVenues(accessibleVenues);

        // Staff
        const uRef = collection(db, 'users');
        const q = query(uRef, where('companyId', '==', company.id));
        const uSnap = await getDocs(q);
        const staffList = uSnap.docs.map(d => d.data() as UserProfile);
        
        // Sort staff: Owners first, then alphabetical
        setStaff(staffList.sort((a, b) => {
          if (a.role === 'owner' && b.role !== 'owner') return -1;
          if (a.role !== 'owner' && b.role === 'owner') return 1;
          return a.displayName.localeCompare(b.displayName);
        }));

      } catch (err: any) {
        console.error("Admin Dashboard Load Error:", err);
        if (err.code === 'permission-denied') {
          setError("Access denied. Please check your account permissions.");
        } else {
          setError("Failed to load dashboard data.");
        }
      }
    };

    loadData();
  }, [company, venue]);

  const handleCreateVenue = async () => {
    if (!company || !newVenueName) return;
    try {
      await createVenue(newVenueName, 200, '#6366f1');
      setNewVenueName('');
      setShowAddVenue(false);
      // Manually trigger reload 
      const vRef = collection(db, 'companies', company.id, 'venues');
      const vSnap = await getDocs(vRef);
      setVenues(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Venue)));
      alert('Venue created!');
    } catch (e: any) {
      console.error(e);
      alert(e.message);
    }
  };

  const handleUpdateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !editingVenue) return;

    try {
      // 1. Update Venue Config
      const vRef = doc(db, 'companies', company.id, 'venues', editingVenue.id);
      await updateDoc(vRef, {
        name: editName,
        maxCapacity: Number(editCapacity)
      });

      // 2. Update Active Session if exists
      // This ensures the door counter updates immediately without waiting for a new shift
      const currentShiftId = getShiftDate();
      const sessionRef = doc(db, 'companies', company.id, 'venues', editingVenue.id, 'shifts', currentShiftId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (sessionSnap.exists()) {
         await updateDoc(sessionRef, {
            maxCapacity: Number(editCapacity),
            venueName: editName
         });
      }

      // Update local state
      setVenues(prev => prev.map(v => v.id === editingVenue.id ? { ...v, name: editName, maxCapacity: Number(editCapacity) } : v));

      // Update global context if this is the active venue
      if (venue?.id === editingVenue.id) {
        refreshVenue();
      }

      setEditingVenue(null);
    } catch (err: any) {
      console.error(err);
      setError("Failed to update venue details.");
    }
  };

  const openEditModal = (e: React.MouseEvent, v: Venue) => {
    e.stopPropagation();
    setEditingVenue(v);
    setEditName(v.name);
    setEditCapacity(v.maxCapacity);
  };

  const copyInvite = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}?invite=${code}`);
    alert('Invite Link Copied!');
  };

  const handleSwitch = async (vid: string) => {
    await switchVenue(vid);
    setShowVenueSwitcher(false);
  };

  if (!company) return <div className="p-8 text-center text-zinc-500">Loading Company Data...</div>;

  return (
    <div className="h-full overflow-y-auto p-4 pb-32" onClick={() => setShowVenueSwitcher(false)}>
      
      {/* Error Banner */}
      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-900/50 p-4 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Header Area */}
      <header className="mb-6 pt-2">
        <div className="flex justify-between items-start">
          <div className="relative z-20" onClick={(e) => e.stopPropagation()}>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">{company.name}</h1>
            
            {/* Venue Selector */}
            <button 
              onClick={() => setShowVenueSwitcher(!showVenueSwitcher)}
              className="mt-2 flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-xl text-sm text-zinc-200 hover:bg-zinc-700 transition-all shadow-sm active:scale-95"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
              <span className="font-bold max-w-[140px] truncate">{venue?.name || 'Select Venue'}</span>
              <ChevronsUpDown size={14} className="text-zinc-500" />
            </button>

            {/* Dropdown */}
            {showVenueSwitcher && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-3 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Switch Location</div>
                <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                  {venues.map(v => (
                    <button
                      key={v.id}
                      onClick={() => handleSwitch(v.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between group transition-colors ${venue?.id === v.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${venue?.id === v.id ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
                        <span className={`text-sm ${venue?.id === v.id ? 'text-white font-bold' : 'text-zinc-400'}`}>{v.name}</span>
                      </div>
                      {venue?.id === v.id && <Check size={14} className="text-emerald-500" />}
                    </button>
                  ))}
                </div>
                {userProfile?.role === 'owner' && (
                  <button 
                    onClick={() => { 
                      if (!features.canAddVenue && !features.isPro) {
                        alert("Starter plan limited to 1 Venue. Upgrade to add more.");
                        return;
                      }
                      setView('venues'); setShowVenueSwitcher(false); setShowAddVenue(true); 
                    }}
                    className={`w-full text-left px-4 py-3 bg-zinc-950 hover:bg-black text-xs font-bold border-t border-zinc-800 flex items-center justify-center gap-2 ${features.canAddVenue || features.isPro ? 'text-indigo-400' : 'text-zinc-500 cursor-not-allowed'}`}
                  >
                    <Plus size={14} /> Add New Venue
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold">
             {userProfile?.displayName.charAt(0)}
          </div>
        </div>
      </header>

      {/* Plan Upsell */}
      {!features.isPro && (
        <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 p-4 rounded-2xl mb-6 flex items-center justify-between shadow-lg">
          <div>
            <h4 className="text-white font-bold text-sm flex items-center gap-1"><Crown size={14} className="text-amber-400" /> Upgrade to Pro</h4>
            <p className="text-indigo-200 text-xs mt-1">Unlock Unlimited Venues & Staff</p>
          </div>
          <button onClick={startProTrial} className="bg-white text-indigo-900 px-3 py-2 rounded-xl text-xs font-bold shadow hover:bg-zinc-200">
            Start 14-Day Trial
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {['overview', 'venues', 'staff'].map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab as any)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
              view === tab 
                ? 'bg-zinc-800 border-zinc-600 text-white shadow' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {view === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Building2 size={18} /> <span className="text-xs uppercase font-bold tracking-wider">Venues</span>
              </div>
              <div className="text-3xl font-bold text-white font-mono">{venues.length}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Users size={18} /> <span className="text-xs uppercase font-bold tracking-wider">Staff</span>
              </div>
              <div className="text-3xl font-bold text-white font-mono">{staff.length}</div>
            </div>
            
            {/* Active Venue Invite Code */}
            {venue && userProfile?.role === 'owner' && (
              <div className="bg-gradient-to-br from-indigo-900/30 to-zinc-900 border border-indigo-500/20 p-5 rounded-2xl col-span-2 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-300 mb-2">
                       <Share2 size={16} /> <span className="text-xs uppercase font-bold tracking-wider">Staff Invite Code</span>
                    </div>
                    <div className="text-white font-mono text-3xl font-bold tracking-widest">{venue.shortCode || 'N/A'}</div>
                    <div className="text-xs text-zinc-500 mt-1">{venue.name}</div>
                  </div>
                  <button onClick={() => copyInvite(venue.shortCode)} className="bg-indigo-600 hover:bg-indigo-500 p-3 rounded-xl text-white transition-colors shadow-lg shadow-indigo-900/20">
                    <Copy size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'venues' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex justify-between items-center px-1">
             <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">All Properties</h3>
             {userProfile?.role === 'owner' && (
              <button 
                onClick={() => { 
                  if (!features.canAddVenue && !features.isPro) {
                      alert("Starter plan limited to 1 Venue. Upgrade to add more.");
                      return;
                  }
                  setShowAddVenue(!showAddVenue); 
                }} 
                className={`p-2 rounded-lg transition-colors ${features.canAddVenue || features.isPro ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
              >
                <Plus size={18} />
              </button>
             )}
           </div>

           {showAddVenue && (
             <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl mb-4 animate-in slide-in-from-top-2">
               <h4 className="text-white font-bold mb-3 text-sm">Create New Venue</h4>
               <input 
                 value={newVenueName}
                 onChange={(e) => setNewVenueName(e.target.value)}
                 placeholder="Venue Name (e.g. Club Onyx)"
                 className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white mb-3 focus:outline-none focus:border-indigo-500"
               />
               <button onClick={handleCreateVenue} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg">
                 Confirm Creation
               </button>
             </div>
           )}

           {venues.map(v => (
             <div 
               key={v.id} 
               onClick={() => handleSwitch(v.id)}
               className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all border ${venue?.id === v.id ? 'bg-indigo-900/10 border-indigo-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
             >
               <div>
                 <h4 className="text-white font-bold">{v.name}</h4>
                 <div className="flex gap-4 mt-1">
                   <p className="text-zinc-500 text-xs bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">Cap: {v.maxCapacity}</p>
                   <p className="text-zinc-500 text-xs font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">Code: {v.shortCode}</p>
                 </div>
               </div>
               
               <div className="flex items-center gap-3">
                  {venue?.id === v.id && (
                    <span className="text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded font-bold uppercase tracking-wider">Active</span>
                  )}
                  
                  {userProfile?.role === 'owner' && (
                    <button 
                      onClick={(e) => openEditModal(e, v)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
               </div>
             </div>
           ))}
        </div>
      )}

      {view === 'staff' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Team Roster</h3>
            {!features.isPro && <span className="text-[10px] text-amber-500 bg-amber-900/20 px-2 py-0.5 rounded border border-amber-500/20">Free Limit: 3</span>}
          </div>
          
          {staff.map(s => (
            <div key={s.uid} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${s.status === 'suspended' ? 'bg-red-900/20 text-red-500' : 'bg-zinc-800 text-zinc-400'}`}>
                 {s.displayName.charAt(0)}
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2">
                   <h4 className={`font-bold truncate ${s.status === 'suspended' ? 'text-red-400 line-through' : 'text-white'}`}>{s.displayName}</h4>
                   {s.status === 'suspended' && <span className="text-[9px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded font-bold">BLOCKED</span>}
                 </div>
                 <p className="text-zinc-500 text-xs truncate">{s.email}</p>
               </div>
               <div className="flex flex-col items-end gap-1">
                 <div className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${s.role === 'owner' ? 'bg-amber-900/20 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                   {s.role}
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Venue Modal */}
      {editingVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                <h3 className="text-white font-bold">Edit Venue</h3>
                <button onClick={() => setEditingVenue(null)} className="text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
             </div>
             
             <form onSubmit={handleUpdateVenue} className="p-4 space-y-4">
               <div>
                 <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Venue Name</label>
                 <input 
                   value={editName}
                   onChange={e => setEditName(e.target.value)}
                   className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                   required
                 />
               </div>
               <div>
                 <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Max Capacity</label>
                 <input 
                   type="number"
                   value={editCapacity}
                   onChange={e => setEditCapacity(parseInt(e.target.value))}
                   className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                   required
                   min="1"
                 />
               </div>
               <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2">
                 <Save size={18} /> Save Changes
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;