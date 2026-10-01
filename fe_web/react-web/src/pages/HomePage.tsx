import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  LayoutDashboard,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Star,
  FolderKanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { workspaceService } from '@/services/workspaceService';
import { ANIMATION_DURATION, EASING, staggerContainerVariants } from '@/lib/animations';

interface HomePageProps {
  onCreateWorkspace?: () => void;
}

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

export function HomePage({ onCreateWorkspace }: HomePageProps) {
  const navigate = useNavigate();
  const handleCreateWorkspace = () => onCreateWorkspace?.() ?? navigate('/workspace/create');

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getWorkspaces(),
  });

  const handleWorkspaceClick = (workspaceId: string) => {
    navigate(`/workspace/${workspaceId}`);
  };

  return (
    <div className="flex-1 overflow-auto bg-white">
      {/* Header */}
      <motion.div
        className="border-b border-gray-200 px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ANIMATION_DURATION.page, ease: EASING.easeOut }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#172B4D]">For you</h1>
            <p className="text-sm text-[#5E6C84] mt-1">Welcome back! Here&apos;s what&apos;s happening.</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: ANIMATION_DURATION.fast }}
          >
            <Button onClick={handleCreateWorkspace}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        className="p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Quick Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={itemVariants}
        >
          <Card>
            <CardContent className="p-4">
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ x: 4 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LayoutDashboard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#172B4D]">{workspaces.length}</p>
                  <p className="text-xs text-[#5E6C84]">Active Workspaces</p>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ x: 4 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#172B4D]">12</p>
                  <p className="text-xs text-[#5E6C84]">Completed Tasks</p>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ x: 4 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#172B4D]">8</p>
                  <p className="text-xs text-[#5E6C84]">In Progress</p>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ x: 4 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Star className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#172B4D]">5</p>
                  <p className="text-xs text-[#5E6C84]">Starred Items</p>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Workspaces */}
        <motion.div className="mb-8" variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#172B4D]">Recent Workspaces</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/recent')}>
              View all
            </Button>
          </div>

          {isLoading ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
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
          ) : workspaces.length === 0 ? (
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
                    <FolderKanban className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-[#172B4D] mb-2">No workspaces yet</h3>
                  <p className="text-sm text-[#5E6C84] mb-4">
                    Create your first workspace to get started
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                  >
                    <Button onClick={handleCreateWorkspace}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workspace
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {workspaces.slice(0, 6).map((ws, index) => (
                <motion.div
                  key={ws.id}
                  variants={itemVariants}
                  custom={index}
                >
                  <Card
                    className="cursor-pointer"
                    onClick={() => handleWorkspaceClick(ws.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="h-10 w-10 rounded flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: getAvatarColor(ws.name) }}
                          whileHover={{ rotate: 5, scale: 1.1 }}
                          transition={{ duration: ANIMATION_DURATION.fast }}
                        >
                          {getInitials(ws.name)}
                        </motion.div>
                        <CardTitle className="text-base">{ws.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-[#5E6C84] line-clamp-2">
                        {ws.description || 'No description'}
                      </p>
                      <motion.div
                        className="flex items-center gap-4 mt-3 text-xs text-[#5E6C84]"
                        whileHover={{ x: 2 }}
                        transition={{ duration: ANIMATION_DURATION.fast }}
                      >
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> 0 tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> 1 member
                        </span>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Upcoming */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#172B4D]">Upcoming</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/plans')}>
              View all
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  { icon: Calendar, color: '[#0052CC]', text: 'Sprint Planning', time: 'Tomorrow' },
                  { icon: CheckCircle, color: 'green-600', text: 'Review Q4 Goals', time: 'Next week' },
                  { icon: Users, color: 'purple-600', text: 'Team Retrospective', time: 'In 2 weeks' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-md cursor-pointer"
                    whileHover={{ backgroundColor: 'rgb(249, 250, 251)' }}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                  >
                    <item.icon className={`h-4 w-4 text-${item.color}`} />
                    <span className="text-sm text-[#172B4D]">{item.text}</span>
                    <motion.span
                      className="text-xs text-[#5E6C84] ml-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                    >
                      {item.time}
                    </motion.span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

const avatarColors = [
  '#0052CC',
  '#DE350B',
  '#008DA6',
  '#403294',
  '#FF991F',
];

const getAvatarColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name: string): string => {
  if (!name.trim()) return '';
  return name.trim()[0].toUpperCase();
};
