import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  LogOut,
  Settings,
  User,
  Plus,
  Menu,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sidebar, SidebarDark } from '@/components/layout/Sidebar';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { useTheme } from '@/contexts/ThemeContext';
import { logout } from '@/store/authSlice';
import { workspaceService } from '@/services/workspaceService';
import { profileService } from '@/services/profileService';
import { MY_PROFILE_QUERY_KEY } from '@/lib/queryKeys';
import type { Workspace } from '@/types/workspace';

export function HomeLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { isDark } = useTheme();

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getWorkspaces(),
  });

  const { data: myProfile } = useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: () => profileService.getMyProfile(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const displayName = [myProfile?.firstName, myProfile?.lastName].filter(Boolean).join(' ') || user?.name || 'User';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleWorkspaceSelect = (workspaceId: string) => {
    navigate(`/workspace/${workspaceId}`);
    setIsMobileMenuOpen(false);
  };

  const handleCreateWorkspace = () => {
    setIsCreateDialogOpen(false);
    navigate('/workspace/create');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0D1117] transition-colors">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className={`hidden lg:block ${isMobileMenuOpen ? 'block' : ''}`}>
        {isDark ? (
          <SidebarDark
            workspaces={workspaces}
            onWorkspaceSelect={handleWorkspaceSelect}
            onCreateWorkspace={() => setIsCreateDialogOpen(true)}
          />
        ) : (
          <Sidebar
            workspaces={workspaces}
            onWorkspaceSelect={handleWorkspaceSelect}
            onCreateWorkspace={() => setIsCreateDialogOpen(true)}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700 transition-colors">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-gray-700 dark:text-gray-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search - Mobile Hidden */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9 bg-gray-50 dark:bg-[#21262D] border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <AnimatedThemeToggler />

            {/* Notifications */}
            <NotificationBell />

            {/* Create Button - Mobile Hidden */}
            <Button
              size="sm"
              className="hidden md:flex gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 pl-2 pr-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-xs bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-gray-200">
                      {displayName.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden md:inline">
                    {displayName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ workspaces, isDarkMode: isDark }} />
        </main>
      </div>

      {/* Mobile Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Actions</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleCreateWorkspace}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setIsCreateDialogOpen(false);
                navigate('/projects');
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
