import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Plus,
  Menu,
  Moon,
  Sun,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { logout } from '@/store/authSlice';
import { workspaceService } from '@/services/workspaceService';
import type { Workspace } from '@/types/workspace';

interface HomeLayoutProps {
  theme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
}

export function HomeLayout({ theme = 'light', onThemeChange }: HomeLayoutProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getWorkspaces(),
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => {
    setIsDarkMode(theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  }, [theme]);

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

  const handleThemeToggle = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    onThemeChange?.(newTheme);
  };

  const effectiveTheme = isDarkMode ? 'dark' : 'light';

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-[#0D1117]' : 'bg-gray-50'}`}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className={`hidden lg:block ${isMobileMenuOpen ? 'block' : ''}`}>
        {effectiveTheme === 'dark' ? (
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
        <header className={`h-14 flex items-center justify-between px-4 border-b ${
          isDarkMode ? 'bg-[#161B22] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search - Mobile Hidden */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <Input
                placeholder="Search..."
                className={`pl-9 h-9 ${
                  isDarkMode
                    ? 'bg-[#21262D] border-gray-600 text-gray-200 placeholder-gray-500'
                    : 'bg-gray-50 border-gray-200'
                }`}
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleThemeToggle}
              className={isDarkMode ? 'text-gray-400 hover:text-white' : ''}
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className={`relative ${isDarkMode ? 'text-gray-400 hover:text-white' : ''}`}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
            </Button>

            {/* Create Button - Mobile Hidden */}
            <Button
              size="sm"
              className="hidden md:flex gap-1"
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
                  className={`flex items-center gap-2 pl-2 pr-1 ${
                    isDarkMode ? 'text-gray-200 hover:bg-gray-800' : ''
                  }`}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className={`text-xs ${
                      isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`text-sm font-medium hidden md:inline ${
                    isDarkMode ? 'text-gray-200' : ''
                  }`}>
                    {user?.name || 'User'}
                  </span>
                  <ChevronDown className={`h-4 w-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
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
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ workspaces, isDarkMode }} />
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
