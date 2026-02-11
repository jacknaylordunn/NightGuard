
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { 
  LogOut, Plus, Building, Nfc, Users, ChevronsUpDown, Check, Crown, MapPin, QrCode
} from 'lucide-react';
import { Venue, UserProfile, Checkpoint, ChecklistDefinition, UserRole } from '../types';

const Settings: React.FC = () => {
  const { userProfile, company, venue, logout, refreshVenue, features, switchVenue, createVenue } = useAuth();
  const { writeNfcTag, hasNfcSupport } = useSecurity();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'venue' | 'org'>('profile');
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [newCheckpointName, setNewCheckpointName] = useState('');

  const [accessibleVenues, setAccessibleVenues] = useState<Venue[]>([]);
  const [showVenueSwitcher, setShowVenueSwitcher] = useState(false);

  useEffect(() => {
    if (!company) return;
    
    const loadData = async () => {
        const vRef = collection(db, 'companies', company.id, 'venues');
        const vSnap = await getDocs(vRef);
        const allVenues = vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
        
        if(userProfile?.role === 'owner') {
            setAccessibleVenues(allVenues);
            setVenues(allVenues);
        } else {
            const allowed = userProfile?.allowedVenues || [];
            if (venue && !allowed.includes(venue.id)) allowed.push(venue.id);
            const myVenues = allVenues.filter(v => allowed.includes(v.id));
            setAccessibleVenues(myVenues);
        }

        if(userProfile?.role === 'owner') {
            const uRef = collection(db, 'users');
            const q = query(uRef, where('companyId', '==', company.id));
            const uSnap = await getDocs(q);
            setStaff(uSnap.docs.map(d => d.data() as UserProfile));
        }
    };

    const loadVenueConfig = async () => {
        if (venue) {
            setCustomLocations(venue.locations || []);
            setCheckpoints(venue.checkpoints || []);
        }
    };

    loadData();
    loadVenueConfig();
  }, [company, venue, userProfile]);

  const handleCreateVenue = async () => {
    if (!newVenueName) return;
    try {
      await createVenue(newVenueName, 200, '#6366f1');
      setNewVenueName('');
      setShowAddVenue(false);
      alert('Venue created! Refreshing...');
      window.location.reload(); 
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSwitchVenue = async (venueId: string) => {
      await switchVenue(venueId);
      setShowVenueSwitcher(false);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
     if (!confirm(`Change role to ${newRole}?`)) return;
     try {
         await updateDoc(doc(db, 'users', userId), { role: newRole });
         setStaff(prev => prev.map(s => s.uid === userId ? { ...s, role: newRole } : s));
     } catch (e: any) {
         console.error("Role update failed", e);
         alert("Failed to update role. Permission denied or network error.");
     }
  };

  const toggleStaffSuspension = async (staffId: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await updateDoc(doc(db, 'users', staffId), { status: newStatus });
      setStaff(prev => prev.map(s => s.uid === staffId ? { ...s, status: newStatus as any } : s));
    } catch(e: any) {
      console.error(e);
      alert("Failed to update status. Ensure you are the owner.");
    }
  };

  const addCheckpoint = async () => {
      if(!venue || !newCheckpointName) return;
      const newCp: Checkpoint = { id: Math.random().toString(36).substr(2,6).toUpperCase(), name: newCheckpointName };
      const updated = [...checkpoints, newCp];
      await updateDoc(doc(db, 'companies', company!.id, 'venues', venue.id), { checkpoints: updated });
      setCheckpoints(updated);
      setNewCheckpointName('');
      refreshVenue();
  };

  const handleWriteTag = async (id: string, name: string) => {
      if(!hasNfcSupport) {
          alert("NFC writing is only available on Android (Chrome).");
          return;
      }
      try {
          alert(`Hold tag to phone to write: ${name}`);
          await writeNfcTag(id);
          alert("Tag written successfully!");
      } catch (e: any) {
          alert("Write failed: " + e.message);
      }
  };

  const addLocation = async () => {
    if (!venue || !newLocation) return;
    const updated = [...customLocations, newLocation];
    await updateDoc(doc(db, 'companies', company!.id, 'venues', venue.id), { locations: updated });
    setCustomLocations(updated);
    setNewLocation('');
    refreshVenue();
  };

  const isOwner = userProfile?.role === 'owner';

  return (
    <div className="h-full overflow-y-auto p-4 pb-32 bg-slate-950" onClick={() => setShowVenueSwitcher(false)}>
      
      <div className="flex justify-between items-start mb-6">
        <div>
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            {accessibleVenues.length > 1 ? (
                <div className="relative mt-1" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => setShowVenueSwitcher(!showVenueSwitcher)}
                        className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
                    >
                        <Building size={14} className="text-indigo-500" />
                        <span className="font-bold truncate max-w-[150px]">{venue?.name}</span>
                        <ChevronsUpDown size={14} className="text-zinc-500" />
                    </button>
                    {showVenueSwitcher && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
                            <div className="p-2 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">Switch Venue</div>
                            <div className="max-h-48 overflow-y-auto">
                                {accessibleVenues.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => handleSwitchVenue(v.id)}
                                        className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-zinc-800 transition-colors ${venue?.id === v.id ? 'bg-zinc-800/50' : ''}`}
                                    >
                                        <span className={`text-sm ${venue?.id === v.id ? 'text-white font-bold' : 'text-zinc-400'}`}>{v.name}</span>
                                        {venue?.id === v.id && <Check size={14} className="text-emerald-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-zinc-500 text-xs mt-1">{venue?.name}</p>
            )}
        </div>
        <button onClick={logout} className="p-2 bg-zinc-900 rounded-xl text-red-400 border border-zinc-800 hover:bg-zinc-800 transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-900 p-1 rounded-xl mb-6 border border-zinc-800">
        <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'profile' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
            My Profile
        </button>
        <button 
            onClick={() => setActiveTab('venue')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'venue' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
            Venue Config
        </button>
        {isOwner && (
            <button 
                onClick={() => setActiveTab('org')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'org' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Organization
            </button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
           <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-xl shadow-indigo-900/20">
                 {userProfile?.displayName.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-white">{userProfile?.displayName}</h3>
              <p className="text-zinc-500 text-sm mb-4">{userProfile?.email}</p>
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-400 uppercase tracking-widest border border-zinc-700">
                 {userProfile?.role?.replace('_', ' ') || 'User'}
              </span>
           </div>
        </div>
      )}

      {activeTab === 'venue' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><MapPin size={16} /> Locations</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                 {customLocations.map(l => (
                    <span key={l} className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-xs border border-zinc-700">{l}</span>
                 ))}
              </div>
              <div className="flex gap-2">
                 <input 
                   value={newLocation}
                   onChange={e => setNewLocation(e.target.value)}
                   placeholder="Add Area"
                   className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 text-sm text-white"
                 />
                 <button onClick={addLocation} className="bg-indigo-600 text-white p-2 rounded-xl"><Plus size={18}/></button>
              </div>
           </div>
           
           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="text-sm font-bold text-white flex items-center gap-2"><Nfc size={16} className="text-emerald-400" /> Checkpoints</h4>
              </div>
              <div className="space-y-2 mb-4">
                 {checkpoints.map(cp => (
                    <div key={cp.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                       <div>
                          <span className="text-sm text-white font-bold block">{cp.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">ID: {cp.id}</span>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => handleWriteTag(cp.id, cp.name)} className="p-2 bg-zinc-900 text-zinc-400 hover:text-blue-400 rounded-lg"><Nfc size={16}/></button>
                          <button onClick={() => alert(`QR DATA: ${cp.id}`)} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg"><QrCode size={16}/></button>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="flex gap-2">
                 <input 
                   value={newCheckpointName}
                   onChange={e => setNewCheckpointName(e.target.value)}
                   placeholder="New Checkpoint Name"
                   className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 text-sm text-white"
                 />
                 <button onClick={addCheckpoint} className="bg-emerald-600 text-white p-2 rounded-xl"><Plus size={18}/></button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'org' && isOwner && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
           <div className="bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-500/50 p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                 <h4 className="text-white font-bold flex items-center gap-2">
                    <Crown size={16} className="text-amber-400" /> 
                    {features.isPro ? 'Pro Plan' : 'Free Plan'}
                 </h4>
                 <p className="text-indigo-200 text-xs mt-1">
                    {features.isPro ? 'You have full access.' : 'Upgrade for unlimited access.'}
                 </p>
              </div>
              <button onClick={() => window.location.href = "/?tab=pricing"} className="bg-white text-indigo-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-zinc-200 transition-colors">
                {features.isPro ? 'Manage Billing' : 'Upgrade'}
              </button>
           </div>

           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="text-sm font-bold text-white flex items-center gap-2"><Building size={16} /> Properties</h4>
                 <button onClick={() => setShowAddVenue(!showAddVenue)} className="text-indigo-400 hover:text-white"><Plus size={18}/></button>
              </div>

              {showAddVenue && (
                 <div className="mb-4 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <input 
                      value={newVenueName}
                      onChange={e => setNewVenueName(e.target.value)}
                      placeholder="Venue Name"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white mb-2"
                    />
                    <button onClick={handleCreateVenue} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold">Create Venue</button>
                 </div>
              )}

              <div className="space-y-2">
                 {venues.map(v => (
                    <div key={v.id} onClick={() => switchVenue(v.id)} className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer ${venue?.id === v.id ? 'bg-indigo-900/10 border-indigo-500/50' : 'bg-zinc-950 border-zinc-800'}`}>
                       <div>
                          <span className={`text-sm font-bold ${venue?.id === v.id ? 'text-white' : 'text-zinc-400'}`}>{v.name}</span>
                       </div>
                       {venue?.id === v.id && <Check size={14} className="text-indigo-400" />}
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Users size={16} /> Team Roster</h4>
              <div className="space-y-3">
                 {staff.map(s => (
                    <div key={s.uid} className="flex flex-col gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                             {s.displayName.charAt(0)}
                          </div>
                          <div className="flex-1">
                             <span className={`text-sm font-bold block ${s.status === 'suspended' ? 'text-red-400 line-through' : 'text-white'}`}>{s.displayName}</span>
                             <span className="text-[10px] text-zinc-500">{s.role?.replace('_', ' ') || 'Unknown'}</span>
                          </div>
                          {s.role !== 'owner' && (
                             <button onClick={() => toggleStaffSuspension(s.uid, s.status)} className="text-xs text-zinc-500 hover:text-white">
                                {s.status === 'suspended' ? 'Unblock' : 'Block'}
                             </button>
                          )}
                       </div>
                       {s.role !== 'owner' && (
                           <div className="flex gap-2 mt-1">
                               <button 
                                 onClick={() => handleRoleChange(s.uid, 'security')}
                                 className={`flex-1 text-[10px] py-1 rounded border ${s.role === 'security' ? 'bg-indigo-900/30 border-indigo-500 text-indigo-400' : 'border-zinc-800 text-zinc-600'}`}
                               >
                                 Security
                               </button>
                               <button 
                                 onClick={() => handleRoleChange(s.uid, 'floor_staff')}
                                 className={`flex-1 text-[10px] py-1 rounded border ${s.role === 'floor_staff' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'border-zinc-800 text-zinc-600'}`}
                               >
                                 Floor
                               </button>
                               <button 
                                 onClick={() => handleRoleChange(s.uid, 'manager')}
                                 className={`flex-1 text-[10px] py-1 rounded border ${s.role === 'manager' ? 'bg-purple-900/30 border-purple-500 text-purple-400' : 'border-zinc-800 text-zinc-600'}`}
                               >
                                 Manager
                               </button>
                           </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
