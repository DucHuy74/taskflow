import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, forceZ,
  type Simulation3D, type SimulationLink3D, type SimulationNode3D,
} from 'd3-force-3d';
import { Focus, LocateFixed, LockKeyhole, Maximize2, Minus, Pause, Play, Plus, RotateCcw, UnlockKeyhole } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { describeRoles, type GraphEdgeType, type GraphNodeType, type VisualGraph, type VisualGraphNode } from '@/lib/graph/graphModel';

export interface ForceGraph3DHandle {
  fit: () => void;
  focusSelected: () => void;
  resetLayout: () => void;
  unpinSelected: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface ForceGraph3DProps {
  graph: VisualGraph;
  storageKey: string;
  selectedNodeId: string | null;
  searchQuery?: string;
  className?: string;
  onNodeSelected: (node: VisualGraphNode | null) => void;
}

interface SimNode extends SimulationNode3D {
  id: string;
  data: VisualGraphNode;
  radius: number;
}

interface SimLink extends SimulationLink3D<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
  type: GraphEdgeType;
  weight: number;
}

type StoredPins = Record<string, [number, number, number]>;

interface SceneApi {
  fit: () => void;
  focus: (id: string) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  unpin: (id: string) => void;
}

interface Palette {
  background: string;
  dimmed: string;
  focus: string;
  pinned: string;
  nodes: Record<GraphNodeType, string>;
}

const LIGHT: Palette = {
  background: '#f8fafc',
  dimmed: '#cbd5e1',
  focus: '#f59e0b',
  pinned: '#16a34a',
  nodes: { SUBJECT: '#2563eb', ACTION: '#7c3aed', OBJECT: '#0891b2', TERM: '#64748b', USER_STORY: '#475569', UNKNOWN: '#64748b' },
};

const DARK: Palette = {
  background: '#020617',
  dimmed: '#1e293b',
  focus: '#fbbf24',
  pinned: '#4ade80',
  nodes: { SUBJECT: '#60a5fa', ACTION: '#a78bfa', OBJECT: '#22d3ee', TERM: '#94a3b8', USER_STORY: '#94a3b8', UNKNOWN: '#94a3b8' },
};

// Subjects drift left, actions sit in the middle and objects drift right, so S → V → O reads naturally.
const SVO_LANE: Partial<Record<GraphNodeType, number>> = { SUBJECT: -70, ACTION: 0, OBJECT: 70 };
const FLOW_EDGES: ReadonlySet<GraphEdgeType> = new Set(['PERFORM', 'TARGET']);
const LABEL_ALL_THRESHOLD = 24;
const LABEL_TOP_COUNT = 12;
const SETTLED_ALPHA = 0.03;

function readPins(storageKey: string): StoredPins {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as { pins?: StoredPins };
    return parsed.pins ?? {};
  } catch {
    return {};
  }
}

function writePins(storageKey: string, pins: StoredPins) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ pins }));
  } catch {
    // Pinning still works for this session when storage is unavailable.
  }
}

function buildAdjacency(graph: VisualGraph) {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, new Set<string>()]));
  graph.edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });
  return adjacency;
}

function expand(adjacency: Map<string, Set<string>>, seeds: string[], hops: number) {
  const active = new Set(seeds);
  let frontier = [...seeds];
  for (let depth = 0; depth < hops; depth += 1) {
    const next: string[] = [];
    frontier.forEach((id) => adjacency.get(id)?.forEach((neighbor) => {
      if (!active.has(neighbor)) {
        active.add(neighbor);
        next.push(neighbor);
      }
    }));
    frontier = next;
  }
  return active;
}

export const ForceGraph3D = forwardRef<ForceGraph3DHandle, ForceGraph3DProps>(function ForceGraph3D({
  graph, storageKey, selectedNodeId, searchQuery = '', className, onNodeSelected,
}, ref) {
  const { isDark } = useTheme();
  const palette = isDark ? DARK : LIGHT;
  const apiRef = useRef<SceneApi | null>(null);
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hovered, setHovered] = useState<VisualGraphNode | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settling, setSettling] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<ReadonlySet<string>>(() => new Set());
  const handlePinsChanged = useCallback((ids: string[]) => setPinnedIds(new Set(ids)), []);
  const handleMissed = useCallback(() => { setHovered(null); onNodeSelected(null); }, [onNodeSelected]);

  const adjacency = useMemo(() => buildAdjacency(graph), [graph]);
  const active = useMemo(() => {
    const focusId = hovered?.id ?? selectedNodeId;
    if (focusId) return expand(adjacency, [focusId], expandedId === focusId ? 2 : 1);
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return null;
    const matches = graph.nodes.filter((node) => node.label.toLocaleLowerCase().includes(query)).map((node) => node.id);
    return expand(adjacency, matches, 1);
  }, [adjacency, expandedId, graph.nodes, hovered, searchQuery, selectedNodeId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onNodeSelected(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNodeSelected]);

  useImperativeHandle(ref, () => ({
    fit: () => apiRef.current?.fit(),
    focusSelected: () => { if (selectedNodeId) apiRef.current?.focus(selectedNodeId); },
    resetLayout: () => apiRef.current?.reset(),
    unpinSelected: () => { if (selectedNodeId) apiRef.current?.unpin(selectedNodeId); },
    zoomIn: () => apiRef.current?.zoom(0.8),
    zoomOut: () => apiRef.current?.zoom(1.25),
  }), [selectedNodeId]);

  const selectedPinned = Boolean(selectedNodeId && pinnedIds.has(selectedNodeId));

  return (
    <div className={cn('relative min-h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950', className)}>
      <div
        className="absolute inset-0 h-full w-full touch-none"
        role="img"
        aria-label={`Interactive 3D subject–verb–object graph with ${graph.nodes.length} terms and ${graph.edges.length} relationships. Drag to rotate, scroll to zoom. Use the table view for keyboard navigation.`}
      >
        <Canvas
          camera={{ position: [0, 0, 340], fov: 50, near: 1, far: 6000 }}
          dpr={[1, 2]}
          onPointerMissed={handleMissed}
          fallback={<div className="grid h-full place-items-center p-6 text-center text-sm text-slate-600 dark:text-slate-300">WebGL is not available in this browser. Switch to the table view to explore the graph.</div>}
        >
          <Scene
            graph={graph}
            palette={palette}
            storageKey={storageKey}
            active={active}
            selectedNodeId={selectedNodeId}
            hoveredId={hovered?.id ?? null}
            pinnedIds={pinnedIds}
            reducedMotion={reducedMotion}
            autoRotate={autoRotate && !reducedMotion}
            apiRef={apiRef}
            onHover={setHovered}
            onSelect={onNodeSelected}
            onExpand={setExpandedId}
            onSettledChange={setSettling}
            onPinsChanged={handlePinsChanged}
          />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-5rem)] rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <p className="font-semibold text-slate-700 dark:text-slate-200">3D S–V–O overview</p>
        <p className="mt-0.5 text-slate-500 dark:text-slate-400">Size = degree · drag a node to pin · right-drag to pan</p>
      </div>

      {hovered && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 max-w-64 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900/95" role="status">
          <p className="break-words font-semibold text-slate-950 dark:text-white">{hovered.label}</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">{describeRoles(hovered)} · degree {hovered.degree} · betweenness {hovered.betweenness.toFixed(2)}</p>
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-md dark:border-slate-700 dark:bg-slate-900">
        <GraphControl label="Zoom in" onClick={() => apiRef.current?.zoom(0.8)}><Plus /></GraphControl>
        <GraphControl label="Zoom out" onClick={() => apiRef.current?.zoom(1.25)}><Minus /></GraphControl>
        <GraphControl label="Fit entire graph" onClick={() => apiRef.current?.fit()}><Maximize2 /></GraphControl>
        <GraphControl label="Focus selected neighborhood" disabled={!selectedNodeId} onClick={() => selectedNodeId && apiRef.current?.focus(selectedNodeId)}><Focus /></GraphControl>
        <GraphControl label={selectedPinned ? 'Unpin selected node' : 'Selected node is not pinned'} disabled={!selectedPinned} onClick={() => selectedNodeId && apiRef.current?.unpin(selectedNodeId)}>{selectedPinned ? <UnlockKeyhole /> : <LockKeyhole />}</GraphControl>
        {!reducedMotion && <GraphControl label={autoRotate ? 'Stop auto-rotation' : 'Start auto-rotation'} pressed={autoRotate} onClick={() => setAutoRotate((value) => !value)}>{autoRotate ? <Pause /> : <Play />}</GraphControl>}
        <GraphControl label="Reset layout and pins" onClick={() => apiRef.current?.reset()}><RotateCcw /></GraphControl>
      </div>

      {settling && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-slate-900/95 dark:text-indigo-300" role="status">
          <LocateFixed className="h-3.5 w-3.5 animate-pulse motion-reduce:animate-none" aria-hidden="true" /> Arranging graph…
        </div>
      )}
    </div>
  );
});

interface SceneProps {
  graph: VisualGraph;
  palette: Palette;
  storageKey: string;
  active: Set<string> | null;
  selectedNodeId: string | null;
  hoveredId: string | null;
  pinnedIds: ReadonlySet<string>;
  reducedMotion: boolean;
  autoRotate: boolean;
  apiRef: React.MutableRefObject<SceneApi | null>;
  onHover: (node: VisualGraphNode | null) => void;
  onSelect: (node: VisualGraphNode | null) => void;
  onExpand: (id: string | null) => void;
  onSettledChange: (settling: boolean) => void;
  onPinsChanged: (pinnedIds: string[]) => void;
}

function Scene({
  graph, palette, storageKey, active, selectedNodeId, hoveredId, pinnedIds, reducedMotion, autoRotate,
  apiRef, onHover, onSelect, onExpand, onSettledChange, onPinsChanged,
}: SceneProps) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const gl = useThree((state) => state.gl);
  const getState = useThree((state) => state.get);
  const setControlsEnabled = useCallback((enabled: boolean) => {
    const current = getState().controls as OrbitControlsImpl | null;
    if (current) current.enabled = enabled;
  }, [getState]);
  const simRef = useRef<Simulation3D<SimNode> | null>(null);
  const simNodesRef = useRef(new Map<string, SimNode>());
  const linksRef = useRef<SimLink[]>([]);
  const groupRefs = useRef(new Map<string, THREE.Group>());
  const flowRef = useRef<THREE.LineSegments>(null);
  const analyticRef = useRef<THREE.LineSegments>(null);
  const cameraGoal = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const needsFitRef = useRef(true);
  const settlingRef = useRef(true);
  const dragRef = useRef<{ id: string; plane: THREE.Plane; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  const radii = useMemo(() => {
    const maxDegree = Math.max(1, ...graph.nodes.map((node) => node.degree));
    return new Map(graph.nodes.map((node) => [node.id, 4 + 7 * (Math.log1p(node.degree) / Math.log1p(maxDegree))]));
  }, [graph.nodes]);
  const flowLinks = useMemo(() => graph.edges.filter((edge) => FLOW_EDGES.has(edge.type)), [graph.edges]);
  const analyticLinks = useMemo(() => graph.edges.filter((edge) => !FLOW_EDGES.has(edge.type)), [graph.edges]);
  const labelled = useMemo(() => {
    if (graph.nodes.length <= LABEL_ALL_THRESHOLD) return new Set(graph.nodes.map((node) => node.id));
    return new Set([...graph.nodes].sort((a, b) => b.structure - a.structure).slice(0, LABEL_TOP_COUNT).map((node) => node.id));
  }, [graph.nodes]);

  const setSettling = useCallback((value: boolean) => {
    if (settlingRef.current === value) return;
    settlingRef.current = value;
    onSettledChange(value);
  }, [onSettledChange]);

  // (Re)build the simulation whenever the graph changes, keeping known positions stable.
  useEffect(() => {
    const previous = simNodesRef.current;
    const pins = readPins(storageKey);
    const nodes: SimNode[] = graph.nodes.map((node) => {
      const radius = radii.get(node.id) ?? 6;
      const known = previous.get(node.id);
      const pin = pins[node.id];
      const simNode: SimNode = { id: node.id, data: node, radius };
      if (known) Object.assign(simNode, { x: known.x, y: known.y, z: known.z, vx: 0, vy: 0, vz: 0 });
      if (pin) Object.assign(simNode, { x: pin[0], y: pin[1], z: pin[2], fx: pin[0], fy: pin[1], fz: pin[2] });
      return simNode;
    });
    const links: SimLink[] = graph.edges.map((edge) => ({ source: edge.source, target: edge.target, type: edge.type, weight: edge.weight }));
    const sim = forceSimulation<SimNode>(nodes, 3)
      .force('link', forceLink<SimNode, SimLink>(links)
        .id((node) => node.id)
        .distance((link) => (FLOW_EDGES.has(link.type) ? 46 : 80))
        // Relations backed by more stories pull their terms closer together.
        .strength((link) => (FLOW_EDGES.has(link.type) ? Math.min(1, 0.55 + 0.15 * Math.max(1, link.weight)) : 0.12)))
      .force('charge', forceManyBody<SimNode>().strength(-110).distanceMax(500))
      .force('center', forceCenter<SimNode>(0, 0, 0))
      .force('collide', forceCollide<SimNode>((node) => node.radius + 6).strength(0.8))
      .force('lane', forceX<SimNode>((node) => SVO_LANE[node.data.type] ?? 0).strength(0.06))
      // Gentle pull towards the origin keeps disconnected components in one compact cloud.
      .force('gravityY', forceY<SimNode>(0).strength(0.05))
      .force('gravityZ', forceZ<SimNode>(0).strength(0.05))
      .alpha(previous.size ? 0.4 : 1)
      .stop();
    simRef.current?.stop();
    simRef.current = sim;
    simNodesRef.current = new Map(nodes.map((node) => [node.id, node]));
    linksRef.current = links;
    needsFitRef.current = previous.size === 0;
    if (reducedMotion) sim.tick(300);
    setSettling(true);
    onPinsChanged(Object.keys(pins).filter((id) => simNodesRef.current.has(id)));
    return () => { sim.stop(); };
  }, [graph, onPinsChanged, radii, reducedMotion, setSettling, storageKey]);

  const persistPins = useCallback(() => {
    const pins: StoredPins = {};
    simNodesRef.current.forEach((node) => {
      if (node.fx != null && node.fy != null && node.fz != null) pins[node.id] = [node.fx, node.fy, node.fz];
    });
    writePins(storageKey, pins);
    onPinsChanged(Object.keys(pins));
  }, [onPinsChanged, storageKey]);

  const flyTo = useCallback((position: THREE.Vector3, target: THREE.Vector3) => {
    if (reducedMotion || !controls) {
      camera.position.copy(position);
      controls?.target.copy(target);
      controls?.update();
      return;
    }
    cameraGoal.current = { position, target };
  }, [camera, controls, reducedMotion]);

  const fitTo = useCallback((ids?: Iterable<string>) => {
    const points: THREE.Vector3[] = [];
    const source = ids ? [...ids].map((id) => simNodesRef.current.get(id)).filter(Boolean) as SimNode[] : [...simNodesRef.current.values()];
    source.forEach((node) => points.push(new THREE.Vector3(node.x ?? 0, node.y ?? 0, node.z ?? 0)));
    if (!points.length) return;
    const sphere = new THREE.Sphere().setFromPoints(points);
    const radius = Math.max(60, sphere.radius * 1.2 + 30);
    const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov ?? 50);
    const aspect = gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight);
    const fitFov = aspect < 1 ? 2 * Math.atan(Math.tan(fov / 2) * aspect) : fov;
    const distance = radius / Math.sin(fitFov / 2);
    const currentTarget = controls?.target ?? new THREE.Vector3();
    const direction = camera.position.clone().sub(currentTarget).normalize();
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);
    flyTo(sphere.center.clone().add(direction.multiplyScalar(distance)), sphere.center.clone());
  }, [camera, controls, flyTo, gl]);

  useEffect(() => {
    apiRef.current = {
      fit: () => fitTo(),
      focus: (id) => fitTo(expand(buildAdjacency(graph), [id], 1)),
      zoom: (factor) => {
        const target = controls?.target ?? new THREE.Vector3();
        const offset = camera.position.clone().sub(target).multiplyScalar(factor);
        flyTo(target.clone().add(offset), target.clone());
      },
      reset: () => {
        simNodesRef.current.forEach((node) => {
          node.fx = null; node.fy = null; node.fz = null;
          node.x = (Math.random() - 0.5) * 200; node.y = (Math.random() - 0.5) * 200; node.z = (Math.random() - 0.5) * 200;
        });
        writePins(storageKey, {});
        onPinsChanged([]);
        needsFitRef.current = true;
        simRef.current?.alpha(1);
        if (reducedMotion) simRef.current?.tick(300);
        setSettling(true);
      },
      unpin: (id) => {
        const node = simNodesRef.current.get(id);
        if (!node) return;
        node.fx = null; node.fy = null; node.fz = null;
        persistPins();
        simRef.current?.alpha(0.3);
        if (reducedMotion) simRef.current?.tick(120);
      },
    };
  }, [apiRef, camera, controls, fitTo, flyTo, graph, onPinsChanged, persistPins, reducedMotion, setSettling, storageKey]);

  const background = useMemo(() => new THREE.Color(palette.background), [palette.background]);
  const dimColor = useMemo(() => new THREE.Color(palette.dimmed), [palette.dimmed]);
  const nodeColors = useMemo(() => {
    const map = new Map<string, THREE.Color>();
    graph.nodes.forEach((node) => map.set(node.id, new THREE.Color(palette.nodes[node.type])));
    return map;
  }, [graph.nodes, palette.nodes]);

  const flowGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flowLinks.length * 6), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(flowLinks.length * 6), 3));
    return geometry;
  }, [flowLinks.length]);
  const analyticGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(analyticLinks.length * 6), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(analyticLinks.length * 6), 3));
    return geometry;
  }, [analyticLinks.length]);
  useEffect(() => () => { flowGeometry.dispose(); }, [flowGeometry]);
  useEffect(() => () => { analyticGeometry.dispose(); }, [analyticGeometry]);

  useFrame(() => {
    const sim = simRef.current;
    if (sim && !reducedMotion && sim.alpha() > sim.alphaMin()) {
      sim.tick();
    }
    if (sim && settlingRef.current && (reducedMotion || sim.alpha() < SETTLED_ALPHA)) {
      setSettling(false);
      if (needsFitRef.current) {
        needsFitRef.current = false;
        fitTo();
      }
    }

    simNodesRef.current.forEach((node, id) => {
      groupRefs.current.get(id)?.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    });

    const activeIds = activeRef.current;
    const colorsFor = { nodes: nodeColors, dimmed: dimColor, active: activeIds };
    writeEdgeBuffers(flowRef.current, flowLinks, simNodesRef.current, colorsFor);
    writeEdgeBuffers(analyticRef.current, analyticLinks, simNodesRef.current, colorsFor);

    const goal = cameraGoal.current;
    if (goal && controls) {
      camera.position.lerp(goal.position, 0.14);
      controls.target.lerp(goal.target, 0.14);
      controls.update();
      if (camera.position.distanceTo(goal.position) < 0.5 && controls.target.distanceTo(goal.target) < 0.5) cameraGoal.current = null;
    }
  });

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>, id: string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const node = simNodesRef.current.get(id);
    if (!node) return;
    const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(node.x ?? 0, node.y ?? 0, node.z ?? 0));
    dragRef.current = { id, plane, moved: false };
    (event.target as Element).setPointerCapture(event.pointerId);
    setControlsEnabled(false);
  }, [camera, setControlsEnabled]);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.stopPropagation();
    const point = event.ray.intersectPlane(drag.plane, new THREE.Vector3());
    const node = simNodesRef.current.get(drag.id);
    if (!point || !node) return;
    drag.moved = true;
    node.fx = point.x; node.fy = point.y; node.fz = point.z;
    if (reducedMotion) {
      node.x = point.x; node.y = point.y; node.z = point.z;
    } else {
      simRef.current?.alpha(Math.max(simRef.current.alpha(), 0.25));
    }
  }, [reducedMotion]);

  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.stopPropagation();
    (event.target as Element).releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setControlsEnabled(true);
    if (drag.moved) {
      suppressClickRef.current = true;
      persistPins();
    }
  }, [persistPins, setControlsEnabled]);

  useEffect(() => () => { document.body.style.cursor = 'auto'; }, []);

  return (
    <>
      <color attach="background" args={[background.getStyle()]} />
      <fog attach="fog" args={[palette.background, 420, 1500]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[160, 220, 260]} intensity={1.1} />
      <directionalLight position={[-200, -120, -160]} intensity={0.35} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.09} autoRotate={autoRotate} autoRotateSpeed={0.6} minDistance={30} maxDistance={2400} />

      <lineSegments ref={flowRef} geometry={flowGeometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.85} />
      </lineSegments>
      <lineSegments ref={analyticRef} geometry={analyticGeometry}>
        <lineDashedMaterial vertexColors transparent opacity={0.6} dashSize={3} gapSize={2.5} />
      </lineSegments>

      {graph.nodes.map((node) => {
        const radius = radii.get(node.id) ?? 6;
        const dimmed = Boolean(active && !active.has(node.id));
        const focused = node.id === selectedNodeId || node.id === hoveredId;
        const pinned = pinnedIds.has(node.id);
        const showLabel = !dimmed && (labelled.has(node.id) || focused || Boolean(active?.has(node.id)));
        return (
          <group key={node.id} ref={(group) => { if (group) groupRefs.current.set(node.id, group); else groupRefs.current.delete(node.id); }}>
            <mesh
              onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; onHover(node); }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; onHover(null); }}
              onPointerDown={(event) => handlePointerDown(event, node.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(event) => {
                event.stopPropagation();
                if (suppressClickRef.current) { suppressClickRef.current = false; return; }
                onExpand(null);
                onSelect(node);
              }}
              onDoubleClick={(event) => { event.stopPropagation(); onSelect(node); onExpand(node.id); }}
            >
              <NodeGeometry type={node.type} radius={radius} />
              <meshStandardMaterial
                color={dimmed ? palette.dimmed : palette.nodes[node.type]}
                emissive={palette.nodes[node.type]}
                emissiveIntensity={focused ? 0.3 : 0}
                roughness={0.45}
                metalness={0.1}
                transparent={dimmed}
                depthWrite={!dimmed}
                opacity={dimmed ? 0.22 : 1}
              />
            </mesh>
            {focused && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[radius * 1.6, 0.7, 10, 48]} />
                <meshBasicMaterial color={palette.focus} />
              </mesh>
            )}
            {pinned && (
              <mesh position={[0, radius * 1.3, 0]}>
                <sphereGeometry args={[1.6, 12, 12]} />
                <meshBasicMaterial color={palette.pinned} />
              </mesh>
            )}
            {/* Labels stay mounted (each Html is its own React root); visibility is toggled with CSS. */}
            <Html center position={[0, -radius - 7, 0]} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
                <span aria-hidden={!showLabel} className={cn(
                  'block max-w-40 truncate whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm transition-opacity duration-150',
                  showLabel ? 'opacity-100' : 'opacity-0',
                  focused ? 'bg-amber-100/95 text-amber-950 dark:bg-amber-400/90 dark:text-slate-950' : 'bg-white/85 text-slate-900 dark:bg-slate-900/85 dark:text-slate-100',
                )}>
                  {node.label}
                </span>
            </Html>
          </group>
        );
      })}
    </>
  );
}

/** Writes simulated endpoint positions and highlight colors into a line's GPU buffers (runs every frame). */
function writeEdgeBuffers(
  line: THREE.LineSegments | null,
  edges: VisualGraph['edges'],
  simNodes: Map<string, SimNode>,
  colors: { nodes: Map<string, THREE.Color>; dimmed: THREE.Color; active: Set<string> | null },
) {
  if (!line) return;
  const positionAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
  const colorAttr = line.geometry.getAttribute('color') as THREE.BufferAttribute;
  edges.forEach((edge, index) => {
    const source = simNodes.get(edge.source);
    const target = simNodes.get(edge.target);
    if (!source || !target) return;
    positionAttr.setXYZ(index * 2, source.x ?? 0, source.y ?? 0, source.z ?? 0);
    positionAttr.setXYZ(index * 2 + 1, target.x ?? 0, target.y ?? 0, target.z ?? 0);
    const lit = !colors.active || (colors.active.has(edge.source) && colors.active.has(edge.target));
    const from = lit ? colors.nodes.get(edge.source) ?? colors.dimmed : colors.dimmed;
    const to = lit ? colors.nodes.get(edge.target) ?? colors.dimmed : colors.dimmed;
    colorAttr.setXYZ(index * 2, from.r, from.g, from.b);
    colorAttr.setXYZ(index * 2 + 1, to.r, to.g, to.b);
  });
  positionAttr.needsUpdate = true;
  colorAttr.needsUpdate = true;
  line.geometry.computeBoundingSphere();
  if (line.material instanceof THREE.LineDashedMaterial) line.computeLineDistances();
}

function NodeGeometry({ type, radius }: { type: GraphNodeType; radius: number }) {
  if (type === 'ACTION') return <octahedronGeometry args={[radius * 1.15, 0]} />;
  if (type === 'OBJECT') return <boxGeometry args={[radius * 1.55, radius * 1.55, radius * 1.55]} />;
  if (type === 'SUBJECT') return <sphereGeometry args={[radius, 24, 24]} />;
  return <dodecahedronGeometry args={[radius, 0]} />;
}

function GraphControl({ label, onClick, disabled, pressed, children }: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: React.ReactElement<{ className?: string }> }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-11 w-11 cursor-pointer place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800 [&>svg]:h-5 [&>svg]:w-5',
        pressed && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
      )}
    >
      {children}
    </button>
  );
}
