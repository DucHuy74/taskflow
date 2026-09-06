import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { workspaceService } from '@/services/workspaceService';
import { ANIMATION_DURATION } from '@/lib/animations';
import { WorkspaceType, WorkspaceAccess } from '@/types/workspace';

interface Template {
  id: string;
  name: string;
  description: string;
  color1: string;
  color2: string;
}

const templates: Template[] = [
  {
    id: 'scrum',
    name: 'Scrum',
    description: 'Plan, track, and execute work using sprints and a backlog.',
    color1: '#0052CC',
    color2: '#36B37E',
  },
  {
    id: 'general',
    name: 'General Service',
    description: 'Create one place to collect and manage any type of request.',
    color1: '#0052CC',
    color2: '#FFC400',
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'Visualize work in progress with columns.',
    color1: '#6554C0',
    color2: '#FFC400',
  },
];

export function CreateWorkspace() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [managementType, setManagementType] = useState<typeof WorkspaceType[keyof typeof WorkspaceType]>(WorkspaceType.TEAM_MANAGED);
  const [accessType, setAccessType] = useState<typeof WorkspaceAccess[keyof typeof WorkspaceAccess]>(WorkspaceAccess.OPEN);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const workspace = await workspaceService.createWorkspace({
        name: workspaceName.trim(),
        type: managementType,
        access: accessType,
      });

      if (workspace) {
        navigate(`/workspace/${workspace.id}/invite`, { state: { workspaceId: workspace.id, workspaceName: workspace.name } });
      } else {
        setError('Failed to create workspace. Please try again.');
      }
    } catch (err) {
      setError('Failed to create workspace. Please try again.');
      console.error('Create workspace error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (selectedTemplate) {
      setSelectedTemplate(null);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-[#172B4D]">
              {selectedTemplate ? 'Create project' : 'Space templates'}
            </h1>
            <p className="text-sm text-[#5E6C84]">
              {selectedTemplate
                ? 'Enter your project details'
                : 'Templates for you based on how similar teams work.'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-4xl mx-auto">
        {!selectedTemplate ? (
          // Template Selection
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: ANIMATION_DURATION.normal }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <motion.div
                  key={template.id}
                  whileHover={{ y: -6 }}
                  transition={{ duration: ANIMATION_DURATION.fast }}
                  className="cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="group relative overflow-hidden rounded-lg border border-gray-200 transition-all hover:border-[#0052CC] hover:shadow-lg">
                    {/* Preview Header */}
                    <div
                      className="h-32 relative"
                      style={{
                        background: `linear-gradient(135deg, ${template.color1}, ${template.color2})`,
                      }}
                    >
                      <div className="absolute top-4 left-4 right-4 bg-white rounded p-3 shadow-sm">
                        <div className="h-2 bg-gray-200 rounded mb-2 w-3/4"></div>
                        <div className="flex gap-2">
                          <div className="flex-1 h-8 bg-gray-100 rounded"></div>
                          <div className="flex-1 h-8 bg-gray-100 rounded"></div>
                          <div className="flex-1 h-8 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-[#172B4D]">{template.name}</h3>
                      <p className="text-sm text-[#5E6C84] mt-1">{template.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          // Create Form
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: ANIMATION_DURATION.normal }}
            className="max-w-xl"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Workspace Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Try a team name, project goal, milestone..."
                  className="h-11"
                />
              </div>

              {/* Management Type */}
              <div className="space-y-2">
                <Label htmlFor="management">How your space is managed</Label>
                <Select value={managementType} onValueChange={(v) => setManagementType(v as typeof managementType)}>
                  <option value={WorkspaceType.TEAM_MANAGED}>Team-managed</option>
                  <option value={WorkspaceType.COMPANY_MANAGED}>Company-managed</option>
                </Select>
              </div>

              {/* Access Type */}
              <div className="space-y-2">
                <Label htmlFor="access">Access</Label>
                <Select value={accessType} onValueChange={(v) => setAccessType(v as typeof accessType)}>
                  <option value={WorkspaceAccess.OPEN}>Open</option>
                  <option value={WorkspaceAccess.PRIVATE}>Private</option>
                  <option value={WorkspaceAccess.LIMITED}>Limited</option>
                </Select>
              </div>

              {/* Preview */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                    style={{ background: selectedTemplate.color1 }}
                  >
                    {workspaceName.trim()[0]?.toUpperCase() || 'W'}
                  </div>
                  <div>
                    <p className="font-semibold text-[#172B4D]">
                      {workspaceName.trim() || 'Untitled space'}
                    </p>
                    <p className="text-sm text-[#5E6C84]">
                      {managementType === WorkspaceType.TEAM_MANAGED ? 'Team-managed' : 'Company-managed'} space
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4">
                <Button type="button" variant="outline" onClick={handleBack}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !workspaceName.trim()}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
