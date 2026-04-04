
import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { EjectionLog, Gender, AgeRange, IncidentType, Location } from '../types';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChevronRight, Save, MapPin, User, AlertOctagon, Ambulance, ShieldAlert, Trash2, X, ShieldCheck } from 'lucide-react';

const Incidents: React.FC = () => {
  const { addEjection, session, history } = useSecurity();
  const { venue, userProfile } = useAuth();
  
  const [isManagingStaff, setIsManagingStaff] = useState(false);

  const recentStaff = Array.from(new Set([
    ...session.ejections.map(e => e.staffBadgeNumber),
    ...history.flatMap(h => h.ejections.map(e => e.staffBadgeNumber))
  ].filter(Boolean))).filter(name => !venue?.hiddenStaff?.includes(name as string)) as string[];

  const handleHideStaff = async (name: string) => {
    if (!venue || !userProfile) return;
    const newHidden = [...(venue.hiddenStaff || []), name];
    try {
      await updateDoc(doc(db, 'companies', userProfile.companyId, 'venues', venue.id), {
        hiddenStaff: newHidden
      });
    } catch (error) {
      console.error("Error hiding staff:", error);
    }
  };

  const [isNewStaff, setIsNewStaff] = useState(recentStaff.length === 0);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<EjectionLog>>({
    gender: 'male',
    ageRange: '18-21',
    reason: 'disorderly',
    location: 'Main Door',
    authoritiesInvolved: [],
    cctvRecorded: true,
    bodyCamRecorded: false,
    staffBadgeNumber: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staffBadgeNumber?.trim()) {
        alert("Staff Badge Number is required.");
        return;
    }

    const newIncident: EjectionLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      managerName: 'Current User',
      details: formData.details || '',
      actionTaken: formData.actionTaken || '',
      departure: formData.departure || 'left solo',
      authoritiesInvolved: formData.authoritiesInvolved || [],
      cctvRecorded: formData.cctvRecorded || false,
      bodyCamRecorded: formData.bodyCamRecorded || false,
      staffBadgeNumber: formData.staffBadgeNumber || 'N/A',
      gender: formData.gender as Gender,
      ageRange: formData.ageRange as AgeRange,
      reason: formData.reason as IncidentType,
      location: formData.location as Location,
    };
    
    addEjection(newIncident);
    alert('Incident Logged Successfully');
    setStep(1);
    setFormData({     
      gender: 'male',
      ageRange: '18-21',
      reason: 'disorderly',
      location: 'Main Door',
      authoritiesInvolved: [],
      cctvRecorded: true,
      bodyCamRecorded: false,
      staffBadgeNumber: '',
    });
  };

  const updateField = (field: keyof EjectionLog, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleAuthority = (auth: string) => {
    const current = formData.authoritiesInvolved || [];
    if (current.includes(auth)) {
      updateField('authoritiesInvolved', current.filter(a => a !== auth));
    } else {
      updateField('authoritiesInvolved', [...current, auth]);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 pb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <ShieldAlert className="text-red-500" /> New Incident Log
      </h2>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-indigo-500' : 'bg-slate-800'}`} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="space-y-3">
              <label className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <AlertOctagon size={16} /> Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['disorderly', 'intox', 'violence', 'drugs', 'harassment', 'other'] as IncidentType[]).map(type => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => updateField('reason', type)}
                    className={`p-3 rounded-lg border capitalize ${
                      formData.reason === type 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <MapPin size={16} /> Location
              </label>
              <select 
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {['Main Door', 'Main Bar', 'Dance Floor', 'VIP', 'Toilets', 'Smoking Area'].map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-slate-700 text-white py-4 rounded-xl font-bold mt-4 flex items-center justify-center gap-2 hover:bg-slate-600"
            >
              Next <ChevronRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="space-y-3">
              <label className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <User size={16} /> Subject Details
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <span className="text-xs text-slate-500 block mb-1">Gender</span>
                  <div className="flex rounded-lg bg-slate-800 p-1">
                    {(['male', 'female'] as Gender[]).map(g => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => updateField('gender', g)}
                        className={`flex-1 py-2 rounded capitalize text-sm ${
                          formData.gender === g ? 'bg-slate-600 text-white shadow' : 'text-slate-400'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xs text-slate-500 block mb-1">Age Range</span>
                   <select 
                    value={formData.ageRange}
                    onChange={(e) => updateField('ageRange', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none"
                  >
                    <option value="Under 18">Under 18</option>
                    <option value="18-21">18-21</option>
                    <option value="22-30">22-30</option>
                    <option value="31-40">31-40</option>
                    <option value="41+">41+</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-400 text-sm font-medium">Incident Description</label>
              <textarea
                value={formData.details}
                onChange={(e) => updateField('details', e.target.value)}
                placeholder="Briefly describe what happened..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white h-24 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 text-slate-400">Back</button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="space-y-3">
              <label className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <Ambulance size={16} /> Outcome & Authority
              </label>
              
              <div className="flex gap-2 flex-wrap">
                {['Police', 'Ambulance'].map(auth => (
                   <button
                    type="button"
                    key={auth}
                    onClick={() => toggleAuthority(auth)}
                    className={`px-4 py-2 rounded-full border text-sm ${
                      formData.authoritiesInvolved?.includes(auth)
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {auth} Called
                  </button>
                ))}
              </div>

               <div className="space-y-2 mt-4">
                  <span className="text-xs text-slate-500 block">Departure</span>
                  <select 
                    value={formData.departure}
                    onChange={(e) => updateField('departure', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none"
                  >
                    <option value="left solo">Left Solo</option>
                    <option value="left w friends">Left w/ Friends</option>
                    <option value="left w group">Left w/ Group</option>
                    <option value="handed to police">Handed to Police</option>
                  </select>
               </div>

                <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700 mt-2">
                  <span className="text-slate-300 text-sm">CCTV Recorded?</span>
                  <button 
                    type="button"
                    onClick={() => updateField('cctvRecorded', !formData.cctvRecorded)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${formData.cctvRecorded ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.cctvRecorded ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700 mt-2">
                  <span className="text-slate-300 text-sm">Body Cam?</span>
                  <button 
                    type="button"
                    onClick={() => updateField('bodyCamRecorded', !formData.bodyCamRecorded)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${formData.bodyCamRecorded ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.bodyCamRecorded ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="space-y-2 mt-4">
                    <label className="text-slate-400 text-sm font-medium">Your Badge Number <span className="text-red-500">*</span></label>
                    {recentStaff.length > 0 && !isNewStaff ? (
                        <div className="space-y-2">
                            <div className="relative">
                                <select 
                                    value={formData.staffBadgeNumber}
                                    onChange={(e) => {
                                        if (e.target.value === 'NEW_STAFF') {
                                            setIsNewStaff(true);
                                            updateField('staffBadgeNumber', '');
                                        } else if (e.target.value === 'MANAGE_LIST') {
                                            setIsManagingStaff(true);
                                        } else {
                                            updateField('staffBadgeNumber', e.target.value);
                                        }
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none appearance-none uppercase font-mono"
                                >
                                    <option value="" disabled>Select Staff Member</option>
                                    {recentStaff.map(staff => (
                                        <option key={staff} value={staff}>{staff}</option>
                                    ))}
                                    <option value="NEW_STAFF">+ Add New Staff Member</option>
                                    {recentStaff.length > 0 && <option value="MANAGE_LIST">Manage List...</option>}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <input 
                                value={formData.staffBadgeNumber}
                                onChange={(e) => updateField('staffBadgeNumber', e.target.value)}
                                placeholder="Initials OR SIA License No."
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none uppercase font-mono"
                            />
                            {recentStaff.length > 0 && (
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsNewStaff(false);
                                        updateField('staffBadgeNumber', recentStaff[0] || '');
                                    }}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                                >
                                    ← Back to recent staff list
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 text-slate-400">Back</button>
              <button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Save size={18} /> Submit Log
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Manage Staff Modal */}
      {isManagingStaff && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  Manage Badge Numbers
              </h3>
              <button onClick={() => setIsManagingStaff(false)} className="text-zinc-500 hover:text-white">
                  <X size={20} />
              </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
              {recentStaff.length === 0 ? (
                  <p className="text-zinc-500 text-center py-4 text-sm">No recent staff found.</p>
              ) : (
                  <div className="space-y-2">
                  {recentStaff.map(name => (
                      <div key={name} className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <span className="text-white font-medium">{name}</span>
                      <button 
                          onClick={() => handleHideStaff(name)}
                          className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                          title="Remove from list"
                      >
                          <Trash2 size={16} />
                      </button>
                      </div>
                  ))}
                  </div>
              )}
              </div>
          </div>
          </div>
      )}
    </div>
  );
};

export default Incidents;
