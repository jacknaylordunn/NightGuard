
import React, { useState, useMemo } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Download, History, Archive, PieChart as PieIcon, BarChart3, 
  Lock, MapPin, FileText, AlertTriangle, Trash2
} from 'lucide-react';
import { SessionData } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
const HEATMAP_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

type FilterMode = 'current' | '7days' | '30days' | 'all' | 'custom';

const Reports: React.FC = () => {
  const { session, history, resetSession, deleteShift } = useSecurity();
  const { features, startProTrial, company } = useAuth();

  // Filter State
  const [filterMode, setFilterMode] = useState<FilterMode>('current');
  const [customRange, setCustomRange] = useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // --- 1. DATA AGGREGATION ---
  
  const filteredSessions = useMemo(() => {
    const allData = [session, ...history];
    const now = new Date();

    switch (filterMode) {
      case 'current':
        return [session];
      
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

      case 'all':
        return allData;

      case 'custom':
        return allData.filter(d => d.shiftDate >= customRange.start && d.shiftDate <= customRange.end);
        
      default:
        return [session];
    }
  }, [session, history, filterMode, customRange]);

  // --- 2. CHART DATA GENERATORS ---

  // Activity Chart: Half-Hourly (if single day) OR Daily (if range)
  const activityChartData = useMemo(() => {
    const isSingleDay = filteredSessions.length === 1;

    if (isSingleDay) {
      // Half-Hourly Breakdown for single session
      const targetSession = filteredSessions[0];
      
      const timeBuckets: Record<string, { admission: number, incidents: number }> = {};
      
      // Fill buckets from logs
      targetSession.logs.forEach(l => {
          if (l.type !== 'in') return;
          const d = new Date(l.timestamp);
          const h = d.getHours();
          const m = d.getMinutes() < 30 ? '00' : '30';
          const key = `${h.toString().padStart(2, '0')}:${m}`;
          if(!timeBuckets[key]) timeBuckets[key] = { admission: 0, incidents: 0 };
          timeBuckets[key].admission += (l.count || 1);
      });

      // Fill buckets from incidents
      targetSession.ejections.forEach(e => {
          const d = new Date(e.timestamp);
          const h = d.getHours();
          const m = d.getMinutes() < 30 ? '00' : '30';
          const key = `${h.toString().padStart(2, '0')}:${m}`;
          if(!timeBuckets[key]) timeBuckets[key] = { admission: 0, incidents: 0 };
          timeBuckets[key].incidents += 1;
      });

      // Sort buckets chronologically
      return Object.entries(timeBuckets)
        .sort((a, b) => {
            const [hA] = a[0].split(':').map(Number);
            const [hB] = b[0].split(':').map(Number);
            const valA = hA < 10 ? hA + 24 : hA;
            const valB = hB < 10 ? hB + 24 : hB;
            if(valA !== valB) return valA - valB;
            return a[0].localeCompare(b[0]);
        })
        .map(([time, data]) => ({
          name: time,
          Admission: data.admission,
          Ejections: data.incidents
        }));

    } else {
      // Daily Trend for multiple sessions
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
  }, [filteredSessions]);

  // Rejection Reasons (Aggregated)
  const rejectionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSessions.forEach(s => {
      s.rejections.forEach(r => {
        counts[r.reason] = (counts[r.reason] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [filteredSessions]);

  // Incident Types (Aggregated)
  const incidentTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSessions.forEach(s => {
      s.ejections.forEach(e => {
        counts[e.reason] = (counts[e.reason] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [filteredSessions]);

  // Incident Locations (Aggregated)
  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSessions.forEach(s => {
      s.ejections.forEach(e => {
        counts[e.location] = (counts[e.location] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [filteredSessions]);

  // Totals
  const totals = useMemo(() => {
    return {
      admissions: filteredSessions.reduce((acc, s) => acc + s.logs.filter(l => l.type === 'in').reduce((sum, l) => sum + (l.count || 1), 0), 0),
      incidents: filteredSessions.reduce((acc, s) => acc + s.ejections.length, 0),
      rejections: filteredSessions.reduce((acc, s) => acc + s.rejections.length, 0),
    };
  }, [filteredSessions]);

  // --- 3. EXPORT LOGIC ---

  const downloadBulkPDF = (sessions: SessionData[]) => {
     if (!features.hasReports) {
        if(confirm("PDF Export is a Pro feature. Start a free 14-day Pro trial now?")) startProTrial();
        return;
     }

     const doc = new jsPDF();
     const sortedSessions = [...sessions].sort((a,b) => b.shiftDate.localeCompare(a.shiftDate));
     const startDate = sortedSessions[sortedSessions.length-1].shiftDate;
     const endDate = sortedSessions[0].shiftDate;

     // Header
    doc.setFillColor(17, 24, 39); 
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(company?.name || 'NightGuard Security', 10, 13);
    doc.setFontSize(10);
    doc.text(`Range Report: ${startDate} to ${endDate}`, 130, 13);

    // Summary Stats
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Executive Summary", 14, 30);
    doc.setFontSize(10);
    
    const totalIncidents = sessions.reduce((acc, s) => acc + s.ejections.length, 0);
    const totalRejections = sessions.reduce((acc, s) => acc + s.rejections.length, 0);
    const totalAdmissions = sessions.reduce((acc, s) => acc + s.logs.filter(l => l.type === 'in').reduce((sum, l) => sum + (l.count || 1), 0), 0);

    const statsData = [
        ['Total Shifts', sessions.length.toString()],
        ['Total Admissions', totalAdmissions.toString()],
        ['Total Ejections', totalIncidents.toString()],
        ['Total Refusals', totalRejections.toString()]
    ];

    autoTable(doc, {
        startY: 35,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'grid',
        tableWidth: 80,
        headStyles: { fillColor: [75, 85, 99] }
    });

    // Shift Breakdown Table
    let lastY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Shift Breakdown", 14, lastY);
    const shiftRows = sortedSessions.map(s => {
        const adm = s.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
        return [s.shiftDate, adm, s.ejections.length, s.rejections.length];
    });

    autoTable(doc, {
        startY: lastY + 5,
        head: [['Date', 'Admissions', 'Ejections', 'Refusals']],
        body: shiftRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });

    lastY = (doc as any).lastAutoTable.finalY + 15;

    // --- AGGREGATED BREAKDOWNS (New Section) ---
    
    // Calculate totals
    const rejectionCounts: Record<string, number> = {};
    const ejectionCounts: Record<string, number> = {};

    sessions.forEach(s => {
        s.rejections.forEach(r => {
            rejectionCounts[r.reason] = (rejectionCounts[r.reason] || 0) + 1;
        });
        s.ejections.forEach(e => {
            ejectionCounts[e.reason] = (ejectionCounts[e.reason] || 0) + 1;
        });
    });

    const rejectionRows = Object.entries(rejectionCounts)
        .sort((a,b) => b[1] - a[1])
        .map(([reason, count]) => [reason, count.toString()]);

    const ejectionRows = Object.entries(ejectionCounts)
        .sort((a,b) => b[1] - a[1])
        .map(([reason, count]) => [reason, count.toString()]);

    // Side-by-Side Tables logic
    const startYForBreakdowns = lastY;
    
    // Table 1: Incidents by Type (Left)
    if (ejectionRows.length > 0) {
        doc.text("Ejections by Category", 14, startYForBreakdowns);
        autoTable(doc, {
            startY: startYForBreakdowns + 5,
            head: [['Category', 'Count']],
            body: ejectionRows,
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68] },
            tableWidth: 80,
            margin: { left: 14 }
        });
    }

    // Table 2: Rejections by Reason (Right)
    if (rejectionRows.length > 0) {
        // If Incidents table exists, position to right (x=110), else left (x=14)
        const startX = ejectionRows.length > 0 ? 110 : 14;
        doc.text("Refusals by Reason", startX, startYForBreakdowns);
        autoTable(doc, {
            startY: startYForBreakdowns + 5,
            head: [['Reason', 'Count']],
            body: rejectionRows,
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11] },
            tableWidth: 80,
            margin: { left: startX }
        });
    }

    // Update lastY to be below the lowest table
    lastY = (doc as any).lastAutoTable.finalY + 15;

    // --- DETAILED INCIDENTS ---

    doc.text("All Ejections (Detailed)", 14, lastY);
    
    let allIncidents: any[] = [];
    sortedSessions.forEach(s => {
        s.ejections.forEach(e => {
            allIncidents.push({ ...e, shiftDate: s.shiftDate });
        });
    });
    
    // Sort all incidents chronologically
    allIncidents.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (allIncidents.length > 0) {
        const incidentRows = allIncidents.map(e => [
            e.shiftDate,
            new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            `${e.reason}\n${e.location}`,
            `${e.details || 'No details'}\n${e.customData ? JSON.stringify(e.customData) : ''}`,
            e.actionTaken
        ]);

        autoTable(doc, {
            startY: lastY + 5,
            head: [['Date', 'Time', 'Type/Loc', 'Details', 'Action']],
            body: incidentRows,
            theme: 'grid',
            headStyles: { fillColor: [75, 85, 99] },
            styles: { fontSize: 8, overflow: 'linebreak', cellPadding: 1 },
            columnStyles: { 0: { cellWidth: 20 }, 2: { cellWidth: 30 }, 3: { cellWidth: 60 } }
        });
    } else {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("No ejections recorded in this period.", 14, lastY + 5);
    }

    doc.save(`Range_Report_${startDate}_${endDate}.pdf`);
  };

  const downloadSinglePDF = (data: SessionData) => {
     if (!features.hasReports) {
      if(confirm("PDF Export is a Pro feature. Start a free 14-day Pro trial now?")) startProTrial();
      return;
    }
    
    const doc = new jsPDF();
    const dateStr = new Date(data.shiftDate).toLocaleDateString();

    doc.setFillColor(17, 24, 39); // Zinc 900
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(company?.name || 'NightGuard Security', 10, 13);
    doc.setFontSize(10);
    doc.text(`Shift Report: ${dateStr}`, 150, 13);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Venue: ${data.venueName}`, 14, 30);
    const totalAdmissions = data.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
    doc.text(`Total Admissions: ${totalAdmissions}`, 14, 36);
    doc.text(`Total Ejections: ${data.ejections.length}`, 14, 42);
    doc.text(`Total Rejections: ${data.rejections.length}`, 14, 48);

    doc.text("Half-Hourly Checks (Chronological)", 14, 60);
    const periodicRows = [...(data.periodicLogs || [])]
      .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(p => [
        p.timeLabel, p.countIn.toString(), p.countOut.toString(), p.countTotal.toString(), new Date(p.timestamp).toLocaleTimeString()
      ]);
      
    autoTable(doc, {
      startY: 65,
      head: [['Time Label', 'Total In', 'Total Out', 'Venue Total', 'Logged At']],
      body: periodicRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 }
    });

    let lastY = (doc as any).lastAutoTable.finalY + 15;

    // Compliance Checks & Patrols (Chronological)
    const combinedChecks = [
        ...(data.preEventChecks || []).filter(c => c.checked).map(c => ({...c, type: 'Pre-Opening'})),
        ...(data.patrolLogs || []).map(p => ({...p, timestamp: p.time, label: p.area, type: 'Patrol'})),
        ...(data.postEventChecks || []).filter(c => c.checked).map(c => ({...c, type: 'Closing'}))
    ].sort((a,b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());

    if (combinedChecks.length > 0) {
        doc.text("Compliance & Patrols", 14, lastY);
        const checkRows = combinedChecks.map(c => [
          c.type, c.label, c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''
        ]);

        autoTable(doc, {
            startY: lastY + 5,
            head: [['Type', 'Item / Area', 'Time Logged']],
            body: checkRows,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 9 },
            columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 30 } }
        });
        
        lastY = (doc as any).lastAutoTable.finalY + 15;
    }

    doc.text("Ejection Logs (Chronological)", 14, lastY);
    const ejectionRows = [...data.ejections]
      .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(e => [
        new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        `${e.reason}\nLoc: ${e.location}`,
        `${e.gender} / ${e.ageRange}\nIC: ${e.icCode || '-'}`,
        `${e.details || 'No details'}\n${e.customData ? Object.entries(e.customData).map(([k,v]) => `${k}:${v}`).join(', ') : ''}`,
        `Act: ${e.actionTaken}\nDep: ${e.departure}\nAuth: ${(e.authoritiesInvolved || []).join(', ')}`,
        `${e.securityBadgeNumber}\n${e.managerName}`
      ]);
      
    autoTable(doc, {
      startY: lastY + 5,
      head: [['Time', 'Type/Loc', 'Subject', 'Details', 'Outcome', 'Staff']],
      body: ejectionRows,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 20 }, 2: { cellWidth: 20 }, 3: { cellWidth: 60 }, 4: { cellWidth: 40 }, 5: { cellWidth: 20 } }
    });

    lastY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Refusals / Rejections", 14, lastY);
    const rejectionRows = [...data.rejections]
      .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(r => [
        new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), r.reason
      ]);
      
    autoTable(doc, {
      startY: lastY + 5,
      head: [['Time', 'Reason']],
      body: rejectionRows,
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 30 } }
    });

    lastY = (doc as any).lastAutoTable.finalY + 30;
    doc.text("Head of Security Signature: _______________________", 14, lastY);
    doc.text("Manager Signature: _______________________", 110, lastY);

    doc.save(`ShiftReport_${data.shiftDate}.pdf`);
  };

  const downloadBulkCSV = (sessions: SessionData[]) => {
     if (!features.hasReports) {
        if(confirm("CSV Export is a Pro feature. Start a free 14-day Pro trial now?")) startProTrial();
        return;
     }

     const sortedSessions = [...sessions].sort((a,b) => b.shiftDate.localeCompare(a.shiftDate));
     let csvContent = "Shift Date,Time,Log Type,Reason/Category,Location,Gender,Age Range,IC Code,Details,Action Taken,Departure,Authorities,CCTV,Body Cam,Badge Number,Manager\n";

     sortedSessions.forEach(data => {
        data.ejections.forEach(e => {
            const d = new Date(e.timestamp);
            const escape = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
            const details = escape(`${e.details || ''}`);
            csvContent += `${data.shiftDate},${d.toLocaleTimeString()},Ejection,${e.reason},${e.location},${e.gender},${e.ageRange},${e.icCode || ''},${details},${e.actionTaken},${e.departure},,${e.cctvRecorded?'Y':'N'},${e.bodyCamRecorded?'Y':'N'},${e.securityBadgeNumber},${e.managerName}\n`;
        });
        
        const logsIn = data.logs.filter(l => l.type === 'in').reduce((acc,l) => acc + (l.count || 1), 0);
        csvContent += `${data.shiftDate},,Shift Summary,Admissions: ${logsIn},,,,,,,,,,,,\n`;
     });
     
     const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `Range_Report.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const downloadSingleCSV = (data: SessionData) => {
    // Basic CSV logic for single file
    if (!features.hasReports) {
        if(confirm("CSV Export is a Pro feature. Start a free 14-day Pro trial now?")) startProTrial();
        return;
    }
    // Re-use logic or simplified
    const uri = "data:text/csv;charset=utf-8,Date,Type,Count\n" + data.logs.map(l => `${l.timestamp},${l.type},${l.count}`).join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(uri));
    link.setAttribute("download", `Shift_${data.shiftDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const isBulkExport = filterMode !== 'current';
  const rangeLabel = filterMode === '7days' ? '7 Days' : filterMode === '30days' ? '30 Days' : filterMode === 'all' ? 'All Time' : 'Custom';

  return (
    <div className="h-full overflow-y-auto p-4 pb-24">
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Reports</h2>
        
        {/* GLOBAL FILTER BAR */}
        <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl flex gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'current', label: 'Current Shift' },
            { id: '7days', label: '7 Days' },
            { id: '30days', label: '30 Days' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom' }
          ].map((opt) => (
             <button
               key={opt.id}
               onClick={() => {
                   setFilterMode(opt.id as FilterMode);
                   setShowCustomPicker(opt.id === 'custom');
               }}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                 filterMode === opt.id 
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' 
                  : 'text-zinc-500 hover:text-zinc-300'
               }`}
             >
               {opt.label}
             </button>
          ))}
        </div>

        {/* Custom Range Picker */}
        {showCustomPicker && (
           <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl animate-in slide-in-from-top-2 flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Start Date</label>
                <input 
                  type="date"
                  value={customRange.start}
                  onChange={e => setCustomRange(p => ({...p, start: e.target.value}))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">End Date</label>
                <input 
                  type="date"
                  value={customRange.end}
                  onChange={e => setCustomRange(p => ({...p, end: e.target.value}))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-xs"
                />
              </div>
           </div>
        )}
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
           <span className="text-[10px] text-zinc-500 uppercase font-bold">Admissions</span>
           <div className="text-xl font-mono text-white mt-1">{totals.admissions}</div>
        </div>
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
           <span className="text-[10px] text-zinc-500 uppercase font-bold">Ejections</span>
           <div className="text-xl font-mono text-white mt-1 text-red-400">{totals.incidents}</div>
        </div>
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
           <span className="text-[10px] text-zinc-500 uppercase font-bold">Refusals</span>
           <div className="text-xl font-mono text-white mt-1 text-amber-400">{totals.rejections}</div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
            <BarChart3 size={14} /> {filteredSessions.length > 1 ? 'Daily Trends' : 'Activity (30m Intervals)'}
          </h3>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityChartData}>
              <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px', fontSize: '12px' }}
                cursor={{fill: '#27272a', opacity: 0.5}}
              />
              <Bar dataKey="Admission" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ejections" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{fontSize: '11px', marginTop: '10px'}} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* Incident Types Chart */}
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-lg">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                  <AlertTriangle size={14} /> Ejection Types
                </h3>
              </div>
              <div className="h-64 w-full">
                {incidentTypeData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-sm">No ejections in range</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={incidentTypeData}>
                        <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                           {incidentTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                )}
              </div>
          </div>

          {/* Rejection Pie Chart */}
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                  <PieIcon size={14} /> Rejection Reasons
                </h3>
              </div>
              <div className="h-64 w-full flex">
                {rejectionData.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-zinc-600 text-sm">No rejections in range</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={rejectionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        >
                        {rejectionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }} />
                        <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="circle" wrapperStyle={{fontSize: '11px'}} />
                    </PieChart>
                    </ResponsiveContainer>
                )}
              </div>
          </div>

          {/* Location Risk Chart */}
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-lg md:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                  <MapPin size={14} /> Ejection Hotspots
                </h3>
                {features.hasReports && <span className="text-[10px] text-amber-500 font-bold border border-amber-500/30 px-1 rounded">PRO</span>}
              </div>
              
              {!features.hasReports ? (
                 <div className="h-56 flex flex-col items-center justify-center text-center px-4">
                    <Lock size={32} className="text-zinc-600 mb-2" />
                    <p className="text-zinc-500 text-sm">Upgrade to view location risk analysis.</p>
                 </div>
              ) : locationData.length === 0 ? (
                 <div className="h-56 flex items-center justify-center text-zinc-600 text-sm">
                   No ejections recorded in this range.
                 </div>
              ) : (
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationData}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]}>
                          {locationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={HEATMAP_COLORS[index % HEATMAP_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                </div>
              )}
          </div>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-3 mb-8">
        <button 
          onClick={() => isBulkExport ? downloadBulkCSV(filteredSessions) : downloadSingleCSV(session)}
          className="flex-1 py-3 font-bold flex items-center justify-center gap-2 transition-colors text-sm rounded-xl border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
        >
          {features.hasReports ? <Download size={16} /> : <Lock size={16} />} 
          CSV
        </button>
        <button 
          onClick={() => isBulkExport ? downloadBulkPDF(filteredSessions) : downloadSinglePDF(session)}
          className="flex-1 py-3 font-bold flex items-center justify-center gap-2 transition-colors text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20"
        >
          {features.hasReports ? <FileText size={16} /> : <Lock size={16} />} 
          PDF Report
        </button>
      </div>

      {/* Filtered History List */}
      <div className="mb-8">
        <h3 className="text-zinc-500 text-xs font-bold uppercase flex items-center gap-2 mb-4">
          <History size={14} /> Shifts in Range
        </h3>
        
        <div className="space-y-2">
            {[...filteredSessions].sort((a,b) => b.shiftDate.localeCompare(a.shiftDate)).map((hist) => (
              <div key={hist.shiftDate} className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 flex justify-between items-center group">
                <div>
                  <div className="text-zinc-200 text-sm font-bold">{hist.shiftDate}</div>
                  <div className="text-[10px] text-zinc-500">
                    {hist.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0)} Entries
                  </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => downloadSinglePDF(hist)}
                        className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                        title="Download PDF"
                    >
                        <FileText size={14} />
                    </button>
                    {hist.shiftDate !== session.shiftDate && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); if(confirm('Permanently delete this shift record?')) deleteShift(hist.shiftDate); }}
                            className="p-2 rounded-lg bg-red-900/10 text-red-500 hover:bg-red-900/30"
                            title="Delete Shift"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
              </div>
            ))}
          </div>
      </div>

      <button 
        onClick={resetSession}
        className="w-full bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/30 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mb-4 text-sm"
      >
        <Archive size={16} /> End & Archive Shift
      </button>
    </div>
  );
};

export default Reports;
