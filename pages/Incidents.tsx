import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { EjectionLog, Gender, AgeRange, IncidentType, Location } from '../types';
import { ChevronRight, Save, MapPin, User, AlertOctagon, Ambulance, ShieldAlert } from 'lucide-react';

const Incidents: React.FC = () => {
  const { addEjection } = useSecurity();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<EjectionLog>>({
    gender: 'male',
    ageRange: '18-21',
    reason: 'disorderly',
    location: 'Main Door',
    authoritiesInvolved: [],
    cctvRecorded: true,
    bodyCamRecorded: false,
    securityBadgeNumber: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      securityBadgeNumber: formData.securityBadgeNumber || 'N/A',
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
      securityBadgeNumber: '',
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
    </div>
  );
};

export default Incidents;