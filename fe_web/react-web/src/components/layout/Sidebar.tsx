import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  Star,
  Grid2X2,
  Calendar,
  ChevronRight,
  Plus,
  Settings,
  HelpCircle,
  ExternalLink as Open,
  Timeline,
  Filter,
  LayoutDashboard as DashboardIcon,
  Settings2,
  Users,
  Headphones,
  Puzzle,
  Group,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ANIMATION_DURATION, EASING } from '@/lib/animations';
import type { Workspace } from '@/types/workspace';

interface SidebarProps {
  workspaces?: Workspace[];
  onWorkspaceSelect?: (workspaceId: string) => void;
  onCreateWorkspace?: () => void;
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

const navMenuItems = [
  { id: 'foryou', label: 'For you', icon: LayoutDashboard },
  { id: 'recent', label: 'Recent', icon: Clock, hasChevron: true },
  { id: 'starred', label: 'Starred', icon: Star, hasChevron: true },
  { id: 'apps', label: 'Apps', icon: Grid2X2 },
  { id: 'plans', label: 'Plans', icon: Calendar },
];

const recommendedItems = [
  { id: 'roadmap', label: 'Create a roadmap', icon: Timeline, badge: 'TRY' },
  { id: 'filters', label: 'Filters', icon: Filter },
  { id: 'dashboards', label: 'Dashboards', icon: DashboardIcon },
  { id: 'operations', label: 'Operations', icon: Settings2 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'customer-experiences', label: 'Customer experiences', icon: Headphones },
];

const bottomItems = [
  { id: 'assets', label: 'Assets', icon: Puzzle, external: true },
  { id: 'teams', label: 'Teams', icon: Group, external: true },
  { id: 'feedback', label: 'Give feedback on the new...', icon: MessageCircle },
];

export function Sidebar({ workspaces = [], onWorkspaceSelect, onCreateWorkspace }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMoreSpaces, setShowMoreSpaces] = useState(false);
  const location = useLocation();

  const currentPath = location.pathname;
  const selectedMenuId = currentPath === '/' ? 'foryou' : currentPath.slice(1);

  return (
    <motion.aside
      className={cn(
        'relative flex flex-col bg-[#FAFBFC] border-r border-gray-200',
        isCollapsed ? 'w-16' : 'w-60'
      )}
      animate={{ width: isCollapsed ? 64 : 240 }}
      transition={{
        duration: ANIMATION_DURATION.slow,
        ease: EASING.easeInOut,
      }}
    >
      {/* Collapse/Expand Toggle */}
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm',
          'hover:bg-gray-50',
          isCollapsed && 'rotate-180'
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: ANIMATION_DURATION.fast }}
      >
        <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
      </motion.button>

      {/* Logo */}
      <motion.div
        className={cn('h-14 flex items-center border-b border-gray-200', isCollapsed ? 'justify-center px-0' : 'px-4')}
        animate={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        transition={{ duration: ANIMATION_DURATION.slow }}
      >
        <motion.h1
          className={cn('text-xl font-bold text-[#0052CC]')}
          animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.8 : 1 }}
          transition={{ duration: ANIMATION_DURATION.fast }}
        >
          {isCollapsed ? '' : 'TaskFlow'}
        </motion.h1>
        {isCollapsed && (
          <motion.span
            className="text-xl font-bold text-[#0052CC]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: ANIMATION_DURATION.fast }}
          >
            TF
          </motion.span>
        )}
      </motion.div>

      {/* Search - Hidden when collapsed */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className="p-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: ANIMATION_DURATION.normal }}
          >
            <div className="relative">
              <LayoutDashboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                className="pl-9 bg-white border-gray-200 h-9"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* Main Menu Items */}
        <div className="space-y-0.5">
          {navMenuItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.id === 'foryou' ? '/' : `/${item.id}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive || selectedMenuId === item.id
                    ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                    : 'text-[#172B4D] hover:bg-gray-100',
                  isCollapsed && 'justify-center px-0'
                )
              }
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
              </motion.div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    className="flex-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                  >
                    <span className="flex-1">{item.label}</span>
                  </motion.span>
                )}
              </AnimatePresence>
              {!isCollapsed && item.hasChevron && (
                <motion.div
                  animate={{ opacity: 1 }}
                  transition={{ duration: ANIMATION_DURATION.fast }}
                >
                  <ChevronRight className="h-4 w-4 text-[#5E6C84]" />
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>

        {/* Divider */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="h-px bg-gray-200 my-3 mx-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            />
          )}
        </AnimatePresence>

        {/* Spaces Section */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="mb-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            >
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">
                  Spaces
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={onCreateWorkspace}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Workspace List */}
              <div className="space-y-0.5">
                {workspaces.length === 0 ? (
                  <p className="px-6 py-2 text-xs text-gray-400 italic">
                    No workspaces found
                  </p>
                ) : (
                  workspaces.slice(0, showMoreSpaces ? workspaces.length : 5).map((ws) => (
                    <motion.button
                      key={ws.id}
                      onClick={() => onWorkspaceSelect?.(ws.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-1.5 text-sm text-left rounded-md transition-colors',
                        selectedMenuId === ws.id
                          ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                          : 'text-[#172B4D] hover:bg-gray-100'
                      )}
                      whileHover={{ x: 4 }}
                      transition={{ duration: ANIMATION_DURATION.fast }}
                    >
                      <div
                        className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: getAvatarColor(ws.name) }}
                      >
                        {getInitials(ws.name)}
                      </div>
                      <span className="truncate">{ws.name}</span>
                    </motion.button>
                  ))
                )}

                {workspaces.length > 5 && (
                  <motion.button
                    onClick={() => setShowMoreSpaces(!showMoreSpaces)}
                    className="w-full flex items-center gap-3 px-4 py-1.5 text-sm text-[#5E6C84] hover:bg-gray-100 rounded-md transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      animate={{ rotate: showMoreSpaces ? 90 : 0 }}
                      transition={{ duration: ANIMATION_DURATION.fast }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </motion.div>
                    <span>{showMoreSpaces ? 'Less spaces' : 'More spaces'}</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="h-px bg-gray-200 my-3 mx-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            />
          )}
        </AnimatePresence>

        {/* Recommended Section */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            >
              <div className="px-4 py-2">
                <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">
                  Recommended
                </span>
              </div>
              <div className="space-y-0.5">
                {recommendedItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`/recommended/${item.id}`}
                    className={({ isActive }) =>
                      cn(
                        'w-full flex items-center gap-3 px-4 py-1.5 text-sm rounded-md transition-colors',
                        isActive
                          ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                          : 'text-[#172B4D] hover:bg-gray-100'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <motion.span
                        className="px-1.5 py-0.5 bg-[#0052CC] text-white text-[10px] font-semibold rounded"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: ANIMATION_DURATION.fast, delay: 0.2 }}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="h-px bg-gray-200 my-3 mx-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            />
          )}
        </AnimatePresence>

        {/* Bottom Items */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="space-y-0.5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            >
              {bottomItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={`/${item.id}`}
                  className={({ isActive }) =>
                    cn(
                      'w-full flex items-center gap-3 px-4 py-1.5 text-sm rounded-md transition-colors',
                      isActive
                        ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                        : 'text-[#172B4D] hover:bg-gray-100'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.external && <Open className="h-3.5 w-3.5 text-[#5E6C84]" />}
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Bottom Section */}
      <div className={cn('border-t border-gray-200 p-2', isCollapsed && 'flex flex-col items-center')}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                : 'text-[#172B4D] hover:bg-gray-100',
              isCollapsed && 'justify-center px-0 w-10'
            )
          }
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 text-[#172B4D] hover:bg-gray-100',
            isCollapsed && 'justify-center px-0 w-10'
          )}
        >
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                Help
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </motion.aside>
  );
}

// Dark mode variant
export function SidebarDark({ workspaces = [], onWorkspaceSelect, onCreateWorkspace }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMoreSpaces, setShowMoreSpaces] = useState(false);
  const location = useLocation();

  const currentPath = location.pathname;
  const selectedMenuId = currentPath === '/' ? 'foryou' : currentPath.slice(1);

  return (
    <motion.aside
      className={cn(
        'relative flex flex-col bg-[#161B22] border-r border-gray-700',
        isCollapsed ? 'w-16' : 'w-60'
      )}
      animate={{ width: isCollapsed ? 64 : 240 }}
      transition={{
        duration: ANIMATION_DURATION.slow,
        ease: EASING.easeInOut,
      }}
    >
      {/* Collapse/Expand Toggle */}
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-600 bg-[#21262D] shadow-sm',
          'hover:bg-gray-700',
          isCollapsed && 'rotate-180'
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: ANIMATION_DURATION.fast }}
      >
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
      </motion.button>

      {/* Logo */}
      <motion.div
        className={cn('h-14 flex items-center border-b border-gray-700', isCollapsed ? 'justify-center px-0' : 'px-4')}
        animate={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        transition={{ duration: ANIMATION_DURATION.slow }}
      >
        <motion.h1
          className={cn('text-xl font-bold text-white')}
          animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.8 : 1 }}
          transition={{ duration: ANIMATION_DURATION.fast }}
        >
          {isCollapsed ? '' : 'TaskFlow'}
        </motion.h1>
        {isCollapsed && (
          <motion.span
            className="text-xl font-bold text-white"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: ANIMATION_DURATION.fast }}
          >
            TF
          </motion.span>
        )}
      </motion.div>

      {/* Search - Hidden when collapsed */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className="p-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: ANIMATION_DURATION.normal }}
          >
            <div className="relative">
              <LayoutDashboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search..."
                className="pl-9 bg-[#21262D] border-gray-600 text-gray-200 h-9"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* Main Menu Items */}
        <div className="space-y-0.5">
          {navMenuItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.id === 'foryou' ? '/' : `/${item.id}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive || selectedMenuId === item.id
                    ? 'bg-[#1F3A5F] text-[#58A6FF] font-semibold'
                    : 'text-gray-300 hover:bg-[#21262D]',
                  isCollapsed && 'justify-center px-0'
                )
              }
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
              </motion.div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    className="flex-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                  >
                    <span className="flex-1">{item.label}</span>
                  </motion.span>
                )}
              </AnimatePresence>
              {!isCollapsed && item.hasChevron && (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </NavLink>
          ))}
        </div>

        {/* Divider */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="h-px bg-gray-700 my-3 mx-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            />
          )}
        </AnimatePresence>

        {/* Spaces Section */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="mb-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            >
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Spaces
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-gray-400 hover:text-white"
                  onClick={onCreateWorkspace}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Workspace List */}
              <div className="space-y-0.5">
                {workspaces.length === 0 ? (
                  <p className="px-6 py-2 text-xs text-gray-500 italic">
                    No workspaces found
                  </p>
                ) : (
                  workspaces.slice(0, showMoreSpaces ? workspaces.length : 5).map((ws) => (
                    <motion.button
                      key={ws.id}
                      onClick={() => onWorkspaceSelect?.(ws.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-1.5 text-sm text-left rounded-md transition-colors',
                        selectedMenuId === ws.id
                          ? 'bg-[#1F3A5F] text-[#58A6FF] font-semibold'
                          : 'text-gray-300 hover:bg-[#21262D]'
                      )}
                      whileHover={{ x: 4 }}
                      transition={{ duration: ANIMATION_DURATION.fast }}
                    >
                      <div
                        className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: getAvatarColor(ws.name) }}
                      >
                        {getInitials(ws.name)}
                      </div>
                      <span className="truncate">{ws.name}</span>
                    </motion.button>
                  ))
                )}

                {workspaces.length > 5 && (
                  <motion.button
                    onClick={() => setShowMoreSpaces(!showMoreSpaces)}
                    className="w-full flex items-center gap-3 px-4 py-1.5 text-sm text-gray-400 hover:bg-[#21262D] rounded-md transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      animate={{ rotate: showMoreSpaces ? 90 : 0 }}
                      transition={{ duration: ANIMATION_DURATION.fast }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </motion.div>
                    <span>{showMoreSpaces ? 'Less spaces' : 'More spaces'}</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="h-px bg-gray-700 my-3 mx-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            />
          )}
        </AnimatePresence>

        {/* Recommended Section */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            >
              <div className="px-4 py-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Recommended
                </span>
              </div>
              <div className="space-y-0.5">
                {recommendedItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={`/recommended/${item.id}`}
                    className={({ isActive }) =>
                      cn(
                        'w-full flex items-center gap-3 px-4 py-1.5 text-sm rounded-md transition-colors',
                        isActive
                          ? 'bg-[#1F3A5F] text-[#58A6FF] font-semibold'
                          : 'text-gray-300 hover:bg-[#21262D]'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <motion.span
                        className="px-1.5 py-0.5 bg-[#238636] text-white text-[10px] font-semibold rounded"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: ANIMATION_DURATION.fast, delay: 0.2 }}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="h-px bg-gray-700 my-3 mx-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            />
          )}
        </AnimatePresence>

        {/* Bottom Items */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="space-y-0.5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: ANIMATION_DURATION.normal }}
            >
              {bottomItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={`/${item.id}`}
                  className={({ isActive }) =>
                    cn(
                      'w-full flex items-center gap-3 px-4 py-1.5 text-sm rounded-md transition-colors',
                      isActive
                        ? 'bg-[#1F3A5F] text-[#58A6FF] font-semibold'
                        : 'text-gray-300 hover:bg-[#21262D]'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.external && <Open className="h-3.5 w-3.5 text-gray-500" />}
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Bottom Section */}
      <div className={cn('border-t border-gray-700 p-2', isCollapsed && 'flex flex-col items-center')}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-[#1F3A5F] text-[#58A6FF] font-semibold'
                : 'text-gray-300 hover:bg-[#21262D]',
              isCollapsed && 'justify-center px-0 w-10'
            )
          }
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 text-gray-300 hover:bg-[#21262D]',
            isCollapsed && 'justify-center px-0 w-10'
          )}
        >
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: ANIMATION_DURATION.fast }}
              >
                Help
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </motion.aside>
  );
}
