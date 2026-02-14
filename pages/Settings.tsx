
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { 
  LogOut, Plus, Building, Nfc, Users, ChevronsUpDown, Check, Crown, MapPin, QrCode, FileText, Upload, Loader2
} from 'lucide-react';
import { Venue, UserProfile, Checkpoint, ChecklistDefinition, UserRole } from '../types';

const Settings: React.FC = () => {
  const { userProfile, company, venue, logout, refreshVenue, features, switchVenue, createVenue } = useAuth();
  const { writeNfcTag, hasNfcSupport, uploadTimesheet, session } = useSecurity();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'venue' | 'org'>('profile');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  
  // Timesheet State
  const tsFileRef = useRef<HTMLInputElement>(null);
  const [tsFile, setTsFile] = useState<File|null>(null);
  const [tsUploading, setTsUploading] = useState(false);

  // Other State
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
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

  const handleTimesheetUpload = async () => {
      if(!tsFile) return;
      setTsUploading(true);
      try {
          await uploadTimesheet(tsFile);
          alert("Timesheet uploaded successfully.");
          setTsFile(null);
      } catch(e) {
          alert("Upload failed.");
      } finally {
          setTsUploading(false);
      }
  };

  const handleAddLocation = async () => {
     if(!newLocation.trim() || !company || !venue) return;
     setAddingLocation(true);
     try {
         const updated = [...customLocations, newLocation.trim()];
         await updateDoc(doc(db,'companies',company.id,'venues',venue.id),{locations:updated});
         setCustomLocations(updated);
         setNewLocation('');
         await refreshVenue();
     } catch (e) {
         console.error(e);
         alert("Failed to add location");
     } finally {
         setAddingLocation(false);
     }
  };

  const isOwner = userProfile?.role === 'owner';

  return (
    <div className="h-full overflow-y-auto p-4 pb-32 bg-slate-950" onClick={() => setShowVenueSwitcher(false)}>
      <div className="flex justify-between items-start mb-6">
        <div>
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            {accessibleVenues.length > 1 ? (
                <div className="relative mt-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowVenueSwitcher(!showVenueSwitcher)} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all">
                        <Building size={14} className="text-indigo-500" />
                        <span className="font-bold truncate max-w-[150px]">{venue?.name}</span>
                        <ChevronsUpDown size={14} className="text-zinc-500" />
                    </button>
                    {showVenueSwitcher && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                            <div className="p-2 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">Switch Venue</div>
                            <div className="max-h-48 overflow-y-auto">
                                {accessibleVenues.map(v => (
                                    <button key={v.id} onClick={() => switchVenue(v.id)} className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-zinc-800 ${venue?.id === v.id ? 'bg-zinc-800/50' : ''}`}>
                                        <span className={`text-sm ${venue?.id === v.id ? 'text-white font-bold' : 'text-zinc-400'}`}>{v.name}</span>
                                        {venue?.id === v.id && <Check size={14} className="text-emerald-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (<p className="text-zinc-500 text-xs mt-1">{venue?.name}</p>)}
        </div>
        <button onClick={logout} className="p-2 bg-zinc-900 rounded-xl text-red-400 border border-zinc-800 hover:bg-zinc-800 transition-colors"><LogOut size={20} /></button>
      </div>

      <div className="flex bg-zinc-900 p-1 rounded-xl mb-6 border border-zinc-800">
        <button onClick={() => setActiveTab('profile')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'profile' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>My Profile</button>
        <button onClick={() => setActiveTab('venue')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'venue' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>Venue Config</button>
        {isOwner && <button onClick={() => setActiveTab('org')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'org' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>Organization</button>}
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6">
           <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-xl shadow-indigo-900/20">{userProfile?.displayName.charAt(0)}</div>
              <h3 className="text-xl font-bold text-white">{userProfile?.displayName}</h3>
              <p className="text-zinc-500 text-sm mb-4">{userProfile?.email}</p>
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-400 uppercase tracking-widest border border-zinc-700">{userProfile?.role?.replace('_', ' ') || 'User'}</span>
           </div>

           {/* Timesheet Upload */}
           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><FileText size={16} /> Timesheet Upload</h4>
              <div onClick={() => tsFileRef.current?.click()} className="border-2 border-dashed border-zinc-700 bg-zinc-950/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 hover:bg-zinc-900">
                  {tsFile ? (
                      <>
                         <FileText size={32} className="text-emerald-500 mb-2"/>
                         <span className="text-xs text-emerald-400 font-bold">{tsFile.name}</span>
                      </>
                  ) : (
                      <>
                         <Upload size={32} className="text-zinc-600 mb-2"/>
                         <span className="text-xs text-zinc-500">Tap to upload photo/PDF</span>
                      </>
                  )}
                  <input ref={tsFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => e.target.files && setTsFile(e.target.files[0])} />
              </div>
              {tsFile && (
                  <button onClick={handleTimesheetUpload} disabled={tsUploading} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm shadow-lg">
                      {tsUploading ? 'Uploading...' : 'Submit Timesheet'}
                  </button>
              )}
              {/* Recent Uploads */}
              {session.timesheets?.filter(t => t.uploadedBy === userProfile?.displayName).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Uploaded This Shift</p>
                      {session.timesheets.filter(t => t.uploadedBy === userProfile?.displayName).map(t => (
                          <div key={t.id} className="flex justify-between text-xs text-zinc-400 bg-zinc-950 p-2 rounded mb-1">
                              <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                              <span className="text-emerald-500">Sent</span>
                          </div>
                      ))}
                  </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'venue' && (
        <div className="space-y-6">
           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><MapPin size={16} /> Locations</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                 {customLocations.map(l => <span key={l} className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-xs border border-zinc-700">{l}</span>)}
              </div>
              <div className="flex gap-2">
                 <input 
                    value={newLocation} 
                    onChange={e => setNewLocation(e.target.value)} 
                    placeholder="Add Area" 
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 text-sm text-white" 
                    onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
                 />
                 <button onClick={handleAddLocation} disabled={addingLocation} className="bg-indigo-600 text-white p-2 rounded-xl flex items-center justify-center min-w-[40px]">
                    {addingLocation ? <Loader2 size={18} className="animate-spin"/> : <Plus size={18}/>}
                 </button>
              </div>
           </div>
           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Nfc size={16} className="text-emerald-400" /> Checkpoints</h4>
              <div className="space-y-2 mb-4">
                 {checkpoints.map(cp => (
                    <div key={cp.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                       <div><span className="text-sm text-white font-bold block">{cp.name}</span><span className="text-[10px] text-zinc-500 font-mono">ID: {cp.id}</span></div>
                       <button onClick={() => writeNfcTag(cp.id)} className="p-2 bg-zinc-900 text-zinc-400 hover:text-blue-400 rounded-lg"><Nfc size={16}/></button>
                    </div>
                 ))}
              </div>
              <div className="flex gap-2">
                 <input value={newCheckpointName} onChange={e => setNewCheckpointName(e.target.value)} placeholder="New Checkpoint Name" className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 text-sm text-white" />
                 <button onClick={() => { if(newCheckpointName) { const u=[...checkpoints,{id:Math.random().toString(36).substr(2,6).toUpperCase(),name:newCheckpointName}]; updateDoc(doc(db,'companies',company!.id,'venues',venue!.id),{checkpoints:u}); setCheckpoints(u); setNewCheckpointName(''); refreshVenue(); } }} className="bg-emerald-600 text-white p-2 rounded-xl"><Plus size={18}/></button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'org' && isOwner && (
        <div className="space-y-6">
           <div className="bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-500/50 p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div><h4 className="text-white font-bold flex items-center gap-2"><Crown size={16} className="text-amber-400" /> {features.isPro ? 'Pro Plan' : 'Free Plan'}</h4></div>
              <button onClick={() => window.location.href = "/?tab=pricing"} className="bg-white text-indigo-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-zinc-200">Manage</button>
           </div>
           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4"><h4 className="text-sm font-bold text-white flex items-center gap-2"><Users size={16} /> Team Roster</h4></div>
              <div className="space-y-3">
                 {staff.map(s => (
                    <div key={s.uid} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                       <span className="text-sm font-bold text-white block">{s.displayName}</span>
                       <span className="text-[10px] text-zinc-500">{s.role}</span>
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
