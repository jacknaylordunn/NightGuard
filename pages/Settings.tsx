
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { 
  LogOut, Plus, Building, Nfc, Users, ChevronsUpDown, Check, Crown, MapPin, QrCode, FileText, Upload, Loader2, X, Share2, Copy, Edit2, Trash2
} from 'lucide-react';
import { Venue, UserProfile, Checkpoint, ChecklistDefinition, UserRole, DEFAULT_PRE_CHECKS, DEFAULT_POST_CHECKS, ChecklistItem } from '../types';

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

  // Staff Management State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [removingStaffId, setRemovingStaffId] = useState<string | null>(null);

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

  const [preChecks, setPreChecks] = useState<ChecklistDefinition[]>([]);
  const [postChecks, setPostChecks] = useState<ChecklistDefinition[]>([]);
  const [newPreCheck, setNewPreCheck] = useState('');
  const [newPostCheck, setNewPostCheck] = useState('');

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
        if (venue && company) {
            setCustomLocations(venue.locations || []);
            setCheckpoints(venue.checkpoints || []);
            
            try {
                const configDoc = await getDoc(doc(db, 'companies', company.id, 'venues', venue.id, 'config', 'checklists'));
                if (configDoc.exists()) {
                    const data = configDoc.data();
                    if (data.pre) setPreChecks(data.pre);
                    if (data.post) setPostChecks(data.post);
                }
            } catch (e) {
                console.error("Failed to load checklists", e);
            }
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

  const saveChecklists = async (newPre: ChecklistDefinition[], newPost: ChecklistDefinition[]) => {
     if(!company || !venue) return;
     try {
         await setDoc(doc(db, 'companies', company.id, 'venues', venue.id, 'config', 'checklists'), {
             pre: newPre,
             post: newPost
         }, { merge: true });

         // Also update the current active session so changes reflect immediately
         if (session) {
             const preDefs = newPre.length > 0 ? newPre : DEFAULT_PRE_CHECKS;
             const postDefs = newPost.length > 0 ? newPost : DEFAULT_POST_CHECKS;

             const mapToItems = (defs: ChecklistDefinition[], existing: ChecklistItem[]) => {
                 return defs.map(d => {
                     const existingItem = existing.find(e => e.id === d.id);
                     const item: any = {
                         id: d.id,
                         label: d.label,
                         checked: existingItem ? existingItem.checked : false,
                     };
                     if (d.checkpointId) item.checkpointId = d.checkpointId;
                     if (existingItem?.timestamp) item.timestamp = existingItem.timestamp;
                     if (existingItem?.checkedBy) item.checkedBy = existingItem.checkedBy;
                     if (existingItem?.verified !== undefined) item.verified = existingItem.verified;
                     if (existingItem?.method) item.method = existingItem.method;
                     return item as ChecklistItem;
                 });
             };

             const updatedPre = mapToItems(preDefs, session.preEventChecks || []);
             const updatedPost = mapToItems(postDefs, session.postEventChecks || []);

             await updateDoc(doc(db, 'companies', company.id, 'venues', venue.id, 'shifts', session.id), {
                 preEventChecks: updatedPre,
                 postEventChecks: updatedPost
             });
         }
     } catch (e) {
         console.error("Failed to save checklists", e);
         alert("Failed to save checklists");
     }
  };

  const handleAddPreCheck = () => {
      if(!newPreCheck.trim()) return;
      const updated = [...preChecks, { id: Math.random().toString(36).substr(2,6), label: newPreCheck.trim(), type: 'pre' as const }];
      setPreChecks(updated);
      setNewPreCheck('');
      saveChecklists(updated, postChecks);
  };

  const handleAddPostCheck = () => {
      if(!newPostCheck.trim()) return;
      const updated = [...postChecks, { id: Math.random().toString(36).substr(2,6), label: newPostCheck.trim(), type: 'post' as const }];
      setPostChecks(updated);
      setNewPostCheck('');
      saveChecklists(preChecks, updated);
  };

  const handleRemovePreCheck = (id: string) => {
      const updated = preChecks.filter(c => c.id !== id);
      setPreChecks(updated);
      saveChecklists(updated, postChecks);
  };

  const handleRemovePostCheck = (id: string) => {
      const updated = postChecks.filter(c => c.id !== id);
      setPostChecks(updated);
      saveChecklists(preChecks, updated);
  };

  const isOwner = userProfile?.role === 'owner';
  
  const copyInvite = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}?invite=${code}`);
    alert('Invite Link Copied!');
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setStaff(staff.map(s => s.uid === uid ? { ...s, role: newRole } : s));
    } catch (e) {
      console.error("Failed to update role", e);
      alert("Failed to update role");
    }
  };

  const handleToggleVenueAccess = async (uid: string, venueId: string, currentAllowed: string[]) => {
    try {
      const isAllowed = currentAllowed.includes(venueId);
      const newAllowed = isAllowed 
        ? currentAllowed.filter(id => id !== venueId)
        : [...currentAllowed, venueId];
        
      // Ensure they always have at least one venue if they are not owner
      if (newAllowed.length === 0) {
        alert("Staff must have access to at least one venue.");
        return;
      }

      await updateDoc(doc(db, 'users', uid), { allowedVenues: newAllowed });
      setStaff(staff.map(s => s.uid === uid ? { ...s, allowedVenues: newAllowed } : s));
    } catch (e) {
      console.error("Failed to update venue access", e);
      alert("Failed to update venue access");
    }
  };

  const handleVenueRoleChange = async (uid: string, venueId: string, newRole: UserRole, currentRoles: Record<string, UserRole> = {}) => {
    try {
      const updatedRoles = { ...currentRoles, [venueId]: newRole };
      await updateDoc(doc(db, 'users', uid), { venueRoles: updatedRoles });
      setStaff(staff.map(s => s.uid === uid ? { ...s, venueRoles: updatedRoles } : s));
    } catch (e) {
      console.error("Failed to update venue role", e);
      alert("Failed to update venue role");
    }
  };

  const formatRole = (role: string) => {
    if (!role) return 'User';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const startEditingStaff = (s: UserProfile) => {
    setEditingStaffId(s.uid);
    setEditStaffName(s.displayName);
  };

  const saveStaffName = async (uid: string) => {
    if (!editStaffName.trim()) return;
    try {
      await updateDoc(doc(db, 'users', uid), { displayName: editStaffName.trim() });
      setStaff(staff.map(s => s.uid === uid ? { ...s, displayName: editStaffName.trim() } : s));
      setEditingStaffId(null);
    } catch (e) {
      console.error("Failed to update name", e);
    }
  };

  const confirmRemoveStaff = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { companyId: '', venueId: '', role: 'floor_staff', allowedVenues: [] });
      setStaff(staff.filter(s => s.uid !== uid));
      setRemovingStaffId(null);
    } catch (e) {
      console.error("Failed to remove staff", e);
    }
  };

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
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-400 uppercase tracking-widest border border-zinc-700">{formatRole(userProfile?.role || 'User')}</span>
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

           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <h4 className="text-sm font-bold text-white mb-4">Opening Checks</h4>
              <div className="space-y-2 mb-4">
                 {preChecks.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                       <span className="text-sm text-white">{c.label}</span>
                       <button onClick={() => handleRemovePreCheck(c.id)} className="text-zinc-500 hover:text-red-500"><X size={16}/></button>
                    </div>
                 ))}
              </div>
              <div className="flex gap-2">
                 <input value={newPreCheck} onChange={e => setNewPreCheck(e.target.value)} placeholder="Add Opening Check" className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 text-sm text-white" onKeyDown={e => e.key === 'Enter' && handleAddPreCheck()} />
                 <button onClick={handleAddPreCheck} className="bg-indigo-600 text-white p-2 rounded-xl"><Plus size={18}/></button>
              </div>
           </div>

           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <h4 className="text-sm font-bold text-white mb-4">Closing Checks</h4>
              <div className="space-y-2 mb-4">
                 {postChecks.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                       <span className="text-sm text-white">{c.label}</span>
                       <button onClick={() => handleRemovePostCheck(c.id)} className="text-zinc-500 hover:text-red-500"><X size={16}/></button>
                    </div>
                 ))}
              </div>
              <div className="flex gap-2">
                 <input value={newPostCheck} onChange={e => setNewPostCheck(e.target.value)} placeholder="Add Closing Check" className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 text-sm text-white" onKeyDown={e => e.key === 'Enter' && handleAddPostCheck()} />
                 <button onClick={handleAddPostCheck} className="bg-indigo-600 text-white p-2 rounded-xl"><Plus size={18}/></button>
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

           {/* Active Venue Invite Code */}
           {venue && (
             <div className="bg-gradient-to-br from-indigo-900/30 to-zinc-900 border border-indigo-500/20 p-5 rounded-2xl shadow-lg">
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

           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="text-sm font-bold text-white flex items-center gap-2"><Building size={16} /> Venues</h4>
                 <button onClick={() => setShowAddVenue(!showAddVenue)} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1"><Plus size={14}/> Add Venue</button>
              </div>
              
              {showAddVenue && (
                 <div className="mb-4 p-4 bg-zinc-950 rounded-xl border border-indigo-500/30">
                    <input 
                       value={newVenueName} 
                       onChange={e => setNewVenueName(e.target.value)} 
                       placeholder="New Venue Name" 
                       className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white mb-2" 
                    />
                    <button 
                       onClick={async () => {
                          if(!newVenueName) return;
                          try {
                              await createVenue(newVenueName, 500, '#3b82f6');
                              setNewVenueName('');
                              setShowAddVenue(false);
                              // Refresh venues
                              const vRef = collection(db, 'companies', company!.id, 'venues');
                              const vSnap = await getDocs(vRef);
                              const allVenues = vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
                              setAccessibleVenues(allVenues);
                              setVenues(allVenues);
                          } catch (e: any) {
                              alert(e.message || "Failed to create venue");
                          }
                       }} 
                       className="w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-bold"
                    >
                       Create Venue
                    </button>
                 </div>
              )}

              <div className="space-y-2">
                 {venues.map(v => (
                    <div key={v.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                       <div>
                          <span className="text-sm font-bold text-white block">{v.name}</span>
                          <span className="text-[10px] text-zinc-500">Code: {v.shortCode}</span>
                       </div>
                       {venue?.id !== v.id && (
                          <button onClick={() => switchVenue(v.id)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors">Switch</button>
                       )}
                       {venue?.id === v.id && (
                          <span className="text-xs text-emerald-500 font-bold flex items-center gap-1"><Check size={14}/> Active</span>
                       )}
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4"><h4 className="text-sm font-bold text-white flex items-center gap-2"><Users size={16} /> Team Roster</h4></div>
               <div className="space-y-3">
                 {staff.map(s => (
                    <div key={s.uid} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
                       <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {editingStaffId === s.uid ? (
                              <div className="flex items-center gap-2 mb-1">
                                <input 
                                  type="text" 
                                  value={editStaffName} 
                                  onChange={(e) => setEditStaffName(e.target.value)}
                                  className="bg-zinc-900 text-sm text-white border border-zinc-700 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                                />
                                <button onClick={() => saveStaffName(s.uid)} className="text-emerald-500 hover:text-emerald-400"><Check size={16} /></button>
                                <button onClick={() => setEditingStaffId(null)} className="text-red-500 hover:text-red-400"><X size={16} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white block">{s.displayName}</span>
                                {s.role !== 'owner' && (
                                  <button onClick={() => startEditingStaff(s)} className="text-zinc-500 hover:text-zinc-300"><Edit2 size={12} /></button>
                                )}
                              </div>
                            )}
                            <span className="text-[10px] text-zinc-500">{s.email}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {s.role === 'owner' ? (
                              <span className="text-[10px] text-zinc-500 uppercase font-bold bg-zinc-900 px-2 py-1 rounded border border-zinc-800">{formatRole(s.role)}</span>
                            ) : (
                              <select 
                                value={s.role} 
                                onChange={(e) => handleRoleChange(s.uid, e.target.value as UserRole)}
                                className="bg-zinc-900 text-xs text-white border border-zinc-700 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="security">Security</option>
                                <option value="manager">Manager</option>
                                <option value="floor_staff">Floor Staff</option>
                              </select>
                            )}
                            {s.role !== 'owner' && (
                              <button onClick={() => setRemovingStaffId(s.uid)} className="text-red-500/50 hover:text-red-500 transition-colors p-1 bg-zinc-900 rounded border border-zinc-800">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                       </div>
                       
                       {removingStaffId === s.uid && (
                         <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 mt-2">
                           <p className="text-xs text-red-200 mb-2">Are you sure you want to remove this staff member from the company? They will lose all access.</p>
                           <div className="flex gap-2">
                             <button onClick={() => confirmRemoveStaff(s.uid)} className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors">Confirm Remove</button>
                             <button onClick={() => setRemovingStaffId(null)} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                           </div>
                         </div>
                       )}
                       
                       {s.role !== 'owner' && venues.length > 1 && (
                          <div className="pt-3 border-t border-zinc-800/50">
                             <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Venue Access & Roles</div>
                             <div className="flex flex-col gap-2">
                                {venues.map(v => {
                                   const hasAccess = (s.allowedVenues || [s.venueId]).includes(v.id);
                                   const venueRole = s.venueRoles?.[v.id] || s.role;
                                   return (
                                      <div key={v.id} className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                                         <button 
                                            onClick={() => handleToggleVenueAccess(s.uid, v.id, s.allowedVenues || [s.venueId])}
                                            className={`text-[10px] px-2 py-1 rounded-md border transition-colors flex-1 text-left ${
                                               hasAccess 
                                                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' 
                                                  : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800'
                                            }`}
                                         >
                                            {v.name}
                                         </button>
                                         
                                         {hasAccess && (
                                            <select 
                                              value={venueRole} 
                                              onChange={(e) => handleVenueRoleChange(s.uid, v.id, e.target.value as UserRole, s.venueRoles)}
                                              className="ml-2 bg-zinc-900 text-[10px] text-zinc-300 border border-zinc-700 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                                            >
                                              <option value="security">Security</option>
                                              <option value="manager">Manager</option>
                                              <option value="floor_staff">Floor Staff</option>
                                            </select>
                                         )}
                                      </div>
                                   );
                                })}
                             </div>
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
