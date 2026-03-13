
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { BannedPerson, IncidentType } from '../types';
import { Search, Plus, AlertOctagon, UserX, Shield, Crown, FileText, Check, Eye, Camera, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Watchlist: React.FC = () => {
  const { company, userProfile, features, startProTrial } = useAuth();
  const { uploadWatchlistImage } = useSecurity();
  
  const [bannedList, setBannedList] = useState<BannedPerson[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newReason, setNewReason] = useState<IncidentType>('disorderly');
  const [newRisk, setNewRisk] = useState<'low'|'medium'|'high'>('medium');
  const [newDuration, setNewDuration] = useState('1 Month');
  const [newPhoto, setNewPhoto] = useState<File|null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setIsUploading(true);
    let photoUrl = '';

    try {
        if (newPhoto) {
            photoUrl = await uploadWatchlistImage(newPhoto);
        }

        const newPerson: Omit<BannedPerson, 'id'> = {
          fullName: newName,
          description: newDesc,
          reason: newReason,
          riskLevel: newRisk as any,
          banDuration: newDuration as any,
          banDate: new Date().toISOString(),
          addedBy: userProfile.displayName,
          companyId: company.id,
          photoUrl
        };

        await addDoc(collection(db, 'companies', company.id, 'banned_people'), newPerson);
        setShowAddForm(false);
        setNewName('');
        setNewDesc('');
        setNewPhoto(null);
        loadWatchlist(); 
    } catch (e) {
      console.error(e);
      alert("Failed to add to watchlist");
    } finally {
        setIsUploading(false);
    }
  };

  const downloadPDF = () => {
    if (bannedList.length === 0) return;
    const doc = new jsPDF();
    
    doc.setFillColor(220, 38, 38); 
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
      p.photoUrl ? '[PHOTO ON FILE]' : 'No Photo'
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Name', 'Risk', 'Duration', 'Banned On', 'Reason', 'Photo']],
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
        <button onClick={startProTrial} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-900/30 w-full max-w-sm flex items-center justify-center gap-2">
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
            <button onClick={downloadPDF} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
              <FileText size={20} />
            </button>
          )}
          <button onClick={() => setShowAddForm(true)} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-500 transition-colors">
            <Plus size={20} />
          </button>
        </div>
      </div>

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
          
          {/* GDPR NOTICE */}
          <div className="bg-amber-900/20 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-200 mb-4 leading-relaxed">
             <strong>GDPR Notice:</strong> Images and personal data are retained strictly for identification and safety purposes. You are responsible for ensuring data is deleted when the ban expires or is no longer necessary.
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
                <div onClick={() => fileInputRef.current?.click()} className="w-20 h-20 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800">
                    {newPhoto ? (
                        <div className="relative w-full h-full">
                            <img src={URL.createObjectURL(newPhoto)} className="w-full h-full object-cover rounded-lg" />
                            <button onClick={(e) => { e.stopPropagation(); setNewPhoto(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button>
                        </div>
                    ) : (
                        <><Camera size={20} className="text-zinc-500"/><span className="text-[9px] text-zinc-500 mt-1">Photo</span></>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setNewPhoto(e.target.files[0])} />
                </div>
                <div className="flex-1 space-y-3">
                    <input placeholder="Name / Nickname" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-zinc-950 border border-slate-800 rounded-lg p-3 text-white text-sm" />
                    <div className="flex gap-2">
                        <select value={newRisk} onChange={e => setNewRisk(e.target.value as any)} className="bg-zinc-950 border border-slate-800 rounded-lg p-2 text-white text-xs flex-1">
                            <option value="low">Low Risk</option><option value="medium">Medium</option><option value="high">High Risk</option>
                        </select>
                        <select value={newDuration} onChange={e => setNewDuration(e.target.value)} className="bg-zinc-950 border border-slate-800 rounded-lg p-2 text-white text-xs flex-1">
                            <option>24h</option><option>1 Month</option><option>6 Months</option><option>Life</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <textarea placeholder="Description (Height, tattoos, clothing style...)" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-zinc-950 border border-slate-800 rounded-lg p-3 text-white h-20 resize-none text-sm" />
            
            <select value={newReason} onChange={e => setNewReason(e.target.value as any)} className="w-full bg-zinc-950 border border-slate-800 rounded-lg p-2 text-white text-sm">
                 {['disorderly', 'violence', 'drugs', 'harassment', 'other'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <div className="flex gap-2 pt-2">
              <button onClick={handleAdd} disabled={isUploading} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg text-sm">{isUploading ? 'Uploading...' : 'Confirm Ban'}</button>
              <button onClick={() => setShowAddForm(false)} className="flex-1 bg-zinc-800 text-white py-3 rounded-xl text-sm">Cancel</button>
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
            <div key={person.id} className={`bg-slate-900 border rounded-xl p-4 flex gap-4 ${person.riskLevel === 'high' ? 'border-red-900/50 bg-red-950/10' : 'border-slate-800'}`}>
               <div className={`w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center font-bold text-lg shrink-0 border border-zinc-700 ${!person.photoUrl && (person.riskLevel === 'high' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400')}`}>
                 {person.photoUrl ? <img src={person.photoUrl} className="w-full h-full object-cover" /> : person.fullName.charAt(0)}
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-start">
                   <h3 className="text-white font-bold truncate pr-2">{person.fullName}</h3>
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${person.riskLevel === 'high' ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-zinc-400'}`}>{person.riskLevel}</span>
                 </div>
                 <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{person.description}</p>
                 <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1 uppercase font-bold text-zinc-300"><AlertOctagon size={10} /> {person.reason}</span>
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">Ends: {person.banDuration}</span>
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