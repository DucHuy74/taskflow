import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, Settings, LogOut, User, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { NotificationDropdown } from './NotificationDropdown';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-blue-600 dark:bg-blue-800 flex items-center px-4 shadow-sm">
      {/* Logo */}
      <Link to="/home" className="flex items-center gap-2 mr-6">
        <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
          <span className="text-blue-600 font-bold text-sm">TF</span>
        </div>
        <span className="text-white font-semibold text-lg hidden md:block">TaskFlow</span>
      </Link>

      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 w-4 h-4" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-10 pr-4 rounded bg-blue-700 border border-blue-500 text-white placeholder-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Create button */}
        <button
          onClick={() => navigate('/workspace/create')}
          className="px-4 py-1.5 bg-white text-blue-600 rounded text-sm font-medium hover:bg-blue-50 transition-colors hidden sm:block"
        >
          Create
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-white hover:bg-blue-700 rounded transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* Help */}
        <button className="p-2 text-white hover:bg-blue-700 rounded transition-colors hidden md:block">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-white hover:bg-blue-700 rounded transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 hover:bg-blue-700 rounded transition-colors"
          >
            <Avatar name={user?.name || user?.email || 'User'} size="sm" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name || user?.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
