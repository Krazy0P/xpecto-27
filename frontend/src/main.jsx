import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './styles/anime.css';
import './styles/animations.css';
import './styles/redesign.css'; // immersive redesign layer (loads last)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MotionConfig reducedMotion="user"><App /></MotionConfig>
        <Toaster position="top-right" toastOptions={{ style: { background: '#120e22', color: '#fff', border: '1px solid #19e6ff' } }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
