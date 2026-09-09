import { useCallback, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown, ChevronUp, GitBranch, Layers3, List, Maximize2, Minus,
  MousePointer2, Network, Pencil, Plus, RefreshCw, Search, Table2,
} from 'lucide-react';
import { graphService, type GraphData, type GraphNode } from '@/services/graphService';
import { workspaceService } from '@/services/workspaceService';
import { Button } from '@/components/ui/button';
import { useToastMessage } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

type Role = 'subject' | 'action' | 'object';
type Point = { x: number; y: number };
type PositionedNode = GraphNode & Point & { role: Role; degree: number; betweenness: number; score: number; structure: number };

const WIDTH = 1120;
const MIN_HEIGHT = 680;
const SPACING = 120;
const X_BY_ROLE: Record<Role, number> = { subject: 230, action: 560, object: 890 };
const MAX_SVG_NODES = 140;

function roleOf(type: string): Role {
  const value = type.toLowerCase();
  if (value.includes('subject') || value.includes('actor')) return 'subject';
  if (value.includes('object')) return 'object';
  return 'action';
}

function priorityOf(priority: GraphNode['priority']) {
  if (typeof priority === 'number') return Math.min(1, Math.max(0, priority));
  const numeric = Number(priority);
  if (priority && Number.isFinite(numeric)) return Math.min(1, Math.max(0, numeric));
  const label = String(priority || '').toLowerCase();
  if (label === 'high' || label === 'highest') return 1;
  if (label === 'medium') return 0.65;
  if (label === 'low' || label === 'lowest') return 0.3;
  return 0;
}

function computeCentrality(data: GraphData) {
  const ids = data.nodes.map((node) => node.id);
  const adjacency = new Map(ids.map((id) => [id, new Set<string>()]));
  data.edges.forEach((edge) => {
    if (adjacency.has(edge.from) && adjacency.has(edge.to)) {
      adjacency.get(edge.from)?.add(edge.to);
      adjacency.get(edge.to)?.add(edge.from);
    }
  });
  const between = new Map(ids.map((id) => [id, 0]));
  const step = ids.length > 120 ? Math.ceil(ids.length / 80) : 1;
  ids.filter((_, index) => index % step === 0).forEach((source) => {
    const stack: string[] = [];
    const previous = new Map(ids.map((id) => [id, [] as string[]]));
    const paths = new Map(ids.map((id) => [id, 0]));
    const distance = new Map(ids.map((id) => [id, -1]));
    paths.set(source, 1); distance.set(source, 0);
    const queue = [source];
    while (queue.length) {
      const current = queue.shift()!;
      stack.push(current);
      adjacency.get(current)?.forEach((next) => {
        if (distance.get(next) === -1) { distance.set(next, (distance.get(current) || 0) + 1); queue.push(next); }
        if (distance.get(next) === (distance.get(current) || 0) + 1) {
          paths.set(next, (paths.get(next) || 0) + (paths.get(current) || 0));
          previous.get(next)?.push(current);
        }
      });
    }
    const dependency = new Map(ids.map((id) => [id, 0]));
    while (stack.length) {
      const node = stack.pop()!;
      previous.get(node)?.forEach((parent) => {
        const contribution = ((paths.get(parent) || 0) / (paths.get(node) || 1)) * (1 + (dependency.get(node) || 0));
        dependency.set(parent, (dependency.get(parent) || 0) + contribution);
      });
      if (node !== source) between.set(node, (between.get(node) || 0) + (dependency.get(node) || 0));
    }
  });
  const max = Math.max(1, ...between.values());
  return { adjacency, between: new Map(ids.map((id) => [id, (between.get(id) || 0) / max])) };
}

function buildLayout(data: GraphData) {
  const visible = data.nodes.slice(0, MAX_SVG_NODES);
  const { adjacency, between } = computeCentrality({ ...data, nodes: visible });
  const counters: Record<Role, number> = { subject: 0, action: 0, object: 0 };
  const positioned = visible.map((node) => {
    const role = roleOf(node.type);
    const row = counters[role]++;
    return {
      ...node,
      role,
      x: X_BY_ROLE[role],
      y: 150 + row * SPACING,
      degree: node.degree ?? adjacency.get(node.id)?.size ?? 0,
      betweenness: node.betweenness ?? between.get(node.id) ?? 0,
      score: priorityOf(node.priority),
      structure: 0,
    };
  });
  const maxDegree = Math.max(1, ...positioned.map((node) => node.degree));
  const maxBetweenness = Math.max(1, ...positioned.map((node) => node.betweenness));
  // DALN formula (2), applied to each visible term as an explainable structural signal.
  const nodes = positioned.map((node) => ({
    ...node,
    structure: 0.5 * (node.degree / maxDegree) + 0.5 * (node.betweenness / maxBetweenness),
  }));
  return { nodes, adjacency, height: Math.max(MIN_HEIGHT, 260 + Math.max(...Object.values(counters), 1) * SPACING) };
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    if (((a.y > point.y) !== (b.y > point.y)) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || 1) + a.x) inside = !inside;
  }
  return inside;
}

function metric(value: number) { return value > 0 && value < 0.01 ? '<0.01' : value.toFixed(2); }

export function WorkspaceGraphPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const showToast = useToastMessage();
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<'graph' | 'table'>('graph');
  const [mode, setMode] = useState<'select' | 'draw'>('select');
  const [collapsed, setCollapsed] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [threshold, setThreshold] = useState(0);
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customPositions, setCustomPositions] = useState<Record<string, Point>>({});
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [panOrigin, setPanOrigin] = useState<Point | null>(null);
  const [nodeDrag, setNodeDrag] = useState<{ id: string; offset: Point } | null>(null);
  const [lasso, setLasso] = useState<Point[]>([]);

  const { data: workspace } = useQuery({ queryKey: ['workspace', workspaceId], queryFn: () => workspaceService.getWorkspace(workspaceId!), enabled: !!workspaceId });
  const graphQuery = useQuery({ queryKey: ['workspace-graph', workspaceId], queryFn: () => graphService.getBacklogGraph(workspaceId!, { source: 'REALTIME' }), enabled: !!workspaceId });
  const graph = useMemo<GraphData>(() => graphQuery.data || { nodes: [], edges: [] }, [graphQuery.data]);
  const layout = useMemo(() => buildLayout(graph), [graph]);
  const nodes = useMemo(() => layout.nodes.map((node) => ({ ...node, ...(customPositions[node.id] || {}) })), [layout.nodes, customPositions]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const rebuildMutation = useMutation({
    mutationFn: async () => { if (!await workspaceService.rebuildGraph(workspaceId!)) throw new Error('Rejected'); },
    onSuccess: () => {
      showToast('Rebuild requested. The graph will refresh when the batch is available.', 'success', 'Graph update queued');
      void queryClient.invalidateQueries({ queryKey: ['workspace-graph', workspaceId] });
      window.setTimeout(() => void graphQuery.refetch(), 2500);
      window.setTimeout(() => void graphQuery.refetch(), 7000);
    },
    onError: () => showToast('Could not request a graph rebuild.', 'error', 'Rebuild failed'),
  });

  const activeIds = useMemo(() => {
    const seeds = new Set<string>();
    const query = search.trim().toLowerCase();
    if (query) nodes.forEach((node) => { if (node.label.toLowerCase().includes(query)) seeds.add(node.id); });
    if (hoveredId) seeds.add(hoveredId);
    if (!seeds.size) return null;
    const active = new Set(seeds);
    seeds.forEach((id) => layout.adjacency.get(id)?.forEach((neighbor) => active.add(neighbor)));
    return active;
  }, [hoveredId, layout.adjacency, nodes, search]);

  const visibleNodes = collapsed ? nodes.filter((node) => node.role === 'subject') : nodes;
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = collapsed ? [] : graph.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to));
  const selectedNode = nodeMap.get(selectedId || '') || null;
  const ranked = useMemo(() => [...nodes].sort((a, b) => b.betweenness - a.betweenness || b.degree - a.degree).slice(0, 8), [nodes]);

  const clientToScene = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const svgPoint = { x: (clientX - rect.left) * WIDTH / rect.width, y: (clientY - rect.top) * layout.height / rect.height };
    return { x: (svgPoint.x - transform.x) / transform.scale, y: (svgPoint.y - transform.y) / transform.scale };
  }, [layout.height, transform]);

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect ? { x: (clientX - rect.left) * WIDTH / rect.width, y: (clientY - rect.top) * layout.height / rect.height } : { x: 0, y: 0 };
  }, [layout.height]);

  const selectFlow = (id: string) => {
    const flow = new Set([id]);
    layout.adjacency.get(id)?.forEach((first) => { flow.add(first); layout.adjacency.get(first)?.forEach((second) => flow.add(second)); });
    setSelectedId(id); setSelectedIds(flow);
  };

  const finishLasso = () => {
    if (lasso.length >= 3) setSelectedIds(new Set(nodes.filter((node) => pointInPolygon(node, lasso)).map((node) => node.id)));
    setLasso([]);
  };

  if (!workspaceId) return <Navigate to="/" replace />;
  const zoom = (factor: number) => setTransform((current) => ({ ...current, scale: Math.min(2.5, Math.max(0.4, current.scale * factor)) }));
  const resetView = () => { setTransform({ x: 0, y: 0, scale: 1 }); setCustomPositions({}); };

  return <div className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1540px]">
      <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><nav className="mb-1 text-xs font-medium text-slate-500" aria-label="Breadcrumb">Workspaces / {workspace?.name || 'Workspace'}</nav><h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">S–V–O story graph</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Subject → Action → Object, built from analyzed workspace stories.</p></div>
        <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-slate-500" role="status">{graphQuery.dataUpdatedAt ? `Updated ${new Date(graphQuery.dataUpdatedAt).toLocaleTimeString()}` : 'Not loaded yet'}</span><Button variant="outline" onClick={() => void graphQuery.refetch()} disabled={graphQuery.isFetching}><RefreshCw className={cn('h-4 w-4', graphQuery.isFetching && 'animate-spin')} /> Refresh</Button><Button onClick={() => rebuildMutation.mutate()} isLoading={rebuildMutation.isPending}><Network className="h-4 w-4" /> Rebuild graph</Button></div>
      </header>

      <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5"><NavLink to={`/workspace/${workspaceId}/backlog`} className="flex min-h-11 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-slate-600 no-underline dark:text-slate-300"><Layers3 className="h-4 w-4" /> Backlog</NavLink><NavLink to={`/workspace/${workspaceId}/graph`} className="flex min-h-11 items-center gap-2 border-b-2 border-indigo-600 text-sm font-semibold text-indigo-700 no-underline dark:text-indigo-300"><GitBranch className="h-4 w-4" /> Story graph</NavLink></div>
        <div className="mb-3 flex w-full gap-2 sm:w-auto"><div className="relative min-w-0 flex-1 sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><label htmlFor="graph-search" className="sr-only">Search graph</label><input id="graph-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a term and neighbors" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></div><ViewToggle view={view} setView={setView} /></div>
      </div>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Graph summary">{[['Subjects', nodes.filter((node) => node.role === 'subject').length], ['Actions', nodes.filter((node) => node.role === 'action').length], ['Objects', nodes.filter((node) => node.role === 'object').length], ['Relationships', graph.edges.length]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-950 dark:text-white">{value}</p></div>)}</section>

      {graphQuery.isLoading ? <Loading /> : !graph.nodes.length ? <Empty onRebuild={() => rebuildMutation.mutate()} loading={rebuildMutation.isPending} /> : view === 'table' ? <GraphTable nodes={nodes} onSelect={selectFlow} /> : <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative min-h-[600px] overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc] dark:border-slate-700 dark:bg-slate-950">
          <GraphToolbar mode={mode} setMode={setMode} collapsed={collapsed} setCollapsed={setCollapsed} filterOpen={filterOpen} setFilterOpen={setFilterOpen} refresh={() => void graphQuery.refetch()} />
          <div className="absolute left-3 top-3 z-10 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"><p className="font-semibold text-slate-700 dark:text-slate-200">S–V–O layout</p><div className="mt-2 flex gap-3"><Legend color="#2563EB" label="Subject" /><Legend color="#7C3AED" label="Action" /><Legend color="#06B6D4" label="Object" square /></div></div>
          {filterOpen && <div className="absolute bottom-4 right-16 z-20 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between"><label htmlFor="priority-filter" className="text-sm font-semibold">Filter by priority</label><span className="text-sm font-semibold tabular-nums text-indigo-600">Hide &lt; {threshold.toFixed(2)}</span></div><input id="priority-filter" type="range" min="0" max="1" step="0.05" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="mt-3 w-full accent-indigo-600" /><p className="mt-2 text-xs text-slate-500">Priority uses the node max-pooling score supplied by the graph.</p></div>}
          <div className="absolute bottom-4 right-3 z-10 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800"><IconButton label="Zoom in" onClick={() => zoom(1.15)}><Plus /></IconButton><IconButton label="Zoom out" onClick={() => zoom(0.87)}><Minus /></IconButton><IconButton label="Fit and reset node positions" onClick={resetView}><Maximize2 /></IconButton></div>
          {selectedIds.size > 1 && <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-lg dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300">{selectedIds.size} nodes selected</div>}
          <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${layout.height}`} className={cn('h-full min-h-[600px] w-full touch-none select-none', mode === 'draw' ? 'cursor-crosshair' : panOrigin ? 'cursor-grabbing' : 'cursor-grab')} role="img" aria-labelledby="graph-title graph-desc"
            onWheel={(event) => { event.preventDefault(); zoom(event.deltaY > 0 ? 0.9 : 1.1); }}
            onPointerDown={(event) => { if (event.target !== event.currentTarget) return; if (mode === 'draw') setLasso([clientToScene(event.clientX, event.clientY)]); else { const point = clientToSvg(event.clientX, event.clientY); setPanOrigin({ x: point.x - transform.x, y: point.y - transform.y }); } }}
            onPointerMove={(event) => { if (nodeDrag) { const point = clientToScene(event.clientX, event.clientY); setCustomPositions((current) => ({ ...current, [nodeDrag.id]: { x: point.x + nodeDrag.offset.x, y: point.y + nodeDrag.offset.y } })); } else if (lasso.length) setLasso((current) => [...current, clientToScene(event.clientX, event.clientY)]); else if (panOrigin) { const point = clientToSvg(event.clientX, event.clientY); setTransform((current) => ({ ...current, x: point.x - panOrigin.x, y: point.y - panOrigin.y })); } }}
            onPointerUp={() => { setNodeDrag(null); setPanOrigin(null); finishLasso(); }} onPointerLeave={() => { setNodeDrag(null); setPanOrigin(null); finishLasso(); }}>
            <title id="graph-title">Workspace radial S–V–O graph</title><desc id="graph-desc">Three-column graph with draggable nodes, priority filtering, neighbor search and lasso selection.</desc>
            <defs><filter id="selected-glow"><feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
            <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
              {visibleEdges.map((edge, index) => {
                const from = nodeMap.get(edge.from); const to = nodeMap.get(edge.to); if (!from || !to) return null;
                const dimmed = from.score < threshold || to.score < threshold || (!!activeIds && (!activeIds.has(from.id) || !activeIds.has(to.id)));
                const selected = selectedIds.has(from.id) && selectedIds.has(to.id);
                const midX = (from.x + to.x) / 2; const midY = (from.y + to.y) / 2 + ((index % 3) - 1) * 18;
                return <path key={`${edge.from}-${edge.to}-${index}`} d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`} fill="none" stroke={selected ? '#4F46E5' : '#94A3B8'} strokeWidth={selected ? 3 : Math.max(1, (edge.score || edge.confidence || 0.4) * 2.5)} strokeDasharray={edge.type?.toLowerCase().includes('similar') ? '6 5' : undefined} opacity={dimmed ? 0.08 : selected ? 0.95 : 0.38} className="transition-opacity duration-200" />;
              })}
              {visibleNodes.map((node) => {
                const dimmed = node.score < threshold || (!!activeIds && !activeIds.has(node.id));
                const selected = selectedIds.has(node.id);
                const relatedTarget = selectedIds.size > 0 && selected && selectedId !== node.id;
                return <g key={node.id} tabIndex={0} role="button" aria-label={`${node.label}, ${node.role}, priority ${node.score.toFixed(2)}`} transform={`translate(${node.x} ${node.y})`} opacity={dimmed ? 0.18 : 1} className="cursor-move outline-none transition-opacity duration-200" onMouseEnter={() => setHoveredId(node.id)} onMouseLeave={() => setHoveredId(null)} onClick={() => selectFlow(node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') selectFlow(node.id); }} onPointerDown={(event) => { if (mode !== 'select') return; event.stopPropagation(); const point = clientToScene(event.clientX, event.clientY); setNodeDrag({ id: node.id, offset: { x: node.x - point.x, y: node.y - point.y } }); }}>
                  {selected && <circle r="35" fill="none" stroke="#6366F1" strokeWidth="3" opacity="0.3" filter="url(#selected-glow)" className="graph-glow" />}
                  {relatedTarget && <circle r="31" fill="none" stroke="#6366F1" strokeWidth="2" strokeDasharray="8 6" />}
                  {node.role === 'subject' ? <rect x="-43" y="-19" width="86" height="38" rx="19" fill="white" stroke="#2563EB" strokeWidth={selected ? 3 : 2} /> : node.role === 'object' ? <rect x="-46" y="-18" width="92" height="36" rx="5" fill="white" stroke="#06B6D4" strokeWidth={selected ? 3 : 2} /> : <circle r="24" fill="#F5F3FF" stroke="#7C3AED" strokeWidth={selected ? 3 : 2} />}
                  <text textAnchor="middle" dominantBaseline="central" className="pointer-events-none fill-slate-800 text-[11px] font-semibold">{node.label.length > 13 ? `${node.label.slice(0, 12)}…` : node.label}</text>
                  <text y={node.role === 'action' ? 39 : 34} textAnchor="middle" className="pointer-events-none fill-slate-400 text-[9px] uppercase">{node.role}</text>
                </g>;
              })}
              {lasso.length > 1 && <polygon points={lasso.map((point) => `${point.x},${point.y}`).join(' ')} fill="#6366F122" stroke="#6366F1" strokeWidth="2" strokeDasharray="6 4" />}
            </g>
          </svg>
        </div>
        <Insights selected={selectedNode} selectedCount={selectedIds.size} ranked={ranked} onSelect={selectFlow} />
      </div>}
    </div>
  </div>;
}

function ViewToggle({ view, setView }: { view: 'graph' | 'table'; setView: (view: 'graph' | 'table') => void }) {
  return <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"><IconButton label="Graph view" pressed={view === 'graph'} onClick={() => setView('graph')}><GitBranch /></IconButton><IconButton label="Table view" pressed={view === 'table'} onClick={() => setView('table')}><Table2 /></IconButton></div>;
}

function GraphToolbar({ mode, setMode, collapsed, setCollapsed, filterOpen, setFilterOpen, refresh }: { mode: 'select' | 'draw'; setMode: (mode: 'select' | 'draw') => void; collapsed: boolean; setCollapsed: (value: boolean) => void; filterOpen: boolean; setFilterOpen: (value: boolean) => void; refresh: () => void }) {
  return <div className="absolute right-3 top-16 z-20 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-md dark:border-slate-700 dark:bg-slate-900">
    <IconButton label="Draw lasso" pressed={mode === 'draw'} onClick={() => setMode(mode === 'draw' ? 'select' : 'draw')}><Pencil /></IconButton>
    <IconButton label="Select and move nodes" pressed={mode === 'select'} onClick={() => setMode('select')}><MousePointer2 /></IconButton>
    <IconButton label={collapsed ? 'Expand graph' : 'Collapse to subjects'} pressed={collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronDown /> : <ChevronUp />}</IconButton>
    <IconButton label="Filter by priority" pressed={filterOpen} onClick={() => setFilterOpen(!filterOpen)}><List /></IconButton>
    <IconButton label="Refresh graph" onClick={refresh}><RefreshCw /></IconButton>
  </div>;
}

function IconButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactElement<{ className?: string }> }) {
  return <button type="button" aria-label={label} aria-pressed={pressed} title={label} onClick={onClick} className={cn('grid h-10 w-10 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800', pressed && 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white')}>{children}</button>;
}

function Legend({ color, label, square }: { color: string; label: string; square?: boolean }) { return <span className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 border-2 bg-white', square ? 'rounded-sm' : 'rounded-full')} style={{ borderColor: color }} />{label}</span>; }

function Insights({ selected, selectedCount, ranked, onSelect }: { selected: PositionedNode | null; selectedCount: number; ranked: PositionedNode[]; onSelect: (id: string) => void }) {
  return <aside className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-label="Graph insights">
    {selected ? <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Selected {selected.role}</p><h2 className="mt-1 break-words text-lg font-semibold text-slate-950 dark:text-white">{selected.label}</h2>{selectedCount > 1 && <p className="mt-1 text-xs text-slate-500">{selectedCount} nodes in this S–V–O flow</p>}<dl className="mt-5 grid grid-cols-2 gap-2"><Metric label="Priority (max)" value={metric(selected.score)} /><Metric label="Struct score" value={metric(selected.structure)} /><Metric label="Degree" value={String(selected.degree)} /><Metric label="Betweenness" value={metric(selected.betweenness)} /></dl></div> : <div><Network className="h-5 w-5 text-indigo-600" /><h2 className="mt-2 font-semibold">Graph insights</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Select a node to highlight its S–V–O flow.</p></div>}
    <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700"><h3 className="text-sm font-semibold">Bridge terms</h3><p className="mt-1 text-xs text-slate-500">Betweenness from Neo4j, with client fallback.</p><ol className="mt-3 space-y-1">{ranked.map((node, index) => <li key={node.id}><button type="button" onClick={() => onSelect(node.id)} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"><span className="w-5 text-xs tabular-nums text-slate-400">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{node.label}</span><span className="text-xs tabular-nums text-slate-500">{metric(node.betweenness)}</span></button></li>)}</ol></div>
  </aside>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><dt className="text-[10px] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd></div>; }
function Loading() { return <div className="grid min-h-[560px] place-items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" role="status"><div className="text-center"><RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-600" /><p className="mt-3 text-sm">Loading workspace graph…</p></div></div>; }
function Empty({ onRebuild, loading }: { onRebuild: () => void; loading: boolean }) { return <div className="grid min-h-[560px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-900"><div><Network className="mx-auto h-10 w-10 text-indigo-600" /><h2 className="mt-4 text-lg font-semibold">No graph data yet</h2><p className="mt-1 text-sm text-slate-500">Add stories, wait for analysis, then rebuild.</p><Button className="mt-5" onClick={onRebuild} isLoading={loading}>Rebuild graph</Button></div></div>; }
function GraphTable({ nodes, onSelect }: { nodes: PositionedNode[]; onSelect: (id: string) => void }) { return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><table className="w-full min-w-[780px] text-left text-sm"><caption className="sr-only">S–V–O graph nodes and metrics</caption><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr><th className="px-4 py-3">Term</th><th className="px-4 py-3">Role</th><th className="px-4 py-3 text-right">Priority</th><th className="px-4 py-3 text-right">Struct</th><th className="px-4 py-3 text-right">Degree</th><th className="px-4 py-3 text-right">Betweenness</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{nodes.map((node) => <tr key={node.id}><td className="px-4 py-3"><button type="button" onClick={() => onSelect(node.id)} className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">{node.label}</button></td><td className="px-4 py-3 capitalize">{node.role}</td><td className="px-4 py-3 text-right tabular-nums">{metric(node.score)}</td><td className="px-4 py-3 text-right tabular-nums">{metric(node.structure)}</td><td className="px-4 py-3 text-right tabular-nums">{node.degree}</td><td className="px-4 py-3 text-right tabular-nums">{metric(node.betweenness)}</td></tr>)}</tbody></table></div>; }
