import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomComposer } from './BottomComposer';
import { SearchModal } from '../modals/SearchModal';
import { UploadModal } from '../modals/UploadModal';
import { BridgeModal } from '../modals/BridgeModal';
import { TabPickerModal } from '../modals/TabPickerModal';
import { ToolsMenu } from '../modals/ToolsMenu';
import { ThinkingCard } from '../modals/ThinkingCard';
import { ChromeExtensionModal } from '../modals/ChromeExtensionModal';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { AuthModal } from '../modals/AuthModal';

// Pages
import { HomePage } from '../../pages/Home/HomePage';
import { ResearchPage } from '../../pages/Research/ResearchPage';
import { NotesPage } from '../../pages/Notes/NotesPage';
import { TasksPage } from '../../pages/Tasks/TasksPage';
import { ChromeSidePanelPage } from '../../pages/Chrome/ChromeSidePanelPage';
import { SettingsPage } from '../../pages/Settings/SettingsPage';
import { ProfilePage } from '../../pages/Profile/ProfilePage';
import { NotificationsPage } from '../../pages/Notifications/NotificationsPage';
import { DiagnosticsPage } from '../../pages/Diagnostics/DiagnosticsPage';

export const AppShell: React.FC = () => {
  const { currentPage, isAuthModalOpen, setIsAuthModalOpen, triggerThinking } = useApp();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'research':
        return <ResearchPage />;
      case 'notes':
        return <NotesPage />;
      case 'tasks':
        return <TasksPage />;
      case 'chrome':
        return <ChromeSidePanelPage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'diagnostics':
        return <DiagnosticsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[var(--bg)] text-[var(--t)] font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <TopBar />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto relative">
          {renderCurrentPage()}
        </main>

        {/* Bottom Floating Composer */}
        <BottomComposer />
      </div>

      {/* Controlled Popovers & Modals */}
      <ToolsMenu />
      <BridgeModal />
      <UploadModal />
      <TabPickerModal />
      <SearchModal />
      <ThinkingCard />
      <ChromeExtensionModal />
      <OnboardingFlow />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setIsAuthModalOpen(false);
          triggerThinking('Account Synced', `Welcome back, ${user.name}! Workspace synced.`, 'Ready');
        }}
      />
    </div>
  );
};
