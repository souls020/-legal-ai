import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Logger for renderer process
const log = (level: string, message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] [RENDERER] ${message}`);
};

log('INFO', 'Renderer process starting');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

log('INFO', 'Renderer process mounted');
