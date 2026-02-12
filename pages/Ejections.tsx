
import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { EjectionLog, Gender, AgeRange, IncidentType, Location, Complaint } from '../types';
import { Save, AlertTriangle, User, MapPin, Trash2, Megaphone, FileText, Shield, Ambulance, Video, Camera, Badge } from 'lucide-react';

const Ejections: React.FC = () => {
  const { addEjection, removeEjection, session, addComplaint, resolveComplaint } = useSecurity();
  const { company, venue, userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'ejection' | 'complaint'>('ejection');

  // EJECTION STATE
  const [formData, setFormData] = useState<Partial<EjectionLog>>({
    gender: 'male',
    ageRange: '18-21',
    reason: 'disorderly',
    location: venue?.locations?.[0] || 'Main Door',
    icCode: 'Unknown',
    authoritiesInvolved: [],
    cctvRecorded: false,
    bodyCamRecorded: false,
    securityBadgeNumber: '',
    departure: 'Walked away',
    actionTaken: 'Ejected',
    details: '',
    customData: {}
  });

  // COMPLAINT STATE
  const [compSource, setCompSource] = useState<'in_person'|'email'|'phone'>('in_person');
  const [compName, setCompName] = useState('');
  const [compDetails, setCompDetails] = useState('');
  const [compContact, setCompContact] = useState('');
  const [resolvingCompId, setResolvingCompId] = useState<string|null>(null);
  const [resolveCompNotes, setResolveCompNotes] = useState('');

  // HANDLERS
  const handleEjectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.details?.trim()) {
        alert("Please provide incident details.");
        return;
    }
    if (!formData.securityBadgeNumber?.trim()) {
        alert("Security Badge Number is required.");
        return;
    }

    // Custom Field Validation
    if (company?.customIncidentFields) {
        for (const field of company.customIncidentFields) {
            if (field.required) {
                const val = formData.customData?.[field.id];
                if (!val || (typeof val === 'string' && !val.trim())) {
                    alert(`${field.label} is required.`);
                    return;
                }
            }
        }
    }

    const newLog: EjectionLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      managerName: session.shiftManager || userProfile?.displayName || 'Current User', 
      details: formData.details || '', 
      actionTaken: formData.actionTaken || 'Ejected',
      departure: formData.departure || 'Walked away',
      authoritiesInvolved: formData.authoritiesInvolved || [],
      cctvRecorded: formData.cctvRecorded || false,
      bodyCamRecorded: formData.bodyCamRecorded || false,
      securityBadgeNumber: formData.securityBadgeNumber || 'N/A',
      gender: formData.gender as Gender,
      ageRange: formData.ageRange as AgeRange,
      reason: formData.reason as IncidentType,
      location: formData.location as Location,
      icCode: formData.icCode,
      customData: formData.customData
    };

    addEjection(newLog);
    alert("Incident Logged Successfully");
    
    // Reset Form
    setFormData({     
      gender: 'male',
      ageRange: '18-21',
      reason: 'disorderly',
      location: venue?.locations?.[0] || 'Main Door',
      icCode: 'Unknown',
      authoritiesInvolved: [],
      cctvRecorded: false,
      bodyCamRecorded: false,
      securityBadgeNumber: '',
      departure: 'Walked away',
      actionTaken: 'Ejected',
      details: '',
      customData: {}
    });
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!compDetails) return;
      try {
          await addComplaint({
              source: compSource,
              complainantName: compName,
              contactInfo: compContact,
              details: compDetails
          });
          setCompName('');
          setCompDetails('');
          setCompContact('');
          alert("Complaint Logged");
      } catch (e) {
          alert("Failed");
      }
  };

  const handleResolveComplaint = () => {
      if (resolvingCompId) {
          resolveComplaint(resolvingCompId, resolveCompNotes || 'Resolved');
          setResolvingCompId(null);
          setResolveCompNotes('');
      }
  };

  const updateField = (field: keyof EjectionLog, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateCustomField = (id: string, value: any) => {
      setFormData(prev => ({
          ...prev,
          customData: {
              ...prev.customData,
              [id]: value
          }
      }));
  };

  const toggleAuthority = (auth: string) => {
      const current = formData.authoritiesInvolved || [];
      if (current.includes(auth)) {
          updateField('authoritiesInvolved', current.filter(a => a !== auth));
      } else {
          updateField('authoritiesInvolved', [...current, auth]);
      }
  };

  const locationOptions = venue?.locations && venue.locations.length > 0 
    ? venue.locations 
    : ['Main Door', 'Bar', 'Floor', 'Toilets', 'VIP', 'Smoking Area'];

  return (
    <div className="h-full overflow-y-auto p-4 pb-32 max-w-xl mx-auto bg-slate-950">
      
      <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 mb-6">
          <button onClick={() => setActiveTab('ejection')} className={`py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'ejection' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>
              <AlertTriangle size={16} /> Incident
          </button>
          <button onClick={() => setActiveTab('complaint')} className={`py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'complaint' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500'}`}>
              <Megaphone size={16} /> Complaint
          </button>
      </div>

      {activeTab === 'ejection' && (
        <>
          <form onSubmit={handleEjectionSubmit} className="space-y-6">
            
            {/* SECTION 1: CONTEXT */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2"><MapPin size={14}/> Incident Context</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label">Location</label>
                  <div className="relative">
                    <select value={formData.location} onChange={(e) => updateField('location', e.target.value)} className="form-input appearance-none">
                      {locationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                  </div>
                </div>
                <div>
                   <label className="form-label">Type</label>
                   <div className="relative">
                     <select value={formData.reason} onChange={(e) => updateField('reason', e.target.value)} className="form-input capitalize appearance-none">
                      {['disorderly', 'intox', 'violence', 'drugs', 'harassment', 'other'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: SUBJECT */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
               <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2"><User size={14}/> Subject Description</h3>
               <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="form-label">Gender</label>
                    <div className="flex bg-zinc-800 rounded-xl p-1 border border-zinc-700">
                      {['male', 'female', 'other'].map(g => (
                        <button type="button" key={g} onClick={() => updateField('gender', g)} className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${formData.gender === g ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Age Range</label>
                    <select value={formData.ageRange} onChange={(e) => updateField('ageRange', e.target.value)} className="form-input appearance-none">
                        <option value="18-21">18-21</option><option value="22-30">22-30</option><option value="31-40">31-40</option><option value="41+">41+</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">IC Code</label>
                    <select value={formData.icCode} onChange={(e) => updateField('icCode', e.target.value)} className="form-input appearance-none">
                         <option value="Unknown">Unknown</option>
                         <option value="IC1">IC1 - White</option>
                         <option value="IC2">IC2 - Mediterranean</option>
                         <option value="IC3">IC3 - Black</option>
                         <option value="IC4">IC4 - Asian</option>
                         <option value="IC5">IC5 - SE Asian</option>
                         <option value="IC6">IC6 - Other</option>
                     </select>
                  </div>
               </div>
            </div>

            {/* SECTION 3: DETAILS */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2"><FileText size={14}/> Incident Details</h3>
                
                <div className="mb-4">
                    <label className="form-label">Full Description <span className="text-red-500">*</span></label>
                    <textarea 
                        value={formData.details} 
                        onChange={(e) => updateField('details', e.target.value)} 
                        placeholder="What happened? Be specific."
                        className="form-input h-24 resize-none"
                    />
                </div>

                {/* Custom Fields Rendering */}
                {company?.customIncidentFields && company.customIncidentFields.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                        {company.customIncidentFields.map(field => (
                            <div key={field.id}>
                                <label className="form-label">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                {field.type === 'select' ? (
                                    <select 
                                        className="form-input"
                                        value={formData.customData?.[field.id] || ''}
                                        onChange={(e) => updateCustomField(field.id, e.target.value)}
                                    >
                                        <option value="">Select...</option>
                                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : field.type === 'checkbox' ? (
                                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                        <input 
                                            type="checkbox"
                                            checked={!!formData.customData?.[field.id]}
                                            onChange={(e) => updateCustomField(field.id, e.target.checked)}
                                            className="w-4 h-4 rounded border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-zinc-300">Yes, confirmed</span>
                                    </label>
                                ) : (
                                    <input 
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        className="form-input"
                                        value={formData.customData?.[field.id] || ''}
                                        onChange={(e) => updateCustomField(field.id, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 4: OUTCOME */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2"><Shield size={14}/> Outcome & Evidence</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="form-label">Action Taken</label>
                        <select value={formData.actionTaken} onChange={(e) => updateField('actionTaken', e.target.value)} className="form-input">
                            <option value="Ejected">Ejected</option>
                            <option value="Refused Entry">Refused Entry</option>
                            <option value="Warning Given">Warning Given</option>
                            <option value="Arrested">Arrested</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Departure</label>
                        <select value={formData.departure} onChange={(e) => updateField('departure', e.target.value)} className="form-input">
                            <option value="Walked away">Walked away</option>
                            <option value="Friends took them">Friends took them</option>
                            <option value="Taxi">Taxi</option>
                            <option value="Ambulance">Ambulance</option>
                            <option value="Police Van">Police Van</option>
                        </select>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="form-label">Authorities Called</label>
                    <div className="flex gap-2">
                        {['Police', 'Ambulance'].map(auth => (
                            <button
                                key={auth}
                                type="button"
                                onClick={() => toggleAuthority(auth)}
                                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                    formData.authoritiesInvolved?.includes(auth) 
                                    ? 'bg-red-900/30 border-red-500 text-red-200' 
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                                }`}
                            >
                                {auth === 'Police' ? <Shield size={14}/> : <Ambulance size={14}/>} {auth}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="form-label">Your Badge Number <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <Badge className="absolute left-3 top-3 text-zinc-500" size={18} />
                        <input 
                            value={formData.securityBadgeNumber}
                            onChange={(e) => updateField('securityBadgeNumber', e.target.value)}
                            placeholder="SIA License No."
                            className="form-input pl-10 uppercase font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.bodyCamRecorded ? 'bg-indigo-900/30 border-indigo-500 text-indigo-200' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                        <input type="checkbox" className="hidden" checked={formData.bodyCamRecorded} onChange={e => updateField('bodyCamRecorded', e.target.checked)} />
                        <Camera size={16} />
                        <span className="text-xs font-bold">Body Cam Rec</span>
                    </label>
                    <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.cctvRecorded ? 'bg-indigo-900/30 border-indigo-500 text-indigo-200' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                        <input type="checkbox" className="hidden" checked={formData.cctvRecorded} onChange={e => updateField('cctvRecorded', e.target.checked)} />
                        <Video size={16} />
                        <span className="text-xs font-bold">CCTV Saved</span>
                    </label>
                </div>
            </div>

            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
              <Save size={20} /> Submit Log
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-800">
            <h3 className="text-zinc-500 font-bold uppercase text-xs mb-4">Recent Incidents</h3>
            <div className="space-y-3">
                 {[...session.ejections].reverse().slice(0, 5).map(log => (
                   <div key={log.id} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                           <span className="text-white font-bold text-sm capitalize">{log.reason}</span>
                           <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold">{log.icCode}</span>
                        </div>
                        <p className="text-zinc-500 text-xs mt-1">{log.location} • {log.gender} {log.ageRange}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-zinc-500 text-xs font-mono">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        <button onClick={() => removeEjection(log.id)} className="text-zinc-600 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                      </div>
                   </div>
                 ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'complaint' && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
              <form onSubmit={handleComplaintSubmit} className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                  <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2">Log Complaint</h3>
                  <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                      {(['in_person', 'email', 'phone'] as const).map(s => (
                          <button key={s} type="button" onClick={() => setCompSource(s)} className={`flex-1 py-1 text-[10px] font-bold uppercase rounded ${compSource === s ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>
                              {s.replace('_', ' ')}
                          </button>
                      ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Complainant Name" className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none" />
                      <input value={compContact} onChange={e => setCompContact(e.target.value)} placeholder="Contact Info" className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none" />
                  </div>
                  <textarea value={compDetails} onChange={e => setCompDetails(e.target.value)} placeholder="Nature of complaint..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-24 resize-none text-sm outline-none" />
                  <button type="submit" className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold shadow-lg">Log Complaint</button>
              </form>

              <div className="space-y-3">
                  <h3 className="text-zinc-500 font-bold uppercase text-xs">Recent Complaints</h3>
                  {session.complaints?.map(c => (
                      <div key={c.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                              <div><h4 className="text-white font-bold text-sm">{c.complainantName || 'Anonymous'}</h4><span className="text-[10px] text-zinc-500 uppercase">{c.source}</span></div>
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${c.status === 'resolved' ? 'bg-emerald-900 text-emerald-400' : 'bg-red-900 text-red-400'}`}>{c.status}</span>
                          </div>
                          <p className="text-xs text-zinc-300 bg-zinc-950 p-2 rounded mb-2">{c.details}</p>
                          {c.status === 'open' && <button onClick={() => setResolvingCompId(c.id)} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded">Mark Resolved</button>}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {resolvingCompId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-2xl p-5">
                  <h3 className="text-white font-bold mb-4">Resolve Complaint</h3>
                  <textarea value={resolveCompNotes} onChange={e => setResolveCompNotes(e.target.value)} placeholder="Outcome..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white h-24 mb-4"/>
                  <div className="flex gap-3">
                      <button onClick={handleResolveComplaint} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl">Close Case</button>
                      <button onClick={() => setResolvingCompId(null)} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Ejections;
