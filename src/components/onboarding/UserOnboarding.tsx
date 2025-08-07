import React, { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import './UserOnboarding.css';

interface UserOnboardingProps {
  onComplete: () => void;
}

const UserOnboarding: React.FC<UserOnboardingProps> = ({ onComplete }) => {
  const { addOrganization, updateWorkspace, setUserInfo, state } = useAppState();
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    workspaceName: 'My Workspace'
  });
  const [orgData, setOrgData] = useState({
    name: 'Personal',
    color: '#3b82f6'
  });
  const [isCompleting, setIsCompleting] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');

  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
    '#ec4899', '#6366f1', '#14b8a6', '#eab308'
  ];

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUserSubmit = () => {
    if (!userData.name.trim() || !userData.email.trim() || !isValidEmail(userData.email.trim())) {
      return;
    }
    
    // Save user info
    const userInfo = {
      name: userData.name.trim(),
      email: userData.email.trim(),
      workspace_name: userData.workspaceName.trim(),
      created_at: Date.now()
    };
    
    setUserInfo(userInfo);
    
    // Update workspace name if provided
    if (userData.workspaceName.trim()) {
      const currentWorkspace = state.workspaces[state.active_workspace];
      updateWorkspace({
        ...currentWorkspace,
        name: userData.workspaceName.trim(),
        description: `${userData.name}'s workspace`
      });
    }
    
    setStep(2);
  };

  const handleOrgSubmit = () => {
    if (!orgData.name.trim()) return;

    const newOrg = {
      id: Date.now().toString(),
      name: orgData.name.trim(),
      color: orgData.color,
      repositories: [],
      settings: {
        auto_fetch_interval: 5,
        auto_group_by_domain: true,
        default_branch_protection: false,
        notification_preferences: {
          pull_requests: true,
          merge_conflicts: true,
          sync_errors: true,
          build_status: false,
          mentions: true
        }
      },
      created_at: Date.now(),
      updated_at: Date.now()
    };

    addOrganization(newOrg);
    setStep(3);
  };

  const handleComplete = async () => {
    if (isCompleting) return;
    
    setIsCompleting(true);
    setDebugMessage('🚀 Starting completion process...');
    
    try {
      setDebugMessage('📞 Calling onComplete function...');
      
      if (typeof onComplete !== 'function') {
        setDebugMessage('❌ onComplete is not a function!');
        return;
      }
      
      const result = onComplete();
      
      if (result && typeof result.then === 'function') {
        setDebugMessage('⏳ Waiting for completion...');
        await result;
        setDebugMessage('✅ Completion successful!');
      } else {
        setDebugMessage('✅ Completion called successfully!');
      }
      
      // Give user time to see the success message
      setTimeout(() => {
        setDebugMessage('');
        setIsCompleting(false);
      }, 2000);
      
    } catch (error: any) {
      setDebugMessage(`❌ Error: ${error?.message || 'Unknown error'}`);
      setIsCompleting(false);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <div className="app-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1>Welcome to CodeGit</h1>
          <div className="step-indicator">
            <span className={step >= 1 ? 'active' : ''}>1</span>
            <span className={step >= 2 ? 'active' : ''}>2</span>
            <span className={step >= 3 ? 'active' : ''}>3</span>
          </div>
        </div>

        <div className="onboarding-content">
          {step === 1 && (
            <div className="step-content">
              <h2>Let's get you started</h2>
              <p>Tell us a bit about yourself to personalize your experience</p>
              
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  value={userData.name}
                  onChange={(e) => setUserData({...userData, name: e.target.value})}
                  placeholder="Enter your full name"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={userData.email}
                  onChange={(e) => setUserData({...userData, email: e.target.value})}
                  placeholder="your.email@example.com"
                  className={userData.email.trim() && !isValidEmail(userData.email.trim()) ? 'error' : ''}
                />
                {userData.email.trim() && !isValidEmail(userData.email.trim()) && (
                  <span className="error-message">Please enter a valid email address</span>
                )}
              </div>

              <div className="form-group">
                <label>Workspace Name (Optional)</label>
                <input
                  type="text"
                  value={userData.workspaceName}
                  onChange={(e) => setUserData({...userData, workspaceName: e.target.value})}
                  placeholder="My Workspace"
                />
              </div>

              <button 
                className="next-button"
                onClick={handleUserSubmit}
                disabled={!userData.name.trim() || !userData.email.trim() || !isValidEmail(userData.email.trim())}
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <h2>Create your first organization</h2>
              <p>Organizations help you group related repositories together</p>
              
              <div className="form-group">
                <label>Organization Name</label>
                <input
                  type="text"
                  value={orgData.name}
                  onChange={(e) => setOrgData({...orgData, name: e.target.value})}
                  placeholder="Personal, Work, etc."
                />
              </div>

              <div className="form-group">
                <label>Choose a Color</label>
                <div className="color-picker">
                  {predefinedColors.map(color => (
                    <button
                      key={color}
                      className={`color-option ${orgData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setOrgData({...orgData, color})}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="button-group">
                <button 
                  className="back-button"
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>
                <button 
                  className="next-button"
                  onClick={handleOrgSubmit}
                  disabled={!orgData.name.trim()}
                >
                  Create Organization →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content final">
              <div className="success-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h2>You're all set!</h2>
              <p>Your workspace is ready. Now you can discover and add Git repositories.</p>
              
              <div className="next-steps">
                <div className="next-step">
                  <span className="step-number">1</span>
                  <div>
                    <strong>Discover Repositories</strong>
                    <p>Find existing Git repositories on your system</p>
                  </div>
                </div>
                <div className="next-step">
                  <span className="step-number">2</span>
                  <div>
                    <strong>Clone Projects</strong>
                    <p>Clone repositories from GitHub, GitLab, or other sources</p>
                  </div>
                </div>
                <div className="next-step">
                  <span className="step-number">3</span>
                  <div>
                    <strong>Start Working</strong>
                    <p>Manage your Git workflow with CodeGit's powerful tools</p>
                  </div>
                </div>
              </div>

              {debugMessage && (
                <div style={{
                  background: debugMessage.includes('❌') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid',
                  borderColor: debugMessage.includes('❌') ? '#ef4444' : '#3b82f6',
                  color: debugMessage.includes('❌') ? '#ef4444' : '#3b82f6',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  {debugMessage}
                </div>
              )}

              <div className="button-group">
                <button 
                  className="back-button"
                  onClick={() => setStep(2)}
                  disabled={isCompleting}
                >
                  ← Back
                </button>
                <button 
                  className="finish-button"
                  onClick={handleComplete}
                  disabled={isCompleting}
                >
                  {isCompleting ? 'Processing...' : 'Get Started 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserOnboarding;