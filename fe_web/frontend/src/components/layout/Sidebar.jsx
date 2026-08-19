import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, List, Calendar, Settings, Plus, ChevronRight } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Avatar } from '../ui/Avatar';
import { clsx } from 'clsx';

export function Sidebar({ isOpen = true }) {
  const navigate = useNavigate();
  const { workspaces, fetchWorkspaces, isLoading } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const navItems = [
    { path: '/home', label: 'Home', icon: Home },
    { path: '/backlog', label: 'Backlog', icon: List },
    { path: '/sprints', label: 'Sprints', icon: Calendar },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500',
      'bg-red-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    return colors[name?.charCodeAt(0) % colors.length] || 'bg-blue-500';
  };

  return (
    <aside
      className={clsx(
        'w-60 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300',
        !isOpen && 'w-0 overflow-hidden'
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Navigation
          </span>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-2 mx-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}

        {/* Workspaces section */}
        <div className="mt-6 px-3 mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Spaces
          </span>
          <button
            onClick={() => navigate('/workspace/create')}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace list */}
        <div className="space-y-1 px-2">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : workspaces.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
              No workspaces
            </div>
          ) : (
            workspaces.map((workspace) => (
              <NavLink
                key={workspace.id}
                to={`/workspace/${workspace.id}`}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group',
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )
                }
              >
                <div
                  className={clsx(
                    'w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                    getAvatarColor(workspace.name)
                  )}
                >
                  {getInitials(workspace.name)}
                </div>
                <span className="truncate flex-1">{workspace.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            ))
          )}
        </div>

        {/* More spaces link */}
        <button className="flex items-center gap-2 px-4 py-2 mx-2 mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <ChevronRight className="w-4 h-4" />
          More spaces
        </button>
      </nav>
    </aside>
  );
}
