import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Shell } from './components/Shell';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { OverviewPage } from './features/overview/OverviewPage';
import { TimelinePage } from './features/timeline/TimelinePage';
import { PayablesPage } from './features/payables/PayablesPage';
import { RiskPage } from './features/risk/RiskPage';
import { ScenariosPage } from './features/scenarios/ScenariosPage';
import { ActionsPage } from './features/actions/ActionsPage';
import { ImportPage } from './features/import/ImportPage';
import { AffordabilityDrawer } from './features/affordability/AffordabilityDrawer';

function AppContent() {
  const { isAuthenticated, isLoading, business, user, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState('/overview');
  const [isAffordOpen, setIsAffordOpen] = useState(false);

  // Sync window hash or path
  useEffect(() => {
    const handleHashChange = () => {
      const path = window.location.hash.replace('#', '') || '/overview';
      setCurrentPath(path);
      if (window.location.search.includes('afford=1')) {
        setIsAffordOpen(true);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keyboard shortcut Alt+A or Cmd+K for "Can I afford this?"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'a') || (e.metaKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setIsAffordOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded bg-cash text-surface font-bold text-lg flex items-center justify-center mx-auto shadow-sm animate-pulse">
            FC
          </div>
          <p className="text-xs text-ink-muted">Connecting to FlowCred Decision Engine...</p>
        </div>
      </div>
    );
  }

  // Protected route guard: show LoginPage if unauthenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Shell
      activePath={currentPath}
      onNavigate={navigate}
      onOpenAffordDrawer={() => setIsAffordOpen(true)}
      businessName={business?.name}
      asOfDate={business?.as_of_date || new Date().toISOString().split('T')[0]}
      userEmail={user?.email}
      onLogout={logout}
      actionBadgeCount={0}
    >
      {currentPath === '/overview' && (
        <OverviewPage
          onNavigate={navigate}
          onOpenAffordDrawer={() => setIsAffordOpen(true)}
        />
      )}
      {currentPath === '/timeline' && <TimelinePage />}
      {currentPath === '/payables' && <PayablesPage />}
      {currentPath === '/risk' && <RiskPage />}
      {currentPath === '/scenarios' && <ScenariosPage />}
      {currentPath === '/actions' && <ActionsPage />}
      {currentPath === '/import' && <ImportPage />}
      {currentPath === '/_design' && <DesignSystemPage />}

      {/* Fallback for unknown path */}
      {![
        '/overview',
        '/timeline',
        '/payables',
        '/risk',
        '/scenarios',
        '/actions',
        '/import',
        '/_design'
      ].includes(currentPath) && (
        <div className="p-8 bg-surface border border-rule rounded text-center space-y-3">
          <h2 className="text-xl font-bold text-ink">Route: {currentPath}</h2>
          <p className="text-sm text-ink-muted">
            The requested screen does not exist.
          </p>
          <button
            onClick={() => navigate('/overview')}
            className="px-4 py-2 bg-cash text-surface text-xs font-semibold rounded"
          >
            Back to Overview (/overview)
          </button>
        </div>
      )}

      {/* Signature "Can I afford this?" Decision Drawer */}
      <AffordabilityDrawer
        isOpen={isAffordOpen}
        onClose={() => setIsAffordOpen(false)}
      />
    </Shell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
