import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Catch any promise rejections that escape application-level try/catch so they
// never surface as uncaught runtime errors in the console.
window.addEventListener('unhandledrejection', (e) => {
  e.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
