import React, { useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { syncGeminiKeyToDesktop } from './lib/ai/keyManager';

export default function App() {
  useEffect(() => {
    syncGeminiKeyToDesktop();
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
