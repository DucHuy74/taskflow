# Đồ thị S–V–O 3D (React Three Fiber + d3-force-3d)

Tài liệu này mô tả màn hình đồ thị hiện tại của TaskFlow: dữ liệu đến từ đâu, component được dựng thế nào, cách người dùng thao tác, và cách tái sử dụng component 3D ở màn hình khác. Bản này thay thế đặc tả fCoSE trước đây; Cytoscape/fCoSE đã được gỡ khỏi dự án.

Ảnh minh hoạ: [`img/story-graph-3d-light.png`](img/story-graph-3d-light.png), [`img/story-graph-3d-dark.png`](img/story-graph-3d-dark.png), [`img/sprint-graph-3d-light.png`](img/sprint-graph-3d-light.png).

---

## 1. Mục tiêu

- Cho thấy **bức tranh toàn cảnh ngữ nghĩa** của backlog: ai (Subject) làm gì (Action) với cái gì (Object).
- **Chỉ hiển thị node S, V, O.** Node User Story và cạnh `RELATES_TO` bị lược bỏ vì chúng nhân đôi số node và làm rối bố cục.
- Dùng không gian 3D để giảm chồng chéo khi số term tăng, trong khi vẫn giữ hướng đọc **S → V → O** (Subject lệch trái, Action ở giữa, Object lệch phải).
- Có phương án thay thế dễ tiếp cận: chế độ **bảng** cho bàn phím và trình đọc màn hình.

## 2. Luồng dữ liệu

```text
User story ──RabbitMQ──▶ analyze_user_stories (spaCy + word2vec)
                              │  trích S–V–O, chuẩn hoá term
                              ▼
                           Neo4j
   (:Term:Subject|:Action|:Object {name, workspace_id, degree, betweenness})
   (s)-[:PERFORM {story_id, sprint_id, backlog_id, source}]->(v)
   (v)-[:TARGET  {…}]->(o)
   (t)-[:SIMILAR {score}]->(t)   (t)-[:ASSOCIATED {confidence, lift}]->(t)
                              │
                              ▼
        BE  POST /api/graphql  → query workspaceGraph
                              │
                              ▼
  FE graphService → adaptGraphData → toSvoGraph → <ForceGraph3D/>
```

- **Realtime:** khi tạo hoặc di chuyển story, analyzer ghi cạnh `PERFORM`/`TARGET` với `source = REALTIME`.
- **Batch:** nút **Rebuild graph** gọi `POST /api/workspace/{id}/rebuild-graph`. Analyzer xoá graph của workspace rồi ghi lại toàn bộ cạnh S–V–O (`BATCH`), `SIMILAR`, `ASSOCIATED`, priority và betweenness, sau đó gắn lại nhãn vai trò `:Subject`/`:Action`/`:Object`.

### 2.1. Contract GraphQL

```graphql
workspaceGraph(
  workspaceId: ID!
  sprintId: ID
  backlogId: ID
  source: String              # null = gộp REALTIME + BATCH; chỉ lọc cạnh PERFORM/TARGET
  includeSimilarity: Boolean = true
  includeAssociation: Boolean = true
  minScore: Float = 0.0
  minConfidence: Float = 0.0
): GraphResponse

type GraphNode {
  id: ID!  label: String!  type: String!   # SUBJECT | ACTION | OBJECT | TERM (nhiều vai trò) | USER_STORY
  priority: Float  degree: Int  betweenness: Float
  roles: [String!]!                          # mọi vai trò của term
  graphRelevanceScore: Float  duplicateScore: Float   # chỉ có ở USER_STORY
}

type GraphEdge {
  from: ID!  to: ID!  type: String!          # PERFORM | TARGET | SIMILAR | ASSOCIATED | RELATES_TO
  score: Float  confidence: Float  lift: Float
  storyId: ID  storyIds: [ID!]  weight: Int  # weight = số story tạo ra quan hệ S–V–O
  sprintId: ID  backlogId: ID  source: String
}
```

FE gọi qua biến GraphQL trong [`src/services/graphService.ts`](../src/services/graphService.ts), không nối chuỗi vào query:

- **Workspace:** `graphService.getBacklogGraph(workspaceId)` gộp realtime và batch, lấy `minScore = 0.5` và `minConfidence = 0.3`.
- **Sprint:** `graphService.getSprintGraph(workspaceId, sprintId)` dùng thêm bộ lọc `sprintId`.

## 3. Chuẩn hoá dữ liệu ở FE

File [`src/lib/graph/graphModel.ts`](../src/lib/graph/graphModel.ts).

### 3.1. `adaptGraphData(data)`

- Loại node trùng, cạnh treo (đầu mút không tồn tại) và cạnh tự vòng; mỗi trường hợp ghi một `warnings[]`.
- Chuẩn hoá tên loại (ví dụ `VERB` → `ACTION`, `SIMILARITY` → `SIMILAR`).
- **Xác định vai trò** từ hợp của ba nguồn:
  1. `roles` từ backend (nhãn Neo4j cộng với cạnh);
  2. `type` từ backend, nếu là S/V/O;
  3. suy luận từ cạnh: đầu `PERFORM` là Subject, đuôi `PERFORM` hoặc đầu `TARGET` là Action, đuôi `TARGET` là Object.

  Đúng một vai trò thì `type` là vai trò đó. Nhiều vai trò thì `type = 'TERM'` (term đa vai trò, ví dụ "backlog" vừa là Subject vừa là Object).
- Tính `degree`, `betweenness` (Brandes, có lấy mẫu khi graph trên 160 node) nếu backend không trả, rồi tính `structure = 0.5·degree + 0.5·betweenness` (đã chuẩn hoá).

### 3.2. `toSvoGraph(graph)`

- Giữ node `SUBJECT | ACTION | OBJECT | TERM` và cạnh `PERFORM | TARGET | SIMILAR | ASSOCIATED`.
- Bỏ `USER_STORY` và `RELATES_TO`, bỏ term `TERM` bị cô lập sau khi lọc, rồi tính lại `degree` và `structure` trên graph đã lọc.

### 3.3. Hiển thị vai trò

- `roleName(type)` trả về `Subject`, `Action (verb)`, `Object`, `Mixed-role term`.
- `describeRoles(node)` trả về chuỗi như `Subject + Object` cho term đa vai trò.

### 3.4. Liên kết term ↔ user story

- Mỗi cạnh `PERFORM`/`TARGET` giữ `storyIds` (từ BE).
- `storyIdsForNode(graph, nodeId)` trả về các story có bộ ba S–V–O chứa term đó; cạnh SIMILAR/ASSOCIATED được bỏ qua.
- `termIdsForStory(graph, storyId)` trả về các term của một story, dùng để highlight.
- Component `NodeStoriesPanel` (`src/components/graph/NodeStoriesPanel.tsx`) tải từng story qua `GET /user-stories/{id}`, hiện tên sprint, và đổi trạng thái qua `useStoryStatusMutation`. Trang graph workspace và graph sprint đều dùng component này.

## 4. Component `ForceGraph3D`

File [`src/components/graph/ForceGraph3D.tsx`](../src/components/graph/ForceGraph3D.tsx).

### 4.1. Props và handle

```ts
interface ForceGraph3DProps {
  graph: VisualGraph;            // đầu ra của toSvoGraph(adaptGraphData(...))
  storageKey: string;            // khoá localStorage để lưu node đã ghim
  selectedNodeId: string | null; // node đang chọn (do trang quản lý)
  searchQuery?: string;          // làm nổi term khớp + hàng xóm
  className?: string;            // thường dùng để đặt chiều cao
  highlightIds?: ReadonlySet<string> | null; // giữ sáng một nhóm term, ví dụ termIdsForStory(graph, storyId)
  onNodeSelected: (node: VisualGraphNode | null) => void; // nên bọc useCallback
}

interface ForceGraph3DHandle {   // qua ref
  fit(): void; focusSelected(): void; resetLayout(): void;
  unpinSelected(): void; zoomIn(): void; zoomOut(): void;
}
```

### 4.2. Mô phỏng lực (d3-force-3d, 3 chiều)

| Lực | Cấu hình | Ý nghĩa |
|---|---|---|
| `link` | Cạnh S–V–O: khoảng cách 46, độ mạnh `0.55 + 0.15·weight` (tối đa 1). Cạnh SIMILAR/ASSOCIATED: khoảng cách 80, độ mạnh 0.12 | Quan hệ có nhiều story đứng sau thì kéo term lại gần nhau hơn |
| `charge` | −110, `distanceMax` 500 | Đẩy các node tách nhau |
| `collide` | bán kính node + 6 | Chống chồng khối |
| `lane` (forceX) | Subject −70, Action 0, Object +70, độ mạnh 0.06 | Giữ hướng đọc S → V → O |
| `gravityY`/`gravityZ` | 0.05 | Gom các thành phần rời thành một cụm |
| `center` | (0, 0, 0) | |

- Simulation được tạo với `.stop()` rồi tick thủ công trong `useFrame`, nên chỉ chạy khi alpha còn lớn hơn `alphaMin`.
- Khi alpha xuống dưới `0.03`, nhãn "Arranging graph…" tắt và camera tự fit một lần.
- Khi dữ liệu đổi, các node cũ **giữ nguyên toạ độ** (alpha khởi động lại ở 0.4 thay vì 1), nên bố cục không bị xáo trộn.
- Với `prefers-reduced-motion`: tick 300 bước đồng bộ, không animate camera, không có nút auto-rotate.

### 4.3. Hiển thị

- **Hình khối theo vai trò** (để không chỉ dựa vào màu):
  - Subject: hình cầu, màu xanh dương;
  - Action: bát diện, màu tím;
  - Object: lập phương, màu cyan;
  - term đa vai trò: khối mười hai mặt, màu xám.
- **Kích thước** tỉ lệ với `log(1 + degree)`.
- **Bảng màu** có hai bộ `LIGHT` và `DARK`, đổi theo `useTheme()`; nền canvas và sương mù (fog) đi theo theme để tạo chiều sâu.
- **Cạnh** gồm hai `lineSegments`, mỗi cái là một BufferGeometry được ghi lại mỗi frame:
  - S–V–O: nét liền, màu chuyển từ màu node nguồn sang màu node đích (thể hiện hướng);
  - SIMILAR/ASSOCIATED: nét đứt.
- **Nhãn** dùng drei `<Html>`:
  - graph có tối đa 24 node: hiện toàn bộ nhãn;
  - graph lớn hơn: chỉ hiện 12 term có `structure` cao nhất, cộng với các node đang hover, đang chọn hoặc là hàng xóm của chúng.
  - Nhãn luôn được mount sẵn và chỉ bật/tắt bằng CSS, vì mỗi `<Html>` là một React root riêng.
- **Làm nổi:**
  - Node đang chọn hoặc hover có vòng torus màu hổ phách.
  - Node không liên quan giảm opacity xuống 0.22.
  - Node đã ghim có chấm xanh lá phía trên.

### 4.4. Tương tác

| Thao tác | Kết quả |
|---|---|
| Kéo nền (chuột trái) | Xoay camera (OrbitControls, có damping) |
| Chuột phải / hai ngón kéo | Pan |
| Cuộn / pinch | Zoom |
| Hover node | Con trỏ thành `pointer`, làm nổi hàng xóm 1 bước, hiện thẻ thông tin góc phải |
| Click node | Chọn node, cập nhật panel Insights: số liệu và **danh sách user story dùng term đó** |
| Panel: ô trạng thái của story | Đổi To do / In progress / Done ngay trong graph; chỉ hiện khi sprint của story đang `InProgress`, các trường hợp khác có dòng giải thích |
| Panel: "Highlight in graph" | Làm nổi đường S → V → O của đúng story đó (prop `highlightIds`) |
| Double-click node | Mở rộng vùng làm nổi ra 2 bước |
| Kéo node | Ghim node tại vị trí thả (lưu vào `localStorage[storageKey]`) |
| Click vùng trống / `Esc` | Bỏ chọn |
| Ô tìm kiếm | Làm nổi các term khớp và hàng xóm của chúng |
| Nút điều khiển góc phải dưới | Zoom +/−, Fit, Focus vùng lân cận, Bỏ ghim, Tự xoay, Reset layout và ghim |

### 4.5. Trợ năng và hiệu năng

- Vùng canvas có `role="img"` và `aria-label` mô tả số term và số quan hệ.
- Mọi nút điều khiển có `aria-label` và vùng chạm 44×44 px.
- Chế độ **Table view** liệt kê đầy đủ term và chỉ số, thao tác được bằng bàn phím.
- Khi trình duyệt không có WebGL, `Canvas` hiện thông báo gợi ý chuyển sang bảng.
- three.js, R3F và d3-force-3d nằm trong chunk riêng `vendor-three` (khoảng 240 KB gzip), chỉ tải khi mở trang graph. Cấu hình trong `vite.config.ts`.
- Khuyến nghị dùng cho dưới 500 term. Nếu vượt quá, nên hạ `LABEL_TOP_COUNT` và tạm tắt cạnh SIMILAR/ASSOCIATED (`includeSimilarity: false`).

## 5. Hướng dẫn sử dụng (người dùng cuối)

1. Mở workspace, chọn tab **Story map**. Hoặc từ Sprint board bấm **View Graph** để xem graph theo sprint.
2. Đợi nhãn "Arranging graph…" tắt. Camera tự căn để thấy toàn bộ.
3. Đọc graph theo chiều trái sang phải: khối cầu (người dùng/vai trò), qua bát diện (hành động), tới lập phương (đối tượng). Nét đứt là quan hệ tương đồng hoặc đồng xuất hiện do batch phân tích ra.
4. Click một term để xem `Degree`, `Betweenness`, `Structure` ở panel bên phải. Danh sách **Bridge terms** xếp hạng các term nối nhiều cụm với nhau, là ứng viên cần thống nhất thuật ngữ.
5. Thêm story mới hoặc bị thiếu quan hệ tương đồng: bấm **Rebuild graph** (cần quyền `WORKSPACE_ADMINISTER`). API trả về `jobId`; trang tự theo dõi `GET /workspaces/{id}/recommendation-jobs/latest` mỗi 2 giây, hiện giai đoạn và % cạnh nút, rồi tự tải lại graph khi job `SUCCEEDED` (báo lỗi nếu `FAILED`).
6. Bố cục bị rối: bấm nút **Reset layout and pins**.

## 6. Áp dụng bản 3D cho màn hình khác

Ví dụ: graph cho một tập story tuỳ chọn.

```tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ForceGraph3D, type ForceGraph3DHandle } from '@/components/graph/ForceGraph3D';
import { adaptGraphData, describeRoles, toSvoGraph, type VisualGraphNode } from '@/lib/graph/graphModel';
import { graphService } from '@/services/graphService';

export function MyGraphPanel({ workspaceId, sprintId }: { workspaceId: string; sprintId?: string }) {
  const ref = useRef<ForceGraph3DHandle>(null);
  const [selected, setSelected] = useState<VisualGraphNode | null>(null);
  const { data } = useQuery({
    queryKey: ['my-graph', workspaceId, sprintId],
    queryFn: () => graphService.getBacklogGraph(workspaceId, { sprintId, includeAssociation: false }),
  });
  // 1) chuẩn hoá  2) chỉ giữ S–V–O
  const graph = useMemo(() => toSvoGraph(adaptGraphData(data ?? { nodes: [], edges: [] })), [data]);
  const onSelect = useCallback((node: VisualGraphNode | null) => setSelected(node), []); // phải ổn định

  return (
    <>
      <ForceGraph3D
        ref={ref}
        graph={graph}
        storageKey={`taskflow:graph3d:custom:${workspaceId}:${sprintId ?? 'all'}`}
        selectedNodeId={selected?.id ?? null}
        onNodeSelected={onSelect}
        className="h-[520px]"
      />
      {selected && <p>{selected.label} — {describeRoles(selected)}</p>}
      <button onClick={() => ref.current?.focusSelected()}>Focus</button>
    </>
  );
}
```

Lưu ý khi áp dụng:

- **Bắt buộc bọc trong `ThemeProvider`** vì component dùng `useTheme()`. App đã bọc sẵn ở `App.tsx`.
- **`onNodeSelected` phải ổn định** (dùng `useCallback`), nếu không listener `Escape` sẽ bị gắn lại ở mỗi lần render.
- **`storageKey` phải duy nhất theo ngữ cảnh**, nếu không vị trí ghim của màn hình này sẽ đè lên màn hình khác.
- **Đặt chiều cao qua `className`.** Component có `min-h-[560px]`; muốn thấp hơn thì ghi đè, ví dụ `min-h-0 h-[420px]`.
- **Muốn hiện cả User Story** (ví dụ màn hình chi tiết): truyền thẳng `adaptGraphData(...)` mà không qua `toSvoGraph`. Story được vẽ bằng khối mười hai mặt màu xám.
- **Tinh chỉnh bố cục:** sửa các hằng số `SVO_LANE`, `LABEL_ALL_THRESHOLD`, `LABEL_TOP_COUNT`, `SETTLED_ALPHA` và cấu hình lực trong `Scene` (mục 4.2).
- **Thêm loại cạnh mới:** khai báo trong `GraphEdgeType` và `normalizeEdgeType`, thêm vào `SVO_EDGE_TYPES` trong `toSvoGraph`, rồi quyết định nó thuộc nhóm nét liền (`FLOW_EDGES`) hay nét đứt.

## 7. Kiểm thử

| Loại | Lệnh / file |
|---|---|
| Unit (mô hình graph, vai trò, lọc S–V–O) | `npx vitest run --config vitest.config.ts src/__tests__/graph` |
| Unit (GraphQL variables) | `src/__tests__/services/graphService.test.ts` |
| E2E hồi quy | `npx playwright test tests/e2e/graph-regression.spec.ts`: kiểm tra canvas WebGL, nhãn, số Subject |
| Ảnh tài liệu | `npm run dev` rồi `npm run screenshots` (`scripts/screenshots/capture.cjs`): chụp lại `docs/img/*.png` bằng Playwright với API giả lập (`mock-api.cjs`), cả light và dark. Chụp một trang: `npm run screenshots -- story-graph-3d` |

## 8. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Mọi node đều xám (Mixed-role) | Neo4j chưa có nhãn vai trò, hoặc term thật sự đa vai trò | Chạy `python scripts/backfill_term_role_labels.py` trong `analyze_user_stories`, hoặc Rebuild graph |
| Không có cạnh nét đứt | Chưa chạy batch, hoặc ngưỡng `minScore`/`minConfidence` quá cao | Rebuild graph; hạ ngưỡng trong `getBacklogGraph` |
| "No graph data yet" | Story chưa được analyzer xử lý (RabbitMQ hoặc consumer chưa chạy) | Kiểm tra `consumer.py` và `batch_runner.py` |
| Màn hình trắng / thông báo WebGL | Trình duyệt hoặc máy ảo tắt tăng tốc phần cứng | Bật hardware acceleration, hoặc dùng Table view |
| Cảnh báo "synchronously unmount a root" trong console dev | StrictMode mount 2 lần các `<Html>` của drei | Chỉ xuất hiện ở dev, bản production không có |
