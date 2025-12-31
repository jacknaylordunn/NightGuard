
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, orderBy, where, addDoc } from 'firebase/firestore';
import { Company, SupportTicket, TicketMessage } from '../types';
import { 
  ShieldCheck, Users, Ticket, TrendingUp, Search, Building2, 
  CreditCard, CheckCircle, XCircle, LogOut, Send, AlertCircle 
} from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
  const { logout, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'tickets'>('overview');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Ticket Reply State
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch All Companies
      const coSnap = await getDocs(collection(db, 'companies'));
      setCompanies(coSnap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));

      // 2. Fetch All Tickets
      const ticketSnap = await getDocs(query(collection(db, 'support_tickets'), orderBy('lastUpdated', 'desc')));
      setTickets(ticketSnap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket)));
    } catch (e) {
      console.error("Admin Load Error:", e);
    }
  };

  const handleUpdatePlan = async (companyId: string, plan: 'free' | 'pro' | 'enterprise') => {
    if (!confirm(`Change plan to ${plan}?`)) return;
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        trialEndsAt: null // Clear trial if manual set
      });
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, subscriptionPlan: plan, subscriptionStatus: 'active' } : c));
    } catch (e) {
      alert("Failed to update plan");
    }
  };

  const handleTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !userProfile || !replyMessage) return;

    const newMessage: TicketMessage = {
      id: Date.now().toString(),
      senderId: userProfile.uid,
      senderName: 'NightGuard Support',
      role: 'admin',
      message: replyMessage,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...activeTicket.messages, newMessage];
    
    try {
      await updateDoc(doc(db, 'support_tickets', activeTicket.id), {
        messages: updatedMessages,
        lastUpdated: new Date().toISOString(),
        status: 'in_progress'
      });
      
      // Update local state
      setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, messages: updatedMessages, status: 'in_progress' } : t));
      setActiveTicket({ ...activeTicket, messages: updatedMessages, status: 'in_progress' });
      setReplyMessage('');
    } catch (e) {
      console.error(e);
      alert("Failed to send reply");
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    await updateDoc(doc(db, 'support_tickets', activeTicket.id), { status: 'resolved' });
    setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: 'resolved' } : t));
    setActiveTicket(null);
  };

  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // -- RENDER HELPERS --

  const Overview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-zinc-400 text-sm font-medium">Total Venues</p>
            <h3 className="text-3xl font-bold text-white">{companies.length}</h3>
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-zinc-400 text-sm font-medium">Active Pro/Ent</p>
            <h3 className="text-3xl font-bold text-white">
              {companies.filter(c => c.subscriptionPlan !== 'free').length}
            </h3>
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
            <Ticket size={24} />
          </div>
          <div>
            <p className="text-zinc-400 text-sm font-medium">Open Tickets</p>
            <h3 className="text-3xl font-bold text-white">
              {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );

  const CompanyList = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 text-zinc-500" size={18} />
        <input 
          placeholder="Search companies..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900 text-zinc-200 font-medium">
            <tr>
              <th className="p-4">Company</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Joined</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredCompanies.map(c => (
              <tr key={c.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-white">{c.name}</div>
                  <div className="text-xs font-mono">{c.id}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${
                    c.subscriptionPlan === 'free' ? 'bg-zinc-800 text-zinc-400' : 
                    c.subscriptionPlan === 'pro' ? 'bg-indigo-900 text-indigo-400' : 'bg-purple-900 text-purple-400'
                  }`}>
                    {c.subscriptionPlan}
                  </span>
                  {c.subscriptionStatus === 'trial' && <span className="ml-2 text-xs text-amber-500">Trial</span>}
                </td>
                <td className="p-4">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdatePlan(c.id, 'pro')}
                      className="px-3 py-1 bg-zinc-800 hover:bg-indigo-600 hover:text-white rounded text-xs transition-colors"
                    >
                      Set Pro
                    </button>
                    <button 
                      onClick={() => handleUpdatePlan(c.id, 'free')}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors"
                    >
                      Set Free
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const TicketBoard = () => (
    <div className="flex gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4">
      {/* List */}
      <div className="w-1/3 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-y-auto">
         {tickets.map(t => (
           <div 
             key={t.id} 
             onClick={() => setActiveTicket(t)}
             className={`p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors ${activeTicket?.id === t.id ? 'bg-zinc-800 border-l-4 border-l-indigo-500' : ''}`}
           >
             <div className="flex justify-between mb-1">
               <span className={`text-[10px] font-bold uppercase px-1.5 rounded ${t.status === 'open' ? 'bg-blue-900 text-blue-400' : t.status === 'resolved' ? 'bg-emerald-900 text-emerald-400' : 'bg-amber-900 text-amber-400'}`}>
                 {t.status}
               </span>
               <span className="text-xs text-zinc-500">{new Date(t.lastUpdated).toLocaleDateString()}</span>
             </div>
             <h4 className="text-white font-bold text-sm mb-1 line-clamp-1">{t.subject}</h4>
             <p className="text-zinc-500 text-xs">{t.companyName} • {t.userEmail}</p>
           </div>
         ))}
      </div>
      
      {/* Detail */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
        {activeTicket ? (
          <>
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">{activeTicket.subject}</h2>
                    <div className="flex gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1"><Building2 size={14}/> {activeTicket.companyName}</span>
                      <span className="flex items-center gap-1"><Users size={14}/> {activeTicket.userEmail}</span>
                    </div>
                  </div>
                  {activeTicket.status !== 'resolved' && (
                    <button onClick={handleCloseTicket} className="bg-emerald-900/30 text-emerald-400 px-4 py-2 rounded-lg text-sm font-bold border border-emerald-500/30 hover:bg-emerald-900/50 transition-colors">
                      Mark Resolved
                    </button>
                  )}
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {activeTicket.messages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[70%] p-4 rounded-2xl ${msg.role === 'admin' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-300 rounded-tl-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className="mt-2 pt-2 border-t border-white/10 text-[10px] opacity-70 flex justify-between">
                        <span>{msg.senderName}</span>
                        <span>{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                   </div>
                 </div>
               ))}
            </div>

            <div className="p-4 bg-zinc-950 border-t border-zinc-800">
               <form onSubmit={handleTicketReply} className="flex gap-4">
                 <input 
                   value={replyMessage}
                   onChange={e => setReplyMessage(e.target.value)}
                   placeholder="Type a reply..."
                   className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500"
                 />
                 <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-colors">
                   <Send size={20} />
                 </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
             <Ticket size={64} className="mb-4 opacity-20" />
             <p>Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Top Bar */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 sticky top-0 z-50">
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center shadow shadow-teal-500/20">
             <ShieldCheck className="text-white" size={18} />
           </div>
           <span className="font-bold text-lg tracking-tight">NightGuard <span className="text-teal-500">Enterprise</span></span>
         </div>
         <div className="flex items-center gap-4">
           <div className="text-sm text-zinc-400">
             Logged in as <span className="text-white font-bold">{userProfile?.email}</span>
           </div>
           <button onClick={logout} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors">
             <LogOut size={20} />
           </button>
         </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col p-4 gap-2">
           <button 
             onClick={() => setActiveTab('overview')}
             className={`p-3 rounded-xl flex items-center gap-3 font-medium transition-colors ${activeTab === 'overview' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             <TrendingUp size={20} /> Overview
           </button>
           <button 
             onClick={() => setActiveTab('companies')}
             className={`p-3 rounded-xl flex items-center gap-3 font-medium transition-colors ${activeTab === 'companies' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             <Building2 size={20} /> Companies
           </button>
           <button 
             onClick={() => setActiveTab('tickets')}
             className={`p-3 rounded-xl flex items-center gap-3 font-medium transition-colors ${activeTab === 'tickets' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             <Ticket size={20} /> Support Tickets
             {tickets.some(t => t.status === 'open') && <span className="w-2 h-2 rounded-full bg-blue-500 ml-auto"></span>}
           </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-black p-8">
           <div className="max-w-7xl mx-auto">
             <h2 className="text-2xl font-bold text-white mb-6 capitalize">{activeTab}</h2>
             {activeTab === 'overview' && <Overview />}
             {activeTab === 'companies' && <CompanyList />}
             {activeTab === 'tickets' && <TicketBoard />}
           </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
