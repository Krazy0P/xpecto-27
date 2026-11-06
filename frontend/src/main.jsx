import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './styles/anime.css';
import './styles/animations.css';
import './styles/redesign.css';
import './styles/neura.css';
import './styles/spacetime.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MotionConfig reducedMotion="user"><App /></MotionConfig>
        <Toaster position="top-right" toastOptions={{ style: { background: '#120e22', color: '#fff', border: '1px solid #19e6ff' } }} />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
