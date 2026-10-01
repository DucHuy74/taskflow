import type { ElementDefinition } from 'cytoscape';
import type { GraphData, GraphEdge, GraphNode } from '@/services/graphService';

export type GraphNodeType = 'SUBJECT' | 'ACTION' | 'OBJECT' | 'TERM' | 'USER_STORY' | 'UNKNOWN';
export type GraphEdgeType = 'PERFORM' | 'TARGET' | 'SIMILAR' | 'ASSOCIATED' | 'REDUNDANT_WITH' | 'HAS_STORY' | 'UNKNOWN';

export interface VisualGraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  priority: number;
  degree: number;
  betweenness: number;
  structure: number;
  color: string;
}

export interface VisualGraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  weight: number;
}

export interface VisualGraph {
  nodes: VisualGraphNode[];
  edges: VisualGraphEdge[];
  elements: ElementDefinition[];
  warnings: string[];
}

export interface RelativePlacementConstraint {
  left: string;
  right: string;
  gap: number;
}

const NODE_COLORS: Record<GraphNodeType, string> = {
  SUBJECT: '#2563eb',
  ACTION: '#7c3aed',
  OBJECT: '#0891b2',
  USER_STORY: '#475569',
  TERM: '#64748b',
  UNKNOWN: '#64748b',
};

export function normalizePriority(priority: GraphNode['priority']): number {
  const numeric = Number(priority);
  if (priority !== undefined && priority !== null && Number.isFinite(numeric)) {
    return Math.min(1, Math.max(0, numeric));
  }
  const label = String(priority ?? '').toUpperCase();
  if (label === 'HIGHEST' || label === 'HIGH') return 1;
  if (label === 'MEDIUM') return 0.65;
  if (label === 'LOW' || label === 'LOWEST') return 0.3;
  return 0;
}

export function normalizeNodeType(type: string): GraphNodeType {
  const value = type.trim().toUpperCase();
  if (value === 'SUBJECT' || value === 'ACTOR') return 'SUBJECT';
  if (value === 'ACTION' || value === 'VERB') return 'ACTION';
  if (value === 'OBJECT') return 'OBJECT';
  if (value === 'TERM') return 'TERM';
  if (value === 'USER_STORY' || value === 'USERSTORY' || value === 'STORY') return 'USER_STORY';
  return 'UNKNOWN';
}

export function normalizeEdgeType(type: string): GraphEdgeType {
  const value = type.trim().toUpperCase();
  if (value === 'PERFORM') return 'PERFORM';
  if (value === 'TARGET') return 'TARGET';
  if (value === 'SIMILAR' || value === 'SIMILARITY') return 'SIMILAR';
  if (value === 'ASSOCIATED' || value === 'ASSOCIATION') return 'ASSOCIATED';
  if (value === 'REDUNDANT_WITH') return 'REDUNDANT_WITH';
  if (value === 'HAS_STORY' || value === 'RELATES_TO') return 'HAS_STORY';
  return 'UNKNOWN';
}

function edgeWeight(edge: GraphEdge): number {
  const raw = edge.score ?? edge.confidence ?? edge.lift ?? 0.5;
  return Number.isFinite(raw) ? Math.max(0, Number(raw)) : 0.5;
}

function normalizedBetweenness(nodes: GraphNode[], adjacency: Map<string, Set<string>>) {
  const ids = nodes.map((node) => node.id);
  const score = new Map(ids.map((id) => [id, 0]));
  const sampleStep = ids.length > 160 ? Math.ceil(ids.length / 120) : 1;

  ids.filter((_, index) => index % sampleStep === 0).forEach((source) => {
    const stack: string[] = [];
    const predecessors = new Map(ids.map((id) => [id, [] as string[]]));
    const paths = new Map(ids.map((id) => [id, 0]));
    const distance = new Map(ids.map((id) => [id, -1]));
    paths.set(source, 1);
    distance.set(source, 0);
    const queue = [source];

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      stack.push(current);
      adjacency.get(current)?.forEach((next) => {
        if (distance.get(next) === -1) {
          distance.set(next, (distance.get(current) ?? 0) + 1);
          queue.push(next);
        }
        if (distance.get(next) === (distance.get(current) ?? 0) + 1) {
          paths.set(next, (paths.get(next) ?? 0) + (paths.get(current) ?? 0));
          predecessors.get(next)?.push(current);
        }
      });
    }

    const dependency = new Map(ids.map((id) => [id, 0]));
    while (stack.length) {
      const node = stack.pop()!;
      predecessors.get(node)?.forEach((parent) => {
        const contribution = ((paths.get(parent) ?? 0) / Math.max(1, paths.get(node) ?? 0)) * (1 + (dependency.get(node) ?? 0));
        dependency.set(parent, (dependency.get(parent) ?? 0) + contribution);
      });
      if (node !== source) score.set(node, (score.get(node) ?? 0) + (dependency.get(node) ?? 0));
    }
  });

  const max = Math.max(1, ...score.values());
  return new Map(ids.map((id) => [id, (score.get(id) ?? 0) / max]));
}

export function adaptGraphData(data: GraphData, storyLabels: ReadonlyMap<string, string> = new Map()): VisualGraph {
  const warnings: string[] = [];
  const uniqueNodes = new Map<string, GraphNode>();
  data.nodes.forEach((node) => {
    if (!node.id || uniqueNodes.has(node.id)) {
      if (node.id) warnings.push(`Duplicate node skipped: ${node.id}`);
      return;
    }
    uniqueNodes.set(node.id, node);
  });

  const adjacency = new Map([...uniqueNodes.keys()].map((id) => [id, new Set<string>()]));
  const edges: VisualGraphEdge[] = [];
  const edgeKeys = new Set<string>();
  data.edges.forEach((edge) => {
    if (!uniqueNodes.has(edge.from) || !uniqueNodes.has(edge.to)) {
      warnings.push(`Dangling edge skipped: ${edge.from} -> ${edge.to}`);
      return;
    }
    if (edge.from === edge.to) {
      warnings.push(`Self edge skipped: ${edge.from}`);
      return;
    }
    const type = normalizeEdgeType(edge.type);
    const key = `${type}\u0000${edge.from}\u0000${edge.to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
    edges.push({ id: `edge:${encodeURIComponent(key)}`, source: edge.from, target: edge.to, type, weight: edgeWeight(edge) });
  });

  const roleHints = new Map<string, Set<GraphNodeType>>();
  const hint = (id: string, type: GraphNodeType) => {
    if (!roleHints.has(id)) roleHints.set(id, new Set());
    roleHints.get(id)?.add(type);
  };
  edges.forEach((edge) => {
    if (edge.type === 'PERFORM') { hint(edge.source, 'SUBJECT'); hint(edge.target, 'ACTION'); }
    if (edge.type === 'TARGET') { hint(edge.source, 'ACTION'); hint(edge.target, 'OBJECT'); }
  });

  const betweenness = normalizedBetweenness([...uniqueNodes.values()], adjacency);
  const rawNodes = [...uniqueNodes.values()].map((node) => {
    const apiType = normalizeNodeType(node.type);
    const hints = roleHints.get(node.id);
    const type = (apiType === 'TERM' || apiType === 'UNKNOWN') && hints?.size === 1 ? [...hints][0] : apiType;
    return {
      id: node.id,
      label: type === 'USER_STORY' ? storyLabels.get(node.id) || node.label || node.id : node.label || node.id,
      type,
      priority: normalizePriority(node.priority),
      degree: node.degree ?? adjacency.get(node.id)?.size ?? 0,
      betweenness: node.betweenness ?? betweenness.get(node.id) ?? 0,
    };
  });
  const maxDegree = Math.max(1, ...rawNodes.map((node) => node.degree));
  const maxBetweenness = Math.max(1, ...rawNodes.map((node) => node.betweenness));
  const nodes: VisualGraphNode[] = rawNodes.map((node) => ({
    ...node,
    structure: 0.5 * (node.degree / maxDegree) + 0.5 * (node.betweenness / maxBetweenness),
    color: NODE_COLORS[node.type],
  }));

  return {
    nodes,
    edges,
    warnings,
    elements: [
      ...nodes.map((node) => ({ data: { ...node } })),
      ...edges.map((edge) => ({ data: { ...edge } })),
    ],
  };
}

function canReach(adjacency: Map<string, Set<string>>, start: string, goal: string): boolean {
  const queue = [start];
  const visited = new Set<string>();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === goal) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    adjacency.get(current)?.forEach((next) => queue.push(next));
  }
  return false;
}

export function buildSvoConstraints(graph: Pick<VisualGraph, 'nodes' | 'edges'>, gap = 100) {
  const ids = new Set(graph.nodes.map((node) => node.id));
  const adjacency = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const constraints: RelativePlacementConstraint[] = [];
  const warnings: string[] = [];

  graph.edges.forEach((edge) => {
    if (edge.type !== 'PERFORM' && edge.type !== 'TARGET') return;
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) return;
    const key = `${edge.source}\u0000${edge.target}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (canReach(adjacency, edge.target, edge.source)) {
      warnings.push(`Cyclic SVO constraint skipped: ${edge.source} -> ${edge.target}`);
      return;
    }
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    adjacency.get(edge.source)?.add(edge.target);
    constraints.push({ left: edge.source, right: edge.target, gap });
  });

  return { constraints, warnings };
}
