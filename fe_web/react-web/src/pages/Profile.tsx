import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Briefcase,
  Link as LinkIcon,
  Edit,
  Camera,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Passionate product manager with 5+ years of experience in agile methodologies and team leadership.',
    location: 'Ho Chi Minh City, Vietnam',
    website: 'https://johndoe.dev',
    company: 'TechCorp Inc.',
    joinDate: 'March 2023',
    timezone: 'Asia/Ho_Chi_Minh',
  });

  const [editForm, setEditForm] = useState(profile);

  const handleEdit = () => {
    setEditForm(profile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(profile);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setProfile(editForm);
    setIsLoading(false);
    setIsEditing(false);
  };

  const handleChange = (field: keyof typeof profile, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#172B4D]">Profile</h1>
              <p className="text-sm text-[#5E6C84]">Manage your personal information</p>
            </div>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={handleEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-[#0052CC] text-white text-2xl">
                      JD
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 p-1.5 bg-[#0052CC] rounded-full text-white hover:bg-[#0044AA] transition-colors">
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={editForm.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editForm.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <textarea
                          id="bio"
                          value={editForm.bio}
                          onChange={(e) => handleChange('bio', e.target.value)}
                          className="w-full min-h-[80px] px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isLoading}>
                          <Check className="h-4 w-4 mr-2" />
                          {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-[#172B4D]">{profile.name}</h2>
                      <p className="text-[#5E6C84] mt-1">{profile.bio}</p>
                      <div className="flex flex-wrap gap-4 mt-4 text-sm text-[#5E6C84]">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {profile.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {profile.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {profile.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-4 w-4" />
                          {profile.website}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for more details */}
          <Tabs defaultValue="activity">
            <TabsList className="mb-6 bg-gray-100">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent actions across workspaces</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        action: 'Created workspace "Project Alpha"',
                        time: '2 hours ago',
                        icon: '📁',
                      },
                      {
                        action: 'Completed task "Design dashboard mockups"',
                        time: '5 hours ago',
                        icon: '✅',
                      },
                      {
                        action: 'Added comment on task "API integration"',
                        time: 'Yesterday',
                        icon: '💬',
                      },
                      {
                        action: 'Updated sprint backlog',
                        time: '2 days ago',
                        icon: '📋',
                      },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <span className="text-xl">{activity.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm text-[#172B4D]">{activity.action}</p>
                          <p className="text-xs text-[#5E6C84]">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workspaces">
              <Card>
                <CardHeader>
                  <CardTitle>Your Workspaces</CardTitle>
                  <CardDescription>Workspaces you own or are a member of</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Project Alpha', role: 'Owner', tasks: 12 },
                      { name: 'Marketing Campaign', role: 'Member', tasks: 8 },
                      { name: 'Product Roadmap', role: 'Admin', tasks: 24 },
                    ].map((workspace, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-[#0052CC] flex items-center justify-center text-white font-bold">
                            {workspace.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-[#172B4D]">{workspace.name}</p>
                            <p className="text-xs text-[#5E6C84]">
                              {workspace.role} - {workspace.tasks} tasks
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teams">
              <Card>
                <CardHeader>
                  <CardTitle>Your Teams</CardTitle>
                  <CardDescription>Teams you belong to</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Engineering', members: 8 },
                      { name: 'Design', members: 4 },
                      { name: 'Product', members: 6 },
                    ].map((team, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-[#403294] flex items-center justify-center text-white font-bold">
                            {team.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-[#172B4D]">{team.name}</p>
                            <p className="text-xs text-[#5E6C84]">{team.members} members</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
