import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AtSign, Cake, Mail, Pencil, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToastMessage } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { profileService } from '@/services/profileService';
import { workspaceService } from '@/services/workspaceService';
import { ERROR_CODES, getApiErrorCode, getApiErrorMessage, isForbidden } from '@/services/apiError';
import { MY_PROFILE_QUERY_KEY } from '@/lib/queryKeys';
import type { ProfileResponse, UpdateProfileRequest } from '@/types/profile';

function fullName(profile: Pick<ProfileResponse, 'firstName' | 'lastName' | 'username'>): string {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function formatDob(dob: string | null | undefined): string {
  if (!dob) return 'Not set';
  const date = new Date(dob);
  return Number.isNaN(date.getTime()) ? dob : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Local "YYYY-MM-DD" for yesterday — the latest allowed date of birth (must be in the past). */
function latestAllowedDob(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type ProfileField = 'firstName' | 'lastName' | 'dob';
type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

function validateProfile(values: UpdateProfileRequest): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';
  if (values.dob && values.dob > latestAllowedDob()) errors.dob = 'Date of birth must be in the past.';
  return errors;
}

/** Map backend error codes from PUT /my-profile to field errors or a form-level message. */
function mapProfileError(error: unknown): { fields: ProfileFieldErrors; form?: string } {
  switch (getApiErrorCode(error)) {
    case ERROR_CODES.FIRST_NAME_REQUIRED:
      return { fields: { firstName: 'First name is required.' } };
    case ERROR_CODES.LAST_NAME_REQUIRED:
      return { fields: { lastName: 'Last name is required.' } };
    case ERROR_CODES.INVALID_DOB:
      return { fields: { dob: 'Enter a valid date of birth in the past.' } };
    case ERROR_CODES.IDENTITY_SYNC_FAILED:
      return { fields: {}, form: 'We could not sync your name with the sign-in service, so nothing was saved. Please try again in a moment.' };
    default:
      return { fields: {}, form: getApiErrorMessage(error, 'Your profile could not be saved. Please try again.') };
  }
}

function ProfileEditForm({ profile, onDone }: { profile: ProfileResponse; onDone: () => void }) {
  const queryClient = useQueryClient();
  const showToast = useToastMessage();
  const id = useId();
  const [values, setValues] = useState<UpdateProfileRequest>({
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    dob: profile.dob ?? null,
  });
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => profileService.updateMyProfile(data),
    onSuccess: (updated) => {
      // The header (HomeLayout) reads the same query, so the new name shows up immediately.
      queryClient.setQueryData(MY_PROFILE_QUERY_KEY, updated);
      void queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showToast('Your profile has been updated.', 'success', 'Profile updated');
      onDone();
    },
    onError: (error) => {
      const mapped = mapProfileError(error);
      setFieldErrors(mapped.fields);
      setFormError(mapped.form ?? null);
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: UpdateProfileRequest = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      // Always send the current value: a missing/null dob clears it on the backend.
      dob: values.dob || null,
    };
    const errors = validateProfile(payload);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;
    mutation.mutate(payload);
  };

  const inputProps = (key: ProfileField) => ({
    id: `${id}-${key}`,
    error: Boolean(fieldErrors[key]),
    'aria-describedby': fieldErrors[key] ? `${id}-${key}-error` : undefined,
  });
  const errorText = (key: ProfileField) =>
    fieldErrors[key] ? (
      <p id={`${id}-${key}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors[key]}</p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Edit profile" className="mt-4 space-y-4">
      {formError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${id}-firstName`} className="text-gray-700 dark:text-gray-300">First name <span aria-hidden="true">*</span></Label>
          <Input
            {...inputProps('firstName')}
            className="mt-1.5 h-11"
            autoComplete="given-name"
            required
            value={values.firstName}
            onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
          />
          {errorText('firstName')}
        </div>
        <div>
          <Label htmlFor={`${id}-lastName`} className="text-gray-700 dark:text-gray-300">Last name <span aria-hidden="true">*</span></Label>
          <Input
            {...inputProps('lastName')}
            className="mt-1.5 h-11"
            autoComplete="family-name"
            required
            value={values.lastName}
            onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))}
          />
          {errorText('lastName')}
        </div>
        <div>
          <Label htmlFor={`${id}-dob`} className="text-gray-700 dark:text-gray-300">
            Date of birth <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
          </Label>
          <Input
            {...inputProps('dob')}
            type="date"
            className="mt-1.5 h-11"
            autoComplete="bday"
            max={latestAllowedDob()}
            value={values.dob ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, dob: e.target.value || null }))}
          />
          {errorText('dob')}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="min-h-11" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const profileQuery = useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: () => profileService.getMyProfile(),
    retry: false,
  });

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getWorkspaces(),
  });

  // GET /profiles is restricted to realm ADMIN. Any 403 simply hides the section.
  const allProfilesQuery = useQuery({
    queryKey: ['profiles'],
    queryFn: () => profileService.getAllProfiles(),
    retry: (failureCount, error) => !isForbidden(error) && failureCount < 1,
    staleTime: 60_000,
  });
  const canSeeAllUsers = allProfilesQuery.isSuccess;

  const profile = profileQuery.data;
  const name = profile ? fullName(profile) : '';

  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0D1117]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-[#161B22] sm:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate('/')} aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your account information</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <Card className="mb-6 dark:border-gray-700 dark:bg-[#161B22]">
            <CardContent className="p-6">
              {profileQuery.isLoading ? (
                <div className="flex items-start gap-6" aria-busy="true" aria-label="Loading profile">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ) : profileQuery.isError || !profile ? (
                <div role="alert" className="flex flex-col items-start gap-3 text-sm text-red-700 dark:text-red-300">
                  <p>Your profile could not be loaded.</p>
                  <Button variant="outline" className="min-h-11" onClick={() => void profileQuery.refetch()}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-6 sm:flex-row">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="bg-indigo-600 text-2xl text-white">{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{name}</h2>
                      {!isEditing && (
                        <Button variant="outline" className="min-h-11" onClick={() => setIsEditing(true)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" /> Edit profile
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <ProfileEditForm profile={profile} onDone={() => setIsEditing(false)} />
                    ) : (
                    <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <dt className="flex items-center gap-1 font-medium"><AtSign className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Username</span></dt>
                        <dd>{profile.username}</dd>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <dt className="flex items-center gap-1 font-medium"><Mail className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Email</span></dt>
                        <dd className="break-all">{profile.email}</dd>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <dt className="flex items-center gap-1 font-medium"><Cake className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Date of birth</span></dt>
                        <dd>{formatDob(profile.dob)}</dd>
                      </div>
                    </dl>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="workspaces">
            <TabsList className="mb-6 bg-gray-100 dark:bg-gray-800" role="tablist" aria-label="Profile sections">
              <TabsTrigger value="workspaces" className="min-h-9 dark:text-gray-200">Workspaces</TabsTrigger>
              {canSeeAllUsers && <TabsTrigger value="users" className="min-h-9 dark:text-gray-200">All users</TabsTrigger>}
            </TabsList>

            <TabsContent value="workspaces">
              <Card className="dark:border-gray-700 dark:bg-[#161B22]">
                <CardHeader>
                  <CardTitle className="dark:text-gray-100">Your workspaces</CardTitle>
                  <CardDescription>Workspaces you own or are a member of</CardDescription>
                </CardHeader>
                <CardContent>
                  {workspacesLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : workspaces.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">You are not a member of any workspace yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {workspaces.map((workspace) => (
                        <li key={workspace.id} className="flex items-center justify-between gap-3 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-indigo-600 font-bold text-white" aria-hidden="true">
                              {workspace.name[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900 dark:text-gray-100">{workspace.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {workspace.roles?.length ? workspace.roles.join(', ') : 'Member'}
                                {typeof workspace.totalSprints === 'number' ? ` · ${workspace.totalSprints} sprints` : ''}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" className="min-h-11" onClick={() => navigate(`/workspace/${workspace.id}`)} aria-label={`Open workspace ${workspace.name}`}>
                            Open
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {canSeeAllUsers && (
              <TabsContent value="users">
                <Card className="dark:border-gray-700 dark:bg-[#161B22]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-gray-100"><Users className="h-5 w-5" aria-hidden="true" /> All users</CardTitle>
                    <CardDescription>Visible to system administrators only</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <caption className="sr-only">All registered users</caption>
                        <thead className="border-b border-gray-200 text-xs uppercase text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          <tr>
                            <th scope="col" className="py-2 pr-4">Name</th>
                            <th scope="col" className="py-2 pr-4">Username</th>
                            <th scope="col" className="py-2 pr-4">Email</th>
                            <th scope="col" className="py-2">Date of birth</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {(allProfilesQuery.data ?? []).map((user) => (
                            <tr key={user.profileId || user.userId} className="text-gray-800 dark:text-gray-200">
                              <td className="py-2 pr-4">{fullName(user)}</td>
                              <td className="py-2 pr-4">{user.username}</td>
                              <td className="break-all py-2 pr-4">{user.email}</td>
                              <td className="py-2">{formatDob(user.dob)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
