# Đặc tả triển khai trực quan hóa đồ thị S–V–O bằng fCoSE

## 1. Mục đích tài liệu

Tài liệu này là đặc tả kỹ thuật dành cho Codex Agent hoặc lập trình viên triển khai lại màn hình đồ thị của Taskflow.

Mục tiêu chính:

- Thay thế Column Layout cố định bằng fCoSE.
- Hiển thị graph dưới dạng một bức tranh toàn cảnh, tận dụng tốt viewport.
- Vẫn duy trì hướng ngữ nghĩa `Subject -> Action -> Object`.
- Khi click một node, làm nổi node được chọn, các node liên quan và các cạnh liên quan.
- Giữ phần còn lại của graph làm bối cảnh bằng cách giảm opacity, không xóa khỏi màn hình.
- Hỗ trợ graph dưới 500 node với tương tác mượt trên web.
- Bảo toàn vị trí tương đối của graph khi cập nhật dữ liệu hoặc kéo thả node.

## 2. Bối cảnh và vấn đề hiện tại

Layout hiện tại phân bổ tọa độ theo ba cột:

```text
X(Subject) = 350
X(Action)  = 650
X(Object)  = 950

Y(0) = 200
Y(i) = Y(i - 1) + 120
```

Phương pháp này không dùng cấu trúc liên kết khi tính tọa độ. Khi số node tăng, chiều cao graph tăng tuyến tính, cạnh dài và chồng nhau, trong khi nhiều vùng viewport không được sử dụng. Các node thuộc cùng một User Story cũng không chắc nằm gần nhau.

Không được tiếp tục dùng Column Layout làm layout mặc định cho toàn bộ Workspace hoặc Sprint. Có thể giữ nó cho chế độ xem chi tiết một User Story nhỏ.

## 3. Quyết định kỹ thuật

Giải pháp được chốt:

```text
fCoSE
+ S–V–O relative-placement constraints
+ disconnected-component packing
+ Focus + Context
+ zoom-based Level of Detail
+ incremental/fixed layout để bảo toàn mental map
```

Frontend đề xuất:

```bash
npm install cytoscape cytoscape-fcose
```

Nếu muốn đóng gói tốt các thành phần rời rạc, kiểm tra và tích hợp thêm extension tương thích:

```bash
npm install cytoscape-layout-utilities
```

Codex Agent phải kiểm tra phiên bản thực tế, API và type definitions trong repository trước khi thêm dependency hoặc viết code. Không sao chép cấu hình trong tài liệu này mà không đối chiếu schema dữ liệu hiện tại.

## 4. Mô hình dữ liệu kỳ vọng

Mỗi node tối thiểu có:

```ts
type GraphNodeType = "SUBJECT" | "ACTION" | "OBJECT" | "USER_STORY";

interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  priority?: number;
  degree?: number;
  color?: string;
  position?: { x: number; y: number };
  pinned?: boolean;
}
```

Mỗi cạnh tối thiểu có:

```ts
type GraphEdgeType =
  | "PERFORM"
  | "TARGET"
  | "SIMILAR"
  | "ASSOCIATED"
  | "REDUNDANT_WITH"
  | "HAS_STORY";

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  weight?: number;
  storyId?: string;
}
```

Quy ước hướng cạnh:

```text
Subject --PERFORM--> Action --TARGET--> Object
```

Nếu API hiện tại sử dụng tên khác, phải tạo một adapter tại frontend thay vì rải logic chuyển đổi trong component hiển thị.

## 5. Cơ sở toán học của layout

### 5.1. Tọa độ node

Với mỗi node `i`, tọa độ cần tìm là:

$$
p_i=(x_i,y_i)
$$

Khoảng cách Euclid giữa hai node:

$$
d(p_i,p_j)=\lVert p_i-p_j\rVert_2
=\sqrt{(x_i-x_j)^2+(y_i-y_j)^2}
$$

### 5.2. Lực hút trên cạnh

Với cạnh `(i,j)`, có thể mô tả lực hút kiểu Fruchterman–Reingold:

$$
F_a(i,j)=w_{ij}\frac{\lVert p_i-p_j\rVert^2}{k}
$$

Vector lực hút từ `i` tới `j`:

$$
\vec{F}_a(i,j)=F_a(i,j)
\frac{p_j-p_i}{\lVert p_j-p_i\rVert+\varepsilon}
$$

Trong đó:

- $w_{ij}$: trọng số quan hệ.
- $k$: chiều dài cạnh lý tưởng.
- $\varepsilon$: số dương rất nhỏ để tránh chia cho 0.

Lực hút giữ các node có quan hệ gần nhau.

### 5.3. Lực đẩy giữa các node

$$
F_r(i,j)=\frac{k^2}{\lVert p_i-p_j\rVert+\varepsilon}
$$

Vector lực đẩy:

$$
\vec{F}_r(i,j)=F_r(i,j)
\frac{p_i-p_j}{\lVert p_i-p_j\rVert+\varepsilon}
$$

Lực đẩy ngăn node chồng lên nhau và tạo khoảng trống giữa các cluster.

Lưu ý: phần frontend không nhất thiết tự hiện thực vòng lặp vật lý này. fCoSE đảm nhiệm layout; công thức được dùng để mô tả cơ sở lý thuyết và hỗ trợ đánh giá tham số.

### 5.4. Stress Function

Stress đo sai lệch giữa khoảng cách hình học trên canvas và khoảng cách topology trong graph:

$$
E_{stress}(P)=
\sum_{i<j}w_{ij}
\left(\lVert p_i-p_j\rVert-d_{ij}\right)^2
$$

Trong đó:

- $d_{ij}$: khoảng cách đường đi ngắn nhất giữa `i` và `j` trên graph.
- $p_i,p_j$: vị trí hai node trên canvas.
- $w_{ij}=d_{ij}^{-2}$: ưu tiên bảo toàn khoảng cách giữa các node gần nhau về topology.

Mục tiêu:

$$
P^*=\arg\min_P E_{stress}(P)
$$

Nếu hai node nối trực tiếp, $d_{ij}=1$ nên thuật toán ưu tiên giữ chúng gần nhau. Hai node cách nhau nhiều bước có thể nằm xa nhau hơn.

### 5.5. Ràng buộc ngữ nghĩa S–V–O

Không đặt toàn bộ Subject, Action và Object vào ba giá trị X cố định. Chỉ duy trì thứ tự tương đối cho từng triple:

$$
S\rightarrow V\rightarrow O
$$

Ràng buộc:

$$
x_V-x_S\geq g_{SV}
$$

$$
x_O-x_V\geq g_{VO}
$$

Trong đó $g_{SV}$ và $g_{VO}$ là khoảng cách tối thiểu, khởi tạo trong khoảng 80–120 px.

Hàm phạt tổng quát:

$$
E_{SVO}=
\sum_{(S,V)}\max(0,g_{SV}-(x_V-x_S))^2
+
\sum_{(V,O)}\max(0,g_{VO}-(x_O-x_V))^2
$$

Ý nghĩa:

- Subject có xu hướng nằm bên trái Action.
- Action có xu hướng nằm bên trái Object.
- Node vẫn được tự do di chuyển để tạo cluster.
- Node dùng chung giữa nhiều story có thể trở thành node trung tâm.
- Graph không bị kéo thành ba cột cứng.

### 5.6. Phạt node chồng nhau

Với bán kính hiển thị $r_i,r_j$ và padding $m$:

$$
d_{ij}^{min}=r_i+r_j+m
$$

$$
E_{overlap}=
\sum_{i<j}
\max(0,d_{ij}^{min}-\lVert p_i-p_j\rVert)^2
$$

Nếu hai node đủ xa, penalty bằng 0. Nếu node chồng nhau, penalty tăng theo bình phương mức giao lấn.

### 5.7. Kích thước node theo degree hoặc priority

Nếu dùng degree để biểu diễn mức độ kết nối:

$$
r_i=r_{min}+(r_{max}-r_{min})
\frac{\log(1+degree_i)}{\log(1+degree_{max})}
$$

Nếu dùng priority đã chuẩn hóa trong `[0,1]`:

$$
r_i=r_{min}+(r_{max}-r_{min})Priority_i
$$

Chỉ chọn một ý nghĩa chính cho kích thước node. Không đồng thời dùng size để biểu diễn cả degree lẫn priority nếu không có legend rõ ràng.

### 5.8. Bảo toàn mental map

Khi graph cập nhật hoặc chạy incremental layout, hạn chế làm các node cũ nhảy quá xa:

$$
E_{stability}=
\sum_i\omega_i\lVert p_i-p_i^{old}\rVert^2
$$

Quy ước trọng số:

- Node mới: $\omega_i=0$.
- Node bình thường: $\omega_i$ nhỏ.
- Node đang được chọn: $\omega_i$ lớn.
- Node người dùng đã kéo/pin: fixed position hoặc $\omega_i$ rất lớn.

### 5.9. Gravity và component packing

Để mỗi thành phần liên thông không trôi quá xa khỏi tâm component:

$$
E_{gravity}=\sum_i\lVert p_i-c_{component(i)}\rVert^2
$$

Trong đó $c_{component(i)}$ là tâm của thành phần liên thông chứa node `i`.

Sau khi layout từng component, cần packing các bounding box của component với padding đủ lớn để graph rời rạc vẫn tạo thành một bức tranh toàn cảnh cân bằng.

### 5.10. Hàm mục tiêu tổng hợp

Mô hình tổng quát dùng để mô tả yêu cầu layout:

$$
E(P)=
\lambda_1E_{stress}
+\lambda_2E_{SVO}
+\lambda_3E_{overlap}
+\lambda_4E_{stability}
+\lambda_5E_{gravity}
$$

Bộ trọng số định hướng cho thực nghiệm:

$$
\lambda_1=1.0,\quad
\lambda_2=1.5,\quad
\lambda_3=2.0,\quad
\lambda_4=0.3,\quad
\lambda_5=0.05
$$

Đây không phải các hằng số tối ưu phổ quát. Khi dùng fCoSE, phải ánh xạ ý nghĩa của chúng sang các tham số mà thư viện thực sự hỗ trợ và tinh chỉnh bằng dữ liệu thật.

## 6. Xây dựng ràng buộc fCoSE

Không tạo global alignment như sau:

```ts
// KHÔNG LÀM: cách này tái tạo ba cột cứng.
alignmentConstraint: {
  vertical: [allSubjects, allActions, allObjects]
}
```

Thay vào đó, tạo relative-placement constraint từ từng cạnh S–V–O:

```ts
function buildSvoConstraints(edges: GraphEdge[]) {
  return edges.flatMap((edge) => {
    if (edge.type === "PERFORM") {
      return [{
        left: edge.source,
        right: edge.target,
        gap: 100
      }];
    }

    if (edge.type === "TARGET") {
      return [{
        left: edge.source,
        right: edge.target,
        gap: 100
      }];
    }

    return [];
  });
}
```

Trước khi truyền constraints cho fCoSE, phải:

1. Loại constraint trùng lặp.
2. Bỏ constraint có source hoặc target không tồn tại.
3. Phát hiện cycle bất hợp lệ trong các ràng buộc trái–phải.
4. Nếu cùng một node đóng nhiều vai trò gây xung đột, ưu tiên topology và ghi log cảnh báo thay vì làm layout thất bại.
5. Không tạo constraint từ các cạnh `SIMILAR`, `ASSOCIATED` hoặc `REDUNDANT_WITH`.

## 7. Cấu hình fCoSE khởi đầu

```ts
const layoutOptions = {
  name: "fcose",
  quality: "default",
  randomize: true,
  animate: true,
  animationDuration: 700,
  fit: true,
  padding: 60,

  nodeDimensionsIncludeLabels: true,
  uniformNodeDimensions: false,
  packComponents: true,

  idealEdgeLength: 110,
  nodeRepulsion: 7500,
  edgeElasticity: 0.35,
  nestingFactor: 0.1,
  gravity: 0.2,
  gravityRange: 3.8,
  numIter: 2500,

  tile: true,
  tilingPaddingVertical: 40,
  tilingPaddingHorizontal: 40,

  relativePlacementConstraint: buildSvoConstraints(edges)
};
```

Các giá trị trên là baseline để thử nghiệm, không phải cấu hình cuối cùng.

Quy tắc tuning:

- Node chồng nhau: tăng `nodeRepulsion`, padding hoặc `idealEdgeLength`.
- Graph quá rời: tăng gravity vừa phải hoặc giảm `idealEdgeLength`.
- Cạnh quá cứng/dài: điều chỉnh `edgeElasticity`.
- Label làm node va chạm: bật `nodeDimensionsIncludeLabels` và kiểm tra `quality` tương thích.
- Component rời rạc phân bố xấu: kiểm tra extension packing và `packComponents`.
- Layout quá chậm: giảm `numIter`, dùng `quality: "draft"` khi preview rồi chạy `default` khi ổn định.
- Không thay đổi camera hoặc chạy lại layout chỉ vì hover/click node.

## 8. Focus + Context khi click node

### 8.1. Tập node active

Giả sử node được chọn là $v_s$. Khoảng cách đường đi ngắn nhất từ $v_s$ tới node $v$ là:

$$
d_G(v_s,v)
$$

Với bán kính tương tác $h$, mặc định $h=1$:

$$
V_{active}(v_s,h)=
\{v\in V\mid d_G(v_s,v)\leq h\}
$$

### 8.2. Tập cạnh active

Tập cạnh nằm hoàn toàn trong neighborhood:

$$
E_{active}=
\{(u,v)\in E\mid u,v\in V_{active}\}
$$

Tập cạnh nối trực tiếp node được chọn:

$$
E_{incident}=
\{(u,v)\in E\mid u=v_s\lor v=v_s\}
$$

Đối với click một hop, ưu tiên highlight `E_incident`. `E_active` hữu ích khi mở rộng hai hop hoặc focus subgraph.

### 8.3. Độ mờ node

$$
Opacity(v)=
\begin{cases}
1.0,&v=v_s\\
0.95,&d_G(v_s,v)=1\\
0.12,&\text{còn lại}
\end{cases}
$$

### 8.4. Độ dày cạnh

$$
Width(e)=
\begin{cases}
4.0,&e\in E_{incident}\\
2.5,&e\in E_{active}\\
0.6,&\text{còn lại}
\end{cases}
$$

### 8.5. Màu cạnh

$$
Color(e)=
\begin{cases}
Color_{highlight},&e\in E_{active}\\
Color_{muted},&\text{còn lại}
\end{cases}
$$

Không dùng `display: none` cho phần graph không active. Phải dim để giữ bối cảnh tổng thể.

## 9. Quy tắc tương tác

### 9.1. Trạng thái mặc định

- Hiển thị toàn graph.
- Fit tất cả component vào viewport với padding.
- Edge opacity mặc định khoảng `0.20–0.35`.
- Node label được kiểm soát theo zoom.
- Edge label chỉ xuất hiện khi hover, selected hoặc zoom đủ lớn.
- Node size phản ánh một metric được định nghĩa rõ.

### 9.2. Hover node

- Làm nổi node và các cạnh trực tiếp.
- Không thay đổi camera.
- Không chạy lại layout.
- Hiển thị tooltip gồm label, type, priority, degree và số story liên quan.
- Khi mouse leave, trở về trạng thái selected hiện có; không xóa selection.

### 9.3. Click node

- Giữ node ở trạng thái selected.
- Highlight neighbor một hop.
- Làm đậm cạnh trực tiếp.
- Dim phần còn lại xuống khoảng `10–18%`.
- Hiển thị panel chi tiết bên phải.
- Không tự động zoom mạnh gây mất toàn cảnh.
- Chỉ `fit()` active neighborhood khi người dùng bấm nút Focus hoặc cấu hình UX yêu cầu rõ ràng.
- Click background hoặc nhấn `Escape` để reset.

### 9.4. Double-click node

- Mở rộng tới hai hop hoặc mở Story Flow Mode.
- Không dùng hai hop làm mặc định vì node degree cao có thể kích hoạt gần như toàn graph.

### 9.5. Kéo node

- Lưu tọa độ mới vào state phù hợp.
- Pin node bằng fixed constraint.
- Nếu cần cân bằng lại graph, chỉ chạy incremental layout.
- Có nút `Unpin node` và `Reset layout`.
- Không ghi vị trí vào backend nếu repository hiện tại chưa có yêu cầu lưu layout; có thể dùng local state/local storage trước.

## 10. Mẫu xử lý click bằng Cytoscape.js

```ts
function focusNode(cy: cytoscape.Core, nodeId: string) {
  cy.batch(() => {
    const selected = cy.getElementById(nodeId);

    if (selected.empty()) {
      return;
    }

    const neighborhood = selected.closedNeighborhood();
    const incidentEdges = selected.connectedEdges();

    cy.elements().removeClass(
      "focused related dimmed active-edge"
    );

    cy.nodes().addClass("dimmed");
    cy.edges().addClass("dimmed");

    selected
      .removeClass("dimmed")
      .addClass("focused");

    neighborhood
      .nodes()
      .removeClass("dimmed")
      .addClass("related");

    incidentEdges
      .removeClass("dimmed")
      .addClass("active-edge");
  });
}

function clearFocus(cy: cytoscape.Core) {
  cy.elements().removeClass(
    "focused related dimmed active-edge"
  );
}

cy.on("tap", "node", (event) => {
  focusNode(cy, event.target.id());
});

cy.on("tap", (event) => {
  if (event.target === cy) {
    clearFocus(cy);
  }
});
```

Trong React, phải unregister event listeners trong cleanup của `useEffect` và destroy Cytoscape instance khi component bị unmount để tránh đăng ký listener nhiều lần và memory leak.

## 11. Style đề xuất

```ts
const graphStyle: cytoscape.Stylesheet[] = [
  {
    selector: "node",
    style: {
      width: "mapData(priority, 0, 1, 22, 48)",
      height: "mapData(priority, 0, 1, 22, 48)",
      label: "data(label)",
      "font-size": 10,
      "text-wrap": "ellipsis",
      "text-max-width": 90,
      "background-color": "data(color)",
      "border-width": 2,
      "border-color": "#ffffff",
      "transition-property":
        "opacity, border-width, border-color, width, height",
      "transition-duration": "180ms"
    }
  },
  {
    selector: "edge",
    style: {
      width: 1.2,
      opacity: 0.3,
      "curve-style": "bezier",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.8,
      "line-color": "#94a3b8",
      "target-arrow-color": "#94a3b8",
      "transition-property":
        "opacity, width, line-color, target-arrow-color",
      "transition-duration": "180ms"
    }
  },
  {
    selector: ".dimmed",
    style: {
      opacity: 0.12,
      "text-opacity": 0
    }
  },
  {
    selector: "node.related",
    style: {
      opacity: 0.95,
      "border-width": 3,
      "border-color": "#f59e0b"
    }
  },
  {
    selector: "node.focused",
    style: {
      opacity: 1,
      "border-width": 6,
      "border-color": "#ef4444",
      "z-index": 999
    }
  },
  {
    selector: "edge.active-edge",
    style: {
      opacity: 1,
      width: 4,
      "line-color": "#f59e0b",
      "target-arrow-color": "#f59e0b",
      "z-index": 998
    }
  }
];
```

Màu thực tế phải lấy từ design system hiện có. Cần đảm bảo contrast đủ rõ ở cả light mode và dark mode.

## 12. Level of Detail theo zoom

Định nghĩa:

$$
LOD(z)=
\begin{cases}
0,&z<0.45\\
1,&0.45\leq z<0.9\\
2,&z\geq0.9
\end{cases}
$$

Quy tắc:

- `LOD 0`: không hiện label, trừ node đang selected.
- `LOD 1`: hiện label của node degree cao, priority cao hoặc active.
- `LOD 2`: hiện toàn bộ node label.
- Edge label chỉ hiện khi hover/selected hoặc `z >= 1.2`.

Ví dụ:

```ts
function updateLabelsByZoom(cy: cytoscape.Core) {
  const zoom = cy.zoom();

  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const active =
        node.hasClass("focused") ||
        node.hasClass("related");

      if (zoom < 0.45) {
        node.style("label", active ? node.data("label") : "");
        return;
      }

      if (zoom < 0.9) {
        const important =
          active ||
          node.degree() >= 4 ||
          Number(node.data("priority")) >= 0.7;

        node.style(
          "label",
          important ? node.data("label") : ""
        );
        return;
      }

      node.style("label", node.data("label"));
    });
  });
}

cy.on("zoom", updateLabelsByZoom);
```

Nên debounce hoặc throttle xử lý zoom nếu profiling cho thấy callback gây tốn CPU.

## 13. Edge Bundling

Không bật edge bundling làm mặc định vì người dùng cần lần chính xác chuỗi:

```text
Subject -> Action -> Object
```

Nếu bổ sung về sau:

- Chỉ bundle ở zoom thấp.
- Zoom trung bình/cao hiển thị từng cạnh.
- Luôn unbundle các cạnh active.
- Chỉ bundle cạnh cùng type hoặc cùng cluster.
- Không bundle `REDUNDANT_WITH` chung với `PERFORM`/`TARGET`.
- Ưu tiên giảm opacity trước khi triển khai bundling, vì bundling làm tăng độ phức tạp và có thể gây hiểu sai adjacency.

## 14. Hai chế độ hiển thị

### 14.1. Overview Mode – mặc định

Sử dụng fCoSE để:

- Xem toàn Workspace/Sprint.
- Nhận diện cluster và component.
- Tìm node trung tâm.
- Click để focus neighborhood.

### 14.2. Story Flow Mode

Chỉ hiển thị một story/subgraph nhỏ theo hướng:

```text
Subject -> Action -> Object
```

Có thể dùng layered layout hoặc bố trí tuyến tính. Column Layout chỉ được giữ trong chế độ này, không dùng cho graph toàn cảnh.

## 15. Chỉ số đánh giá layout

### 15.1. Số cạnh giao nhau

$$
C(P)=\sum_{e_i<e_j}I(e_i\cap e_j\neq\varnothing)
$$

Loại trừ hai cạnh có chung endpoint.

### 15.2. Hệ số node chồng nhau

$$
O(P)=
\frac{
\sum_{i<j}I(B_i\cap B_j\neq\varnothing)
}{
\binom{|V|}{2}
}
$$

Trong đó $B_i$ là bounding box của node `i`, bao gồm label nếu label đang hiển thị.

### 15.3. Độ lệch chiều dài cạnh

$$
\sigma_L=
\sqrt{
\frac{1}{|E|}
\sum_{e\in E}(l_e-\bar{l})^2
}
$$

### 15.4. Tỷ lệ sử dụng viewport

$$
U=
\frac{Area(BoundingBox(V))}{Area(Viewport)}
$$

Tỷ lệ quá nhỏ cho thấy graph bị co cụm và lãng phí viewport; quá lớn có thể gây clipping hoặc phải zoom quá xa.

### 15.5. Độ ổn định sau cập nhật

$$
M=
\frac{1}{|V_{old}|}
\sum_{i\in V_{old}}
\lVert p_i^{new}-p_i^{old}\rVert
$$

### 15.6. Tỷ lệ tuân thủ hướng S–V–O

Gọi $E_{SVO}=E_{PERFORM}\cup E_{TARGET}$:

$$
R_{SVO}=
\frac{
|\{(u,v)\in E_{SVO}:x_u<x_v\}|
}{|E_{SVO}|}
$$

## 16. Mục tiêu nghiệm thu

| Chỉ số | Mục tiêu ban đầu |
|---|---:|
| Node overlap | 0 trên bộ dữ liệu kiểm thử |
| $R_{SVO}$ | >= 0.90 |
| Node/cạnh active sau click | Phân biệt rõ 100% trong usability test |
| Thời gian layout 500 node | < 2 giây trên máy kiểm thử được ghi rõ cấu hình |
| Hover/click sau layout | Hướng tới 60 FPS |
| Stability khi thêm một story | Tốt hơn full randomized layout |
| Edge crossing | Giảm so với Column Layout trên cùng dữ liệu |

Mốc `< 2 giây` và `60 FPS` là mục tiêu sản phẩm, không phải kết quả đã được chứng minh. Phải benchmark thực tế trước khi đưa vào phần kết quả đồ án.

## 17. Lộ trình triển khai cho Codex Agent

### Giai đoạn 1 – khảo sát repository

1. Đọc `AGENTS.md` và hướng dẫn dự án nếu có.
2. Xác định framework React, package manager, component graph hiện tại và schema GraphQL/API.
3. Tìm `_calculateLayout`, logic pan/zoom/drag, edge rendering và state selection hiện tại.
4. Kiểm tra working tree; không ghi đè thay đổi không liên quan.
5. Xác định graph đang render bằng SVG, Canvas, Flutter migration code hay thư viện khác.
6. Viết kế hoạch thay đổi file trước khi triển khai.

### Giai đoạn 2 – thay nền tảng layout

1. Thêm Cytoscape.js và fCoSE bằng package manager hiện có.
2. Tạo adapter chuyển API response sang Cytoscape elements.
3. Tạo S–V–O relative constraints từ `PERFORM` và `TARGET`.
4. Bật component packing.
5. Chạy layout sau khi dữ liệu load và `fit` viewport đúng một lần.
6. Không chạy lại layout khi chỉ thay selection/style.

### Giai đoạn 3 – Focus + Context

1. Cài đặt state `selectedNodeId`.
2. Highlight một-hop neighborhood.
3. Làm đậm incident edges.
4. Dim phần còn lại, không hide.
5. Reset bằng click background và phím `Escape`.
6. Giữ selection khi hover kết thúc.

### Giai đoạn 4 – tăng khả năng đọc

1. Thêm label LOD theo zoom.
2. Thêm tooltip.
3. Thêm legend cho node type, edge type và size metric.
4. Thêm pin/unpin/reset layout.
5. Lưu vị trí cũ và dùng incremental layout khi phù hợp.

### Giai đoạn 5 – kiểm thử và đánh giá

1. Chuẩn bị dữ liệu 50, 100, 250 và 500 node.
2. Kiểm tra graph liên thông, graph nhiều component, hub degree cao và node label dài.
3. So sánh Column Layout và fCoSE.
4. Đo overlap, crossings, layout time, stability và $R_{SVO}$.
5. Chạy lint, type-check, unit/integration tests và production build.
6. Báo cáo rõ các test không thể chạy hoặc metric chưa đạt.

## 18. Yêu cầu bắt buộc đối với Codex Agent

- Không thay đổi backend/Neo4j nếu frontend đã nhận đủ node và edge cần thiết.
- Không tự suy đoán edge direction; kiểm tra schema/API trước.
- Không hard-code ID node.
- Không ép toàn bộ node cùng type vào một cột.
- Không chạy layout lại khi hover hoặc click.
- Không ẩn toàn bộ graph không liên quan khi focus.
- Không bật edge bundling trong phiên bản đầu.
- Không dùng hai-hop neighborhood làm mặc định.
- Không đưa các ngưỡng benchmark vào báo cáo như kết quả thực nghiệm nếu chưa đo.
- Phải cleanup Cytoscape instance và event listener khi React component unmount.
- Phải giữ giao diện responsive khi sidebar hoặc detail panel mở.
- Phải kiểm tra touch interaction nếu ứng dụng web có hỗ trợ màn hình cảm ứng.

## 19. Definition of Done

Tính năng chỉ được coi là hoàn thành khi:

- Graph mặc định dùng fCoSE ở Overview Mode.
- S–V–O giữ hướng trái sang phải trong phần lớn quan hệ.
- Các thành phần rời rạc được đóng gói trong viewport.
- Không có node overlap trên bộ dữ liệu kiểm thử chuẩn.
- Click node làm nổi selected node, neighbor và incident edges.
- Các thành phần không liên quan được dim nhưng vẫn nhìn thấy.
- Click background và `Escape` reset focus.
- Hover không làm mất selection.
- Drag/pin không làm toàn graph nhảy lại ngoài ý muốn.
- Label thay đổi hợp lý theo zoom.
- Layout không tự chạy lại do React re-render thông thường.
- Không có listener bị đăng ký lặp hoặc memory leak quan sát được.
- Type-check, lint, test và build liên quan đều pass.
- Có ảnh hoặc video so sánh trước/sau trên cùng một dataset.

## 20. Đoạn mô tả đề xuất cho mục 4.3.5.1 của báo cáo

> **4.3.5.1. Bố trí đồ thị dựa trên lực có ràng buộc ngữ nghĩa**
>
> Hệ thống sử dụng thuật toán fCoSE để bố trí đồ thị. Thuật toán kết hợp bố trí spectral với mô hình force-directed nhằm đưa các node có quan hệ lại gần nhau, đẩy các node không liên quan ra xa và hạn chế hiện tượng chồng lấn. Khác với phương pháp chia ba cột cố định, tọa độ node được xác định dựa trên topology của graph và các ràng buộc vị trí tương đối.
>
> Hàm mục tiêu tổng quát của bố cục được mô tả như sau:
>
> $$
> E(P)=
> \lambda_1E_{stress}
> +\lambda_2E_{SVO}
> +\lambda_3E_{overlap}
> +\lambda_4E_{stability}
> +\lambda_5E_{gravity}
> $$
>
> Đối với mỗi chuỗi Subject–Action–Object, hệ thống áp dụng các ràng buộc:
>
> $$
> x_{Action}-x_{Subject}\geq g
> $$
>
> $$
> x_{Object}-x_{Action}\geq g
> $$
>
> Các ràng buộc duy trì hướng đọc từ trái sang phải nhưng không ép toàn bộ node vào ba cột cố định. Nhờ đó, node dùng chung có thể trở thành trung tâm của cluster, các thành phần liên thông được bố trí gọn hơn và toàn bộ graph sử dụng không gian hiển thị cân bằng hơn.

## 21. Đoạn mô tả đề xuất cho Active Neighbor Search

> **Active Neighbor Search và Focus + Context**
>
> Khi người dùng chọn node $v_s$, hệ thống xác định các node active dựa trên khoảng cách đường đi ngắn nhất:
>
> $$
> V_{active}(v_s,h)=
> \{v\in V\mid d_G(v_s,v)\leq h\}
> $$
>
> Với tương tác mặc định, $h=1$. Tập cạnh active được xác định bởi:
>
> $$
> E_{active}=
> \{(u,v)\in E\mid u,v\in V_{active}\}
> $$
>
> Node được chọn, các node lân cận và cạnh liên quan được tăng độ đậm, trong khi phần còn lại giảm opacity nhưng không bị loại khỏi màn hình. Cách tiếp cận Focus + Context giúp người dùng tập trung vào quan hệ cần quan sát mà vẫn duy trì nhận thức về cấu trúc tổng thể của graph.

## 22. Tài liệu tham khảo

1. T. M. J. Fruchterman and E. M. Reingold, “Graph Drawing by Force-Directed Placement,” *Software: Practice and Experience*, vol. 21, no. 11, pp. 1129–1164, 1991. DOI: https://doi.org/10.1002/spe.4380211102
2. E. R. Gansner, Y. Koren, and S. North, “Graph Drawing by Stress Majorization,” *Graph Drawing 2004*, pp. 239–250. PDF: https://www.graphviz.org/documentation/GKN04.pdf
3. M. Jacomy, T. Venturini, S. Heymann, and M. Bastian, “ForceAtlas2, a Continuous Graph Layout Algorithm for Handy Network Visualization Designed for the Gephi Software,” *PLOS ONE*, vol. 9, no. 6, e98679, 2014. DOI: https://doi.org/10.1371/journal.pone.0098679
4. H. Balci and U. Dogrusoz, “fCoSE: A Fast Compound Graph Layout Algorithm with Constraint Support,” *IEEE Transactions on Visualization and Computer Graphics*, vol. 28, no. 12, pp. 4582–4593, 2022. DOI: https://doi.org/10.1109/TVCG.2021.3095303
5. H. C. Purchase, “Effective Information Visualisation: A Study of Graph Drawing Aesthetics and Algorithms,” *Interacting with Computers*, vol. 13, no. 2, pp. 147–162, 2000. DOI: https://doi.org/10.1016/S0953-5438(00)00032-1
6. D. Holten, “Hierarchical Edge Bundles: Visualization of Adjacency Relations in Hierarchical Data,” *IEEE Transactions on Visualization and Computer Graphics*, vol. 12, no. 5, pp. 741–748, 2006. DOI: https://doi.org/10.1109/TVCG.2006.147
7. Cytoscape.js Documentation: https://js.cytoscape.org/
8. fCoSE Cytoscape.js Extension: https://github.com/iVis-at-Bilkent/cytoscape.js-fcose

