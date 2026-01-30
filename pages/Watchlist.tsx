
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { BannedPerson, IncidentType } from '../types';
import { Search, Plus, AlertOctagon, UserX, Shield, Crown, FileText, Check, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Watchlist: React.FC = () => {
  const { company, userProfile, features, startProTrial } = useAuth();
  const [bannedList, setBannedList] = useState<BannedPerson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newReason, setNewReason] = useState<IncidentType>('disorderly');
  const [newRisk, setNewRisk] = useState<'low'|'medium'|'high'>('medium');
  const [newDuration, setNewDuration] = useState('1 Month');

  useEffect(() => {
    if (!company) return;
    if (features.isPro) {
      loadWatchlist();
    }
  }, [company, features.isPro]);

  const loadWatchlist = async () => {
    if (!company) return;
    try {
      const ref = collection(db, 'companies', company.id, 'banned_people');
      const q = query(ref, orderBy('banDate', 'desc'));
      const snap = await getDocs(q);
      setBannedList(snap.docs.map(d => ({ id: d.id, ...d.data() } as BannedPerson)));
    } catch (e) {
      console.error("Failed to load watchlist", e);
    }
  };

  const handleAdd = async () => {
    if (!company || !userProfile) return;
    if (!newName || !newDesc) {
      alert("Name and description required");
      return;
    }

    const newPerson: Omit<BannedPerson, 'id'> = {
      fullName: newName,
      description: newDesc,
      reason: newReason,
      riskLevel: newRisk as any,
      banDuration: newDuration as any,
      banDate: new Date().toISOString(),
      addedBy: userProfile.displayName,
      companyId: company.id
    };

    try {
      await addDoc(collection(db, 'companies', company.id, 'banned_people'), newPerson);
      setShowAddForm(false);
      setNewName('');
      setNewDesc('');
      loadWatchlist(); // Reload
    } catch (e) {
      console.error(e);
      alert("Failed to add to watchlist");
    }
  };

  const downloadPDF = () => {
    if (bannedList.length === 0) return;
    const doc = new jsPDF();
    
    doc.setFillColor(220, 38, 38); // Red for Watchlist
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`CONFIDENTIAL - BANNED LIST`, 10, 13);
    doc.setFontSize(10);
    doc.text(company?.name || '', 150, 13);

    const rows = bannedList.map(p => [
      p.fullName,
      p.riskLevel.toUpperCase(),
      p.banDuration,
      new Date(p.banDate).toLocaleDateString(),
      p.reason,
      p.description
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Name', 'Risk', 'Duration', 'Banned On', 'Reason', 'Description']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9 }
    });

    doc.save(`Watchlist_${company?.name}.pdf`);
  };

  const filteredList = bannedList.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!features.isPro) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <Eye size={40} className="text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Watchlist Locked</h2>
        <p className="text-zinc-400 mb-8">
          The Digital Watchlist & BOLO system is a Pro feature. Upgrade to keep track of banned patrons and share alerts with your team.
        </p>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 w-full max-w-sm mb-8">
            <ul className="text-left space-y-3 text-sm text-zinc-300">
                <li className="flex gap-2"><Check size={16} className="text-emerald-500" /> Searchable Ban Database</li>
                <li className="flex gap-2"><Check size={16} className="text-emerald-500" /> Risk Level Indicators</li>
                <li className="flex gap-2"><Check size={16} className="text-emerald-500" /> Incident Linking</li>
            </ul>
        </div>
        <button 
          onClick={startProTrial}
          className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-900/30 w-full max-w-sm flex items-center justify-center gap-2"
        >
          Start 14-Day Free Trial <Crown size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-24 bg-slate-950">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="text-indigo-500" /> Watchlist
        </h2>
        <div className="flex gap-2">
          {bannedList.length > 0 && (
            <button 
              onClick={downloadPDF}
              className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <FileText size={20} />
            </button>
          )}
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-500 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 text-zinc-500" size={18} />
        <input 
          type="text"
          placeholder="Search name, description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {showAddForm && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 animate-in slide-in-from-top-4">
          <h3 className="text-white font-bold mb-4">Add Banned Person</h3>
          <div className="space-y-3">
            <input 
              placeholder="Full Name / Nickname"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white"
            />
            <textarea 
              placeholder="Description (Height, tattoos, clothing style...)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white h-20 resize-none"
            />
            <div className="flex gap-2">
               <select 
                value={newReason}
                onChange={e => setNewReason(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm flex-1"
               >
                 {['disorderly', 'violence', 'drugs', 'harassment', 'other'].map(r => <option key={r} value={r}>{r}</option>)}
               </select>
               <select 
                value={newRisk}
                onChange={e => setNewRisk(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm flex-1"
               >
                 <option value="low">Low Risk</option>
                 <option value="medium">Medium Risk</option>
                 <option value="high">High Risk</option>
               </select>
            </div>
             <div className="flex gap-2">
                 <select 
                  value={newDuration}
                  onChange={e => setNewDuration(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm flex-1"
                 >
                   <option>24h</option>
                   <option>1 Month</option>
                   <option>6 Months</option>
                   <option>Life</option>
                 </select>
             </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleAdd} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold">Ban</button>
              <button onClick={() => setShowAddForm(false)} className="flex-1 bg-slate-800 text-white py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center text-zinc-500 py-10">
            <UserX size={48} className="mx-auto mb-2 opacity-50" />
            <p>No active bans found.</p>
          </div>
        ) : (
          filteredList.map(person => (
            <div 
              key={person.id} 
              className={`bg-slate-900 border rounded-xl p-4 flex gap-4 ${
                person.riskLevel === 'high' ? 'border-red-900/50 bg-red-950/10' : 'border-slate-800'
              }`}
            >
               <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                 person.riskLevel === 'high' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 
                 person.riskLevel === 'medium' ? 'bg-amber-600 text-white' :
                 'bg-slate-800 text-slate-400'
               }`}>
                 {person.fullName.charAt(0)}
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                   <h3 className="text-white font-bold">{person.fullName}</h3>
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      person.riskLevel === 'high' ? 'bg-red-900 text-red-200 border border-red-500/30' : 
                      person.riskLevel === 'medium' ? 'bg-amber-900 text-amber-200 border border-amber-500/30' :
                      'bg-slate-800 text-zinc-400'
                   }`}>
                     {person.riskLevel}
                   </span>
                 </div>
                 <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{person.description}</p>
                 <div className="flex gap-3 mt-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1 uppercase font-bold text-zinc-400"><AlertOctagon size={12} /> {person.reason}</span>
                    <span className="bg-zinc-950 px-2 rounded border border-zinc-800">For: {person.banDuration}</span>
                 </div>
                 <div className="mt-2 text-[10px] text-zinc-600">
                    Added by {person.addedBy} on {new Date(person.banDate).toLocaleDateString()}
                 </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Watchlist;
