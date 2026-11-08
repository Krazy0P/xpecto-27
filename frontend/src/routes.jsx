import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Route-level code splitting
const About = lazy(() => import('./pages/About'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Workshops = lazy(() => import('./pages/Workshops'));
const Auth = lazy(() => import('./pages/Auth'));
const Sponsors = lazy(() => import('./pages/Sponsors'));
const Team = lazy(() => import('./pages/Team'));
const CampusAmbassador = lazy(() => import('./pages/CampusAmbassador'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/admin/Admin'));

export default function AppRoutes({ location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<About />} />
      <Route path="/about" element={<About />} />
      <Route path="/events" element={<Events />} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path="/workshops" element={<Workshops />} />
      <Route path="/sponsors" element={<Sponsors />} />
      <Route path="/team" element={<Team />} />
      <Route path="/campus-ambassador" element={<CampusAmbassador />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/me" element={<Navigate to="/profile" replace />} />
      <Route path="/admin/*" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
