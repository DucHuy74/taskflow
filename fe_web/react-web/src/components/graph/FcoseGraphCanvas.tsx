import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import cytoscape, { type Core, type EdgeSingular, type EventObject, type NodeSingular } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { Focus, LocateFixed, LockKeyhole, Maximize2, Minus, Plus, RotateCcw, UnlockKeyhole } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildSvoConstraints, type VisualGraph, type VisualGraphNode } from '@/lib/graph/graphModel';

cytoscape.use(fcose);

type StoredLayout = {
  positions: Record<string, { x: number; y: number }>;
  pinned: string[];
};

interface FcoseLayoutOptions {
  name: 'fcose';
  quality: 'default' | 'proof';
  randomize: boolean;
  animate: boolean;
  animationDuration: number;
  fit: boolean;
  padding: number;
  nodeDimensionsIncludeLabels: boolean;
  uniformNodeDimensions: boolean;
  packComponents: boolean;
  idealEdgeLength: number;
  nodeRepulsion: number;
  edgeElasticity: number;
  nestingFactor: number;
  gravity: number;
  gravityRange: number;
  numIter: number;
  tile: boolean;
  tilingPaddingVertical: number;
  tilingPaddingHorizontal: number;
  relativePlacementConstraint: Array<{ left: string; right: string; gap: number }>;
  fixedNodeConstraint: Array<{ nodeId: string; position: { x: number; y: number } }> | undefined;
  stop: () => void;
}

export interface FcoseGraphCanvasHandle {
  fit: () => void;
  focusSelected: () => void;
  resetLayout: () => void;
  unpinSelected: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface FcoseGraphCanvasProps {
  graph: VisualGraph;
  storageKey: string;
  selectedNodeId: string | null;
  searchQuery?: string;
  className?: string;
  onNodeSelected: (node: VisualGraphNode | null) => void;
}

const GRAPH_CLASSES = 'focused related dimmed active-edge active-context-edge hovered-edge';

function readStoredLayout(storageKey: string): StoredLayout {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<StoredLayout>;
    return { positions: parsed.positions ?? {}, pinned: parsed.pinned ?? [] };
  } catch {
    return { positions: {}, pinned: [] };
  }
}

function writeStoredLayout(storageKey: string, layout: StoredLayout) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch {
    // Graph interaction remains usable when storage is unavailable.
  }
}

function setLabelLevelOfDetail(cy: Core) {
  const zoom = cy.zoom();
  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const active = node.hasClass('focused') || node.hasClass('related');
      const important = active || node.degree(false) >= 4 || Number(node.data('priority')) >= 0.7;
      node.data('displayLabel', zoom < 0.45 ? (active ? node.data('label') : '') : zoom < 0.9 ? (important ? node.data('label') : '') : node.data('label'));
    });
    cy.edges().forEach((edge) => {
      const active = edge.hasClass('active-edge') || edge.hasClass('hovered-edge');
      edge.data('displayLabel', active || zoom >= 1.2 ? edge.data('type') : '');
    });
  });
}

function clearContext(cy: Core) {
  cy.elements().removeClass(GRAPH_CLASSES);
  setLabelLevelOfDetail(cy);
}

function applyContext(cy: Core, nodeId: string, hops = 1) {
  const selected = cy.getElementById(nodeId);
  if (!selected.isNode()) return;
  let activeNodes = selected;
  let frontier = selected;
  for (let depth = 0; depth < hops; depth += 1) {
    frontier = frontier.neighborhood('node');
    activeNodes = activeNodes.union(frontier);
  }
  const activeEdges = cy.edges().filter((edge) => activeNodes.contains(edge.source()) && activeNodes.contains(edge.target()));
  cy.batch(() => {
    cy.elements().removeClass(GRAPH_CLASSES);
    cy.elements().addClass('dimmed');
    activeNodes.removeClass('dimmed').addClass('related');
    activeEdges.removeClass('dimmed').addClass('active-context-edge');
    selected.removeClass('related').addClass('focused');
    selected.connectedEdges().removeClass('dimmed active-context-edge').addClass('active-edge');
  });
  setLabelLevelOfDetail(cy);
}

function applySearchContext(cy: Core, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    clearContext(cy);
    return;
  }
  const matches = cy.nodes().filter((node) => String(node.data('label')).toLocaleLowerCase().includes(normalized));
  if (!matches.length) {
    cy.elements().removeClass(GRAPH_CLASSES);
    cy.elements().addClass('dimmed');
    setLabelLevelOfDetail(cy);
    return;
  }
  let activeNodes = matches;
  matches.forEach((node) => { activeNodes = activeNodes.union(node.neighborhood('node')); });
  const activeEdges = cy.edges().filter((edge) => activeNodes.contains(edge.source()) && activeNodes.contains(edge.target()));
  cy.batch(() => {
    cy.elements().removeClass(GRAPH_CLASSES);
    cy.elements().addClass('dimmed');
    activeNodes.removeClass('dimmed').addClass('related');
    matches.removeClass('related').addClass('focused');
    activeEdges.removeClass('dimmed').addClass('active-context-edge');
  });
  setLabelLevelOfDetail(cy);
}

function packDisconnectedComponents(cy: Core) {
  const components = cy.elements().components().filter((component) => component.nodes().length > 0);
  if (components.length < 2 || cy.nodes('.pinned').length > 0) return;
  const padding = 48;
  const entries = components.map((component) => ({ component, box: component.boundingBox({ includeLabels: true }) }));
  const totalArea = entries.reduce((sum, entry) => sum + (entry.box.w + padding) * (entry.box.h + padding), 0);
  const targetWidth = Math.max(560, Math.sqrt(totalArea) * 1.35);
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  cy.batch(() => {
    entries.forEach(({ component, box }) => {
      if (cursorX > 0 && cursorX + box.w > targetWidth) {
        cursorX = 0;
        cursorY += rowHeight + padding;
        rowHeight = 0;
      }
      const dx = cursorX - box.x1;
      const dy = cursorY - box.y1;
      component.nodes().positions((node) => ({ x: node.position('x') + dx, y: node.position('y') + dy }));
      cursorX += box.w + padding;
      rowHeight = Math.max(rowHeight, box.h);
    });
  });
}

function graphStyles(dark: boolean): cytoscape.StylesheetJson {
  const surface = dark ? '#0f172a' : '#ffffff';
  const text = dark ? '#f8fafc' : '#0f172a';
  const muted = dark ? '#64748b' : '#94a3b8';
  return [
    { selector: 'node', style: {
      width: 'data(size)', height: 'data(size)', label: 'data(displayLabel)', 'font-size': 11,
      'font-family': 'Inter, ui-sans-serif, system-ui, sans-serif', 'font-weight': 600,
      color: text, 'text-background-color': surface, 'text-background-opacity': 0.92,
      'text-background-padding': '3px', 'text-background-shape': 'roundrectangle',
      'text-valign': 'bottom', 'text-margin-y': 8, 'text-wrap': 'ellipsis', 'text-max-width': '130px',
      'background-color': 'data(color)', 'border-width': 2, 'border-color': surface,
      'transition-property': 'opacity, border-width, border-color', 'transition-duration': 180,
    } },
    { selector: 'node[type = "OBJECT"]', style: { shape: 'round-rectangle' } },
    { selector: 'node[type = "USER_STORY"]', style: { shape: 'diamond', 'background-color': dark ? '#94a3b8' : '#475569' } },
    { selector: 'node[type = "UNKNOWN"]', style: { shape: 'hexagon' } },
    { selector: 'edge', style: {
      width: 1.2, opacity: 0.3, label: 'data(displayLabel)', 'font-size': 9, color: text,
      'text-background-color': surface, 'text-background-opacity': 0.92, 'text-background-padding': '2px',
      'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'arrow-scale': 0.8,
      'line-color': muted, 'target-arrow-color': muted,
      'transition-property': 'opacity, width, line-color, target-arrow-color', 'transition-duration': 180,
    } },
    { selector: 'edge[type = "SIMILAR"], edge[type = "ASSOCIATED"]', style: { 'line-style': 'dashed', 'target-arrow-shape': 'none' } },
    { selector: '.dimmed', style: { opacity: 0.12, 'text-opacity': 0 } },
    { selector: 'node.related', style: { opacity: 0.95, 'border-width': 3, 'border-color': '#f59e0b' } },
    { selector: 'node.focused', style: { opacity: 1, 'border-width': 6, 'border-color': '#ef4444', 'z-index': 999 } },
    { selector: 'node.pinned', style: { 'border-style': 'double', 'border-color': '#16a34a' } },
    { selector: 'edge.active-context-edge', style: { opacity: 0.92, width: 2.5, 'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b' } },
    { selector: 'edge.active-edge', style: { opacity: 1, width: 4, 'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b', 'z-index': 998 } },
    { selector: 'edge.hovered-edge', style: { opacity: 1, width: 3 } },
  ];
}

export const FcoseGraphCanvas = forwardRef<FcoseGraphCanvasHandle, FcoseGraphCanvasProps>(function FcoseGraphCanvas({
  graph, storageKey, selectedNodeId, searchQuery = '', className, onNodeSelected,
}, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const selectedRef = useRef(selectedNodeId);
  const searchRef = useRef(searchQuery);
  const graphRef = useRef(graph);
  const activeLayoutRef = useRef<cytoscape.Layouts | null>(null);
  const hasCompletedLayoutRef = useRef(false);
  const [layoutRunning, setLayoutRunning] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [selectedPinned, setSelectedPinned] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: VisualGraphNode } | null>(null);
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const restorePersistentContext = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (selectedRef.current) applyContext(cy, selectedRef.current);
    else applySearchContext(cy, searchRef.current);
  }, []);

  const persistPositions = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const stored = readStoredLayout(storageKey);
    cy.nodes().forEach((node) => { stored.positions[node.id()] = node.position(); });
    stored.pinned = cy.nodes('.pinned').map((node) => node.id());
    writeStoredLayout(storageKey, stored);
  }, [storageKey]);

  const runLayout = useCallback((randomize: boolean) => {
    const cy = cyRef.current;
    if (!cy || cy.nodes().empty()) return;
    activeLayoutRef.current?.stop();
    const { constraints, warnings } = buildSvoConstraints(graphRef.current);
    warnings.forEach((warning) => console.warn(`[graph] ${warning}`));
    const fixedNodeConstraint = cy.nodes('.pinned').map((node) => ({ nodeId: node.id(), position: node.position() }));
    setLayoutRunning(true);
    setLayoutError(null);
    const options: FcoseLayoutOptions = {
      name: 'fcose', quality: randomize ? 'default' : 'proof', randomize,
      animate: !reducedMotion, animationDuration: reducedMotion ? 0 : 700,
      fit: false, padding: 60, nodeDimensionsIncludeLabels: true, uniformNodeDimensions: false,
      packComponents: true, idealEdgeLength: 110, nodeRepulsion: 7500, edgeElasticity: 0.35,
      nestingFactor: 0.1, gravity: 0.2, gravityRange: 3.8, numIter: 2500,
      tile: true, tilingPaddingVertical: 40, tilingPaddingHorizontal: 40,
      relativePlacementConstraint: constraints,
      fixedNodeConstraint: fixedNodeConstraint.length ? fixedNodeConstraint : undefined,
      stop: () => {
        if (cy.destroyed()) return;
        if (randomize) {
          packDisconnectedComponents(cy);
          cy.fit(cy.elements(), 60);
        }
        persistPositions();
        restorePersistentContext();
        hasCompletedLayoutRef.current = true;
        activeLayoutRef.current = null;
        setLayoutRunning(false);
      },
    };
    try {
      const layout = cy.layout(options as unknown as cytoscape.LayoutOptions);
      activeLayoutRef.current = layout;
      layout.run();
    } catch (error) {
      console.error('[graph] fCoSE layout failed, using a safe CoSE fallback.', error);
      setLayoutError('fCoSE could not arrange this dataset. A safe fallback layout is shown.');
      const fallback = cy.layout({ name: 'cose', animate: false, fit: true, padding: 60, randomize: true });
      activeLayoutRef.current = fallback;
      fallback.one('layoutstop', () => {
        if (cy.destroyed()) return;
        hasCompletedLayoutRef.current = true;
        activeLayoutRef.current = null;
        persistPositions();
        restorePersistentContext();
        setLayoutRunning(false);
      });
      fallback.run();
    }
  }, [persistPositions, reducedMotion, restorePersistentContext]);

  useEffect(() => {
    if (!hostRef.current) return;
    const dark = document.documentElement.classList.contains('dark');
    const cy = cytoscape({
      container: hostRef.current,
      elements: [],
      style: graphStyles(dark),
      minZoom: 0.18,
      maxZoom: 3,
      wheelSensitivity: 0.18,
      boxSelectionEnabled: false,
      autoungrabify: false,
    });
    cyRef.current = cy;
    const handleTapNode = (event: EventObject) => {
      const node = event.target as NodeSingular;
      applyContext(cy, node.id());
      const selected = graphRef.current.nodes.find((item) => item.id === node.id()) ?? null;
      onNodeSelected(selected);
    };
    const handleDoubleTap = (event: EventObject) => {
      const node = event.target as NodeSingular;
      applyContext(cy, node.id(), 2);
    };
    const handleBackgroundTap = (event: EventObject) => {
      if (event.target !== cy) return;
      onNodeSelected(null);
      applySearchContext(cy, searchRef.current);
    };
    const handleMouseOver = (event: EventObject) => {
      const node = event.target as NodeSingular;
      applyContext(cy, node.id());
      const original = event.originalEvent as MouseEvent | undefined;
      const data = graphRef.current.nodes.find((item) => item.id === node.id());
      if (data && original) setTooltip({ x: original.clientX, y: original.clientY, node: data });
    };
    const handleMouseOut = () => { setTooltip(null); restorePersistentContext(); };
    const handleEdgeOver = (event: EventObject) => {
      (event.target as EdgeSingular).addClass('hovered-edge');
      setLabelLevelOfDetail(cy);
    };
    const handleEdgeOut = (event: EventObject) => {
      (event.target as EdgeSingular).removeClass('hovered-edge');
      setLabelLevelOfDetail(cy);
    };
    const handleDragFree = (event: EventObject) => {
      const node = event.target as NodeSingular;
      node.addClass('pinned');
      node.lock();
      setSelectedPinned(selectedRef.current === node.id());
      persistPositions();
    };
    const handleZoom = () => setLabelLevelOfDetail(cy);
    cy.on('tap', 'node', handleTapNode);
    cy.on('dbltap', 'node', handleDoubleTap);
    cy.on('tap', handleBackgroundTap);
    cy.on('mouseover', 'node', handleMouseOver);
    cy.on('mouseout', 'node', handleMouseOut);
    cy.on('mouseover', 'edge', handleEdgeOver);
    cy.on('mouseout', 'edge', handleEdgeOut);
    cy.on('dragfree', 'node', handleDragFree);
    cy.on('zoom', handleZoom);

    const resizeObserver = new ResizeObserver(() => { cy.resize(); });
    resizeObserver.observe(hostRef.current);
    const themeObserver = new MutationObserver(() => {
      cy.style(graphStyles(document.documentElement.classList.contains('dark')));
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onNodeSelected(null);
      applySearchContext(cy, searchRef.current);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      activeLayoutRef.current?.stop();
      activeLayoutRef.current = null;
      hasCompletedLayoutRef.current = false;
      cy.removeAllListeners();
      cy.destroy();
      cyRef.current = null;
    };
  }, [onNodeSelected, persistPositions, restorePersistentContext]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    graphRef.current = graph;
    const previous = new Map(cy.nodes().map((node) => [node.id(), node.position()]));
    const stored = readStoredLayout(storageKey);
    const maxDegree = Math.max(1, ...graph.nodes.map((node) => node.degree));
    const elements = graph.elements.map((element) => {
      if (!element.data.id || element.data.source) return element;
      const degree = Number(element.data.degree ?? 0);
      const size = 22 + 26 * (Math.log1p(degree) / Math.log1p(maxDegree));
      return { ...element, data: { ...element.data, size, displayLabel: element.data.label } };
    });
    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
      cy.nodes().forEach((node) => {
        const saved = stored.positions[node.id()] ?? previous.get(node.id());
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) node.position(saved);
        if (stored.pinned.includes(node.id())) node.addClass('pinned').lock();
      });
    });
    graph.warnings.forEach((warning) => console.warn(`[graph] ${warning}`));
    const hasSavedPositions = graph.nodes.some((node) => Boolean(stored.positions[node.id]));
    runLayout(!hasCompletedLayoutRef.current && !hasSavedPositions && previous.size === 0);
  }, [graph, runLayout, storageKey]);

  useEffect(() => {
    selectedRef.current = selectedNodeId;
    const cy = cyRef.current;
    if (!cy) return;
    if (selectedNodeId) applyContext(cy, selectedNodeId);
    else applySearchContext(cy, searchRef.current);
    setSelectedPinned(Boolean(selectedNodeId && cy.getElementById(selectedNodeId).hasClass('pinned')));
  }, [selectedNodeId]);

  useEffect(() => {
    searchRef.current = searchQuery;
    if (!selectedRef.current && cyRef.current) applySearchContext(cyRef.current, searchQuery);
  }, [searchQuery]);

  useImperativeHandle(ref, () => ({
    fit: () => cyRef.current?.fit(cyRef.current.elements(), 60),
    focusSelected: () => {
      const cy = cyRef.current;
      if (!cy || !selectedRef.current) return;
      const node = cy.getElementById(selectedRef.current);
      cy.animate({ fit: { eles: node.closedNeighborhood(), padding: 80 }, duration: reducedMotion ? 0 : 350 });
    },
    resetLayout: () => {
      const cy = cyRef.current;
      if (!cy) return;
      localStorage.removeItem(storageKey);
      cy.nodes().unlock().removeClass('pinned');
      setSelectedPinned(false);
      runLayout(true);
    },
    unpinSelected: () => {
      const cy = cyRef.current;
      if (!cy || !selectedRef.current) return;
      cy.getElementById(selectedRef.current).unlock().removeClass('pinned');
      setSelectedPinned(false);
      persistPositions();
      runLayout(false);
    },
    zoomIn: () => cyRef.current?.zoom({ level: Math.min(3, (cyRef.current?.zoom() ?? 1) * 1.2), renderedPosition: { x: (cyRef.current?.width() ?? 0) / 2, y: (cyRef.current?.height() ?? 0) / 2 } }),
    zoomOut: () => cyRef.current?.zoom({ level: Math.max(0.18, (cyRef.current?.zoom() ?? 1) / 1.2), renderedPosition: { x: (cyRef.current?.width() ?? 0) / 2, y: (cyRef.current?.height() ?? 0) / 2 } }),
  }), [persistPositions, reducedMotion, runLayout, storageKey]);

  return (
    <div className={cn('relative min-h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950', className)}>
      <div ref={hostRef} className="absolute inset-0 h-full w-full touch-none" role="img" aria-label={`Interactive S–V–O graph with ${graph.nodes.length} nodes and ${graph.edges.length} relationships. Use the table view for keyboard navigation.`} />
      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-5rem)] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <p className="font-semibold text-slate-700 dark:text-slate-200">fCoSE overview</p>
        <p className="mt-0.5 text-slate-500 dark:text-slate-400">Node size represents degree · drag to pin</p>
      </div>
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-md dark:border-slate-700 dark:bg-slate-900">
        <GraphControl label="Zoom in" onClick={() => ref && typeof ref !== 'function' ? ref.current?.zoomIn() : cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}><Plus /></GraphControl>
        <GraphControl label="Zoom out" onClick={() => ref && typeof ref !== 'function' ? ref.current?.zoomOut() : cyRef.current?.zoom(cyRef.current.zoom() / 1.2)}><Minus /></GraphControl>
        <GraphControl label="Fit entire graph" onClick={() => cyRef.current?.fit(cyRef.current.elements(), 60)}><Maximize2 /></GraphControl>
        <GraphControl label="Focus selected neighborhood" disabled={!selectedNodeId} onClick={() => selectedNodeId && cyRef.current?.animate({ fit: { eles: cyRef.current.getElementById(selectedNodeId).closedNeighborhood(), padding: 80 }, duration: reducedMotion ? 0 : 350 })}><Focus /></GraphControl>
        <GraphControl label={selectedPinned ? 'Unpin selected node' : 'Selected node is not pinned'} disabled={!selectedPinned} onClick={() => {
          if (!selectedNodeId || !cyRef.current) return;
          cyRef.current.getElementById(selectedNodeId).unlock().removeClass('pinned');
          setSelectedPinned(false); persistPositions(); runLayout(false);
        }}>{selectedPinned ? <UnlockKeyhole /> : <LockKeyhole />}</GraphControl>
        <GraphControl label="Reset layout and pins" onClick={() => {
          if (!cyRef.current) return;
          localStorage.removeItem(storageKey); cyRef.current.nodes().unlock().removeClass('pinned'); setSelectedPinned(false); runLayout(true);
        }}><RotateCcw /></GraphControl>
      </div>
      {layoutRunning && <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-slate-900/95 dark:text-indigo-300" role="status"><LocateFixed className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" /> Arranging graph…</div>}
      {layoutError && <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-5rem)] rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100" role="status">{layoutError}</div>}
      {tooltip && <div className="pointer-events-none fixed z-[1000] max-w-64 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900" style={{ left: tooltip.x, top: tooltip.y }} role="tooltip">
        <p className="break-words font-semibold text-slate-950 dark:text-white">{tooltip.node.label}</p>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{tooltip.node.type.replace('_', ' ')} · degree {tooltip.node.degree} · priority {tooltip.node.priority.toFixed(2)}</p>
      </div>}
    </div>
  );
});

function GraphControl({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactElement<{ className?: string }> }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800">{children}</button>;
}
