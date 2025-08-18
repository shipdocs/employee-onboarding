import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { CacheProvider } from '@emotion/react';
import { emotionCache } from './utils/emotionCache';
import App from './App';
import './index.css';

// Force rebuild v2.0.1 - ensure new build hash
// console.log('🚀 [BUILD] App starting v2.0.1 - TrainingContentEditor integration');

// Service Worker Registration for Offline Functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        // console.log('🚢 [SW] Service Worker registered successfully:', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                // console.log('🚢 [SW] New service worker available');
                // Could show update notification here
              }
            });
          }
        });
      })
      .catch(registrationError => {
        // console.error('🚢 [SW] Service Worker registration failed:', registrationError);
      });
  });
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CacheProvider value={emotionCache}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
          <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff'
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff'
              }
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff'
              }
            }
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
    </CacheProvider>
  </React.StrictMode>
);
