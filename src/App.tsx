import React from 'react';
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import MainLayout from './components/layout/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import UserOnboarding from './components/onboarding/UserOnboarding';
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
  const { state, completeOnboarding } = useAppState();
  
  // Show onboarding only if it's first time AND we haven't completed onboarding
  // After completion, is_first_time becomes false
  const shouldShowOnboarding = state.is_first_time;
  
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