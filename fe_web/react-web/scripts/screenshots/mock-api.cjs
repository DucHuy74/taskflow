// Deterministic API fixtures for `npm run screenshots` (no backend, Keycloak or analyzer needed).
const triples = [
  ['product manager', 'prioritize', 'backlog'],
  ['product manager', 'review', 'roadmap'],
  ['product manager', 'track', 'release'],
  ['delivery team', 'plan', 'sprint'],
  ['delivery team', 'estimate', 'story'],
  ['delivery team', 'review', 'backlog'],
  ['scrum master', 'plan', 'sprint'],
  ['scrum master', 'track', 'velocity'],
  ['customer', 'create', 'account'],
  ['customer', 'update', 'profile'],
  ['customer', 'reset', 'password'],
  ['customer', 'view', 'order'],
  ['admin', 'manage', 'account'],
  ['admin', 'assign', 'role'],
  ['admin', 'view', 'report'],
  ['developer', 'deploy', 'release'],
  ['developer', 'fix', 'bug'],
  ['tester', 'report', 'bug'],
  ['tester', 'verify', 'story'],
  ['analyst', 'export', 'report'],
];
const nodes = new Map();
const edges = [];
const add = (id) => { if (!nodes.has(id)) nodes.set(id, { id, label: id, type: 'TERM', priority: null }); };
triples.forEach(([s, v, o], i) => {
  add(s); add(v); add(o);
  edges.push({ from: s, to: v, type: 'PERFORM' }, { from: v, to: o, type: 'TARGET' });
  const story = `story-${i + 1}`;
  nodes.set(story, { id: story, label: story, type: 'USER_STORY', priority: 0.5 });
  edges.push({ from: story, to: s, type: 'RELATES_TO' });
});
edges.push(
  { from: 'account', to: 'profile', type: 'SIMILAR', score: 0.82 },
  { from: 'report', to: 'order', type: 'SIMILAR', score: 0.66 },
  { from: 'sprint', to: 'backlog', type: 'ASSOCIATED', confidence: 0.71, lift: 1.4 },
  { from: 'bug', to: 'release', type: 'ASSOCIATED', confidence: 0.58, lift: 1.2 },
  { from: 'story', to: 'backlog', type: 'SIMILAR', score: 0.7 },
);
const graph = { nodes: [...nodes.values()], edges };

const workspaces = [
  { id: 'ws', name: 'Product Discovery', type: 'TEAM_MANAGED', access: 'PRIVATE', backlog: { id: 'bl', name: 'Backlog' }, roles: ['ADMIN'], ownerId: 'u1', createdAt: '2026-10-01', totalSprints: 2 },
  { id: 'platform', name: 'Platform Engineering', type: 'COMPANY_MANAGED', access: 'LIMITED', backlog: { id: 'bl2', name: 'Backlog' }, roles: ['MEMBER'], createdAt: '2026-09-12' },
  { id: 'mobile', name: 'Mobile Experience', type: 'TEAM_MANAGED', access: 'OPEN', backlog: { id: 'bl3', name: 'Backlog' }, roles: ['VIEWER'], createdAt: '2026-08-30' },
];
const stories = [
  { id: 'story-1', storyText: 'As a product manager, I want to prioritize the backlog so that the team builds the most valuable work first', status: 'ToDo', version: 3, sprintId: null, workspaceId: 'ws', backlogId: 'bl' },
  { id: 'story-2', storyText: 'As a delivery team, we want to plan the next sprint with clear capacity', status: 'InProgress', version: 1, sprintId: null, workspaceId: 'ws', backlogId: 'bl' },
  { id: 'story-3', storyText: 'As a customer, I want to reset my password so that I can regain access', status: 'Done', version: 0, sprintId: null, workspaceId: 'ws', backlogId: 'bl' },
  { id: 'story-4', storyText: 'As an admin, I want to assign roles to members', status: 'ToDo', version: 2, sprintId: null, workspaceId: 'ws', backlogId: 'bl' },
];
const sprintStories = [
  { id: 'story-5', storyText: 'As a tester, I want to report bugs with screenshots', status: 'InProgress', version: 1, sprintId: 'sprint-1', workspaceId: 'ws' },
  { id: 'story-6', storyText: 'As a developer, I want to deploy a release from CI', status: 'ToDo', version: 0, sprintId: 'sprint-1', workspaceId: 'ws' },
];
const sprints = [
  { id: 'sprint-1', name: 'Sprint 12 · Discovery', status: 'InProgress', startDate: '2026-10-13', endDate: '2026-10-27', createdAt: '2026-10-10T09:00:00' },
  { id: 'sprint-2', name: 'Sprint 13', status: 'ToDo', startDate: '2026-10-27', endDate: '2026-11-10', createdAt: '2026-10-20T09:00:00' },
];
const profile = { profileId: 'p1', userId: 'u1', email: 'huy@example.com', username: 'huy', firstName: 'Huy', lastName: 'Hoang', dob: '2002-05-14' };
const invitations = [{ id: 'inv-1', workspaceId: 'platform', workspaceName: 'Platform Engineering', role: 'MEMBER', email: 'huy@example.com', inviterId: 'u2', inviterEmail: 'linh@example.com', expiredAt: '2026-10-31T00:00:00Z' }];
const recommendations = {
  data: [
    {
      id: 'rec-1', type: 'POSSIBLE_DUPLICATE', status: 'OPEN',
      confidence: { band: 'HIGH', score: 0.91, calibrated: false },
      title: 'These stories may describe the same backlog outcome',
      stories: [
        { id: 'story-1', text: 'As a product manager, I want to prioritize backlog items by customer value.', graphRelevanceScore: 0.93, parseConfidence: 0.96 },
        { id: 'story-7', text: 'As a product owner, I want to rank stories by business value.', graphRelevanceScore: 0.9, parseConfidence: 0.94 },
      ],
      evidence: [
        { code: 'SEMANTIC_TEXT_SIMILARITY', label: 'Strong semantic overlap', value: 0.91 },
        { code: 'SAME_CANONICAL_OBJECT', label: 'Shared backlog concept' },
      ],
      suggestedAction: { type: 'MERGE_REVIEW', representativeStoryId: 'story-1' },
      modelVersion: 'heuristic-v1', policyVersion: 'deterministic-v1', generatedAt: '2026-10-24T08:30:00Z', version: 1,
    },
  ],
  page: { nextCursor: null, hasMore: false },
  summary: { open: 1, high: 1, medium: 0 },
};
const permissions = ['WORKSPACE_BROWSE', 'WORKSPACE_ADMINISTER', 'WORKSPACE_DELETE', 'RECOMMENDATION_VIEW', 'RECOMMENDATION_REVIEW', 'RECOMMENDATION_ACCEPT', 'MEMBER_VIEW', 'MEMBER_INVITE', 'MEMBER_MANAGE', 'SPRINT_VIEW', 'SPRINT_CREATE', 'SPRINT_EDIT', 'SPRINT_MANAGE', 'ISSUE_VIEW', 'ISSUE_CREATE', 'ISSUE_EDIT', 'ISSUE_DELETE', 'ISSUE_TRANSITION', 'ACL_READ', 'ACL_WRITE'];
const notifications = [
  { id: 'n1', title: 'Workspace invitation', content: 'Linh invited you to Platform Engineering', type: 'WORKSPACE_INVITE', referenceId: 'inv-1', createdAt: '2026-10-24T08:10:00Z', read: false },
  { id: 'n2', title: 'Invitation accepted', content: 'minh@example.com joined Product Discovery', type: 'INVITATION_ACCEPTED', referenceId: 'ws', createdAt: '2026-10-23T15:00:00Z', read: false },
];

function apiResult(method, pathname) {
  const ok = (result) => ({ code: 1000, result });
  if (pathname.endsWith('/graphql')) return { data: { workspaceGraph: graph } };
  if (pathname.endsWith('/rebuild-graph')) return { code: 1000, message: 'Rebuild triggered', result: { jobId: 'job-2', status: 'QUEUED' } };
  if (pathname.endsWith('/workspaces/ws/recommendations')) return ok(recommendations);
  if (pathname.includes('/recommendation-jobs/latest')) return ok({ id: 'job-1', status: 'SUCCEEDED', stage: 'PUBLISHING', progress: 100, candidateCount: 1, completedAt: '2026-10-24T08:30:00Z', lastSuccessfulRunAt: '2026-10-24T08:30:00Z' });
  if (pathname.endsWith('/my-access')) return ok({ role: 'ADMIN', permissions, grants: [] });
  if (pathname.endsWith('/permission-matrix')) return ok([
    { role: 'ADMIN', permissions },
    { role: 'MEMBER', permissions: permissions.filter((p) => !p.startsWith('WORKSPACE_A') && !p.startsWith('WORKSPACE_D') && !p.startsWith('ACL') && p !== 'MEMBER_MANAGE') },
    { role: 'VIEWER', permissions: ['WORKSPACE_BROWSE', 'RECOMMENDATION_VIEW', 'MEMBER_VIEW', 'SPRINT_VIEW', 'ISSUE_VIEW'] },
  ]);
  if (pathname.endsWith('/grants')) return ok([{ id: 'g1', workspaceId: 'ws', resourceType: 'SPRINT', resourceId: 'sprint-1', principalType: 'ROLE', principalId: 'VIEWER', permission: 'SPRINT_EDIT', effect: 'ALLOW' }]);
  if (pathname.endsWith('/members')) return ok([
    { userId: 'u1', email: 'huy@example.com', role: 'ADMIN' },
    { userId: 'u2', email: 'linh@example.com', role: 'MEMBER' },
    { userId: 'u3', email: 'minh@example.com', role: 'VIEWER' },
  ]);
  if (pathname.endsWith('/notifications/unread')) return ok(notifications);
  if (pathname.endsWith('/invitations/pending')) return ok(invitations);
  if (/\/invitations\/[^/]+\/accept$/.test(pathname)) return { code: 1000, message: 'Invitation accepted' };
  if (/\/invitations\/[^/]+\/deny$/.test(pathname)) return { code: 1000, message: 'Invitation denied' };
  if (pathname.endsWith('/my-profile')) return method === 'PUT' ? { code: 1000, message: 'Profile updated successfully', result: profile } : ok(profile);
  if (pathname.endsWith('/profiles')) return ok([profile]);
  if (pathname.endsWith('/sprints/workspace/ws')) return ok(sprints);
  if (/\/sprints\/sprint-\d+$/.test(pathname) && method === 'PUT') return ok(sprints.find((sprint) => pathname.endsWith(sprint.id)) || sprints[0]);
  if (/\/sprints\/sprint-\d\/user-stories$/.test(pathname)) return ok(pathname.includes('sprint-1') ? sprintStories : []);
  if (pathname.endsWith('/user-stories/workspace/ws/backlog')) return ok(stories);
  if (/\/user-stories\/story-[^/]+$/.test(pathname) && method === 'GET') return ok(stories[0]);
  // Single workspace: exact match so /workspace/ws/members etc. never land here.
  if (pathname === '/api/workspace/ws' && method === 'GET') return ok(workspaces[0]);
  if (pathname.endsWith('/workspace')) return ok(workspaces);
  return ok([]);
}

async function mockBackend(page) {
  await page.route('http://localhost:8080/api/**', async (route) => {
    const request = route.request();
    const body = apiResult(request.method(), new URL(request.url()).pathname);
    await route.fulfill({
      status: 200,
      contentType: typeof body === 'string' ? 'text/plain' : 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  });
}

function fakeToken() {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'none' })}.${enc({ sub: 'u1', email: 'huy@example.com', name: 'Huy Hoang', preferred_username: 'huy' })}.sig`;
}

module.exports = { mockBackend, fakeToken };
