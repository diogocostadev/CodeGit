import React, { useEffect } from 'react';
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import MainLayout from './components/layout/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import UserOnboarding from './components/onboarding/UserOnboarding';
import UserSelection from './components/onboarding/UserSelection';
import './App.css';

const App = () => {
  return (
    <ErrorBoundary>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </ErrorBoundary>
  );
};

const AppContent = () => {
  const { state, completeOnboarding, loadExistingUser } = useAppState();
  
  // Dev helper: Cmd+R to reload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        window.location.reload();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Determinar qual tela mostrar baseado no estado
  const shouldShowUserSelection = state.show_user_selection;
  const shouldShowOnboarding = state.is_first_time && !shouldShowUserSelection;
  
  if (shouldShowUserSelection) {
    return (
      <UserSelection
        onNewUser={() => {
          // Iniciar processo de novo usuário (onboarding)
          completeOnboarding();
        }}
        onExistingUser={(userData) => {
          // Carregar usuário existente
          loadExistingUser(userData);
        }}
      />
    );
  }
  
  if (shouldShowOnboarding) {
    return <UserOnboarding onComplete={completeOnboarding} />;
  }
  
  return (
    <div className="app">
      <MainLayout />
    </div>
  );
};

export default App;