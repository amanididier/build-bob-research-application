import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
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
