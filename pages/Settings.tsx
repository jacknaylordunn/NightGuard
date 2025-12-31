import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { LogOut, Copy, Plus, Share2, Check, Star, Crown, Trash2, Building, Shield, FileText, MapPin } from 'lucide-react';
import { Venue, UserProfile, CustomField } from '../types';

const Settings: React.FC = () => {
  const { userProfile, company, venue, logout, refreshVenue, features, startProTrial } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'staff' | 'customize'>('company');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [companyName, setCompanyName] = useState('');
  
  // Customization State
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomField>>({ type: 'text', label: '', required: false });
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Staff Management State
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [staffVenues, setStaffVenues] = useState<string[]>([]);

  // Load Data function
  const loadVenues = async () => {
    if (!company) return;
    const vRef = collection(db, 'companies', company.id, 'venues');
    const vSnap = await getDocs(vRef);
    setVenues(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Venue)));
  };

  const loadStaff = async () => {
    if (!company) return;
    const uRef = collection(db, 'users');
    const q = query(uRef, where('companyId', '==', company.id));
    const uSnap = await getDocs(q);
    setStaff(uSnap.docs.map(d => d.data() as UserProfile));
  };

  useEffect(() => {
    if (!company) return;
    loadVenues();
    if (userProfile?.role === 'owner') {
       loadStaff();
       setCompanyName(company.name);
       setCustomFields(company.customIncidentFields || []);
    }
  }, [company, userProfile]);

  useEffect(() => {
    if (venue) {
      setCustomLocations(venue.locations || []);
    }
  }, [venue]);

  // --- Company & Branding ---
  const saveCompanySettings = async () => {
    if (!company) return;
    await updateDoc(doc(db, 'companies', company.id), { name: companyName });
    alert('Company Name Updated');
  };

  // --- Venue Locations ---
  const addLocation = async () => {
    if (!venue || !newLocation) return;
    const updated = [...customLocations, newLocation];
    await updateDoc(doc(db, 'companies', company!.id, 'venues', venue.id), { locations: updated });
    setCustomLocations(updated);
    setNewLocation('');
    refreshVenue();
  };

  const removeLocation = async (loc: string) => {
    if (!venue) return;
    const updated = customLocations.filter(l => l !== loc);
    await updateDoc(doc(db, 'companies', company!.id, 'venues', venue.id), { locations: updated });
    setCustomLocations(updated);
    refreshVenue();
  };

  // --- Custom Incident Fields ---
  const addCustomField = async () => {
    if (!company || !newField.label) return;
    const field: CustomField = {
      id: Date.now().toString(),
      label: newField.label!,
      type: newField.type as any,
      required: !!newField.required,
      options: newField.type === 'select' ? newFieldOptions.split(',').map(s => s.trim()) : undefined
    };
    const updated = [...customFields, field];
    await updateDoc(doc(db, 'companies', company.id), { customIncidentFields: updated });
    setCustomFields(updated);
    setShowAddField(false);
    setNewField({ type: 'text', label: '', required: false });
    setNewFieldOptions('');
  };

  const removeCustomField = async (id: string) => {
    if (!company) return;
    const updated = customFields.filter(f => f.id !== id);
    await updateDoc(doc(db, 'companies', company.id), { customIncidentFields: updated });
    setCustomFields(updated);
  };

  // --- Staff Management ---
  const toggleStaffSuspension = async (staffId: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    await updateDoc(doc(db, 'users', staffId), { status: newStatus });
    setStaff(prev => prev.map(s => s.uid === staffId ? { ...s, status: newStatus as any } : s));
  };

  const openStaffEdit = (s: UserProfile) => {
    setEditingStaff(s.uid);
    setStaffVenues(s.allowedVenues || []);
  };

  const saveStaffPermissions = async () => {
    if (!editingStaff) return;
    await updateDoc(doc(db, 'users', editingStaff), { allowedVenues: staffVenues });
    setStaff(prev => prev.map(s => s.uid === editingStaff ? { ...s, allowedVenues: staffVenues } : s));
    setEditingStaff(null);
  };

  const toggleStaffVenue = (vid: string) => {
    if (staffVenues.includes(vid)) {
      setStaffVenues(staffVenues.filter(v => v !== vid));
    } else {
      setStaffVenues([...staffVenues, vid]);
    }
  };

  if (!userProfile || !company) return null;

  const isOwner = userProfile.role === 'owner';
  const isTrial = company.subscriptionStatus === 'trial';
  let planLabel = company.subscriptionPlan === 'free' ? 'Starter' : 'Pro';
  if (isTrial) planLabel = 'Pro Trial';

  return (
    <div className="h-full overflow-y-auto p-4 pb-32">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Menu</h2>
        <div className="flex items-center gap-2">
           <span className="text-zinc-400 text-sm">{company.name}</span>
           <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${isTrial ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
             {planLabel}
           </span>
        </div>
      </header>

      {/* Plan Upsell / Management */}
      <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 p-4 rounded-2xl mb-6 flex items-center justify-between shadow-lg">
        <div>
          <h4 className="text-white font-bold text-sm flex items-center gap-1"><Crown size={14} className="text-amber-400" /> {features.isPro ? 'Pro Active' : 'Upgrade Plan'}</h4>
          <p className="text-indigo-200 text-xs mt-1">{features.isPro ? 'You have access to all features.' : 'Unlock all features'}</p>
        </div>
        <button onClick={startProTrial} className="bg-white text-indigo-900 px-3 py-2 rounded-xl text-xs font-bold shadow hover:bg-zinc-200">
           {features.isPro ? 'Manage' : 'Trial'}
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex items-center justify-between mb-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-lg">
            {userProfile.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-bold">{userProfile.displayName}</div>
            <div className="text-zinc-500 text-xs">{userProfile.email}</div>
          </div>
        </div>
        <button onClick={() => logout()} className="text-red-400 bg-red-900/10 hover:bg-red-900/20 p-3 rounded-xl transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      {isOwner ? (
        <>
          {/* Tabs */}
          <div className="flex bg-zinc-900 p-1 rounded-xl mb-6 border border-zinc-800 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('company')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${activeTab === 'company' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>Company</button>
            <button onClick={() => setActiveTab('customize')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${activeTab === 'customize' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>Customize</button>
            <button onClick={() => setActiveTab('staff')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${activeTab === 'staff' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>Staff</button>
          </div>

          {/* Company & Venues Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Building size={16}/> Company Name</h3>
                <div className="flex gap-2">
                  <input 
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <button onClick={saveCompanySettings} className="bg-indigo-600 px-4 rounded-xl text-white text-sm font-bold">Save</button>
                </div>
              </div>

              <div>
                <h3 className="text-zinc-500 text-xs font-bold uppercase mb-2 px-1">Venue Invite Links</h3>
                <div className="space-y-3">
                  {venues.map(v => (
                    <div key={v.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center">
                       <div>
                         <span className="text-white text-sm font-bold block">{v.name}</span>
                         <code className="text-xs text-indigo-400">{v.shortCode}</code>
                       </div>
                       <button onClick={() => {navigator.clipboard.writeText(`${window.location.origin}?invite=${v.shortCode}`); alert('Copied')}} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300">
                          <Copy size={16} />
                       </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Customization Tab */}
          {activeTab === 'customize' && (
            <div className="space-y-8">
               {/* Venue Locations */}
               <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                 <h3 className="text-white font-bold mb-1 flex items-center gap-2"><MapPin size={16}/> Locations</h3>
                 <p className="text-xs text-zinc-500 mb-4">Areas for incident logging at <strong>{venue?.name}</strong>.</p>
                 
                 <div className="flex flex-wrap gap-2 mb-4">
                   {customLocations.map(loc => (
                     <span key={loc} className="bg-zinc-800 border border-zinc-700 text-zinc-200 pl-3 pr-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2">
                       {loc}
                       <button onClick={() => removeLocation(loc)} className="text-zinc-500 hover:text-red-400"><Trash2 size={12}/></button>
                     </span>
                   ))}
                 </div>
                 
                 <div className="flex gap-2">
                   <input 
                     placeholder="Add area (e.g. Roof Terrace)"
                     value={newLocation}
                     onChange={e => setNewLocation(e.target.value)}
                     className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                   />
                   <button onClick={addLocation} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-4 rounded-xl"><Plus size={18}/></button>
                 </div>
               </div>

               {/* Custom Incident Fields */}
               <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                 <h3 className="text-white font-bold mb-1 flex items-center gap-2"><FileText size={16}/> Form Fields</h3>
                 <p className="text-xs text-zinc-500 mb-4">Extra questions for incident reports.</p>
                 
                 <div className="space-y-2 mb-4">
                    {customFields.map(f => (
                      <div key={f.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                        <div>
                          <span className="text-white text-sm font-medium block">{f.label}</span>
                          <span className="text-[10px] text-zinc-500 uppercase font-bold bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{f.type}</span>
                        </div>
                        <button onClick={() => removeCustomField(f.id)} className="text-zinc-600 hover:text-red-400 p-2"><Trash2 size={16}/></button>
                      </div>
                    ))}
                 </div>

                 {!showAddField ? (
                   <button onClick={() => setShowAddField(true)} className="w-full py-3 border border-dashed border-zinc-700 rounded-xl text-zinc-500 text-sm hover:text-white hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors font-medium">
                     + Add Custom Field
                   </button>
                 ) : (
                   <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 animate-in fade-in">
                      <input 
                        placeholder="Label (e.g. Police Badge #)"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white focus:outline-none"
                        value={newField.label}
                        onChange={e => setNewField({...newField, label: e.target.value})}
                      />
                      <div className="flex gap-2">
                        <select 
                          className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white flex-1 focus:outline-none"
                          value={newField.type}
                          onChange={e => setNewField({...newField, type: e.target.value as any})}
                        >
                          <option value="text">Text Input</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="select">Dropdown</option>
                        </select>
                        <div className="flex items-center gap-2 bg-zinc-900 px-3 rounded-xl border border-zinc-700">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded bg-zinc-800 border-zinc-600"
                            checked={newField.required}
                            onChange={e => setNewField({...newField, required: e.target.checked})}
                          />
                          <span className="text-xs text-zinc-400">Required</span>
                        </div>
                      </div>
                      {newField.type === 'select' && (
                        <input 
                          placeholder="Options (comma separated)"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white focus:outline-none"
                          value={newFieldOptions}
                          onChange={e => setNewFieldOptions(e.target.value)}
                        />
                      )}
                      <div className="flex gap-2 pt-2">
                        <button onClick={addCustomField} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold">Add</button>
                        <button onClick={() => setShowAddField(false)} className="flex-1 bg-zinc-800 text-white py-2 rounded-xl text-sm font-bold">Cancel</button>
                      </div>
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              {staff.map(s => (
                <div key={s.uid} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                   <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${s.status === 'suspended' ? 'bg-red-900' : 'bg-zinc-800 border border-zinc-700'}`}>
                          {s.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${s.status === 'suspended' ? 'text-red-400 line-through' : 'text-white'}`}>{s.displayName}</span>
                            {s.status === 'suspended' && <span className="text-[9px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded font-bold">BLOCKED</span>}
                          </div>
                          <div className="text-xs text-zinc-500 capitalize">{s.role}</div>
                        </div>
                      </div>
                      
                      {s.role !== 'owner' && (
                        <button 
                          onClick={() => editingStaff === s.uid ? setEditingStaff(null) : openStaffEdit(s)}
                          className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 transition-colors"
                        >
                          {editingStaff === s.uid ? 'Close' : 'Manage'}
                        </button>
                      )}
                   </div>

                   {/* Access Management Drawer */}
                   {editingStaff === s.uid && (
                     <div className="bg-zinc-950 p-4 border-t border-zinc-800 space-y-4 animate-in slide-in-from-top-2">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-1"><Shield size={12}/> Venue Access</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                             {venues.map(v => (
                               <label key={v.id} className="flex items-center gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800 cursor-pointer">
                                 <input 
                                   type="checkbox" 
                                   checked={staffVenues.includes(v.id)}
                                   onChange={() => toggleStaffVenue(v.id)}
                                   className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 checked:bg-indigo-600 focus:ring-0 focus:ring-offset-0"
                                 />
                                 <span className="text-sm font-medium text-white">{v.name}</span>
                               </label>
                             ))}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button 
                            onClick={() => toggleStaffSuspension(s.uid, s.status)}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-colors ${s.status === 'suspended' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-900/20 text-red-400 border border-red-500/30'}`}
                          >
                             {s.status === 'suspended' ? 'Unblock Staff' : 'Block Access'}
                          </button>
                          <button 
                            onClick={saveStaffPermissions}
                            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-xs font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-900/20"
                          >
                            Save Changes
                          </button>
                        </div>
                     </div>
                   )}
                </div>
              ))}
            </div>
          )}

        </>
      ) : (
        <div className="text-center text-zinc-500 py-12 px-4 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed">
          <Shield size={32} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Staff Account</p>
          <p className="text-xs mt-1 opacity-60">Contact your manager to update venue settings.</p>
        </div>
      )}
    </div>
  );
};

export default Settings;