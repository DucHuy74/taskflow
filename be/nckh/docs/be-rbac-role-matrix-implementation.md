# Backend RBAC implementation — Role matrix completion

- **Scope:** `be/nckh`
- **Source:** Code Graph trace + source-code review
- **Implemented:** 31 Aug 2026
- **Reference audit:** [`be-rbac-s3-jira-audit.md`](./be-rbac-s3-jira-audit.md)

## Verdict

| Metric | Before | After |
| --- | ---: | ---: |
| Permission matrix | 18 permissions | **33 permissions** |
| Default Jira-style roles | 3 / 3 | **3 / 3** |
| `WorkspaceAccess` persisted | Yes | Yes |
| `WorkspaceAccess` evaluated | No | **Yes** |
| Explicit resource `DENY` precedence | Yes | **Yes** |
| Domain RBAC tests | Missing | **Added** |
| Existing workspace/sprint/story/graph enforcement | Partial implementation | **Traced and protected** |

Backend hiện có một role matrix tập trung gồm ba role `ADMIN`, `MEMBER`, `VIEWER`, 33 permission chi tiết và resource grants theo dạng IAM statement. `OPEN`, `LIMITED`, `PRIVATE` không còn chỉ là dữ liệu hiển thị mà đã tham gia trực tiếp vào quyết định quyền.

## 1. Những phần đã triển khai

### Permission catalog

`Permission` đã được mở rộng thêm các nhóm quyền còn thiếu trong audit:

| Nhóm | Permission mới |
| --- | --- |
| Issue operations | `issue:Assign`, `issue:Link`, `issue:Move` |
| Issue administration | `issue:EditReporter`, `issue:EditDueDate` |
| Comments | `comment:Add`, `comment:Edit`, `comment:Delete` |
| Attachments | `attachment:Add`, `attachment:Delete` |
| Worklogs | `worklog:Add`, `worklog:Edit`, `worklog:Delete` |
| Watchers | `watcher:Manage` |
| Development | `development:View` |

Các permission cũ cho workspace, member, sprint, issue và ACL được giữ nguyên.

### `WorkspaceAccess` evaluation

`WorkspaceAccessServiceImpl` hiện xử lý người dùng đã đăng nhập nhưng chưa phải explicit member như sau:

| Workspace access | Implicit role | Kết quả |
| --- | --- | --- |
| `OPEN` | `MEMBER` | Có thể browse và thực hiện các thao tác của Member |
| `LIMITED` | `VIEWER` | Có thể browse/view và cộng tác giới hạn |
| `PRIVATE` | — | Từ chối nếu chưa phải member |

Implicit access không tự động tạo bản ghi `WorkspaceMember`. Backend tạo một access context tạm thời để việc đọc workspace không làm thay đổi membership.

Nếu workspace đã tùy chỉnh permission của `MEMBER` hoặc `VIEWER`, implicit access sử dụng role matrix đã lưu của workspace thay vì luôn dùng default matrix.

## 2. Role matrix sau khi hoàn thiện

### Workspace và member

| Permission | ADMIN | MEMBER | VIEWER |
| --- | :---: | :---: | :---: |
| `workspace:Browse` | Grant | Grant | Grant |
| `workspace:Administer` | Grant | — | — |
| `workspace:Delete` | Grant | — | — |
| `member:View` | Grant | Grant | Grant |
| `member:Invite` | Grant | — | — |
| `member:Manage` | Grant | — | — |

### Sprint

| Permission | ADMIN | MEMBER | VIEWER |
| --- | :---: | :---: | :---: |
| `sprint:View` | Grant | Grant | Grant |
| `sprint:Create` | Grant | Grant | — |
| `sprint:Edit` | Grant | Grant | — |
| `sprint:Manage` | Grant | Grant | — |

### Issue

| Permission | ADMIN | MEMBER | VIEWER |
| --- | :---: | :---: | :---: |
| `issue:View` | Grant | Grant | Grant |
| `issue:Create` | Grant | Grant | — |
| `issue:Edit` | Grant | Grant | — |
| `issue:Delete` | Grant | — | — |
| `issue:Transition` | Grant | Grant | — |
| `issue:Assign` | Grant | Grant | — |
| `issue:Link` | Grant | Grant | — |
| `issue:Move` | Grant | Grant | — |
| `issue:EditReporter` | Grant | — | — |
| `issue:EditDueDate` | Grant | — | — |

### Collaboration

| Permission | ADMIN | MEMBER | VIEWER |
| --- | :---: | :---: | :---: |
| `comment:Add` | Grant | Grant | Grant |
| `comment:Edit` | Grant | Grant | — |
| `comment:Delete` | Grant | Grant | — |
| `attachment:Add` | Grant | Grant | Grant |
| `attachment:Delete` | Grant | Grant | — |
| `worklog:Add` | Grant | Grant | — |
| `worklog:Edit` | Grant | Grant | — |
| `worklog:Delete` | Grant | Grant | — |
| `watcher:Manage` | Grant | Grant | — |
| `development:View` | Grant | Grant | — |

### Resource grants / ACL

| Permission | ADMIN | MEMBER | VIEWER |
| --- | :---: | :---: | :---: |
| `acl:Read` | Grant | Grant | Grant |
| `acl:Write` | Grant | — | — |
| `acl:FullControl` | Grant | — | — |

`ADMIN` dùng `EnumSet.allOf(Permission.class)`, vì vậy permission mới được thêm trong tương lai cũng mặc định thuộc Admin.

## 3. Luồng quyết định quyền sau cùng

Luồng chính:

`Controller` → application service → `WorkspaceAccessService.require*` → `AccessEvaluator.isAllowed`

Thứ tự evaluate:

1. Lấy current authenticated profile.
2. Nếu có explicit `WorkspaceMember`, dùng role của member đó.
3. Nếu chưa có membership:
   - `OPEN` tạo access context với role `MEMBER`;
   - `LIMITED` tạo access context với role `VIEWER`;
   - `PRIVATE` trả về `NO_PERMISSION`.
4. Load workspace grant và resource grant tương ứng.
5. Grant `DENY` khớp principal/action → từ chối ngay.
6. Grant `ALLOW` khớp principal/action → cho phép.
7. Nếu không có grant quyết định kết quả, kiểm tra permission trong role matrix.
8. `acl:FullControl` tiếp tục hoạt động như wildcard action.

Membership thật luôn được ưu tiên hơn implicit access. Ví dụ một explicit `VIEWER` trong workspace `OPEN` vẫn là `VIEWER`, không tự động được nâng thành `MEMBER`.

## 4. Enforcement surface đã trace

Các service hiện có gọi qua `WorkspaceAccessService`:

- `WorkspaceAppServiceImpl`
- `WorkspaceRoleAppServiceImpl`
- `SprintAppServiceImpl`
- `UserStoryAppServiceImpl`
- `GraphServiceImpl`

Các operation hiện tại đã có guard tương ứng:

| Operation | Permission |
| --- | --- |
| Update workspace | `workspace:Administer` |
| Delete workspace | `workspace:Delete` |
| Invite member | `member:Invite` |
| View members | `member:View` |
| Change role | `member:Manage` |
| Read/update role matrix | `workspace:Browse` / `workspace:Administer` |
| Read/write resource grants | `acl:Read` / `acl:Write` |
| Create/view/manage sprint | `sprint:Create` / `sprint:View` / `sprint:Manage` |
| Create/view/delete/transition story | Các permission `issue:*` tương ứng |
| Read/rebuild graph | Permission workspace tương ứng |

Invitation accept/deny và notification/profile APIs sử dụng ownership/current-user checks thay vì workspace role matrix vì đây là tài nguyên cá nhân hoặc pre-membership flow.

## 5. Tests đã bổ sung

### `AccessEvaluatorTest`

- Explicit `DENY` thắng cả role permission và explicit `ALLOW`.
- `acl:FullControl` cho phép mọi requested action.

### `DefaultPermissionMatrixTest`

- Admin có toàn bộ `Permission.values()`.
- Member có các quyền collaboration nhưng không có quyền admin/destructive.
- Viewer có browse/view, add comment và add attachment nhưng không được sửa hoặc transition issue.

Kết quả xác minh:

| Check | Result |
| --- | --- |
| Domain + application Maven tests | **Passed** |
| `git diff --check` | **Passed** |
| Full Maven reactor trên máy hiện tại | Dừng ở code dùng `List.getFirst()` vì môi trường là JDK 17, project yêu cầu JDK 21 |

Lỗi full reactor không nằm trong RBAC. Domain và application chứa toàn bộ thay đổi RBAC đã compile và test thành công.

## 6. Files liên quan

| File | Vai trò |
| --- | --- |
| `domain/model/enums/Permission.java` | Danh mục 33 permission |
| `domain/model/permission/DefaultPermissionMatrix.java` | Default role × permission matrix |
| `domain/service/AccessEvaluator.java` | Explicit deny/allow và role fallback |
| `application/service/access/impl/WorkspaceAccessServiceImpl.java` | Membership, access level và resource-scope evaluation |
| `application/service/role/impl/WorkspaceRoleAppServiceImpl.java` | API matrix, member role và grants |
| `controller/http/WorkspaceRoleController.java` | HTTP endpoints quản lý RBAC |
| `domain/service/AccessEvaluatorTest.java` | Tests grant precedence/full control |
| `domain/model/permission/DefaultPermissionMatrixTest.java` | Tests default role matrix |

## 7. Những phần chưa triển khai

Role matrix đã có permission cho comment, attachment, worklog, watcher, link/move và development tools, nhưng backend hiện chưa có các application service/controller tương ứng.

Khi các feature này được tạo, mỗi endpoint phải gọi `requireUserStory` hoặc `requireOnResource` với permission chuyên biệt. Chỉ thêm permission vào matrix không tự động bảo vệ một endpoint mới.

Các phần sau vẫn ngoài phạm vi implementation hiện tại:

- custom role ngoài ba enum `ADMIN`, `MEMBER`, `VIEWER`
- company-managed permission schemes
- IAM `Condition`, resource wildcard hoặc ARN
- public/anonymous principal
- reporter/assignee làm dynamic principal của resource grant

## Final status

Ma trận role mặc định và access-level evaluation đã hoàn thiện cho phạm vi backend hiện có. Backend đã sẵn sàng dùng các permission collaboration mới khi những module tương ứng được phát triển, đồng thời vẫn giữ nguyên explicit-deny precedence và khả năng tùy chỉnh permission theo từng workspace.
