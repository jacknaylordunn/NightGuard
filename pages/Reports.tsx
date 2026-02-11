
import React, { useState, useMemo } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Archive, PieChart as PieIcon,
  Lock, FileText, ClipboardCheck, Megaphone, User
} from 'lucide-react';
import { SessionData } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FilterMode = 'current' | '7days' | '30days' | 'all' | 'custom';

const Reports: React.FC = () => {
  const { session, history, resetSession } = useSecurity();
  const { features, startProTrial, company, userProfile } = useAuth();

  // Filter State
  const [filterMode, setFilterMode] = useState<FilterMode>('current');
  const [customRange] = useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const isFloorStaff = userProfile?.role === 'floor_staff';

  // --- 1. DATA AGGREGATION ---
  
  const filteredSessions = useMemo(() => {
    const allData = [session, ...history];
    const now = new Date();

    switch (filterMode) {
      case 'current': return [session];
      case '7days': {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - 7);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        return allData.filter(d => d.shiftDate >= cutoffStr);
      }
      case '30days': {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - 30);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        return allData.filter(d => d.shiftDate >= cutoffStr);
      }
      case 'all': return allData;
      case 'custom': return allData.filter(d => d.shiftDate >= customRange.start && d.shiftDate <= customRange.end);
      default: return [session];
    }
  }, [session, history, filterMode, customRange]);

  // --- CHART DATA GENERATORS ---

  const activityChartData = useMemo(() => {
    if (isFloorStaff) {
         return filteredSessions.map(s => ({
             name: new Date(s.shiftDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
             "Checks": (s.complianceLogs?.length || 0)
         }));
    }

    const isSingleDay = filteredSessions.length === 1;

    if (isSingleDay) {
      const targetSession = filteredSessions[0];
      const timeBuckets: Record<string, { admission: number, incidents: number }> = {};
      targetSession.logs.forEach(l => {
          if (l.type !== 'in') return;
          const d = new Date(l.timestamp);
          const h = d.getHours();
          const m = d.getMinutes() < 30 ? '00' : '30';
          const key = `${h.toString().padStart(2, '0')}:${m}`;
          if(!timeBuckets[key]) timeBuckets[key] = { admission: 0, incidents: 0 };
          timeBuckets[key].admission += (l.count || 1);
      });
      targetSession.ejections.forEach(e => {
          const d = new Date(e.timestamp);
          const h = d.getHours();
          const m = d.getMinutes() < 30 ? '00' : '30';
          const key = `${h.toString().padStart(2, '0')}:${m}`;
          if(!timeBuckets[key]) timeBuckets[key] = { admission: 0, incidents: 0 };
          timeBuckets[key].incidents += 1;
      });
      return Object.entries(timeBuckets).sort().map(([time, data]) => ({ name: time, Admission: data.admission, Ejections: data.incidents }));
    } else {
      const sorted = [...filteredSessions].sort((a,b) => a.shiftDate.localeCompare(b.shiftDate));
      return sorted.map(s => {
        const inCount = s.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
        return {
          name: new Date(s.shiftDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
          Admission: inCount,
          Ejections: s.ejections.length
        };
      });
    }
  }, [filteredSessions, isFloorStaff]);

  const totals = useMemo(() => {
    return {
      admissions: filteredSessions.reduce((acc, s) => acc + s.logs.filter(l => l.type === 'in').reduce((sum, l) => sum + (l.count || 1), 0), 0),
      incidents: filteredSessions.reduce((acc, s) => acc + s.ejections.length, 0),
      compliance: filteredSessions.reduce((acc, s) => acc + (s.complianceLogs?.length || 0), 0),
      complaints: filteredSessions.reduce((acc, s) => acc + (s.complaints?.length || 0), 0),
    };
  }, [filteredSessions]);

  // --- PDF EXPORT LOGIC ---

  const downloadVenuePDF = (sessions: SessionData[]) => {
     if (!features.hasReports) { if(confirm("Upgrade to Pro?")) startProTrial(); return; }
     
     const doc = new jsPDF();
     const dateStr = sessions.length === 1 ? sessions[0].shiftDate : 'Multi-Shift';
     
     // Header
     doc.setFillColor(16, 185, 129); // Emerald
     doc.rect(0, 0, 210, 25, 'F');
     doc.setTextColor(255, 255, 255);
     doc.setFontSize(18);
     doc.text(company?.name || 'NightGuard', 14, 16);
     doc.setFontSize(10);
     doc.text(`Venue Operations Report`, 14, 22);
     doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 16);
     
     let lastY = 35;
     
     sessions.forEach((s, index) => {
         if (index > 0) {
             doc.addPage();
             lastY = 20;
         }

         // --- SESSION HEADER ---
         doc.setTextColor(0,0,0);
         doc.setFontSize(14);
         doc.setFont('helvetica', 'bold');
         doc.text(`Shift Date: ${s.shiftDate}`, 14, lastY);
         
         // --- SHIFT MANAGER ---
         doc.setFontSize(10);
         doc.setFont('helvetica', 'normal');
         doc.setTextColor(80, 80, 80);
         doc.text(`Shift Manager: ${s.shiftManager || 'NOT RECORDED'}`, 14, lastY + 6);
         doc.text(`Capacity Peak: ${Math.max(...s.periodicLogs.map(p => p.countTotal), 0)}`, 100, lastY + 6);
         
         lastY += 15;

         // --- 1. COMPLIANCE CHECKS ---
         if ((s.complianceLogs?.length || 0) > 0) {
             doc.setFontSize(11);
             doc.setFont('helvetica', 'bold');
             doc.setTextColor(16, 185, 129);
             doc.text("Compliance & Checks", 14, lastY);
             lastY += 2;

             const rows = (s.complianceLogs || []).map(l => [
                 new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                 l.type.toUpperCase().replace('_', ' '),
                 l.location,
                 `${l.description}\n${l.resolutionNotes ? `[FIX]: ${l.resolutionNotes}` : ''}`,
                 l.status === 'resolved' ? 'FIXED' : 'OPEN',
                 l.loggedBy
             ]);

             autoTable(doc, {
                startY: lastY + 2,
                head: [['Time', 'Type', 'Location', 'Details', 'Status', 'Staff']],
                body: rows,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 3: { cellWidth: 70 } }
             });
             
             lastY = (doc as any).lastAutoTable.finalY + 10;
         }

         // --- 2. COMPLAINTS ---
         if ((s.complaints?.length || 0) > 0) {
             doc.setFontSize(11);
             doc.setFont('helvetica', 'bold');
             doc.setTextColor(245, 158, 11); // Amber
             doc.text("Complaints & Resolutions", 14, lastY);
             lastY += 2;

             const complaintRows = (s.complaints || []).map(c => [
                 new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                 c.source.toUpperCase(),
                 c.complainantName || 'Anonymous',
                 c.details,
                 c.resolution ? `RESOLVED: ${c.resolution}` : 'OPEN',
                 c.receivedBy
             ]);

             autoTable(doc, {
                startY: lastY + 2,
                head: [['Time', 'Source', 'Name', 'Issue', 'Resolution', 'Staff']],
                body: complaintRows,
                theme: 'grid',
                headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 3: { cellWidth: 60 }, 4: { cellWidth: 40 } }
             });
             
             lastY = (doc as any).lastAutoTable.finalY + 10;
         }

         // --- 3. TIMESHEETS ---
         if ((s.timesheets?.length || 0) > 0) {
             doc.setFontSize(11);
             doc.setFont('helvetica', 'bold');
             doc.setTextColor(99, 102, 241); // Indigo
             doc.text("Staff Timesheet Log", 14, lastY);
             lastY += 2;

             const tsRows = (s.timesheets || []).map(t => [
                 new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                 t.uploadedBy,
                 t.notes || '-',
                 'FILE UPLOADED'
             ]);

             autoTable(doc, {
                startY: lastY + 2,
                head: [['Time', 'Staff Name', 'Notes', 'Status']],
                body: tsRows,
                theme: 'grid',
                headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 }
             });
             
             lastY = (doc as any).lastAutoTable.finalY + 10;
         }
     });
     
     doc.save(`VenueReport_${dateStr}.pdf`);
  };

  const downloadSecurityPDF = (sessions: SessionData[]) => {
      if (!features.hasReports) { if(confirm("Upgrade to Pro?")) startProTrial(); return; }
      
      const doc = new jsPDF();
      const dateStr = sessions.length === 1 ? sessions[0].shiftDate : 'Multi-Shift';

      // Header
      doc.setFillColor(79, 70, 229); // Indigo
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(company?.name || 'NightGuard', 14, 16);
      doc.setFontSize(10);
      doc.text(`Security & Incident Report`, 14, 22);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 16);

      let lastY = 35;

      sessions.forEach((s, index) => {
          if (index > 0) { doc.addPage(); lastY = 20; }

          // --- SESSION HEADER ---
          doc.setTextColor(0,0,0);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(`Shift: ${s.shiftDate}`, 14, lastY);
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          doc.text(`Manager in Charge: ${s.shiftManager || 'N/A'}`, 14, lastY + 6);
          
          // Stats Line
          doc.text(`Admissions: ${s.logs.filter(l=>l.type==='in').reduce((a,b)=>a+(b.count||1),0)}`, 14, lastY + 12);
          doc.text(`Ejections: ${s.ejections.length}`, 60, lastY + 12);
          doc.text(`Refusals: ${s.rejections.length}`, 100, lastY + 12);

          lastY += 20;

          // --- INCIDENTS ---
          if (s.ejections.length > 0) {
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(239, 68, 68); // Red
              doc.text("Incidents & Ejections", 14, lastY);
              lastY += 2;

              const rows = s.ejections.map(e => [
                  new Date(e.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                  e.reason.toUpperCase(),
                  e.location,
                  `${e.gender} / ${e.ageRange} / ${e.icCode || '-'}`,
                  e.details,
                  e.authoritiesInvolved?.join(', ') || '-'
              ]);

              autoTable(doc, {
                  startY: lastY + 2,
                  head: [['Time', 'Type', 'Location', 'Subject', 'Details', 'Police/Amb']],
                  body: rows,
                  theme: 'grid',
                  headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 8 },
                  styles: { fontSize: 8, cellPadding: 2 },
                  columnStyles: { 4: { cellWidth: 60 } }
              });
              lastY = (doc as any).lastAutoTable.finalY + 10;
          }

          // --- REFUSALS ---
          if (s.rejections.length > 0) {
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(100, 100, 100);
              doc.text("Door Refusals", 14, lastY);
              lastY += 2;

              const rows = s.rejections.map(r => [
                  new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                  r.reason,
                  'Main Door'
              ]);

              autoTable(doc, {
                  startY: lastY + 2,
                  head: [['Time', 'Reason', 'Location']],
                  body: rows,
                  theme: 'striped',
                  headStyles: { fillColor: [100, 100, 100], textColor: 255, fontSize: 8 },
                  styles: { fontSize: 8 }
              });
              lastY = (doc as any).lastAutoTable.finalY + 10;
          }
      });

      doc.save(`SecurityReport_${dateStr}.pdf`);
  };

  return (
    <div className="h-full overflow-y-auto p-4 pb-24">
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Reports</h2>
        {/* Filter Bar */}
        <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl flex gap-1 overflow-x-auto no-scrollbar">
          {['current', '7days', '30days', 'all'].map((opt) => (
             <button key={opt} onClick={() => setFilterMode(opt as any)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${filterMode === opt ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>{opt}</button>
          ))}
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {!isFloorStaff && (
            <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Admissions</span>
            <div className="text-xl font-mono text-white mt-1">{totals.admissions}</div>
            </div>
        )}
        {!isFloorStaff && (
            <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Incidents</span>
            <div className="text-xl font-mono text-white mt-1 text-red-400">{totals.incidents}</div>
            </div>
        )}
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
           <span className="text-[10px] text-zinc-500 uppercase font-bold">Venue Logs</span>
           <div className="text-xl font-mono text-white mt-1 text-emerald-400">{totals.compliance}</div>
        </div>
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
           <span className="text-[10px] text-zinc-500 uppercase font-bold">Complaints</span>
           <div className="text-xl font-mono text-white mt-1 text-amber-400">{totals.complaints}</div>
        </div>
      </div>

      {/* Graphs */}
      <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 mb-6 shadow-sm">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityChartData}>
              <XAxis dataKey="name" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#27272a'}} contentStyle={{backgroundColor: '#18181b', border: 'none'}} />
              {!isFloorStaff && <Bar dataKey="Admission" fill="#6366f1" radius={[4,4,0,0]} />}
              {!isFloorStaff && <Bar dataKey="Ejections" fill="#ef4444" radius={[4,4,0,0]} />}
              {isFloorStaff && <Bar dataKey="Checks" fill="#10b981" radius={[4,4,0,0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-1 gap-3 mb-8">
        {!isFloorStaff && (
            <button 
            onClick={() => downloadSecurityPDF(filteredSessions)}
            className="flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
            >
            {features.hasReports ? <FileText size={16} /> : <Lock size={16} />} 
            Security Report (PDF)
            </button>
        )}
        <button 
          onClick={() => downloadVenuePDF(filteredSessions)}
          className="flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
        >
          {features.hasReports ? <ClipboardCheck size={16} /> : <Lock size={16} />} 
          Venue Ops Report (PDF)
        </button>
      </div>

      {/* Footer Actions */}
      {!isFloorStaff && (
          <button 
            onClick={resetSession}
            className="w-full bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/30 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mb-4 text-sm"
          >
            <Archive size={16} /> End & Archive Shift
          </button>
      )}
    </div>
  );
};

export default Reports;
