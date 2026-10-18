import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { syncGeminiKeyToDesktop } from './lib/ai/keyManager';
import { warmupVoiceEngine } from './lib/voice/startupWarmup';
import { RoadmapSheet } from './components/roadmap/RoadmapSheet';

function GlobalRoadmapController() {
  const [isOpen, setIsOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; context?: string }>).detail || {};
      setGoal(typeof detail.title === 'string' ? detail.title : 'Project Roadmap');
      setContext(typeof detail.context === 'string' ? detail.context : '');
      setIsOpen(true);
    };
    window.addEventListener('bob-open-roadmap', onOpen);
    return () => window.removeEventListener('bob-open-roadmap', onOpen);
  }, []);

  return (
    <RoadmapSheet
      isOpen={isOpen}
      initialGoal={goal}
      initialContext={context}
      onClose={() => setIsOpen(false)}
    />
  );
}

export default function App() {
  useEffect(() => {
    syncGeminiKeyToDesktop();

    // Spec B1: Warm STT & TTS models during boot so first speech turn has zero cold-start latency
    const timer = setTimeout(() => {
      void warmupVoiceEngine();
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <AppProvider>
        <ErrorBoundary>
          <AppShell />
          <GlobalRoadmapController />
        </ErrorBoundary>
      </AppProvider>
    </ThemeProvider>
  );
}
