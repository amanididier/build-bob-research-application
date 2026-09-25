import React, { createContext, useContext, useState } from 'react';

export type AppPage =
  | 'home'
  | 'research'
  | 'notes'
  | 'tasks'
  | 'chrome'
  | 'settings'
  | 'profile'
  | 'notifications'
  | 'diagnostics';

export type ResearchSubView = 'chat' | 'summary' | 'tabs' | 'tasks';

export interface ResearchProjectItem {
  id: string;
  title: string;
  sourceCount: number;
  openTasks: number;
  status: string;
  dotColor: string;
  summary: string;
}

export interface ResearchTaskItem {
  id: string;
  title: string;
  dueDate: string;
  sourceConnection: string;
  completed: boolean;
  projectId: string;
}

export interface ResearchNoteItem {
  id: string;
  title: string;
  selectedText: string;
  sourceTitle: string;
  sourceUrl: string;
  projectId: string;
  relevance: number;
  color: 'emerald' | 'blue' | 'yellow' | 'red';
  createdAt: string;
}

export interface ThinkingState {
  show: boolean;
  title: string;
  sub: string;
  step: string;
}

interface AppContextType {
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;
  researchSubView: ResearchSubView;
  setResearchSubView: (view: ResearchSubView) => void;
  activeResearchId: string;
  setActiveResearchId: (id: string) => void;
  isSidebarClosed: boolean;
  setIsSidebarClosed: (closed: boolean) => void;
  toggleSidebar: () => void;

  // Modals & Popovers
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isAddFilesOpen: boolean;
  setIsAddFilesOpen: (open: boolean) => void;
  isBridgeOpen: boolean;
  setIsBridgeOpen: (open: boolean) => void;
  isTabPickerOpen: boolean;
  setIsTabPickerOpen: (open: boolean) => void;
  isToolsMenuOpen: boolean;
  setIsToolsMenuOpen: (open: boolean) => void;
  isChromeModalOpen: boolean;
  setIsChromeModalOpen: (open: boolean) => void;
  openChromeBridge: () => void;

  // First-launch Onboarding
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  startOnboarding: () => void;
  finishOnboarding: () => void;
  userName: string;
  setUserName: (name: string) => void;

  // Subtopic View
  activeSubtopic: { open: boolean; title: string; parentId: string } | null;
  openSubtopic: (title: string) => void;
  closeSubtopic: () => void;

  // Thinking Toast
  thinkingState: ThinkingState;
  triggerThinking: (title: string, sub: string, step: string, callback?: () => void) => void;
  closeThinking: () => void;

  // Data & State
  projects: ResearchProjectItem[];
  tasks: ResearchTaskItem[];
  notes: ResearchNoteItem[];
  toggleTask: (id: string) => void;
  addNote: (note: Omit<ResearchNoteItem, 'id' | 'createdAt'>) => void;
  unreadNotifications: number;
  markNotificationsRead: () => void;
  
  // Navigation helper
  navigateTo: (page: AppPage, subView?: ResearchSubView, projectId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [researchSubView, setResearchSubView] = useState<ResearchSubView>('chat');
  const [activeResearchId, setActiveResearchId] = useState<string>('ai-companion');
  const [isSidebarClosed, setIsSidebarClosed] = useState<boolean>(false);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAddFilesOpen, setIsAddFilesOpen] = useState<boolean>(false);
  const [isBridgeOpen, setIsBridgeOpen] = useState<boolean>(false);
  const [isTabPickerOpen, setIsTabPickerOpen] = useState<boolean>(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [isChromeModalOpen, setIsChromeModalOpen] = useState<boolean>(false);

  // Onboarding state
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('bob_user_name') || 'Amani';
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem('bob_onboarding_completed') !== 'true';
  });

  const startOnboarding = () => {
    setIsOnboardingOpen(true);
  };

  const finishOnboarding = () => {
    localStorage.setItem('bob_onboarding_completed', 'true');
    localStorage.setItem('bob_user_name', userName);
    setIsOnboardingOpen(false);
  };

  const openChromeBridge = () => {
    setIsChromeModalOpen(true);
  };

  // Subtopic
  const [activeSubtopic, setActiveSubtopic] = useState<{ open: boolean; title: string; parentId: string } | null>(null);

  // Thinking Toast
  const [thinkingState, setThinkingState] = useState<ThinkingState>({
    show: false,
    title: 'Bob is thinking',
    sub: 'Connecting your research...',
    step: 'Reading connected context',
  });

  const [unreadNotifications, setUnreadNotifications] = useState(3);

  // Seed projects
  const [projects] = useState<ResearchProjectItem[]>([
    {
      id: 'ai-companion',
      title: 'AI research companion',
      sourceCount: 12,
      openTasks: 3,
      status: 'active today',
      dotColor: '#f4bc18',
      summary: 'Cross-browser context synthesis and automated friction discovery.',
    },
    {
      id: 'urugendo',
      title: 'Urugendo transport study',
      sourceCount: 9,
      openTasks: 1,
      status: 'summary ready',
      dotColor: '#4385f5',
      summary: 'Passenger booking friction analysis and market validation.',
    },
    {
      id: 'bob-startup',
      title: 'Bob AI startup study',
      sourceCount: 7,
      openTasks: 2,
      status: '2 open tasks',
      dotColor: '#8b5cf6',
      summary: 'Local small language models running offline with browser bridge.',
    },
  ]);

  // Seed Tasks
  const [tasks, setTasks] = useState<ResearchTaskItem[]>([
    {
      id: 't-1',
      title: 'Validate the core problem',
      dueDate: 'Today · 8:00 PM',
      sourceConnection: 'Connected to 5 sources',
      completed: false,
      projectId: 'urugendo',
    },
    {
      id: 't-2',
      title: 'Write problem statement',
      dueDate: 'Today · 8:00 PM',
      sourceConnection: 'Connected to 3 AI chats',
      completed: true,
      projectId: 'ai-companion',
    },
    {
      id: 't-3',
      title: 'Compare 3 competitors',
      dueDate: 'Tomorrow',
      sourceConnection: 'Connected to 4 tabs',
      completed: false,
      projectId: 'urugendo',
    },
    {
      id: 't-4',
      title: 'Interview 2 potential users',
      dueDate: 'Friday',
      sourceConnection: 'Validate assumption #2',
      completed: false,
      projectId: 'bob-startup',
    },
    {
      id: 't-5',
      title: 'Turn findings into a one-page brief',
      dueDate: 'Friday',
      sourceConnection: 'Bob can draft from summary',
      completed: false,
      projectId: 'ai-companion',
    },
  ]);

  // Seed Notes
  const [notes, setNotes] = useState<ResearchNoteItem[]>([
    {
      id: 'n-1',
      title: 'Booking abandonment friction',
      selectedText:
        'Users often leave booking flows when prices, seat availability, or pickup details are unclear. A useful research workflow should preserve the exact evidence behind these observations instead of only saving a page title.',
      sourceTitle: 'Why people abandon online transport booking',
      sourceUrl: 'research.example.com/transport-booking',
      projectId: 'urugendo',
      relevance: 96,
      color: 'emerald',
      createdAt: 'Today, 10:14 AM',
    },
    {
      id: 'n-2',
      title: 'Sub-400MB Local Inference Allocation',
      selectedText:
        'Sparse attention layers in modern architectures reduce KV-cache memory pressure by up to 60%, allowing local LLMs to run with sub-400MB RAM allocations on consumer PCs.',
      sourceTitle: 'Attention Mechanism Scaling & Sparsity',
      sourceUrl: 'arxiv.org/abs/1706.03762',
      projectId: 'bob-startup',
      relevance: 92,
      color: 'emerald',
      createdAt: 'Yesterday, 3:20 PM',
    },
    {
      id: 'n-3',
      title: 'Cross-tab evidence corroboration',
      selectedText:
        'The strongest evidence appears when several independent sources point to the same friction. Comparing those passages helps a researcher distinguish repeated assumptions from meaningful signals.',
      sourceTitle: 'Transport booking research notes',
      sourceUrl: 'docs.example.com/transport-notes',
      projectId: 'urugendo',
      relevance: 84,
      color: 'blue',
      createdAt: '2 days ago',
    },
  ]);

  const toggleSidebar = () => {
    setIsSidebarClosed((prev) => !prev);
  };

  const triggerThinking = (title: string, sub: string, step: string, callback?: () => void) => {
    setThinkingState({ show: true, title, sub, step });
    setTimeout(() => {
      setThinkingState((prev) => ({ ...prev, step: 'Ready' }));
      setTimeout(() => {
        setThinkingState((prev) => ({ ...prev, show: false }));
        if (callback) callback();
      }, 1200);
    }, 1500);
  };

  const closeThinking = () => {
    setThinkingState((prev) => ({ ...prev, show: false }));
  };

  const openSubtopic = (title: string) => {
    setActiveSubtopic({
      open: true,
      title,
      parentId: activeResearchId,
    });
  };

  const closeSubtopic = () => {
    setActiveSubtopic(null);
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const addNote = (noteData: Omit<ResearchNoteItem, 'id' | 'createdAt'>) => {
    const newNote: ResearchNoteItem = {
      ...noteData,
      id: `n-${Date.now()}`,
      createdAt: 'Just now',
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const markNotificationsRead = () => {
    setUnreadNotifications(0);
  };

  const navigateTo = (page: AppPage, subView?: ResearchSubView, projectId?: string) => {
    setCurrentPage(page);
    if (subView) setResearchSubView(subView);
    if (projectId) setActiveResearchId(projectId);
    // close modals upon navigation
    setIsSearchOpen(false);
    setIsToolsMenuOpen(false);
    setIsBridgeOpen(false);
    setIsAddFilesOpen(false);
    setIsTabPickerOpen(false);
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        researchSubView,
        setResearchSubView,
        activeResearchId,
        setActiveResearchId,
        isSidebarClosed,
        setIsSidebarClosed,
        toggleSidebar,

        isSearchOpen,
        setIsSearchOpen,
        isAddFilesOpen,
        setIsAddFilesOpen,
        isBridgeOpen,
        setIsBridgeOpen,
        isTabPickerOpen,
        setIsTabPickerOpen,
        isToolsMenuOpen,
        setIsToolsMenuOpen,
        isChromeModalOpen,
        setIsChromeModalOpen,
        openChromeBridge,

        isOnboardingOpen,
        setIsOnboardingOpen,
        startOnboarding,
        finishOnboarding,
        userName,
        setUserName,

        activeSubtopic,
        openSubtopic,
        closeSubtopic,

        thinkingState,
        triggerThinking,
        closeThinking,

        projects,
        tasks,
        notes,
        toggleTask,
        addNote,
        unreadNotifications,
        markNotificationsRead,
        navigateTo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
