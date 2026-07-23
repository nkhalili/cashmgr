import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { ErrorBoundary } from '@cashmgr/ui';
import { setLogger } from '@cashmgr/core';
import { createWebFileLogger } from './logging/web-file-logger';
import { installGlobalErrorHandlers } from './logging/global-error-handlers';
import { ServicesProvider } from './services/services-context';
import { ThemePreferenceProvider } from './contexts/theme-context';
import { CreditDisplayProvider } from './contexts/credit-display-context';

setLogger(createWebFileLogger());
installGlobalErrorHandlers();

const Root: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemePreferenceProvider>
        <CreditDisplayProvider>
          <ServicesProvider>
            <App />
          </ServicesProvider>
        </CreditDisplayProvider>
      </ThemePreferenceProvider>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
