
import React, { useState, useMemo } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Archive, FileText, ClipboardCheck, Lock, EyeOff, Eye, X
} from 'lucide-react';
import { SessionData } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FilterMode = 'current' | '7days' | '30days' | 'all';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Reports: React.FC = () => {
  const { session, history, resetSession } = useSecurity();
  const { features, startProTrial, company, userProfile, venue } = useAuth();

  const [filterMode, setFilterMode] = useState<FilterMode>('current');
  const [includeAdmissions, setIncludeAdmissions] = useState(true);

  const isFloorStaff = userProfile?.role === 'floor_staff';

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
      default: return [session];
    }
  }, [session, history, filterMode]);

  const stats = useMemo(() => {
    const allEjections = filteredSessions.flatMap(s => s.ejections || []);
    const allRejections = filteredSessions.flatMap(s => s.rejections || []);
    const allLogs = filteredSessions.flatMap(s => s.logs || []);

    const ejectionReasons: Record<string, number> = {};
    allEjections.forEach(e => { 
        const r = e.reason || 'other';
        ejectionReasons[r] = (ejectionReasons[r] || 0) + 1; 
    });
    const ejectionChart = Object.entries(ejectionReasons).map(([name, value]) => ({ name, value }));

    const refusalReasons: Record<string, number> = {};
    allRejections.forEach(r => { 
        const reason = r.reason || 'Other';
        refusalReasons[reason] = (refusalReasons[reason] || 0) + 1; 
    });
    const refusalChart = Object.entries(refusalReasons).map(([name, value]) => ({ name, value }));

    let activityChart = [];
    if (filteredSessions.length === 1) {
        const target = filteredSessions[0];
        const buckets: Record<string, { admission: number, incidents: number }> = {};
        target.logs.filter(l => l.type === 'in').forEach(l => {
            const h = new Date(l.timestamp).getHours();
            const k = `${h}:00`;
            if(!buckets[k]) buckets[k] = { admission:0, incidents:0 };
            buckets[k].admission += (l.count || 1);
        });
        target.ejections.forEach(e => {
            const h = new Date(e.timestamp).getHours();
            const k = `${h}:00`;
            if(!buckets[k]) buckets[k] = { admission:0, incidents:0 };
            buckets[k].incidents += 1;
        });
        activityChart = Object.entries(buckets).sort().map(([name, d]) => ({ name, Admission: d.admission, Incidents: d.incidents }));
    } else {
        activityChart = filteredSessions.map(s => ({
            name: new Date(s.shiftDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
            Admission: s.logs.filter(l => l.type === 'in').reduce((a,b) => a + (b.count || 1), 0),
            Incidents: s.ejections.length
        })).reverse();
    }

    return {
        ejectionChart,
        refusalChart,
        activityChart,
        totalAdmissions: allLogs.filter(l => l.type === 'in').reduce((a,b) => a + (b.count || 1), 0),
        totalEjections: allEjections.length,
        totalRefusals: allRejections.length
    };
  }, [filteredSessions]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    summary: true,
    admissions: true,
    incidents: true,
    refusals: true,
    patrols: true,
    toiletChecks: true,
    floorChecks: true,
    openingClosing: true,
    complaints: true,
    timesheets: true,
  });

  const generateCustomReport = () => {
     if (!features.hasReports) { if(confirm("Upgrade to Pro?")) startProTrial(); return; }
     
     const doc = new jsPDF();
     const title = "Custom Operations Report";
     const color: [number, number, number] = [79, 70, 229]; // Indigo

     // --- FRONT PAGE ---
     doc.setFillColor(color[0], color[1], color[2]);
     doc.rect(0, 0, 210, 30, 'F');
     doc.setTextColor(255, 255, 255);
     doc.setFontSize(20);
     doc.text(company?.name || 'NightGuard', 14, 18);
     doc.setFontSize(10);
     doc.text(title, 14, 25);
     doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 18);

     let y = 40;
     doc.setTextColor(0,0,0);
     
     // SUMMARY SECTION
     if (reportOptions.summary) {
         doc.setFontSize(12);
         doc.setFont('helvetica', 'bold');
         doc.text("Executive Summary", 14, y);
         y += 8;
         
         const summaryData = [
             ['Total Shifts', filteredSessions.length.toString()],
             ['Total Incidents', stats.totalEjections.toString()],
             ['Total Refusals', stats.totalRefusals.toString()]
         ];
         
         if (reportOptions.admissions) {
             summaryData.splice(1, 0, ['Total Admissions', stats.totalAdmissions.toString()]);
         }
         
         autoTable(doc, {
             startY: y,
             head: [['Metric', 'Count']],
             body: summaryData,
             theme: 'grid',
             headStyles: { fillColor: [80, 80, 80] },
             styles: { fontSize: 10 },
             margin: { left: 14, right: 100 }
         });

         // INCIDENT BREAKDOWN
         if (stats.ejectionChart.length > 0 && reportOptions.incidents) {
            y = (doc as any).lastAutoTable.finalY + 10;
            doc.text("Incident Breakdown", 14, y);
            y += 5;
            
            const incidentRows = stats.ejectionChart.map(i => [(i.name || 'Unknown').toUpperCase(), i.value.toString()]);
            autoTable(doc, {
                startY: y,
                head: [['Reason', 'Count']],
                body: incidentRows,
                theme: 'striped',
                headStyles: { fillColor: [239, 68, 68] }, // Red
                styles: { fontSize: 9 },
                margin: { left: 14, right: 100 } 
            });
         }
         y = (doc as any).lastAutoTable.finalY + 10;
     }

     if (reportOptions.floorChecks) {
         doc.setFontSize(10);
         doc.setFont('helvetica', 'italic');
         doc.text("Compliance Statement: The following locations are checked every 15 minutes", 14, y);
         doc.text("during operational hours to ensure venue safety and compliance.", 14, y + 5);
         y += 12;
         
         const locations = venue?.locations?.length ? venue.locations.join(', ') : 'All Venue Areas';
         doc.setFont('helvetica', 'bold');
         doc.setFontSize(9);
         const splitLocs = doc.splitTextToSize(`Locations: ${locations}`, 180);
         doc.text(splitLocs, 14, y);
         y += (splitLocs.length * 4) + 5;
     }

     // --- SHIFT LOGS ---
     doc.addPage();
     y = 20;
     doc.setFontSize(14);
     doc.text("Detailed Shift Logs", 14, y);
     y += 10;

     filteredSessions.forEach((s, index) => {
         if (index > 0) {
             doc.addPage();
             y = 20;
         }

         // SHIFT HEADER
         doc.setFillColor(240, 240, 240);
         doc.rect(14, y-6, 182, 12, 'F');
         doc.setFontSize(12);
         doc.setTextColor(0,0,0);
         doc.setFont('helvetica', 'bold');
         doc.text(`Shift Date: ${s.shiftDate}`, 16, y);
         doc.setFont('helvetica', 'normal');
         doc.setFontSize(10);
         doc.text(`Manager: ${s.shiftManager || 'N/A'}`, 16, y+4);
         
         if (reportOptions.admissions) {
             const shiftAdmissions = s.logs.filter(l => l.type === 'in').reduce((a,b) => a + (b.count || 1), 0);
             doc.text(`Admissions: ${shiftAdmissions}`, 150, y+2);
         }
         
         y += 15;

         // SHIFT NOTES
         if (s.shiftNotes) {
             doc.setFontSize(10);
             doc.setFont('helvetica', 'bold');
             doc.text("Shift Notes:", 14, y);
             doc.setFont('helvetica', 'normal');
             doc.setFontSize(9);
             const splitNotes = doc.splitTextToSize(s.shiftNotes, 180);
             doc.text(splitNotes, 14, y+5);
             y += (splitNotes.length * 4) + 10;
         }

         // --- ADMISSION DATA BREAKDOWN (HALF HOURLY) ---
         if (reportOptions.admissions) {
             let tableBody: string[][] = [];
             const tableHead = [['Time', 'In', 'Out', 'Capacity', 'Toilet Check']];

             if (s.periodicLogs && s.periodicLogs.length > 0) {
                 // Manual Logs (Verified)
                 const sorted = [...s.periodicLogs].sort((a,b) => a.timeLabel.localeCompare(b.timeLabel));
                 tableBody = sorted.map(p => [
                     p.timeLabel,
                     p.countIn.toString(),
                     p.countOut.toString(),
                     p.countTotal.toString(),
                     p.toiletCheck ? 'Yes' : 'No'
                 ]);
             } else if (s.logs && s.logs.length > 0) {
                 // Computed Logs (Fallback)
                 const buckets: Record<string, {in: number, out: number, total: number}> = {};
                 let runningCap = 0;
                 const sortedLogs = [...s.logs].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                 
                 sortedLogs.forEach(l => {
                     const d = new Date(l.timestamp);
                     const h = d.getHours().toString().padStart(2, '0');
                     const m = d.getMinutes() < 30 ? '00' : '30';
                     const key = `${h}:${m}`;
                     
                     if (!buckets[key]) buckets[key] = { in: 0, out: 0, total: runningCap };
                     
                     const c = l.count || 1;
                     if (l.type === 'in') {
                         buckets[key].in += c;
                         runningCap += c;
                     } else {
                         buckets[key].out += c;
                         runningCap -= c;
                     }
                     buckets[key].total = runningCap;
                 });

                 tableBody = Object.entries(buckets).sort().map(([time, data]) => [
                     time,
                     data.in.toString(),
                     data.out.toString(),
                     data.total.toString(),
                     '-'
                 ]);
             }

             if (tableBody.length > 0) {
                 doc.setFontSize(10); 
                 doc.setFont('helvetica', 'bold');
                 doc.text("Half-Hourly Activity Log", 14, y);
                 autoTable(doc, {
                     startY: y + 2,
                     head: tableHead,
                     body: tableBody,
                     theme: 'striped',
                     headStyles: { fillColor: color },
                     styles: { fontSize: 8 },
                     margin: { left: 14, right: 14 }
                 });
                 y = (doc as any).lastAutoTable.finalY + 10;
             }
         }

         // --- INCIDENTS TABLE ---
         if (reportOptions.incidents) {
             if (s.ejections.length > 0) {
                 doc.setFontSize(10); doc.setFont('helvetica', 'bold');
                 doc.text("Incidents / Ejections", 14, y);
                 const rows = s.ejections.map(e => [
                     new Date(e.timestamp).toLocaleTimeString(),
                     (e.reason || 'other').toUpperCase(),
                     e.location || 'Unknown',
                     `${e.gender || 'Unknown'}/${e.ageRange || '?'}`,
                     e.details || ''
                 ]);
                 autoTable(doc, {
                     startY: y + 2,
                     head: [['Time', 'Type', 'Location', 'Subj', 'Details']],
                     body: rows,
                     theme: 'grid',
                     headStyles: { fillColor: [239, 68, 68] },
                     styles: { fontSize: 8 },
                     columnStyles: { 4: { cellWidth: 80 } }
                 });
                 y = (doc as any).lastAutoTable.finalY + 10;
             } else {
                 doc.setFontSize(9); doc.setTextColor(150,150,150);
                 doc.text("No Incidents Recorded", 14, y); y+= 10; doc.setTextColor(0,0,0);
             }
         }

         // --- REFUSALS TABLE ---
         if (reportOptions.refusals) {
             if (s.rejections.length > 0) {
                 doc.setFontSize(10); doc.setFont('helvetica', 'bold');
                 doc.text("Refusals at Door", 14, y);
                 const rRows = s.rejections.map(r => [
                     new Date(r.timestamp).toLocaleTimeString(),
                     (r.reason || 'Unknown'),
                     'Main Door'
                 ]);
                 autoTable(doc, {
                     startY: y+2,
                     head: [['Time', 'Reason', 'Location']],
                     body: rRows,
                     theme: 'plain',
                     styles: { fontSize: 8 },
                     headStyles: { fillColor: [100, 100, 100], textColor: 255 }
                 });
                 y = (doc as any).lastAutoTable.finalY + 10;
             }
         }

         // --- PATROLS ---
         if (reportOptions.patrols) {
             if (s.patrolLogs && s.patrolLogs.length > 0) {
                 doc.setFontSize(10); doc.setFont('helvetica', 'bold');
                 doc.text("Patrol Log", 14, y);
                 const pRows = s.patrolLogs.map(p => [
                     new Date(p.time).toLocaleTimeString(),
                     p.area || 'Unknown',
                     (p.method || 'manual').toUpperCase(),
                     p.checkedBy || 'Unknown'
                 ]);
                 autoTable(doc, {
                     startY: y+2,
                     head: [['Time', 'Area', 'Method', 'Staff']],
                     body: pRows,
                     theme: 'plain',
                     styles: { fontSize: 8 }
                 });
                 y = (doc as any).lastAutoTable.finalY + 10;
             }
         }

         // --- TOILET CHECKS ---
         if (reportOptions.toiletChecks) {
             doc.setFontSize(10); doc.setFont('helvetica', 'bold');
             doc.text("Toilet Checks Log", 14, y);
             const toiletLogs = s.complianceLogs?.filter(l => l.type === 'toilet_check') || [];
             if (toiletLogs.length > 0) {
                 const rows = toiletLogs.map(l => [
                     new Date(l.timestamp).toLocaleTimeString(),
                     l.location || 'All Toilets',
                     l.description || 'Routine check completed. Clean and stocked.',
                     l.loggedBy || 'Venue Staff'
                 ]);
                 autoTable(doc, {
                     startY: y + 2,
                     head: [['Time', 'Location', 'Details', 'Staff']],
                     body: rows,
                     theme: 'striped',
                     headStyles: { fillColor: [59, 130, 246] },
                     styles: { fontSize: 8 }
                 });
                 y = (doc as any).lastAutoTable.finalY + 10;
             } else {
                 doc.setFontSize(10); doc.setFont('helvetica', 'normal');
                 doc.text("No toilet checks recorded for this shift.", 14, y); y += 10;
             }
         }

         // --- FLOOR CHECKS ---
         if (reportOptions.floorChecks) {
             doc.setFontSize(10); doc.setFont('helvetica', 'bold');
             doc.text("Floor Checks Log", 14, y);
             const floorLogs = s.complianceLogs?.filter(l => l.type !== 'toilet_check') || [];
             const patrolLogs = s.patrolLogs || [];
             
             const combinedRows = [
                 ...floorLogs.map(l => ({ time: new Date(l.timestamp), type: l.type || 'Task', loc: l.location || 'Unknown', desc: l.description || '', staff: l.loggedBy || 'Unknown' })),
                 ...patrolLogs.map(p => ({ time: new Date(p.time), type: 'Patrol', loc: p.area || 'Unknown', desc: `Method: ${p.method}`, staff: p.checkedBy || 'Unknown' }))
             ].sort((a, b) => a.time.getTime() - b.time.getTime());

             if (combinedRows.length > 0) {
                 const rows = combinedRows.map(r => [
                     r.time.toLocaleTimeString(),
                     r.type,
                     r.loc,
                     r.desc,
                     r.staff
                 ]);
                 autoTable(doc, {
                     startY: y + 2,
                     head: [['Time', 'Type', 'Location', 'Details', 'Staff']],
                     body: rows,
                     theme: 'striped',
                     headStyles: { fillColor: [245, 158, 11] },
                     styles: { fontSize: 8 }
                 });
                 y = (doc as any).lastAutoTable.finalY + 10;
             } else {
                 doc.setFontSize(10); doc.setFont('helvetica', 'normal');
                 doc.text("No floor checks or patrols recorded for this shift.", 14, y); y += 10;
             }
         }

         // --- COMPLAINTS ---
         if (reportOptions.complaints && s.complaints && s.complaints.length > 0) {
             if (y > 250) { doc.addPage(); y = 20; }
             doc.setFontSize(12); doc.setFont('helvetica', 'bold');
             doc.text("Customer Complaints", 14, y); y += 5;
             const rows = s.complaints.map(c => [
                 new Date(c.timestamp).toLocaleTimeString(),
                 c.source.replace('_', ' ').toUpperCase(),
                 c.complainantName || 'Anonymous',
                 c.details || '',
                 c.status.toUpperCase(),
                 c.resolution || '-'
             ]);
             autoTable(doc, {
                 startY: y,
                 head: [['Time', 'Source', 'Customer', 'Details', 'Status', 'Resolution']],
                 body: rows,
                 theme: 'grid',
                 headStyles: { fillColor: [220, 38, 38] },
                 styles: { fontSize: 8 },
                 columnStyles: { 3: { cellWidth: 60 }, 5: { cellWidth: 40 } }
             });
             y = (doc as any).lastAutoTable.finalY + 10;
         }

         // --- TIMESHEETS ---
         if (reportOptions.timesheets && s.timesheets && s.timesheets.length > 0) {
             if (y > 250) { doc.addPage(); y = 20; }
             doc.setFontSize(12); doc.setFont('helvetica', 'bold');
             doc.text("Timesheets", 14, y); y += 5;
             const rows = s.timesheets.map(t => [
                 new Date(t.timestamp).toLocaleTimeString(),
                 t.uploadedBy || 'Unknown',
                 t.notes || '-'
             ]);
             autoTable(doc, {
                 startY: y,
                 head: [['Time Uploaded', 'Staff Member', 'Notes']],
                 body: rows,
                 theme: 'grid',
                 headStyles: { fillColor: [16, 185, 129] },
                 styles: { fontSize: 8 }
             });
             y = (doc as any).lastAutoTable.finalY + 10;
         }

         // --- OPENING & CLOSING CHECKS ---
         if (reportOptions.openingClosing) {
             const preChecks = s.preEventChecks || [];
             const postChecks = s.postEventChecks || [];

             doc.setFontSize(11); doc.setFont('helvetica', 'bold');
             doc.text("Opening Checks", 14, y); y += 5;
             if (preChecks.length > 0) {
                 const rows = preChecks.map(c => [
                     c.label,
                     c.checked ? 'Completed' : 'Pending',
                     c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : '-',
                     c.checkedBy || '-'
                 ]);
                 autoTable(doc, {
                     startY: y,
                     head: [['Check Item', 'Status', 'Time', 'Staff']],
                     body: rows,
                     theme: 'grid',
                     headStyles: { fillColor: [16, 185, 129] },
                     styles: { fontSize: 8 }
                 });
                 y = (doc as any).lastAutoTable.finalY + 10;
             } else {
                 doc.setFontSize(10); doc.setFont('helvetica', 'normal');
                 doc.text("No opening checks recorded.", 14, y); y += 10;
             }

             doc.setFontSize(11); doc.setFont('helvetica', 'bold');
             doc.text("Closing Checks", 14, y); y += 5;
             if (postChecks.length > 0) {
                 const rows = postChecks.map(c => [
                     c.label,
                     c.checked ? 'Completed' : 'Pending',
                     c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : '-',
                     c.checkedBy || '-'
                 ]);
                 autoTable(doc, {
                     startY: y,
                     head: [['Check Item', 'Status', 'Time', 'Staff']],
                     body: rows,
                     theme: 'grid',
                     headStyles: { fillColor: [16, 185, 129] },
                     styles: { fontSize: 8 }
                 });
                 y = (doc as any).lastAutoTable.finalY + 10;
             } else {
                 doc.setFontSize(10); doc.setFont('helvetica', 'normal');
                 doc.text("No closing checks recorded.", 14, y); y += 10;
             }
         }
     });

     doc.save(`Custom_Report.pdf`);
     setIsModalOpen(false);
  };

  return (
    <div className="h-full overflow-y-auto p-4 pb-24 bg-slate-950">
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
        <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl flex gap-1 overflow-x-auto no-scrollbar">
          {['current', '7days', '30days', 'all'].map((opt) => (
             <button key={opt} onClick={() => setFilterMode(opt as any)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${filterMode === opt ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>{opt}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
         <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
            <p className="text-zinc-500 text-xs font-bold uppercase">Admissions</p>
            <p className="text-2xl font-mono text-white">{stats.totalAdmissions}</p>
         </div>
         <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
            <p className="text-zinc-500 text-xs font-bold uppercase">Incidents</p>
            <p className="text-2xl font-mono text-red-400">{stats.totalEjections}</p>
         </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl mb-6">
         <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4">Activity Timeline</h3>
         <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={stats.activityChart}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#27272a'}} contentStyle={{backgroundColor: '#18181b', border: 'none'}} />
                  <Bar dataKey="Admission" fill="#6366f1" radius={[4,4,0,0]} stackId="a" />
                  <Bar dataKey="Incidents" fill="#ef4444" radius={[4,4,0,0]} stackId="a" />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Pie Charts Row */}
      {!isFloorStaff && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
         <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4">Incident Types</h3>
            <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={stats.ejectionChart} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {stats.ejectionChart.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip contentStyle={{backgroundColor: '#18181b', border: 'none', fontSize: '12px'}} />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}}/>
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4">Refusal Reasons</h3>
            <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={stats.refusalChart} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {stats.refusalChart.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip contentStyle={{backgroundColor: '#18181b', border: 'none', fontSize: '12px'}} />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}}/>
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
      )}

      {/* Venue Report Options */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl mb-4">
          <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white">Venue Report Settings</span>
          </div>
          <div 
            onClick={() => setIncludeAdmissions(!includeAdmissions)}
            className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800 cursor-pointer"
          >
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                  {includeAdmissions ? <Eye size={16} className="text-emerald-500"/> : <EyeOff size={16} className="text-zinc-500"/>}
                  Include Admission Data
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${includeAdmissions ? 'bg-emerald-600' : 'bg-zinc-700'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${includeAdmissions ? 'left-6' : 'left-1'}`} />
              </div>
          </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
         <button onClick={() => setIsModalOpen(true)} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
            <Lock size={18} /> Download Custom PDF Report
         </button>
         {!isFloorStaff && (
             <button onClick={resetSession} className="w-full bg-red-900/20 text-red-400 border border-red-900/50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-6">
                <Archive size={18} /> Archive Shift
             </button>
         )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="font-bold text-white">Customise PDF Report</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-zinc-400 mb-2">Select the sections you want to include in the generated PDF report.</p>
              
              <div className="space-y-2">
                {Object.entries(reportOptions).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 cursor-pointer">
                    <span className="text-sm font-medium text-zinc-200 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${value ? 'left-6' : 'left-1'}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={value}
                      onChange={() => setReportOptions(prev => ({ ...prev, [key]: !prev[key as keyof typeof reportOptions] }))}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-950">
              <button 
                onClick={generateCustomReport}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <FileText size={18} /> Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
