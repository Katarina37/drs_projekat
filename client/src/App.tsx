import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components';
import { RealtimeListener } from './components/RealtimeListener';
import { MainLayout, AuthLayout, ProtectedRoute } from './components/layout';
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  FlightsPage,
  MyTicketsPage,
  ProfilePage,
  UsersPage,
  CreateFlightPage,
  AirlinesPage,
  PendingFlightsPage,
  RatingsPage,
  ManagerFlightsPage,
} from './pages';
import { UserRole } from './types';

// Import styles
import './styles/global.css';
import './styles/components.css';
import './styles/layout.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <RealtimeListener />
          <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/flights" element={<FlightsPage />} />
              <Route path="/my-tickets" element={<MyTicketsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Manager Routes */}
              <Route
                path="/create-flight"
                element={
                  <ProtectedRoute roles={[UserRole.MENADZER, UserRole.ADMINISTRATOR]}>
                    <CreateFlightPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-flights"
                element={
                  <ProtectedRoute roles={[UserRole.MENADZER, UserRole.ADMINISTRATOR]}>
                    <ManagerFlightsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/airlines"
                element={
                  <ProtectedRoute roles={[UserRole.MENADZER, UserRole.ADMINISTRATOR]}>
                    <AirlinesPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={[UserRole.ADMINISTRATOR]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pending-flights"
                element={
                  <ProtectedRoute roles={[UserRole.ADMINISTRATOR]}>
                    <PendingFlightsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ratings"
                element={
                  <ProtectedRoute roles={[UserRole.ADMINISTRATOR]}>
                    <RatingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
