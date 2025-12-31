
import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, History, Archive, PieChart as PieIcon, BarChart3, Lock, MapPin, FileText } from 'lucide-react';
import { SessionData } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];
const HEATMAP_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

const Reports: React.FC = () => {
  const { session, history, resetSession, clearHistory } = useSecurity();
  const { features, startProTrial, company } = useAuth();

  // Helper to group data by hour for the chart
  const getHourlyData = (currentSession: SessionData) => {
    const hours = Array.from({ length: 9 }, (_, i) => {
      const h = 20 + i; // 20:00 start
      return h >= 24 ? h - 24 : h;
    }); 

    return hours.map(hour => {
      const inCount = currentSession.logs.filter(l => {
        const d = new Date(l.timestamp);
        return d.getHours() === hour && l.type === 'in';
      }).length;

      const ejectCount = currentSession.ejections.filter(r => {
        const d = new Date(r.timestamp);
        return d.getHours() === hour;
      }).length;

      return {
        name: `${hour}:00`,
        Admission: inCount,
        Ejection: ejectCount
      };
    });
  };

  const getRejectionData = (currentSession: SessionData) => {
    const counts: Record<string, number> = {};
    currentSession.rejections.forEach(r => {
      counts[r.reason] = (counts[r.reason] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getLocationData = (currentSession: SessionData) => {
    const counts: Record<string, number> = {};
    currentSession.ejections.forEach(e => {
        counts[e.location] = (counts[e.location] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const barData = getHourlyData(session);
  const pieData = getRejectionData(session);
  const locationData = getLocationData(session);

  const generateCSV = (data: SessionData) => {
    const periodicLogs = data.periodicLogs || [];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Time,Type,Detail,Location\n"
      + data.logs.map(l => `${new Date(l.timestamp).toLocaleDateString()},${new Date(l.timestamp).toLocaleTimeString()},Admission,${l.type},-`).join("\n")
      + "\n"
      + data.ejections.map(i => `${new Date(i.timestamp).toLocaleDateString()},${new Date(i.timestamp).toLocaleTimeString()},Ejection,${i.reason},${i.location}`).join("\n")
      + "\n"
      + data.rejections.map(r => `${new Date(r.timestamp).toLocaleDateString()},${new Date(r.timestamp).toLocaleTimeString()},Rejection,${r.reason},-`).join("\n")
      + "\n"
      + periodicLogs.map(p => `${new Date(p.timestamp).toLocaleDateString()},${p.timeLabel},Half-Hourly Log,In:${p.countIn} Out:${p.countOut} Total:${p.countTotal},-`).join("\n");
    
    return encodeURI(csvContent);
  };

  const downloadCSV = (data: SessionData, filename: string) => {
    if (!features.hasReports) {
      if(confirm("CSV Export is a Pro feature. Start a free 14-day Pro trial now?")) {
         startProTrial();
      }
      return;
    }
    const link = document.createElement("a");
    link.setAttribute("href", generateCSV(data));
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = (data: SessionData) => {
     if (!features.hasReports) {
      if(confirm("PDF Export is a Pro feature. Start a free 14-day Pro trial now?")) {
         startProTrial();
      }
      return;
    }

    const doc = new jsPDF();
    const dateStr = new Date(data.shiftDate).toLocaleDateString();

    // Header
    doc.setFillColor(99, 102, 241); // Indigo
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(company?.name || 'NightGuard Security', 10, 13);
    doc.setFontSize(10);
    doc.text(`Shift Report: ${dateStr}`, 150, 13);

    // Summary Stats
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Venue: ${data.venueName}`, 14, 30);
    doc.text(`Total Admissions: ${data.logs.filter(l => l.type === 'in').length}`, 14, 36);
    doc.text(`Total Ejections: ${data.ejections.length}`, 14, 42);
    doc.text(`Total Rejections: ${data.rejections.length}`, 14, 48);

    // Periodic Logs Table
    doc.text("Half-Hourly Checks", 14, 60);
    const periodicRows = (data.periodicLogs || []).map(p => [
      p.timeLabel,
      p.countIn.toString(),
      p.countOut.toString(),
      p.countTotal.toString(),
      new Date(p.timestamp).toLocaleTimeString()
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Time Label', 'Total In', 'Total Out', 'Venue Total', 'Logged At']],
      body: periodicRows,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9 }
    });

    // Ejections Table
    const lastY1 = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Incident Logs (Ejections)", 14, lastY1);
    const ejectionRows = data.ejections.map(e => [
      new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      e.reason,
      e.location,
      e.gender,
      e.details,
      e.securityBadgeNumber
    ]);

    autoTable(doc, {
      startY: lastY1 + 5,
      head: [['Time', 'Reason', 'Location', 'Gender', 'Details', 'Badge #']],
      body: ejectionRows,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] }, // Red
      styles: { fontSize: 8 }
    });

    // Rejections Table
    const lastY2 = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Refusals / Rejections", 14, lastY2);
    
    const rejectionRows = data.rejections.map(r => [
       new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
       r.reason
    ]);

    autoTable(doc, {
      startY: lastY2 + 5,
      head: [['Time', 'Reason']],
      body: rejectionRows,
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 30 } }
    });

    // Sign Off
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.text("Head of Security Signature: _______________________", 14, finalY);
    doc.text("Manager Signature: _______________________", 110, finalY);

    doc.save(`ShiftReport_${data.shiftDate}.pdf`);
  };

  // Filter History for Free Plan (7 Days)
  const visibleHistory = history.filter(h => {
    if (features.hasFullHistory) return true;
    const date = new Date(h.shiftDate);
    const diffTime = Math.abs(new Date().getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  return (
    <div className="h-full overflow-y-auto p-4 pb-24">
      <h2 className="text-2xl font-bold text-white mb-6">Reports & Analytics</h2>

      {/* Hourly Chart */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
            <BarChart3 size={14} /> Hourly Activity
          </h3>
          <span className="text-xs bg-indigo-900/50 text-indigo-200 px-2 py-1 rounded border border-indigo-500/30">
            Live
          </span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                cursor={{fill: '#334155', opacity: 0.2}}
              />
              <Bar dataKey="Admission" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ejection" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Rejection Pie Chart */}
          {pieData.length > 0 && (
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
                  <PieIcon size={14} /> Rejection Reasons
                </h3>
              </div>
              <div className="h-56 w-full flex">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Location Risk Heatmap (Pro Feature) */}
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden group">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
                  <MapPin size={14} /> Incident Locations
                </h3>
                {features.hasReports && <span className="text-[10px] text-amber-500 font-bold border border-amber-500/30 px-1 rounded">PRO</span>}
              </div>
              
              {!features.hasReports ? (
                 <div className="h-56 flex flex-col items-center justify-center text-center px-4">
                    <Lock size={32} className="text-slate-600 mb-2" />
                    <p className="text-slate-500 text-sm">Upgrade to view location risk heatmaps.</p>
                 </div>
              ) : locationData.length === 0 ? (
                 <div className="h-56 flex items-center justify-center text-slate-600 text-sm">
                   No incidents recorded yet.
                 </div>
              ) : (
                <div className="h-56 w-full flex">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={locationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        >
                        {locationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={HEATMAP_COLORS[index % HEATMAP_COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
              )}
          </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
           <span className="text-xs text-slate-400 uppercase font-bold">Total Entries</span>
           <div className="text-2xl font-mono text-white mt-1">{session.logs.filter(l => l.type === 'in').length}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
           <span className="text-xs text-slate-400 uppercase font-bold">Rejections</span>
           <div className="text-2xl font-mono text-white mt-1">{session.rejections.length}</div>
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <button 
          onClick={() => downloadCSV(session, `current_shift_${session.shiftDate}.csv`)}
          className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors text-sm rounded-xl border border-slate-700 ${!features.hasReports ? 'bg-slate-900 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
        >
          {features.hasReports ? <Download size={16} /> : <Lock size={16} />} 
          CSV
        </button>
        <button 
          onClick={() => downloadPDF(session)}
          className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors text-sm rounded-xl ${!features.hasReports ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'}`}
        >
          {features.hasReports ? <FileText size={16} /> : <Lock size={16} />} 
          PDF Report
        </button>
      </div>

      {/* History Section */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-4">
           <h3 className="text-slate-400 text-sm font-bold uppercase flex items-center gap-2">
            <History size={16} /> Past Shifts
          </h3>
          {!features.hasFullHistory && (
             <span className="text-[10px] text-amber-500 bg-amber-900/20 px-2 py-0.5 rounded border border-amber-500/30">Last 7 Days (Free Plan)</span>
          )}
        </div>
        
        {visibleHistory.length === 0 ? (
          <div className="text-center py-8 bg-slate-800/50 rounded-xl border border-slate-800 border-dashed">
            <Archive size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="text-slate-500 text-sm">
              {history.length > 0 && !features.hasFullHistory 
                ? "Older history is hidden. Upgrade to view." 
                : "No past shifts archived yet."}
            </p>
            {history.length > 0 && !features.hasFullHistory && (
               <button onClick={startProTrial} className="mt-4 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline">
                 Upgrade to Unlock History
               </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleHistory.map((hist) => (
              <div key={hist.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-indigo-500/50 transition-colors">
                <div>
                  <div className="text-white font-bold">{hist.shiftDate}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {hist.logs.filter(l => l.type === 'in').length} Entries • {hist.ejections ? hist.ejections.length : 0} Ejections
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => downloadCSV(hist, `history_${hist.shiftDate}.csv`)}
                    className={`p-2 rounded-lg transition-colors ${features.hasReports ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-900 text-slate-600'}`}
                  >
                    {features.hasReports ? <Download size={16} /> : <Lock size={14} />}
                  </button>
                  <button 
                    onClick={() => downloadPDF(hist)}
                    className={`p-2 rounded-lg transition-colors ${features.hasReports ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-900 text-slate-600'}`}
                  >
                     {features.hasReports ? <FileText size={16} /> : <Lock size={14} />}
                  </button>
                </div>
              </div>
            ))}
            <button 
              onClick={clearHistory}
              className="text-xs text-red-500 hover:text-red-400 underline w-full text-center mt-4"
            >
              Clear Local History
            </button>
          </div>
        )}
      </div>

      <button 
        onClick={resetSession}
        className="w-full bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mb-4"
      >
        <Archive size={20} /> End & Archive Shift
      </button>
    </div>
  );
};

export default Reports;
