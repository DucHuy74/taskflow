import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { HomeLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAppSelector } from '@/hooks/useAppDispatch';
import { Skeleton } from '@/components/ui/skeleton';
import { ANIMATION_DURATION } from '@/lib/animations';
import { motion } from 'framer-motion';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const CreateWorkspace = lazy(() => import('@/pages/CreateWorkspace').then(m => ({ default: m.CreateWorkspace })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const BacklogPage = lazy(() => import('@/pages/BacklogPage').then(m => ({ default: m.BacklogPage })));
const SprintPage = lazy(() => import('@/pages/SprintPage').then(m => ({ default: m.SprintPage })));
const InviteToProject = lazy(() => import('@/pages/InviteToProject').then(m => ({ default: m.InviteToProject })));
const SprintGraphPage = lazy(() => import('@/pages/SprintGraphPage').then(m => ({ default: m.SprintGraphPage })));

// Loading fallback component
function PageLoader() {
  return (
    <motion.div
      className="flex items-center justify-center h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: ANIMATION_DURATION.normal }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <Skeleton className="h-4 w-32" />
      </div>
    </motion.div>
  );
}

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

// Route with lazy loading and suspense with error boundary
function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <AuthRoute>
        <LazyRoute>
          <LoginPage />
        </LazyRoute>
      </AuthRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <AuthRoute>
        <LazyRoute>
          <RegisterPage />
        </LazyRoute>
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
        element: (
          <LazyRoute>
            <HomePage />
          </LazyRoute>
        ),
      },
      {
        path: 'workspace/create',
        element: (
          <LazyRoute>
            <CreateWorkspace />
          </LazyRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <LazyRoute>
            <Settings />
          </LazyRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <LazyRoute>
            <Profile />
          </LazyRoute>
        ),
      },
      {
        path: 'recent',
        element: (
          <LazyRoute>
            <HomePage />
          </LazyRoute>
        ),
      },
      {
        path: 'starred',
        element: (
          <LazyRoute>
            <HomePage />
          </LazyRoute>
        ),
      },
      {
        path: 'apps',
        element: (
          <LazyRoute>
            <HomePage />
          </LazyRoute>
        ),
      },
      {
        path: 'plans',
        element: (
          <LazyRoute>
            <HomePage />
          </LazyRoute>
        ),
      },
      {
        path: 'workspace/:workspaceId',
        element: (
          <LazyRoute>
            <DashboardPage />
          </LazyRoute>
        ),
      },
      {
        path: 'workspace/:workspaceId/invite',
        element: (
          <LazyRoute>
            <InviteToProject />
          </LazyRoute>
        ),
      },
      {
        path: 'workspace/:workspaceId/backlog',
        element: (
          <LazyRoute>
            <BacklogPage />
          </LazyRoute>
        ),
      },
      {
        path: 'workspace/:workspaceId/sprint',
        element: (
          <LazyRoute>
            <SprintPage />
          </LazyRoute>
        ),
      },
      {
        path: 'workspace/:workspaceId/sprint/:sprintId',
        element: (
          <LazyRoute>
            <SprintPage />
          </LazyRoute>
        ),
      },
      {
        path: 'workspace/:workspaceId/sprint/:sprintId/graph',
        element: (
          <LazyRoute>
            <SprintGraphPage />
          </LazyRoute>
        ),
      },
      {
        path: 'projects',
        children: [
          { index: true, element: <LazyRoute><DashboardPage /></LazyRoute> },
          { path: ':projectId', element: <LazyRoute><DashboardPage /></LazyRoute> },
        ],
      },
      {
        path: 'tasks',
        children: [
          { index: true, element: <LazyRoute><DashboardPage /></LazyRoute> },
          { path: ':taskId', element: <LazyRoute><DashboardPage /></LazyRoute> },
        ],
      },
      {
        path: 'recommended/:itemId',
        element: <LazyRoute><DashboardPage /></LazyRoute>,
      },
      {
        path: 'assets',
        element: <LazyRoute><DashboardPage /></LazyRoute>,
      },
      {
        path: 'teams',
        element: <LazyRoute><DashboardPage /></LazyRoute>,
      },
      {
        path: 'feedback',
        element: <LazyRoute><DashboardPage /></LazyRoute>,
      },
      {
        path: 'filters',
        element: <LazyRoute><DashboardPage /></LazyRoute>,
      },
      {
        path: 'dashboards',
        element: <LazyRoute><DashboardPage /></LazyRoute>,
      },
      {
        path: 'operations',
        element: <LazyRoute><DashboardPage /></LazyRoute>,
      },
      {
        path: 'customers',
        element: <LazyRoute><DashboardPage /></LazyRoute>,
      },
      {
        path: 'customer-experiences',
        element: <LazyRoute><DashboardPage /></LazyRoute>,
      },
    ],
  },
]);
