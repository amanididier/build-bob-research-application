import React, { createContext, useContext, useState, useEffect } from 'react';
import { bobAi, ModelDownloadStatus, AiSynthesisResponse } from '../lib/aiEngine';
import { localMemoryBank, MemoryBankStats } from '../lib/researchMemory';

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
  isAiGenerated?: boolean;
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
  isPolished?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: Array<{ title: string; url?: string; snippet?: string }>;
  modelTier?: string;
  tokensPerSec?: number;
  memoryNodesUsed?: number;
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

  // Auth modal after first response
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;

  // Onboarding
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  startOnboarding: () => void;
  finishOnboarding: () => void;
  userName: string;
  setUserName: (name: string) => void;

  // Focused Subtopic
  activeSubtopic: { open: boolean; title: string; parentId: string } | null;
  openSubtopic: (title: string) => void;
  closeSubtopic: () => void;

  // Thinking State
  thinkingState: ThinkingState;
  triggerThinking: (title: string, sub: string, step: string, callback?: () => void) => void;
  closeThinking: () => void;

  // Dynamic Chat & AI
  messages: ChatMessage[];
  isAiGenerating: boolean;
  sendMessage: (prompt: string) => Promise<void>;
  clearChat: () => void;

  // Local AI Engine & Background Download
  aiDownloadStatus: ModelDownloadStatus;
  startAiDownload: () => void;
  accelerateAiDownload: () => void;

  // Local PC Memory
  memoryStats: MemoryBankStats;
  refreshMemoryStats: () => void;

  // Projects, Tasks & Notes
  projects: ResearchProjectItem[];
  createNewResearchSession: () => string;
  deleteResearchSession: (id: string) => void;
  tasks: ResearchTaskItem[];
  notes: ResearchNoteItem[];
  toggleTask: (id: string) => void;
  addTask: (title: string, dueDate?: string, projectId?: string) => void;
  extractAiTasks: () => Promise<number>;
  addNote: (noteData: Omit<ResearchNoteItem, 'id' | 'createdAt'>) => void;
  polishNote: (id: string) => Promise<void>;

  // Notifications
  unreadNotifications: number;
  markNotificationsRead: () => void;

  // Navigation
  navigateTo: (page: AppPage, subView?: ResearchSubView, projectId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [researchSubView, setResearchSubView] = useState<ResearchSubView>('chat');
  const [activeResearchId, setActiveResearchId] = useState<string>('urugendo');
  const [isSidebarClosed, setIsSidebarClosed] = useState<boolean>(false);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAddFilesOpen, setIsAddFilesOpen] = useState<boolean>(false);
  const [isBridgeOpen, setIsBridgeOpen] = useState<boolean>(false);
  const [isTabPickerOpen, setIsTabPickerOpen] = useState<boolean>(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [isChromeModalOpen, setIsChromeModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Onboarding state
  const [userName, setUserName] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('bob_user_name')) || 'Amani';
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('bob_onboarding_completed') !== 'true';
  });

  // Local AI engine background download tracking
  const [aiDownloadStatus, setAiDownloadStatus] = useState<ModelDownloadStatus>(() => bobAi.getDownloadStatus());
  const [memoryStats, setMemoryStats] = useState<MemoryBankStats>(() => localMemoryBank.getStats());

  useEffect(() => {
    const unsub = bobAi.subscribe((status) => {
      setAiDownloadStatus(status);
    });
    return unsub;
  }, []);

  const startAiDownload = () => {
    bobAi.startBackgroundDownload();
  };

  const accelerateAiDownload = () => {
    bobAi.accelerateToComplete();
  };

  const refreshMemoryStats = () => {
    setMemoryStats(localMemoryBank.getStats());
  };

  const startOnboarding = () => {
    setIsOnboardingOpen(true);
    startAiDownload();
  };

  const finishOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bob_onboarding_completed', 'true');
      localStorage.setItem('bob_user_name', userName);
    }
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
    sub: 'Synthesizing context...',
    step: 'Generating response',
  });

  const [unreadNotifications, setUnreadNotifications] = useState(3);

  // Dynamic Research Sessions with LocalStorage persistence
  const [projects, setProjects] = useState<ResearchProjectItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bob_research_sessions_v3');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: 'urugendo',
        title: 'Urugendo transport study',
        sourceCount: 9,
        openTasks: 3,
        status: 'active today',
        dotColor: '#4385f5',
        summary: 'Passenger booking friction analysis, station dispatching and market validation.',
      }
    ];
  });

  // Dynamic Chat Messages per session
  const [sessionMessages, setSessionMessages] = useState<Record<string, ChatMessage[]>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bob_session_messages_v3');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  const messages = sessionMessages[activeResearchId] || [];
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const createNewResearchSession = (): string => {
    const newId = `session-${Date.now()}`;
    const newSession: ResearchProjectItem = {
      id: newId,
      title: 'New research',
      sourceCount: 0,
      openTasks: 0,
      status: 'active',
      dotColor: '#4385f5',
      summary: 'New research inquiry',
    };

    setProjects((prev) => {
      const updated = [newSession, ...prev];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bob_research_sessions_v3', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    setActiveResearchId(newId);
    setCurrentPage('research');
    setResearchSubView('chat');
    return newId;
  };

  const deleteResearchSession = (id: string) => {
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bob_research_sessions_v3', JSON.stringify(updated));
        } catch {}
      }
      if (activeResearchId === id && updated.length > 0) {
        setActiveResearchId(updated[0].id);
      }
      return updated;
    });
  };

  // Dynamic interactive chat send with automatic title and priority color assignment
  const sendMessage = async (promptText: string) => {
    if (!promptText.trim()) return;

    const currentProject = projects.find((p) => p.id === activeResearchId);
    const isNewSession = !currentProject || currentProject.title === 'New research' || currentProject.title.startsWith('New ');

    // Automatic session title and priority color generation (like ChatGPT / Gemini)
    if (isNewSession) {
      const cleanWords = promptText
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 5)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      const newTitle = cleanWords || 'Research exploration';

      const lower = promptText.toLowerCase();
      let dotColor = '#4385f5'; // blue (analysis/study)
      if (lower.includes('bug') || lower.includes('error') || lower.includes('fail') || lower.includes('fix') || lower.includes('urgent')) {
        dotColor = '#ef4444'; // red (critical/bug)
      } else if (lower.includes('feature') || lower.includes('design') || lower.includes('build') || lower.includes('idea')) {
        dotColor = '#f59e0b'; // amber (product/feature)
      } else if (lower.includes('complete') || lower.includes('summary') || lower.includes('verified')) {
        dotColor = '#10b981'; // green (verified/complete)
      }

      setProjects((prev) => {
        const updated = prev.map((p) => {
          if (p.id === activeResearchId) {
            return { ...p, title: newTitle, dotColor };
          }
          return p;
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('bob_research_sessions_v3', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    }

    const isFirstConversation = (sessionMessages[activeResearchId] || []).filter((m) => m.role === 'assistant').length === 0;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: promptText.trim(),
      timestamp: 'Just now',
    };

    setSessionMessages((prev) => {
      const existing = prev[activeResearchId] || [];
      const updated = { ...prev, [activeResearchId]: [...existing, userMsg] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bob_session_messages_v3', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    setIsAiGenerating(true);

    try {
      const response: AiSynthesisResponse = await bobAi.generateResearchAnswer(
        promptText,
        activeResearchId
      );

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: response.answer,
        timestamp: 'Just now',
        sources: response.sources,
        modelTier: response.modelTier,
        tokensPerSec: response.tokensPerSec,
        memoryNodesUsed: response.memoryNodesUsed,
      };

      setSessionMessages((prev) => {
        const existing = prev[activeResearchId] || [];
        const updated = { ...prev, [activeResearchId]: [...existing, assistantMsg] };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('bob_session_messages_v3', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      // Pop up real Google/Auth sign-in card on first response if user not logged in
      if (isFirstConversation && typeof window !== 'undefined' && !localStorage.getItem('bob_auth_user')) {
        setTimeout(() => {
          setIsAuthModalOpen(true);
        }, 800);
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  const clearChat = () => {
    setSessionMessages((prev) => {
      const updated = { ...prev, [activeResearchId]: [] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bob_session_messages_v3', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  // Seed Tasks
  const [tasks, setTasks] = useState<ResearchTaskItem[]>([
    {
      id: 't-1',
      title: 'Validate the core problem with 2 users',
      dueDate: 'Today · 8:00 PM',
      sourceConnection: 'Connected to 5 sources',
      completed: false,
      projectId: 'urugendo',
    },
    {
      id: 't-2',
      title: 'Write problem statement on checkout friction',
      dueDate: 'Today · 8:00 PM',
      sourceConnection: 'Connected to 3 AI chats',
      completed: true,
      projectId: 'urugendo',
    },
    {
      id: 't-3',
      title: 'Compare 3 competitor ticket dispatch apps',
      dueDate: 'Tomorrow',
      sourceConnection: 'Connected to 4 tabs',
      completed: false,
      projectId: 'urugendo',
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
      }, 700);
    }, 900);
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

  const addTask = (title: string, dueDate: string = 'Today', projectId: string = activeResearchId) => {
    if (!title.trim()) return;
    const newTask: ResearchTaskItem = {
      id: `t-${Date.now()}`,
      title: title.trim(),
      dueDate,
      sourceConnection: 'Created by user',
      completed: false,
      projectId,
      isAiGenerated: false,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const extractAiTasks = async (): Promise<number> => {
    triggerThinking('Extracting tasks', 'Analyzing evidence...', 'Generating checklist items');
    const suggestions = await bobAi.extractTasksFromContext(activeResearchId);

    const newTasks: ResearchTaskItem[] = suggestions.map((s, idx) => ({
      id: `ai-t-${Date.now()}-${idx}`,
      title: s.title,
      dueDate: s.dueDate,
      sourceConnection: s.sourceConnection,
      completed: false,
      projectId: activeResearchId,
      isAiGenerated: true,
    }));

    setTasks((prev) => [...newTasks, ...prev]);
    return newTasks.length;
  };

  const addNote = (noteData: Omit<ResearchNoteItem, 'id' | 'createdAt'>) => {
    const newNote: ResearchNoteItem = {
      ...noteData,
      id: `n-${Date.now()}`,
      createdAt: 'Just now',
    };
    setNotes((prev) => [newNote, ...prev]);

    localMemoryBank.addMemory({
      type: 'note',
      title: newNote.title,
      content: newNote.selectedText,
      sourceUrl: newNote.sourceUrl,
      projectId: newNote.projectId,
      tags: ['notebook', newNote.color],
      relevanceWeight: newNote.relevance / 100,
    });
    refreshMemoryStats();
  };

  const polishNote = async (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;

    triggerThinking('Polishing Note', 'Structuring takeaways and findings...', 'Formatting');
    const polished = await bobAi.polishResearchNote(target.title, target.selectedText);

    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              title: polished.polishedTitle,
              selectedText: polished.polishedContent,
              relevance: 98,
              isPolished: true,
            }
          : n
      )
    );
  };

  const markNotificationsRead = () => {
    setUnreadNotifications(0);
  };

  const navigateTo = (page: AppPage, subView?: ResearchSubView, projectId?: string) => {
    setCurrentPage(page);
    if (subView) setResearchSubView(subView);
    if (projectId) setActiveResearchId(projectId);
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
        isAuthModalOpen,
        setIsAuthModalOpen,
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
        messages,
        isAiGenerating,
        sendMessage,
        clearChat,
        aiDownloadStatus,
        startAiDownload,
        accelerateAiDownload,
        memoryStats,
        refreshMemoryStats,
        projects,
        tasks,
        notes,
        toggleTask,
        addTask,
        extractAiTasks,
        addNote,
        polishNote,
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
