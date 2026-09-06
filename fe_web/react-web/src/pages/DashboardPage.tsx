import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckCircle,
  Clock,
  ArrowRight,
  ListTodo,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { workspaceService } from '@/services/workspaceService';
import { backlogService } from '@/services/backlogService';
import { sprintService } from '@/services/sprintService';
import { ANIMATION_DURATION, EASING, staggerContainerVariants } from '@/lib/animations';
import type { Workspace } from '@/types/workspace';
import type { Sprint } from '@/types/sprint';

const containerVariants = {
  ...staggerContainerVariants,
  visible: {
    ...staggerContainerVariants.visible,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut,
    },
  },
};

export function DashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  if (!workspaceId) {
    return <Navigate to="/" replace />;
  }

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceService.getWorkspace(workspaceId) as Promise<Workspace>,
    initialData: undefined,
  });

  const { data: backlogStories = [], isLoading: backlogLoading } = useQuery({
    queryKey: ['backlog-stories', workspaceId],
    queryFn: () => backlogService.getBacklogStories(workspaceId),
  });

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery<Sprint[]>({
    queryKey: ['sprints', workspaceId],
    queryFn: () => sprintService.getSprints(workspaceId),
  });

  const activeSprints = sprints.filter((s) => s.status === 'InProgress');
  const completedSprints = sprints.filter((s) => s.status === 'Completed');
  const todoSprints = sprints.filter((s) => s.status === 'ToDo');

  const isLoading = workspaceLoading || backlogLoading || sprintsLoading;

  return (
    <motion.div
      className="flex-1 overflow-auto bg-gray-50"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div
        className="bg-white border-b border-gray-200 px-6 py-4"
        variants={{
          hidden: { opacity: 0, y: -20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: ANIMATION_DURATION.page,
              ease: EASING.easeOut,
            },
          },
        }}
      >
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: ANIMATION_DURATION.normal }}
          >
            <h1 className="text-2xl font-bold text-[#172B4D]">{workspace?.name}</h1>
            <p className="text-sm text-[#5E6C84] mt-1">
              {workspace?.description || 'No description'}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Content */}
      <div className="p-6">
        {/* Quick Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={itemVariants}
        >
          {[
            { icon: ListTodo, color: 'blue', value: backlogStories.length, label: 'Backlog Items' },
            { icon: CheckCircle, color: 'green', value: completedSprints.length, label: 'Completed Sprints' },
            { icon: Clock, color: 'orange', value: activeSprints.length, label: 'Active Sprints' },
            { icon: Calendar, color: 'purple', value: todoSprints.length, label: 'Planned Sprints' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <motion.div
                  className="flex items-center gap-3"
                  whileHover={{ x: 4 }}
                  transition={{ duration: ANIMATION_DURATION.fast }}
                >
                  <div className={`p-2 bg-${stat.color}-100 rounded-lg`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#172B4D]">{stat.value}</p>
                    <p className="text-xs text-[#5E6C84]">{stat.label}</p>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                Backlog
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#5E6C84] mb-4">
                Manage your backlog and create user stories.
              </p>
              <Link to={`/workspace/${workspaceId}/backlog`}>
                <Button variant="outline" className="w-full">
                  Open Backlog
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Sprints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#5E6C84] mb-4">
                Plan and execute sprints.
              </p>
              <Link to={`/workspace/${workspaceId}/backlog`}>
                <Button variant="outline" className="w-full">
                  View Sprints
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Sprints
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sprintsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sprints.length === 0 ? (
                <p className="text-sm text-[#5E6C84] text-center py-4">
                  No sprints yet. Create your first sprint in the backlog.
                </p>
              ) : (
                <div className="space-y-3">
                  {sprints.slice(0, 5).map((sprint) => (
                    <motion.div
                      key={sprint.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            sprint.status === 'Completed'
                              ? 'bg-green-500'
                              : sprint.status === 'InProgress'
                              ? 'bg-blue-500'
                              : 'bg-gray-400'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-[#172B4D]">{sprint.name}</p>
                          {sprint.startDate && sprint.endDate && (
                            <p className="text-xs text-[#5E6C84]">
                              {new Date(sprint.startDate).toLocaleDateString()} -{' '}
                              {new Date(sprint.endDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          sprint.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : sprint.status === 'InProgress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {sprint.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
