
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { SupportTicket, TicketMessage } from '../types';
import { MessageSquare, Plus, Send, LifeBuoy, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const Support: React.FC = () => {
  const { userProfile, company } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  
  // Form State
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low'|'normal'|'high'>('normal');

  useEffect(() => {
    if (!company) return;
    const q = query(collection(db, 'support_tickets'), where('companyId', '==', company.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const t = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket));
      // Sort client side
      t.sort((a,b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
      setTickets(t);
    });
    return () => unsubscribe();
  }, [company]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !userProfile) return;

    const initialMessage: TicketMessage = {
      id: Date.now().toString(),
      senderId: userProfile.uid,
      senderName: userProfile.displayName,
      role: 'user',
      message: message,
      timestamp: new Date().toISOString()
    };

    const newTicket: Omit<SupportTicket, 'id'> = {
      companyId: company.id,
      companyName: company.name,
      userId: userProfile.uid,
      userEmail: userProfile.email,
      subject,
      status: 'open',
      priority,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      messages: [initialMessage]
    };

    try {
      await addDoc(collection(db, 'support_tickets'), newTicket);
      setShowNewTicket(false);
      setSubject('');
      setMessage('');
      alert('Ticket Created. Our team will respond shortly.');
    } catch (err) {
      console.error(err);
      alert('Failed to submit ticket');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 pb-24 bg-slate-950">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="text-indigo-500" /> Support
          </h2>
          <p className="text-zinc-500 text-xs">Help & Technical Assistance</p>
        </div>
        <button 
          onClick={() => setShowNewTicket(true)}
          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-500 transition-colors"
        >
          <Plus size={20} />
        </button>
      </header>

      {showNewTicket ? (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 animate-in slide-in-from-top-4">
          <h3 className="text-white font-bold mb-4">New Support Request</h3>
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <input 
              placeholder="Subject / Issue Summary"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white"
            />
            <div className="flex gap-2">
               <span className="text-slate-400 text-sm py-2">Priority:</span>
               {(['low', 'normal', 'high'] as const).map(p => (
                 <button
                   key={p}
                   type="button"
                   onClick={() => setPriority(p)}
                   className={`px-3 py-1 rounded-full text-xs capitalize border ${priority === p ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-zinc-500'}`}
                 >
                   {p}
                 </button>
               ))}
            </div>
            <textarea 
              placeholder="Describe your issue..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white h-32 resize-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">Submit Ticket</button>
              <button type="button" onClick={() => setShowNewTicket(false)} className="flex-1 bg-slate-800 text-white py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      ) : activeTicket ? (
        <div className="flex flex-col h-[calc(100vh-140px)]">
           <button onClick={() => setActiveTicket(null)} className="text-zinc-500 text-sm mb-2 flex items-center gap-1">← Back to tickets</button>
           <div className="bg-slate-900 border border-slate-800 rounded-t-xl p-4">
             <div className="flex justify-between items-start">
               <h3 className="text-white font-bold text-lg">{activeTicket.subject}</h3>
               <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${activeTicket.status === 'resolved' ? 'bg-emerald-900 text-emerald-400' : 'bg-amber-900 text-amber-400'}`}>
                 {activeTicket.status.replace('_', ' ')}
               </span>
             </div>
             <p className="text-zinc-500 text-xs mt-1">Ticket ID: {activeTicket.id}</p>
           </div>
           
           <div className="flex-1 overflow-y-auto bg-slate-950 p-4 space-y-4 border-x border-slate-800">
             {activeTicket.messages.map(msg => (
               <div key={msg.id} className={`flex flex-col ${msg.role === 'admin' ? 'items-start' : 'items-end'}`}>
                 <div className={`max-w-[85%] rounded-xl p-3 ${msg.role === 'admin' ? 'bg-slate-800 text-white rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                   <p className="text-sm">{msg.message}</p>
                 </div>
                 <span className="text-[10px] text-zinc-600 mt-1">
                   {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                 </span>
               </div>
             ))}
           </div>
           
           {/* Note: User replies not implemented in this simplified view as prompt focused on admin side management, but easy to add here */}
           <div className="p-4 bg-slate-900 border border-slate-800 rounded-b-xl text-center text-xs text-zinc-500">
              Wait for an agent to respond.
           </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-10 text-zinc-600">
               <MessageSquare size={48} className="mx-auto mb-2 opacity-20" />
               <p>No support tickets yet.</p>
            </div>
          ) : (
            tickets.map(t => (
              <div 
                key={t.id} 
                onClick={() => setActiveTicket(t)}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:bg-slate-900 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-white font-bold">{t.subject}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    t.status === 'resolved' ? 'text-emerald-500 bg-emerald-950' : 
                    t.status === 'open' ? 'text-blue-400 bg-blue-950' : 'text-amber-500 bg-amber-950'
                  }`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm line-clamp-1">{t.messages[0].message}</p>
                <div className="flex justify-between items-center mt-3 text-xs text-zinc-600">
                  <span>Last update: {new Date(t.lastUpdated).toLocaleDateString()}</span>
                  {t.priority === 'high' && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> High Priority</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Support;
