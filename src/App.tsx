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
  
  // Debug logs
  console.log('🐛 AppContent - is_first_time:', state.is_first_time);
  console.log('🐛 AppContent - user:', state.user);
  console.log('🐛 AppContent - full state:', state);
  
  // Show onboarding if it's first time OR if there's no user data
  const shouldShowOnboarding = state.is_first_time || !state.user || !state.user.name || !state.user.email;
  
  if (shouldShowOnboarding) {
    console.log('👋 Showing onboarding screen');
    return <UserOnboarding onComplete={completeOnboarding} />;
  }
  
  console.log('🏠 Showing main app interface');
  return (
    <div className="app">
      <MainLayout />
    </div>
  );
};

export default App;