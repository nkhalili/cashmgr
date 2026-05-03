import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { ErrorBoundary } from '@cashmgr/ui';
import { ServicesProvider } from './services/services-context';
import { ThemePreferenceProvider } from './contexts/theme-context';

const Root: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemePreferenceProvider>
        <ServicesProvider>
          <App />
        </ServicesProvider>
      </ThemePreferenceProvider>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
