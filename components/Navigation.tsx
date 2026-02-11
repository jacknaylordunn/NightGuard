
import React from 'react';
import { LayoutDashboard, Users, AlertTriangle, ClipboardList, BarChart2, Settings, Shield, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { userProfile } = useAuth();
  
  // Define nav items
  const allNavItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, roles: ['owner', 'manager', 'security', 'floor_staff'] },
    { id: 'admission', label: 'Entry', icon: Users, roles: ['owner', 'manager', 'security'] },
    { id: 'ejections', label: 'Ejections', icon: AlertTriangle, roles: ['owner', 'manager', 'security'] }, 
    { id: 'compliance', label: 'Venue', icon: ClipboardCheck, roles: ['owner', 'manager', 'floor_staff'] },
    { id: 'checks', label: 'Patrol', icon: ClipboardList, roles: ['owner', 'manager', 'security'] },
    { id: 'reports', label: 'Reports', icon: BarChart2, roles: ['owner', 'manager', 'security', 'floor_staff'] },
    { id: 'settings', label: 'Manage', icon: Settings, roles: ['owner', 'manager', 'security', 'floor_staff'] },
  ];

  const userRole = userProfile?.role || 'floor_staff';

  const visibleItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="fixed bottom-0 w-full z-50 pb-safe bg-slate-950 border-t border-slate-800 shadow-2xl">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full group active:scale-95 transition-transform`}
            >
              {/* Active Indicator Dot */}
              {isActive && (
                 <div className="absolute top-1.5 w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
              )}
              
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 group-hover:text-slate-300'}`}>
                 <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              
              <span className={`text-[9px] font-medium mt-0.5 transition-colors ${isActive ? 'text-indigo-200' : 'text-slate-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navigation;
