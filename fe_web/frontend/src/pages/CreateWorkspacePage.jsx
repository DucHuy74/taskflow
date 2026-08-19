import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardBody, CardHeader } from '../components/ui/Card';

export function CreateWorkspacePage() {
  const navigate = useNavigate();
  const { createWorkspace, isLoading } = useWorkspaceStore();
  const [formData, setFormData] = useState({
    name: '',
    type: 'TEAM_MANAGED',
    access: 'PRIVATE',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Workspace name is required');
      return;
    }

    try {
      const result = await createWorkspace(formData);
      if (result) {
        navigate(`/workspace/${result.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create workspace');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Create Workspace
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            A workspace is where your team collaborates on projects
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Input
              label="Workspace Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter workspace name"
              required
            />

            {/* Workspace Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Workspace Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.type === 'TEAM_MANAGED'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value="TEAM_MANAGED"
                    checked={formData.type === 'TEAM_MANAGED'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.type === 'TEAM_MANAGED'
                          ? 'border-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {formData.type === 'TEAM_MANAGED' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Team Managed</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Best for small teams
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.type === 'COMPANY_MANAGED'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value="COMPANY_MANAGED"
                    checked={formData.type === 'COMPANY_MANAGED'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.type === 'COMPANY_MANAGED'
                          ? 'border-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {formData.type === 'COMPANY_MANAGED' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Company Managed</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        For larger organizations
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Access */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Workspace Access
              </label>
              <select
                name="access"
                value={formData.access}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PRIVATE">Private - Only invited members</option>
                <option value="OPEN">Open - Anyone can view</option>
                <option value="LIMITED">Limited - View + request access</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="submit" isLoading={isLoading}>
                Create Workspace
              </Button>
              <Button variant="ghost" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
