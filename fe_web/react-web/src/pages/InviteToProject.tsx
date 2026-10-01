import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Mail, Shield, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { invitationService } from '@/services/invitationService';
import type { SendInvitationRequest } from '@/types/invitation';
import { ANIMATION_DURATION } from '@/lib/animations';

type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';

const roleInfo: Record<Role, { label: string; description: string; icon: React.ReactNode }> = {
  ADMIN: {
    label: 'Administrator',
    description: 'Admins can do most things in a space, like editing and deleting.',
    icon: <Shield className="w-5 h-5" />,
  },
  MEMBER: {
    label: 'Member',
    description: 'Members are part of a team and can work on issues.',
    icon: <Users className="w-5 h-5" />,
  },
  VIEWER: {
    label: 'Viewer',
    description: 'Viewers can search and view issues in a space.',
    icon: <Eye className="w-5 h-5" />,
  },
};

export function InviteToProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const workspaceId = (location.state as { workspaceId?: string })?.workspaceId || '';
  const workspaceName = (location.state as { workspaceName?: string })?.workspaceName || '';

  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role>('MEMBER');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = email.trim();
      if (trimmed && !emails.includes(trimmed)) {
        setEmails([...emails, trimmed]);
        setEmail('');
      }
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter((e) => e !== emailToRemove));
  };

  const handleInvite = async () => {
    const currentEmail = email.trim();
    const allEmails = currentEmail ? [...emails, currentEmail] : emails;

    if (allEmails.length === 0) {
      setError('Please add at least one email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const invitations: SendInvitationRequest[] = allEmails.map((e) => ({
        email: e,
        role: selectedRole,
      }));

      const success = await invitationService.sendInvitation(workspaceId, invitations);

      if (success) {
        navigate(`/workspace/${workspaceId}`);
      } else {
        setError('Failed to send invitations. Please try again.');
      }
    } catch (err) {
      setError('Failed to send invitations. Please try again.');
      console.error('Invite error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate(`/workspace/${workspaceId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-[#172B4D]">Bring your team along</h1>
            <p className="text-sm text-[#5E6C84]">Invite members to {workspaceName}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATION.normal }}
          className="space-y-6"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="emails">Email addresses</Label>
            <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-md min-h-[60px]">
              {emails.map((e) => (
                <span
                  key={e}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  {e}
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(e)}
                    className="hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
              <input
                id="emails"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleAddEmail}
                placeholder={emails.length === 0 ? 'e.g., name@company.com' : ''}
                className="flex-1 min-w-[200px] outline-none text-sm"
              />
            </div>
            <p className="text-xs text-[#5E6C84]">Press Enter or comma to add email</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label>Role</Label>
            <div className="space-y-2">
              {(Object.keys(roleInfo) as Role[]).map((role) => (
                <label
                  key={role}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedRole === role
                      ? 'border-[#0052CC] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={() => setSelectedRole(role)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={selectedRole === role ? 'text-[#0052CC]' : 'text-gray-600'}>
                        {roleInfo[role].icon}
                      </span>
                      <span className="font-medium text-[#172B4D]">{roleInfo[role].label}</span>
                    </div>
                    <p className="text-sm text-[#5E6C84] mt-1">{roleInfo[role].description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6">
            <Button variant="outline" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button onClick={handleInvite} disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Invite and continue
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-semibold text-[#172B4D]"
    >
      {children}
    </label>
  );
}
