# Backend RBAC audit — S3 policy form + Jira roles

Codegraph trace of `taskflow/be/nckh` (187 files under `taskflow/be`). Compared to [Amazon S3 access policy language](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-policy-language-overview.html) and Jira Cloud team-managed default roles.

- **Source:** Codegraph index
- **Date:** 30 Aug 2026

## Verdict

| Metric | Result |
| --- | --- |
| Permission matrix exists | **Yes** |
| IAM / S3 statement form | **Partial** |
| Jira team-managed default roles | **3 / 3** |
| Jira TM permission coverage | **~18 / ~30** |

Ma trận phân quyền đã có (role × `Permission`, seed + API). `ResourceGrant` là **IAM statement** (`Effect` + `Principal` + `Action` + `Resource`), không phải object ACL S3 thuần (`READ` / `WRITE` / `FULL_CONTROL` allow-only). Role mặc định khớp Jira team-managed (Administrator / Member / Viewer). Thiếu custom role, scheme company-managed, và **không evaluate** `WorkspaceAccess` OPEN / LIMITED / PRIVATE trong `AccessEvaluator`.

## 1. Có ma trận phân quyền chưa?

Có. Hai lớp:

1. **Identity** — `WorkspaceRole.permissions` seed từ `DefaultPermissionMatrix`
2. **Object** — `ResourceGrant` trên `WORKSPACE` / `SPRINT` / `USER_STORY`

### API (`WorkspaceRoleController`)

| Method | Path |
| --- | --- |
| GET | `/workspace/{id}/permission-matrix` |
| PUT | `/workspace/{id}/roles/{roleName}/permissions` |
| PUT | `/workspace/{id}/members/{userId}/role` |
| GET / POST | `/workspace/{id}/grants` |
| DELETE | `/workspace/{id}/grants/{grantId}` |
| GET | `/workspace/{id}/my-access` |

### Evaluation (`AccessEvaluator.isAllowed`)

1. Filter grants by Principal (USER id hoặc ROLE name)
2. Matching **DENY** → `false` (explicit deny thắng)
3. Matching **ALLOW** → `true`
4. Else: role matrix chứa `Permission` được yêu cầu
5. `acl:FullControl` trên grant khớp **mọi** action

Luồng: `WorkspaceRoleController` → `WorkspaceAccessServiceImpl.decide` → `AccessEvaluator.isAllowed`.

### DefaultPermissionMatrix (seed)

`ADMIN` = `EnumSet.allOf(Permission)`. MEMBER không có `WORKSPACE_ADMINISTER` / `DELETE`, `MEMBER_INVITE` / `MANAGE`, `ISSUE_DELETE`, `ACL_WRITE` / `FULL_CONTROL`. VIEWER chỉ browse + `ACL_READ`.

| Permission (action) | ADMIN | MEMBER | VIEWER |
| --- | :---: | :---: | :---: |
| `workspace:Browse` | Grant | Grant | Grant |
| `workspace:Administer` | Grant | — | — |
| `workspace:Delete` | Grant | — | — |
| `member:View` | Grant | Grant | Grant |
| `member:Invite` | Grant | — | — |
| `member:Manage` | Grant | — | — |
| `sprint:View` | Grant | Grant | Grant |
| `sprint:Create` | Grant | Grant | — |
| `sprint:Edit` | Grant | Grant | — |
| `sprint:Manage` | Grant | Grant | — |
| `issue:View` | Grant | Grant | Grant |
| `issue:Create` | Grant | Grant | — |
| `issue:Edit` | Grant | Grant | — |
| `issue:Delete` | Grant | — | — |
| `issue:Transition` | Grant | Grant | — |
| `acl:Read` | Grant | Grant | Grant |
| `acl:Write` | Grant | — | — |
| `acl:FullControl` | Grant | — | — |

## 2. Đúng form S3 object permission chưa?

Comment trên `ResourceGrant`: *Object-level ACL statement (S3-like): Principal + Action + Resource + Effect.* Đó là form **IAM policy statement**, không phải object ACL.

Object ACL của S3 chỉ Allow (`READ`, `WRITE`, `READ_ACP`, `WRITE_ACP`, `FULL_CONTROL`), không có Effect Deny. Deny thuộc IAM.

### IAM statement vs ResourceGrant

| IAM / S3 policy | Taskflow field | Match |
| --- | --- | :---: |
| `Version` (`2012-10-17`) | — | No |
| `Id` / `Sid` | `grant_id` UUID only | No |
| `Effect` Allow \| Deny | `PermissionEffect` | Yes |
| `Principal` (account / user / `*`) | `PrincipalType` USER \| ROLE + `principalId` | Partial |
| `Action` (`s3:GetObject` …) | `Permission.action` e.g. `issue:View` | Yes |
| `Resource` ARN `arn:aws:s3:::bucket/key` | `resourceType` + `resourceId` (no ARN, no `prefix/*`) | Partial |
| `Condition` keys | — | No |
| Implicit deny if no Allow | Fall through role matrix, then `NO_PERMISSION` | Yes |
| Explicit Deny wins | DENY stream before ALLOW | Yes |

### S3 object ACL vs Taskflow `ACL_*`

| S3 object ACL | Taskflow analog | Notes |
| --- | --- | --- |
| `READ` (GetObject) | `issue:View` / `sprint:View` via grants | Không có `object:Get` generic |
| `WRITE` (PutObject) | `issue:Edit` / Create trên grant | Không có `object:Write` |
| `READ_ACP` | `acl:Read` | Có |
| `WRITE_ACP` | `acl:Write` | Có; bắt buộc để POST/DELETE `/grants` |
| `FULL_CONTROL` | `acl:FullControl` | `matchesAction` coi như wildcard |
| Canned ACL (`private`, `public-read` …) | — | Không |
| Anonymous / AllUsers | Phải là `WorkspaceMember` trước | Không public object |
| Owner vs uploader ownership | Chỉ membership workspace | Không field object owner |

**Resource matching là phía caller.** `AccessEvaluator` không so `grant.resourceType` / `resourceId` với object được request. `WorkspaceAccessServiceImpl` load grant workspace rồi append SPRINT và USER_STORY — tương đương union các policy document, không evaluate ARN wildcard.

DTO: `ResourceGrantRequest { resourceType, resourceId, principalType, principalId, permission, effect }`.

Ví dụ bucket policy AWS: `Effect` + `Principal.AWS` ARN + `Action` `[s3:GetObject, s3:ListBucket]` + `Resource` `[arn:aws:s3:::bucket, arn:aws:s3:::bucket/*]`.

## 3. Role giống Jira chưa?

Jira team-managed mặc định: Administrator, Member, Viewer. Backend `WorkspaceRoleType`: `ADMIN`, `MEMBER`, `VIEWER`. Frontend có `WorkspaceType` TEAM_MANAGED / COMPANY_MANAGED và `WorkspaceAccess` OPEN / LIMITED / PRIVATE — **lưu trên Workspace, không dùng trong `AccessEvaluator`**.

| Jira (team-managed) | Taskflow | Status |
| --- | --- | :---: |
| Administrator | `ADMIN` | Yes |
| Member | `MEMBER` | Yes |
| Viewer | `VIEWER` | Yes |
| Custom space roles | Enum cố định 3 role; permissions chỉnh được | No |
| Open / Limited / Private access level | Enum `WorkspaceAccess` persist | Stored, not evaluated |
| Guest collaborator | — | No |
| Reporter / Assignee issue roles | Không principal kiểu issue-role | No |
| Company-managed Developer / Reporter + schemes | Chỉ flag type | No |
| JSM Agent / Customer | Ngoài scope | No |

### Jira TM permissions vs `Permission` enum

| Jira permission | Viewer / Member / Admin | Taskflow |
| --- | --- | --- |
| Administer the space | — / — / Yes | `workspace:Administer` (ADMIN) |
| Browse / view work items | Yes / Yes / Yes | `workspace:Browse`, `issue:View` |
| Create work items | — / Yes / Yes | `issue:Create` |
| Edit any work item | — / Yes / Yes | `issue:Edit` |
| Transition any work item | — / Yes / Yes | `issue:Transition` |
| Delete any work item | — / — / Yes | `issue:Delete` (seed: ADMIN only) |
| Manage space sprints | — / Yes / Yes | `sprint:Manage` (MEMBER seed) |
| Add comments / attachments | Yes / Yes / Yes | Missing |
| Assign / link / move / log work | — / Yes / Yes | Missing |
| Watchers, edit reporters, due date | Admin-heavy | Missing |
| Access development tools | — / Yes / Yes | Missing |
| Issue-level security | Paid / company-managed | `ResourceGrant` on `USER_STORY` |

## Gaps

| Severity | Gap | Why |
| --- | --- | --- |
| High | OPEN / LIMITED / PRIVATE never evaluated | Jira Open ⇒ user trên site inherit Member; Limited ⇒ Viewer. Taskflow vẫn bắt buộc `WorkspaceMember`; field access chỉ cosmetic. |
| Med | No Condition / Resource ARN / wildcard | Không diễn tả `s3:prefix/*`, `StringEquals`, hoặc grant theo thời gian. `validateGrant` chỉ check field khác null. |
| Med | No custom roles / company-managed schemes | Jira TM trả phí cho phép thêm role; company-managed dùng Developer/Reporter + scheme dùng chung. Taskflow chỉ retune 3 ma trận. |
| Med | Comment / attach / assign / worklog missing | Jira Viewer vẫn collaborate. Feature sau này sẽ không có bit `Permission`. |
| Low | ACL vs IAM mixed metaphor | Tên `acl:*` copy object ACL; Effect Deny copy IAM. Ổn nếu document; không 1:1 object ACL. |

## Implementation follow-up — 31 Aug 2026

The role matrix has been completed for the Jira-style collaboration surface:

- issue assignment, linking, moving, reporter and due-date management
- comments and attachments
- worklogs and watchers
- development-tool access

Default behavior is now:

- `ADMIN`: every permission
- `MEMBER`: normal create/edit/transition and collaboration permissions; destructive and administrative actions remain excluded
- `VIEWER`: browse/view plus adding comments and attachments

`WorkspaceAccess` is also enforced centrally by `WorkspaceAccessServiceImpl` for authenticated users who are not explicit members: `OPEN` evaluates as `MEMBER`, `LIMITED` as `VIEWER`, and `PRIVATE` remains membership-only. Explicit resource `DENY` grants still take precedence over both implicit access and the role matrix.

The current backend has no comment, attachment, worklog, watcher, issue-link, or development-tool application services yet. Their permission constants and defaults are ready in the matrix; each future endpoint must call `requireUserStory` (or the appropriate resource-scoped variant) with its dedicated permission.

## Enforcement surface (`require*` callers)

`WorkspaceAccessService.require` / `requireSprint` / `requireUserStory` — 18 + 5 + 4 call sites. Graph, sprint, user story, workspace, và role services đều qua `decide()` → `AccessEvaluator`.

- `WorkspaceAppServiceImpl`
- `SprintAppServiceImpl`
- `UserStoryAppServiceImpl`
- `WorkspaceRoleAppServiceImpl`
- `GraphServiceImpl`

Repo index ~537 files; RBAC nằm ở `nckh-domain` + `nckh-application` + `nckh-controller`. Graph không thấy unit test cho `AccessEvaluator`.
