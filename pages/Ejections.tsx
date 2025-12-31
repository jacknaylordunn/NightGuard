import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { EjectionLog, Gender, AgeRange, IncidentType, Location } from '../types';
import { Save, FileText, AlertTriangle, Shield, User, MapPin, Activity, Trash2 } from 'lucide-react';

const Ejections: React.FC = () => {
  const { addEjection, removeEjection, session } = useSecurity();
  const { company, venue } = useAuth();
  
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
    details: '',
    customData: {}
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Note: Narrative details are now optional.

    const newLog: EjectionLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      managerName: 'Current User', 
      details: formData.details || '', // Optional
      actionTaken: 'Ejected',
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
    
    // Smooth scroll to recent list
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    
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
      details: '',
      customData: {}
    });
  };

  const updateField = (field: keyof EjectionLog, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateCustomField = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customData: {
        ...prev.customData,
        [fieldId]: value
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
    <div className="h-full overflow-y-auto p-4 pb-32 max-w-xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="text-amber-500" /> New Incident Log
        </h2>
        <p className="text-zinc-500 text-sm">Fill out the report below for any ejection or incident.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: The Basics */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2"><MapPin size={14}/> Context</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Location</label>
              <div className="relative">
                <select 
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  className="form-input appearance-none"
                >
                  {locationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
              </div>
            </div>
            <div>
               <label className="form-label">Type</label>
               <div className="relative">
                 <select 
                  value={formData.reason}
                  onChange={(e) => updateField('reason', e.target.value)}
                  className="form-input capitalize appearance-none"
                >
                  {['disorderly', 'intox', 'violence', 'drugs', 'harassment', 'other'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.bodyCamRecorded ? 'bg-indigo-900/30 border-indigo-500 text-indigo-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
               <input type="checkbox" className="hidden" checked={formData.bodyCamRecorded} onChange={e => updateField('bodyCamRecorded', e.target.checked)} />
               <span className="text-sm font-bold">Body Cam</span>
             </label>
             <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.cctvRecorded ? 'bg-indigo-900/30 border-indigo-500 text-indigo-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
               <input type="checkbox" className="hidden" checked={formData.cctvRecorded} onChange={e => updateField('cctvRecorded', e.target.checked)} />
               <span className="text-sm font-bold">CCTV</span>
             </label>
          </div>
        </div>

        {/* Section 2: Subject */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
           <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2"><User size={14}/> Subject</h3>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label">Gender</label>
                <div className="flex bg-zinc-800 rounded-xl p-1 border border-zinc-700">
                  {['male', 'female'].map(g => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => updateField('gender', g)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${formData.gender === g ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Age Group</label>
                <div className="relative">
                  <select 
                    value={formData.ageRange}
                    onChange={(e) => updateField('ageRange', e.target.value)}
                    className="form-input appearance-none"
                  >
                    <option value="18-21">18-21</option>
                    <option value="22-30">22-30</option>
                    <option value="31-40">31-40</option>
                    <option value="41+">41+</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                </div>
              </div>
           </div>

           {/* IC Code Selection */}
           <div>
             <label className="form-label">Identity Code (IC)</label>
             <div className="relative">
               <select
                 value={formData.icCode}
                 onChange={(e) => updateField('icCode', e.target.value)}
                 className="form-input appearance-none"
               >
                 <option value="Unknown">Unknown / Not Recorded</option>
                 <option value="IC1">IC1 - White (North European)</option>
                 <option value="IC2">IC2 - White (South European)</option>
                 <option value="IC3">IC3 - Black</option>
                 <option value="IC4">IC4 - Asian</option>
                 <option value="IC5">IC5 - Chinese/SE Asian</option>
                 <option value="IC6">IC6 - Arabic/Mixed/Other</option>
               </select>
               <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
             </div>
           </div>
        </div>

        {/* Section 3: Narrative */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2"><FileText size={14}/> Report Narrative</h3>
             <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">Optional</span>
          </div>
          <textarea
            value={formData.details}
            onChange={(e) => updateField('details', e.target.value)}
            placeholder="Describe the incident details, actions taken, and subject behavior..."
            className="form-input h-40 resize-none leading-relaxed"
          />
        </div>

        {/* Section 4: Outcome */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
           <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2"><Shield size={14}/> Conclusion</h3>
           
           <div className="mb-4">
             <label className="form-label">Departure</label>
             <div className="relative">
               <select 
                  value={formData.departure}
                  onChange={(e) => updateField('departure', e.target.value)}
                  className="form-input appearance-none"
                >
                  <option>Walked away</option>
                  <option>Collected by Taxi</option>
                  <option>Collected by Friends</option>
                  <option>Arrested by Police</option>
                  <option>Taken by Ambulance</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
             </div>
           </div>

           <div className="mb-4">
              <label className="form-label">Emergency Services</label>
              <div className="flex gap-2">
                 {['Police', 'Ambulance'].map(auth => (
                    <button
                      key={auth}
                      type="button"
                      onClick={() => toggleAuthority(auth)}
                      className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all ${
                        formData.authoritiesInvolved?.includes(auth) 
                        ? 'bg-red-900/30 border-red-500 text-red-400' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {auth} Called
                    </button>
                 ))}
              </div>
           </div>

           <div>
             <label className="form-label">SIA Badge OR Initials</label>
             <input 
               type="text"
               value={formData.securityBadgeNumber}
               onChange={(e) => updateField('securityBadgeNumber', e.target.value)}
               placeholder="Enter Badge # or Initials"
               className="form-input font-mono"
             />
           </div>
        </div>

        {/* Custom Fields if Any */}
        {company?.customIncidentFields && company.customIncidentFields.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4">Venue Specifics</h3>
            <div className="space-y-4">
              {company.customIncidentFields.map(field => (
                <div key={field.id}>
                    <label className="form-label">{field.label}</label>
                    {field.type === 'text' && (
                      <input 
                        type="text" 
                        className="form-input"
                        value={formData.customData?.[field.id] || ''}
                        onChange={e => updateCustomField(field.id, e.target.value)}
                      />
                    )}
                    {field.type === 'select' && field.options && (
                      <div className="relative">
                        <select
                          className="form-input appearance-none"
                          value={formData.customData?.[field.id] || ''}
                          onChange={e => updateCustomField(field.id, e.target.value)}
                        >
                          <option value="">Select...</option>
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                      </div>
                    )}
                    {field.type === 'checkbox' && (
                      <label className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                        <input 
                          type="checkbox"
                          className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-indigo-600 focus:ring-indigo-500"
                          checked={!!formData.customData?.[field.id]}
                          onChange={e => updateCustomField(field.id, e.target.checked)}
                        />
                        <span className="text-sm font-medium text-zinc-200">Yes</span>
                      </label>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          type="submit"
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Save size={20} /> Submit Incident Log
        </button>
      </form>

      {/* Verification Feed: Visible Recent Incidents */}
      <div className="mt-8 pt-8 border-t border-zinc-800">
        <h3 className="text-zinc-500 font-bold uppercase text-xs mb-4 flex items-center gap-2">
          <Activity size={14} /> Submitted This Shift
        </h3>
        
        {session.ejections.length === 0 ? (
          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-500 text-sm text-center">
            No incidents logged this shift.
          </div>
        ) : (
          <div className="space-y-3">
             {session.ejections.slice(0, 5).map(log => (
               <div key={log.id} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between items-start animate-in fade-in slide-in-from-bottom-2 group">
                  <div>
                    <div className="flex items-center gap-2">
                       <span className="text-white font-bold text-sm capitalize">{log.reason}</span>
                       <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-bold">{log.icCode || 'N/A'}</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-1">{log.location} • {log.gender} {log.ageRange}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-zinc-500 text-xs font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </div>
                    <button onClick={() => removeEjection(log.id)} className="text-zinc-600 hover:text-red-500 transition-colors p-1">
                        <Trash2 size={14} />
                    </button>
                  </div>
               </div>
             ))}
             {session.ejections.length > 5 && (
               <p className="text-center text-xs text-zinc-600 mt-2">
                 + {session.ejections.length - 5} older logs visible in Reports
               </p>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ejections;