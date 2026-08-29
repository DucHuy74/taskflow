import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomeLayout } from '@/components/layout';
import {
  DashboardPage,
  HomePage,
  CreateWorkspace,
  Settings,
  Profile,
  LoginPage,
  RegisterPage,
  BacklogPage,
  SprintPage,
  InviteToProject,
  SprintGraphPage,
} from '@/pages';
import { useAppSelector } from '@/hooks/useAppDispatch';

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Auth Route wrapper (redirect to dashboard if logged in)
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <AuthRoute>
        <LoginPage />
      </AuthRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <AuthRoute>
        <RegisterPage />
      </AuthRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomeLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'workspace/create',
        element: <CreateWorkspace />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      {
        path: 'recent',
        element: <HomePage />,
      },
      {
        path: 'starred',
        element: <HomePage />,
      },
      {
        path: 'apps',
        element: <HomePage />,
      },
      {
        path: 'plans',
        element: <HomePage />,
      },
      {
        path: 'workspace/:workspaceId',
        element: <DashboardPage />,
      },
      {
        path: 'workspace/:workspaceId/invite',
        element: <InviteToProject />,
      },
      {
        path: 'workspace/:workspaceId/backlog',
        element: <BacklogPage />,
      },
      {
        path: 'workspace/:workspaceId/sprint',
        element: <SprintPage />,
      },
      {
        path: 'workspace/:workspaceId/sprint/:sprintId',
        element: <SprintPage />,
      },
      {
        path: 'workspace/:workspaceId/sprint/:sprintId/graph',
        element: <SprintGraphPage />,
      },
      {
        path: 'projects',
        children: [
          { index: true, element: <DashboardPage /> },
          { path: ':projectId', element: <DashboardPage /> },
        ],
      },
      {
        path: 'tasks',
        children: [
          { index: true, element: <DashboardPage /> },
          { path: ':taskId', element: <DashboardPage /> },
        ],
      },
      {
        path: 'recommended/:itemId',
        element: <DashboardPage />,
      },
      {
        path: 'assets',
        element: <DashboardPage />,
      },
      {
        path: 'teams',
        element: <DashboardPage />,
      },
      {
        path: 'feedback',
        element: <DashboardPage />,
      },
      {
        path: 'filters',
        element: <DashboardPage />,
      },
      {
        path: 'dashboards',
        element: <DashboardPage />,
      },
      {
        path: 'operations',
        element: <DashboardPage />,
      },
      {
        path: 'customers',
        element: <DashboardPage />,
      },
      {
        path: 'customer-experiences',
        element: <DashboardPage />,
      },
    ],
  },
]);
