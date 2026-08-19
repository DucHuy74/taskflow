# Plan: Enhance React Frontend cho TaskFlow Application

## Context

Người dùng muốn xây dựng lại frontend React tại `fe_web/` dựa trên:
- **Backend APIs** đã implement trong `be/nckh/nckh-controller/` (7 controllers)
- **Frontend Flutter MVVM** đã có tại `frontend-mvvm/` với đầy đủ UI components

Frontend React hiện tại chỉ là template Vite rỗng, cần được enhance để tương thích với backend và replicate giao diện Jira-like.

---

## Recommended Approach

### 1. Cài đặt Dependencies

```bash
npm install react-router-dom zustand axios @tanstack/react-query clsx tailwind-merge lucide-react date-fns
npm install -D tailwindcss postcss autoprefixer
```

### 2. Cấu trúc Project

```
fe_web/frontend/src/
├── api/                      # API client với interceptors
│   ├── apiClient.js          # Axios instance
│   ├── authService.js
│   ├── workspaceService.js
│   ├── userStoryService.js
│   ├── sprintService.js
│   └── notificationService.js
│
├── stores/                   # Zustand stores (thay thế ViewModels)
│   ├── authStore.js
│   ├── workspaceStore.js
│   ├── backlogStore.js
│   └── notificationStore.js
│
├── components/              # UI components
│   ├── ui/                  # Base: Button, Input, Modal, Badge, etc.
│   ├── auth/                # LoginForm, RegisterForm
│   ├── layout/              # Sidebar, Header, AppLayout
│   └── backlog/             # BacklogSection, SprintCard, UserStoryCard
│
├── pages/                    # Pages
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── HomePage.jsx
│   ├── WorkspacePage.jsx
│   ├── SprintBoardPage.jsx
│   └── ProfilePage.jsx
│
├── contexts/                # React Context
│   ├── AuthContext.jsx
│   └── ThemeContext.jsx
│
├── hooks/                   # Custom hooks
│   └── useTheme.js
│
├── styles/                  # CSS
│   └── index.css           # Tailwind + theme variables
│
├── App.jsx                  # Router setup
└── main.jsx                # Entry point
```

### 3. API Client với Axios

```javascript
// api/apiClient.js
- Base URL: http://localhost:8080/api
- Request interceptor: Thêm Bearer token từ localStorage
- Response interceptor: Xử lý 401 → logout, refresh token
```

### 4. Authentication Flow (Keycloak OAuth2)

1. **Login**: Gọi Keycloak password grant
2. **Store tokens**: access_token, refresh_token, id_token, expires_at
3. **Auto-refresh**: Interceptor tự động refresh khi token hết hạn
4. **Protected routes**: Redirect về login nếu chưa authenticate

### 5. State Management - Zustand

| Store | State | Actions |
|-------|-------|---------|
| authStore | user, isAuthenticated, isLoading | login, logout, checkAuth |
| workspaceStore | workspaces, currentWorkspace | fetchWorkspaces, createWorkspace, selectWorkspace |
| backlogStore | backlogStories, sprints, sprintStories | fetchBacklog, createStories, updateStatus, addToSprint |
| sprintStore | sprints, activeSprint | createSprint, startSprint, completeSprint |

### 6. UI Components cần implement

| Component | Mô tả | Ưu tiên |
|-----------|-------|---------|
| `Sidebar` | Workspace list, navigation menu | HIGH |
| `Header` | Search, notifications, user menu | HIGH |
| `BacklogSection` | List user stories, create story form | HIGH |
| `SprintCard` | Sprint info, drag-drop stories | HIGH |
| `UserStoryCard` | User story item với status badge | HIGH |
| `CreateWorkspaceModal` | Form tạo workspace | HIGH |
| `CreateSprintModal` | Form tạo sprint với date picker | HIGH |
| `NotificationDropdown` | Popup notifications | MEDIUM |
| `LoginForm` | Login page | HIGH |
| `ProfilePage` | User profile | MEDIUM |

### 7. Pages/Routes

```
/login              - Login page
/register           - Registration page
/                   - Main layout (Protected)
/home               - Dashboard với workspace list
/workspaces/:id     - Workspace backlog view
/workspaces/:id/sprints/:sprintId - Sprint board
/profile            - User profile
```

### 8. Dark/Light Theme (Jira palette)

```css
/* Light */
--color-accent: #0052CC;
--color-bg-primary: #ffffff;
--color-text-primary: #172B4D;

/* Dark */
--color-accent: #579DFF;
--color-bg-primary: #1D2125;
--color-text-primary: #B6C2CF;
```

---

## Implementation Priority Order

### Phase 1: Foundation
1. Install dependencies + Tailwind config
2. Create API client với axios interceptors
3. Setup Zustand stores
4. Implement AuthContext + ProtectedRoute
5. Create Login page

### Phase 2: Core Features
6. Layout components (Sidebar, Header, AppLayout)
7. Home page với workspace list
8. Workspace CRUD
9. Backlog section + User story cards

### Phase 3: Sprint Management
10. Sprint creation dialog
11. Sprint board view
12. Add/remove stories from sprint
13. Start/complete sprint

### Phase 4: Additional Features
14. Notification system
15. Profile page
16. Dark/light theme toggle

---

## Verification

1. `npm run build` - Không lỗi
2. `npm run dev` - Dev server chạy
3. Test login/logout flow
4. Test workspace CRUD
5. Test backlog + sprint features
