import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckCircle,
  Clock,
  Users,
  ArrowRight,
  ListTodo,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { workspaceService } from '@/services/workspaceService';
import { getBacklogStories } from '@/services/backlogService';
import { getSprints } from '@/services/sprintService';
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
    queryFn: () => getBacklogStories(workspaceId),
  });

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery<Sprint[]>({
    queryKey: ['sprints', workspaceId],
    queryFn: () => getSprints(workspaceId),
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

        {/* Navigation Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
          variants={itemVariants}
        >
          {/* Backlog Card */}
          <Card className="cursor-pointer">
            <Link to={`/workspace/${workspaceId}/backlog`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-blue-600" />
                    Backlog
                  </CardTitle>
                  <motion.div
                    whileHover={{ x: 4 }}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                  >
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#5E6C84] mb-3">
                  Manage user stories and plan sprints
                </p>
                <div className="flex items-center gap-4 text-xs text-[#5E6C84]">
                  <span className="flex items-center gap-1">
                    <ListTodo className="h-3 w-3" />
                    {backlogStories.length} items
                  </span>
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* Sprints Card */}
          <Card className="cursor-pointer">
            <Link to={`/workspace/${workspaceId}/sprint`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    Sprints
                  </CardTitle>
                  <motion.div
                    whileHover={{ x: 4 }}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                  >
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#5E6C84] mb-3">
                  View and manage active sprints
                </p>
                <div className="flex items-center gap-4 text-xs text-[#5E6C84]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {activeSprints.length} active
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {completedSprints.length} done
                  </span>
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* Team Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Team
                </CardTitle>
                <motion.div
                  whileHover={{ x: 4 }}
                  transition={{ duration: ANIMATION_DURATION.fast }}
                >
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </motion.div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#5E6C84] mb-3">
                Manage team members and roles
              </p>
              <div className="flex items-center gap-4 text-xs text-[#5E6C84]">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  1 member
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sprints List */}
        <motion.div
          className="mb-8"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#172B4D]">Sprints</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/workspace/${workspaceId}/backlog`}>
                View all
              </Link>
            </Button>
          </div>

          {sprintsLoading ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {[1, 2, 3].map((i) => (
                <motion.div key={i} variants={itemVariants}>
                  <Card>
                    <CardContent className="p-4">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : sprints.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            >
              <Card>
                <CardContent className="p-8 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-[#172B4D] mb-2">No sprints yet</h3>
                  <p className="text-sm text-[#5E6C84] mb-4">
                    Create your first sprint in the backlog
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                  >
                    <Button asChild>
                      <Link to={`/workspace/${workspaceId}/backlog`}>
                        Go to Backlog
                      </Link>
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {sprints.slice(0, 6).map((sprint) => (
                <motion.div key={sprint.id} variants={itemVariants}>
                  <Card className="cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-[#172B4D]">{sprint.name}</h3>
                          <motion.span
                            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                              sprint.status === 'InProgress'
                                ? 'bg-blue-100 text-blue-700'
                                : sprint.status === 'Completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1 }}
                          >
                            {sprint.status === 'InProgress' ? 'Active' : sprint.status}
                          </motion.span>
                        </div>
                      </div>
                      {sprint.startDate && sprint.endDate && (
                        <p className="text-xs text-[#5E6C84]">
                          {new Date(sprint.startDate).toLocaleDateString()} -{' '}
                          {new Date(sprint.endDate).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Recent Backlog Items */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#172B4D]">Recent Backlog Items</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/workspace/${workspaceId}/backlog`}>
                View all
              </Link>
            </Button>
          </div>

          {backlogLoading ? (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : backlogStories.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <ListTodo className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-lg font-medium text-[#172B4D] mb-2">No backlog items</h3>
                <p className="text-sm text-[#5E6C84]">
                  Add user stories in the backlog
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {backlogStories.slice(0, 5).map((story, index) => (
                    <motion.div
                      key={story.id}
                      className="flex items-center gap-3 p-2 rounded-md cursor-pointer"
                      whileHover={{ backgroundColor: 'rgb(249, 250, 251)' }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: ANIMATION_DURATION.fast, delay: index * 0.05 }}
                    >
                      <div className="flex-1">
                        <p className="text-sm text-[#172B4D]">{story.storyText}</p>
                        {story.acceptanceCriteria && (
                          <p className="text-xs text-[#5E6C84] mt-1 line-clamp-1">
                            {story.acceptanceCriteria}
                          </p>
                        )}
                      </div>
                      <motion.span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          story.priority === 'High'
                            ? 'bg-red-100 text-red-700'
                            : story.priority === 'Medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        {story.priority || 'Medium'}
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
