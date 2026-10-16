import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DesktopWindowHeader } from './DesktopWindowHeader';
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
import { ErrorBoundary } from '../ErrorBoundary';
import { BobOverlayBubble } from '../companion/BobOverlayBubble';
import { RoadmapSheet } from '../roadmap/RoadmapSheet';
import { HomePage } from '../../pages/Home/HomePage';
import { DashboardPage } from '../../pages/Home/DashboardPage';
import { ResearchPage } from '../../pages/Research/ResearchPage';
import { ChatPage } from '../../pages/Chat/ChatPage';
import { NotesPage } from '../../pages/Notes/NotesPage';
import { TasksPage } from '../../pages/Tasks/TasksPage';
import { ChromeSidePanelPage } from '../../pages/Chrome/ChromeSidePanelPage';
import { SettingsPage } from '../../pages/Settings/SettingsPage';
import { ProfilePage } from '../../pages/Profile/ProfilePage';
import { NotificationsPage } from '../../pages/Notifications/NotificationsPage';
import { DiagnosticsPage } from '../../pages/Diagnostics/DiagnosticsPage';

export const AppShell: React.FC = () => {
  const { currentPage, isAuthModalOpen, setIsAuthModalOpen, setUserEmail, setUserName, triggerThinking, activeResearchId, researchSubView } = useApp();

  useEffect(() => {
    const onRoadmapFinished = () => {
      if (localStorage.getItem('bob_guest_mode') !== 'true' ||
          localStorage.getItem('bob_guest_auth_prompted') === 'true') return;
      localStorage.setItem('bob_guest_auth_prompted', 'true');
      setIsAuthModalOpen(true);
    };
    window.addEventListener('bob:roadmap-finished', onRoadmapFinished);
    return () => window.removeEventListener('bob:roadmap-finished', onRoadmapFinished);
  }, [setIsAuthModalOpen]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'dashboard': return <DashboardPage />;
      case 'research': return <ResearchPage />;
      case 'chat': return <ChatPage />;
      case 'notes': return <NotesPage />;
      case 'tasks': return <TasksPage />;
      case 'chrome': return <ChromeSidePanelPage />;
      case 'settings': return <SettingsPage />;
      case 'profile': return <ProfilePage />;
      case 'notifications': return <NotificationsPage />;
      case 'diagnostics': return <DiagnosticsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg)] text-[var(--t)] font-sans select-none">
      <DesktopWindowHeader />
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
          {currentPage !== 'chat' && currentPage !== 'home' && <TopBar />}
          <main className={`flex-1 relative ${currentPage === 'chat' ? 'h-full overflow-hidden' : 'overflow-y-auto'}`}>
            <ErrorBoundary key={`${currentPage}-${activeResearchId}-${researchSubView}`}>
              {renderCurrentPage()}
            </ErrorBoundary>
          </main>
          {currentPage !== 'chat' && currentPage !== 'home' && <BottomComposer />}
        </div>
      </div>
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
          try {
            localStorage.removeItem('bob_guest_mode');
            localStorage.removeItem('bob_guest_chat_count');
            localStorage.removeItem('bob_guest_auth_prompted');
            localStorage.setItem('bob_auth_user', JSON.stringify(user));
          } catch {}
          setUserEmail(user.email);
          setUserName(user.name);
          setIsAuthModalOpen(false);
          triggerThinking('Account Synced', 'You are signed in.', 'Ready');
        }}
      />
      <RoadmapSheet />
      {currentPage === 'chrome' && <BobOverlayBubble />}
    </div>
  );
};
