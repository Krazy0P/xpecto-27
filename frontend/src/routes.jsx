import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Route-level code splitting
const About = lazy(() => import('./pages/About'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Workshops = lazy(() => import('./pages/Workshops'));
const Mess = lazy(() => import('./pages/Mess'));
const Auth = lazy(() => import('./pages/Auth'));
const Sponsors = lazy(() => import('./pages/Sponsors'));
const Team = lazy(() => import('./pages/Team'));
const MyRegistrations = lazy(() => import('./pages/MyRegistrations'));
const Admin = lazy(() => import('./pages/admin/Admin'));

export default function AppRoutes({ location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<About />} />
      <Route path="/events" element={<Events />} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path="/workshops" element={<Workshops />} />
      <Route path="/sponsors" element={<Sponsors />} />
      <Route path="/team" element={<Team />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/mess" element={<Mess />} />{/* browsing is public; payment requires login */}
      <Route path="/me" element={<ProtectedRoute><MyRegistrations /></ProtectedRoute>} />
      <Route path="/admin/*" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
