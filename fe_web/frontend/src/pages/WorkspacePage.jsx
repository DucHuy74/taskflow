import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useBacklogStore } from '../stores/backlogStore';
import { BacklogSection } from '../components/backlog/BacklogSection';
import { SprintSection } from '../components/backlog/SprintSection';
import { CreateSprintModal } from '../components/backlog/CreateSprintModal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { workspaceService } from '../api/workspaceService';

export function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { workspaces, setCurrentWorkspace, fetchMembers, members } = useWorkspaceStore();
  const { fetchBacklog, fetchSprints } = useBacklogStore();
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Find workspace from list or set by ID
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
      }
      await Promise.all([
        fetchBacklog(workspaceId),
        fetchSprints(workspaceId),
        fetchMembers(workspaceId),
      ]);
      setIsLoading(false);
    };

    if (workspaceId) {
      loadData();
    }
  }, [workspaceId]);

  const handleRebuildGraph = async () => {
    try {
      await workspaceService.rebuildGraph(workspaceId);
      alert('Graph rebuild triggered');
    } catch (error) {
      console.error('Failed to rebuild graph:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspaces
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {workspaces.find((w) => w.id === workspaceId)?.name || 'Workspace'}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="primary">
                {workspaces.find((w) => w.id === workspaceId)?.type === 'TEAM_MANAGED'
                  ? 'Team Managed'
                  : 'Company Managed'}
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users className="w-4 h-4" />
                {members.length} members
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRebuildGraph}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Rebuild Graph
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          <button className="pb-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
            Backlog
          </button>
          <button className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400">
            Board
          </button>
          <button className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400">
            Graph
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backlog */}
        <BacklogSection
          workspaceId={workspaceId}
          onCreateSprint={() => setShowCreateSprint(true)}
        />

        {/* Sprints */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sprints</h2>
          <SprintSection workspaceId={workspaceId} />
        </div>
      </div>

      {/* Create Sprint Modal */}
      <CreateSprintModal
        isOpen={showCreateSprint}
        onClose={() => setShowCreateSprint(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
}
