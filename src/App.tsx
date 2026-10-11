import React, { useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { syncGeminiKeyToDesktop } from './lib/ai/keyManager';
import { warmupVoiceEngine } from './lib/voice/startupWarmup';

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
        </ErrorBoundary>
      </AppProvider>
    </ThemeProvider>
  );
}
