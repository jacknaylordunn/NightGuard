import React from 'react';
import { LayoutGrid, Users, TriangleAlert, ClipboardCheck, Activity, Settings, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';

  const navItems = [
    ...(isOwner ? [{ id: 'admin', label: 'Admin', icon: ShieldAlert }] : []),
    { id: 'dashboard', label: 'Home', icon: LayoutGrid },
    { id: 'admission', label: 'Door', icon: Users },
    { id: 'ejections', label: 'Incident', icon: TriangleAlert }, 
    { id: 'checks', label: 'Check', icon: ClipboardCheck },
    { id: 'reports', label: 'Data', icon: Activity },
    { id: 'settings', label: 'Menu', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 w-full z-50 pb-safe pointer-events-none">
      <div className="mx-4 mb-4 rounded-3xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl flex justify-around items-center h-16 pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 group`}
            >
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-indigo-500 shadow-[0_0_10px_#6366f1] transition-all duration-300 ${isActive ? 'opacity-100 translate-y-3' : 'opacity-0 -translate-y-2'}`} />
              
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={`transition-all duration-300 mb-0.5 ${isActive ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] scale-110' : 'text-zinc-500 group-hover:text-zinc-300'}`}
              />
              <span className={`text-[9px] font-bold transition-all duration-300 ${isActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
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