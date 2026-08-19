import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, ArrowRight } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Avatar } from '../components/ui/Avatar';

export function HomePage() {
  const navigate = useNavigate();
  const { workspaces, fetchWorkspaces, isLoading } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

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
    ];
    return colors[name?.charCodeAt(0) % colors.length] || 'bg-blue-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Workspaces</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Select a workspace to manage your projects and sprints
        </p>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <Button onClick={() => navigate('/workspace/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Workspace
        </Button>
      </div>

      {/* Workspaces Grid */}
      {workspaces.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={FolderKanban}
              title="No workspaces yet"
              description="Create your first workspace to start managing your projects"
              action={
                <Button onClick={() => navigate('/workspace/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workspace
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
              onClick={() => navigate(`/workspace/${workspace.id}`)}
            >
              <CardBody>
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg ${getAvatarColor(workspace.name)}`}
                  >
                    {getInitials(workspace.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {workspace.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {workspace.type === 'TEAM_MANAGED' ? 'Team Managed' : 'Company Managed'}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {workspace.access || 'Private'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
