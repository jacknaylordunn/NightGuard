
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import AdmissionControl from './pages/AdmissionControl';
import Ejections from './pages/Ejections'; 
import Checks from './pages/Checks';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SuperAdminDashboard from './pages/SuperAdminDashboard'; 
import Support from './pages/Support'; 
import Landing from './pages/Landing';
import AuthPage from './pages/Auth';
import Watchlist from './pages/Watchlist';
import Pricing from './pages/Pricing';
import BillingSuccess from './pages/BillingSuccess';
import VenueCompliance from './pages/VenueCompliance';
import { SecurityProvider } from './context/SecurityContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const AuthenticatedApp: React.FC = () => {
  const { userProfile } = useAuth();
  
  if (userProfile?.role === 'superadmin') {
    return <SuperAdminDashboard />;
  }

  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) setActiveTab(tabParam);
    if (params.get('success') === 'true') setActiveTab('billing-success');
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'admission': return <AdmissionControl />;
      case 'ejections': return <Ejections />; 
      case 'compliance': return <VenueCompliance />;
      case 'watchlist': return <Watchlist />;
      case 'checks': return <Checks />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      case 'support': return <Support />;
      case 'pricing': return <Pricing onBack={() => setActiveTab('settings')} />;
      case 'billing-success': return <BillingSuccess onBack={() => setActiveTab('settings')} />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <SecurityProvider>
      <div className="h-[100dvh] w-full flex flex-col bg-background text-zinc-50 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden relative pt-[68px] w-full max-w-md mx-auto md:max-w-full">
          {renderContent()}
        </main>
        {!['pricing', 'billing-success'].includes(activeTab) && (
            <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </div>
    </SecurityProvider>
  );
};

const Root: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | null>(null);

  useEffect(() => {
    if (!loading && !user && localStorage.getItem('nightguard_returning_user') === 'true') {
      setAuthView('login');
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="h-4 w-32 bg-surfaceHighlight rounded"></div>
        </div>
      </div>
    );
  }

  if (user) return <AuthenticatedApp />;
  if (authView) return <AuthPage initialView={authView} onBack={() => setAuthView(null)} />;
  
  return <Landing onGetStarted={() => setAuthView('register')} onLogin={() => setAuthView('login')} />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
};

export default App;
