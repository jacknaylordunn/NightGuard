
import React, { useState, useMemo } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid 
} from 'recharts';
import { 
  Download, History, Archive, PieChart as PieIcon, BarChart3, 
  Lock, MapPin, FileText, Calendar, Filter, AlertTriangle, ShieldAlert, ChevronDown
} from 'lucide-react';
import { SessionData } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
const HEATMAP_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

type FilterMode = 'current' | '7days' | '30days' | 'all' | 'custom';

const Reports: React.FC = () => {
  const { session, history, resetSession, clearHistory } = useSecurity();
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
    // Combine current session + history
    // Note: session is live, history is past. 
    // We filter based on shiftDate string comparison.
    const allData = [session, ...history];
    const today = new Date().toISOString().split('T')[0];
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

  // Activity Chart: Hourly (if single day) OR Daily (if range)
  const activityChartData = useMemo(() => {
    const isSingleDay = filteredSessions.length === 1;

    if (isSingleDay) {
      // Hourly Breakdown for single session
      const targetSession = filteredSessions[0];
      const hours = Array.from({ length: 9 }, (_, i) => {
        const h = 20 + i; // 20:00 start
        return h >= 24 ? h - 24 : h;
      }); 

      return hours.map(hour => {
        const inCount = targetSession.logs.filter(l => {
          const d = new Date(l.timestamp);
          return d.getHours() === hour && l.type === 'in';
        }).reduce((acc, l) => acc + (l.count || 1), 0);

        const ejectCount = targetSession.ejections.filter(r => {
          const d = new Date(r.timestamp);
          return d.getHours() === hour;
        }).length;

        return {
          name: `${hour}:00`,
          Admission: inCount,
          Incidents: ejectCount
        };
      });
    } else {
      // Daily Trend for multiple sessions
      // Sort by date ascending
      const sorted = [...filteredSessions].sort((a,b) => a.shiftDate.localeCompare(b.shiftDate));
      return sorted.map(s => {
        const inCount = s.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
        return {
          name: new Date(s.shiftDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
          Admission: inCount,
          Incidents: s.ejections.length
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

  // --- 3. EXPORT LOGIC (Single Session) ---
  const generateCSV = (data: SessionData) => {
    const periodicLogs = data.periodicLogs || [];
    let csvContent = "Date,Time,Log Type,Reason/Category,Location,Gender,Age Range,IC Code,Details,Action Taken,Departure,Authorities,CCTV,Body Cam,Badge Number,Manager,Count In,Count Out,Count Total\n";

    const admissions = data.logs.map(l => {
        const d = new Date(l.timestamp);
        return `${d.toLocaleDateString()},${d.toLocaleTimeString()},Admission,${l.type},,,,,,,,,,,,,,,`;
    }).join("\n");

    const rejections = data.rejections.map(r => {
        const d = new Date(r.timestamp);
        return `${d.toLocaleDateString()},${d.toLocaleTimeString()},Refusal,${r.reason},,,,,,,,,,,,,,,`;
    }).join("\n");

    const ejections = data.ejections.map(e => {
        const d = new Date(e.timestamp);
        const escape = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
        const details = escape(e.details);
        const action = escape(e.actionTaken);
        const departure = escape(e.departure);
        const auth = escape((e.authoritiesInvolved || []).join(', '));
        const customStr = e.customData ? Object.entries(e.customData).map(([k,v]) => `${k}:${v}`).join('; ') : '';
        const mergedDetails = escape(`${e.details || ''} ${customStr ? `[${customStr}]` : ''}`.trim());
        return `${d.toLocaleDateString()},${d.toLocaleTimeString()},Incident,${e.reason},${e.location},${e.gender},${e.ageRange},${e.icCode || ''},${mergedDetails},${action},${departure},${auth},${e.cctvRecorded ? 'Yes' : 'No'},${e.bodyCamRecorded ? 'Yes' : 'No'},${e.securityBadgeNumber},${e.managerName},,,`;
    }).join("\n");

    const periodics = periodicLogs.map(p => {
        const d = new Date(p.timestamp);
        return `${d.toLocaleDateString()},${p.timeLabel},Half-Hourly Check,,,,,,,,,,,,,,,${p.countIn},${p.countOut},${p.countTotal}`;
    }).join("\n");

    csvContent += admissions + "\n" + rejections + "\n" + ejections + "\n" + periodics + "\n\n";

    csvContent += "SUMMARY STATISTICS\n";
    const incidentCounts: Record<string, number> = {};
    data.ejections.forEach(e => incidentCounts[e.reason] = (incidentCounts[e.reason] || 0) + 1);
    csvContent += "Total Incidents by Type\n";
    Object.entries(incidentCounts).forEach(([type, count]) => {
        csvContent += `${type},${count}\n`;
    });
    csvContent += `TOTAL INCIDENTS,${data.ejections.length}\n\n`;

    const rejCounts: Record<string, number> = {};
    data.rejections.forEach(r => rejCounts[r.reason] = (rejCounts[r.reason] || 0) + 1);
    csvContent += "Total Rejections by Reason\n";
    Object.entries(rejCounts).forEach(([reason, count]) => {
        csvContent += `${reason},${count}\n`;
    });
    csvContent += `TOTAL REJECTIONS,${data.rejections.length}\n\n`;

    const totalAdmissions = data.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
    csvContent += `TOTAL ADMISSIONS,${totalAdmissions}\n`;

    return encodeURI("data:text/csv;charset=utf-8," + csvContent);
  };

  // --- BULK EXPORT LOGIC ---
  const downloadBulkCSV = (sessions: SessionData[]) => {
     if (!features.hasReports) {
        if(confirm("CSV Export is a Pro feature. Start a free 14-day Pro trial now?")) startProTrial();
        return;
     }

     const sortedSessions = [...sessions].sort((a,b) => b.shiftDate.localeCompare(a.shiftDate));
     let csvContent = "Shift Date,Time,Log Type,Reason/Category,Location,Gender,Age Range,IC Code,Details,Action Taken,Departure,Authorities,CCTV,Body Cam,Badge Number,Manager\n";

     sortedSessions.forEach(data => {
        // Incidents
        data.ejections.forEach(e => {
            const d = new Date(e.timestamp);
            const escape = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
            const details = escape(`${e.details || ''} ${e.customData ? JSON.stringify(e.customData) : ''}`);
            const action = escape(e.actionTaken);
            const departure = escape(e.departure);
            const auth = escape((e.authoritiesInvolved || []).join(', '));
            
            csvContent += `${data.shiftDate},${d.toLocaleTimeString()},Incident,${e.reason},${e.location},${e.gender},${e.ageRange},${e.icCode || ''},${details},${action},${departure},${auth},${e.cctvRecorded?'Y':'N'},${e.bodyCamRecorded?'Y':'N'},${e.securityBadgeNumber},${e.managerName}\n`;
        });

        // Rejections
        data.rejections.forEach(r => {
            const d = new Date(r.timestamp);
            csvContent += `${data.shiftDate},${d.toLocaleTimeString()},Refusal,${r.reason},,,,,,,,,,,,\n`;
        });
        
        // Logs Summary
        const logsIn = data.logs.filter(l => l.type === 'in').reduce((acc,l) => acc + (l.count || 1), 0);
        csvContent += `${data.shiftDate},,Shift Summary,Admissions: ${logsIn},,,,,,,,,,,,\n`;
     });

     // Summary Section
     csvContent += "\n\nSUMMARY AGGREGATION\n";
     csvContent += `Total Shifts,${sessions.length}\n`;
     
     const totalIncidents = sessions.reduce((acc, s) => acc + s.ejections.length, 0);
     const totalRejections = sessions.reduce((acc, s) => acc + s.rejections.length, 0);
     const totalAdmissions = sessions.reduce((acc, s) => acc + s.logs.filter(l => l.type === 'in').reduce((sum, l) => sum + (l.count || 1), 0), 0);
     
     csvContent += `Total Admissions,${totalAdmissions}\n`;
     csvContent += `Total Incidents,${totalIncidents}\n`;
     csvContent += `Total Rejections,${totalRejections}\n`;

     const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `Security_Report_Range_${new Date().toISOString().split('T')[0]}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

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
    doc.setFillColor(79, 70, 229); 
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
        ['Total Incidents', totalIncidents.toString()],
        ['Total Rejections', totalRejections.toString()]
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
    doc.text("Shift Breakdown", 14, (doc as any).lastAutoTable.finalY + 10);
    const shiftRows = sortedSessions.map(s => {
        const adm = s.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0);
        return [s.shiftDate, adm, s.ejections.length, s.rejections.length];
    });

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Date', 'Admissions', 'Incidents', 'Refusals']],
        body: shiftRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });

    // Combined Incidents
    doc.text("All Incidents (Detailed)", 14, (doc as any).lastAutoTable.finalY + 10);
    
    let allIncidents: any[] = [];
    sortedSessions.forEach(s => {
        s.ejections.forEach(e => {
            allIncidents.push({ ...e, shiftDate: s.shiftDate });
        });
    });

    if (allIncidents.length > 0) {
        const incidentRows = allIncidents.map(e => [
            e.shiftDate,
            new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            `${e.reason}\n${e.location}`,
            e.details || 'No details',
            e.actionTaken
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 15,
            head: [['Date', 'Time', 'Type/Loc', 'Details', 'Action']],
            body: incidentRows,
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 8, overflow: 'linebreak', cellPadding: 1 },
            columnStyles: { 0: { cellWidth: 20 }, 2: { cellWidth: 30 }, 3: { cellWidth: 60 } }
        });
    } else {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("No incidents recorded in this period.", 14, (doc as any).lastAutoTable.finalY + 15);
    }

    doc.save(`Range_Report_${startDate}_${endDate}.pdf`);
  };

  const downloadCSV = (data: SessionData, filename: string) => {
    if (!features.hasReports) {
      if(confirm("CSV Export is a Pro feature. Start a free 14-day Pro trial now?")) startProTrial();
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
      if(confirm("PDF Export is a Pro feature. Start a free 14-day Pro trial now?")) startProTrial();
      return;
    }
    
    const doc = new jsPDF();
    const dateStr = new Date(data.shiftDate).toLocaleDateString();

    doc.setFillColor(99, 102, 241);
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

    doc.text("Half-Hourly Checks", 14, 60);
    const periodicRows = (data.periodicLogs || []).map(p => [
      p.timeLabel, p.countIn.toString(), p.countOut.toString(), p.countTotal.toString(), new Date(p.timestamp).toLocaleTimeString()
    ]);
    autoTable(doc, {
      startY: 65,
      head: [['Time Label', 'Total In', 'Total Out', 'Venue Total', 'Logged At']],
      body: periodicRows,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9 }
    });

    const lastY1 = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Incident Logs (Full Detail)", 14, lastY1);
    const ejectionRows = data.ejections.map(e => [
      new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      `${e.reason}\nLoc: ${e.location}`,
      `${e.gender} / ${e.ageRange}\nIC: ${e.icCode || '-'}`,
      `${e.details || 'No details'}\n${e.customData ? Object.entries(e.customData).map(([k,v]) => `${k}:${v}`).join(', ') : ''}`,
      `Act: ${e.actionTaken}\nDep: ${e.departure}\nAuth: ${(e.authoritiesInvolved || []).join(', ')}`,
      `CCTV: ${e.cctvRecorded?'Y':'N'}\nCam: ${e.bodyCamRecorded?'Y':'N'}`,
      `${e.securityBadgeNumber}\n${e.managerName}`
    ]);
    autoTable(doc, {
      startY: lastY1 + 5,
      head: [['Time', 'Type/Loc', 'Subject', 'Details', 'Outcome', 'Evidence', 'Staff']],
      body: ejectionRows,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 20 }, 2: { cellWidth: 20 }, 3: { cellWidth: 60 }, 4: { cellWidth: 40 }, 5: { cellWidth: 15 }, 6: { cellWidth: 20 } }
    });

    const lastY2 = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Refusals / Rejections", 14, lastY2);
    const rejectionRows = data.rejections.map(r => [
       new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), r.reason
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

    const lastY3 = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Category Summaries", 14, lastY3);
    doc.setFontSize(10);
    
    const incidentCounts: Record<string, number> = {};
    data.ejections.forEach(e => incidentCounts[e.reason] = (incidentCounts[e.reason] || 0) + 1);
    const incSummaryRows = Object.entries(incidentCounts).map(([k,v]) => [k, v]);
    incSummaryRows.push(['TOTAL INCIDENTS', data.ejections.length]);

    const rejCounts: Record<string, number> = {};
    data.rejections.forEach(r => rejCounts[r.reason] = (rejCounts[r.reason] || 0) + 1);
    const rejSummaryRows = Object.entries(rejCounts).map(([k,v]) => [k, v]);
    rejSummaryRows.push(['TOTAL REJECTIONS', data.rejections.length]);

    autoTable(doc, {
      startY: lastY3 + 5,
      head: [['Incident Type', 'Count']],
      body: incSummaryRows,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      margin: { right: 110 },
      tableWidth: 90
    });

    autoTable(doc, {
      startY: lastY3 + 5,
      head: [['Rejection Reason', 'Count']],
      body: rejSummaryRows,
      theme: 'grid',
      headStyles: { fillColor: [75, 85, 99] },
      margin: { left: 110 },
      tableWidth: 90
    });

    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.text("Head of Security Signature: _______________________", 14, finalY);
    doc.text("Manager Signature: _______________________", 110, finalY);

    doc.save(`ShiftReport_${data.shiftDate}.pdf`);
  };

  const isBulkExport = filterMode !== 'current';
  const rangeLabel = filterMode === '7days' ? '7 Days' : filterMode === '30days' ? '30 Days' : filterMode === 'all' ? 'All Time' : 'Custom';

  return (
    <div className="h-full overflow-y-auto p-4 pb-24">
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
        
        {/* GLOBAL FILTER BAR */}
        <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'current', label: 'Current Shift' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom' }
          ].map((opt) => (
             <button
               key={opt.id}
               onClick={() => {
                 setFilterMode(opt.id as FilterMode);
                 if(opt.id === 'custom') setShowCustomPicker(true);
                 else setShowCustomPicker(false);
               }}
               className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                 filterMode === opt.id 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
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
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">End Date</label>
                <input 
                  type="date"
                  value={customRange.end}
                  onChange={e => setCustomRange(p => ({...p, end: e.target.value}))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-sm"
                />
              </div>
           </div>
        )}
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
           <span className="text-[10px] text-zinc-500 uppercase font-bold">Admissions</span>
           <div className="text-xl font-mono text-white mt-1">{totals.admissions}</div>
        </div>
        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
           <span className="text-[10px] text-zinc-500 uppercase font-bold">Incidents</span>
           <div className="text-xl font-mono text-white mt-1 text-red-400">{totals.incidents}</div>
        </div>
        <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
           <span className="text-[10px] text-zinc-500 uppercase font-bold">Rejections</span>
           <div className="text-xl font-mono text-white mt-1 text-amber-400">{totals.rejections}</div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
            <BarChart3 size={14} /> {filteredSessions.length > 1 ? 'Daily Trends' : 'Hourly Activity'}
          </h3>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityChartData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                cursor={{fill: '#334155', opacity: 0.2}}
              />
              <Bar dataKey="Admission" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{fontSize: '12px', marginTop: '10px'}} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* Incident Types Chart (NEW) */}
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
                  <AlertTriangle size={14} /> Incident Types
                </h3>
              </div>
              <div className="h-64 w-full">
                {incidentTypeData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-sm">No incidents in range</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={incidentTypeData}>
                        <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
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
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
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
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                        <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="circle" wrapperStyle={{fontSize: '11px'}} />
                    </PieChart>
                    </ResponsiveContainer>
                )}
              </div>
          </div>

          {/* Location Risk Chart */}
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg md:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
                  <MapPin size={14} /> Incident Hotspots
                </h3>
                {features.hasReports && <span className="text-[10px] text-amber-500 font-bold border border-amber-500/30 px-1 rounded">PRO</span>}
              </div>
              
              {!features.hasReports ? (
                 <div className="h-56 flex flex-col items-center justify-center text-center px-4">
                    <Lock size={32} className="text-slate-600 mb-2" />
                    <p className="text-slate-500 text-sm">Upgrade to view location risk analysis.</p>
                 </div>
              ) : locationData.length === 0 ? (
                 <div className="h-56 flex items-center justify-center text-slate-600 text-sm">
                   No incidents recorded in this range.
                 </div>
              ) : (
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationData}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
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
          onClick={() => isBulkExport ? downloadBulkCSV(filteredSessions) : downloadCSV(session, `current_shift_${session.shiftDate}.csv`)}
          className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors text-sm rounded-xl border border-slate-700 ${!features.hasReports ? 'bg-slate-900 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
        >
          {features.hasReports ? <Download size={16} /> : <Lock size={16} />} 
          CSV ({isBulkExport ? rangeLabel : 'Current'})
        </button>
        <button 
          onClick={() => isBulkExport ? downloadBulkPDF(filteredSessions) : downloadPDF(session)}
          className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-colors text-sm rounded-xl ${!features.hasReports ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'}`}
        >
          {features.hasReports ? <FileText size={16} /> : <Lock size={16} />} 
          PDF ({isBulkExport ? rangeLabel : 'Current'})
        </button>
      </div>

      {/* Filtered History List */}
      <div className="mb-8">
        <h3 className="text-slate-400 text-sm font-bold uppercase flex items-center gap-2 mb-4">
          <History size={16} /> Shifts in Range ({filteredSessions.length})
        </h3>
        
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 bg-slate-800/50 rounded-xl border border-slate-800 border-dashed">
            <Archive size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="text-slate-500 text-sm">No shifts found for this range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...filteredSessions].sort((a,b) => b.shiftDate.localeCompare(a.shiftDate)).map((hist) => (
              <div key={hist.shiftDate} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-indigo-500/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-white font-bold">{hist.shiftDate}</div>
                    {hist.shiftDate === session.shiftDate && (
                      <span className="text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold">Live</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {hist.logs.filter(l => l.type === 'in').reduce((acc, l) => acc + (l.count || 1), 0)} Entries • {hist.ejections ? hist.ejections.length : 0} Ejections
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => downloadCSV(hist, `history_${hist.shiftDate}.csv`)}
                    className={`p-2 rounded-lg transition-colors ${features.hasReports ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-900 text-slate-600'}`}
                  >
                    <Download size={14} />
                  </button>
                  <button 
                    onClick={() => downloadPDF(hist)}
                    className={`p-2 rounded-lg transition-colors ${features.hasReports ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-900 text-slate-600'}`}
                  >
                     <FileText size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        onClick={resetSession}
        className="w-full bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mb-4"
      >
        <Archive size={20} /> End & Archive Current Shift
      </button>
    </div>
  );
};

export default Reports;
