import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { LoadingPage } from './components/ui/LoadingSpinner';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { CreateWorkspacePage } from './pages/CreateWorkspacePage';
import { WorkspacePage } from './pages/WorkspacePage';
import { SprintBoardPage } from './pages/SprintBoardPage';

// Layout
import { AppLayout } from './components/layout/AppLayout';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      await useAuthStore.getState().checkAuth();
      setIsLoading(false);
    };
    verifyAuth();
  }, []);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      await useAuthStore.getState().checkAuth();
      setIsLoading(false);
    };
    verifyAuth();
  }, []);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="workspace/create" element={<CreateWorkspacePage />} />
        <Route path="workspace/:workspaceId" element={<WorkspacePage />} />
        <Route path="workspace/:workspaceId/sprint/:sprintId/board" element={<SprintBoardPage />} />
        <Route path="backlog" element={<HomePage />} />
        <Route path="sprints" element={<HomePage />} />
        <Route path="settings" element={<HomePage />} />
        <Route path="profile" element={<HomePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
