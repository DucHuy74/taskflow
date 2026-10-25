import type { GraphData, GraphEdge, GraphNode } from '@/services/graphService';

export type GraphNodeType = 'SUBJECT' | 'ACTION' | 'OBJECT' | 'TERM' | 'USER_STORY' | 'UNKNOWN';
export type GraphEdgeType = 'PERFORM' | 'TARGET' | 'SIMILAR' | 'ASSOCIATED' | 'REDUNDANT_WITH' | 'HAS_STORY' | 'UNKNOWN';

export interface GraphElementDefinition {
  data: Record<string, unknown>;
}

export interface VisualGraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  priority: number;
  degree: number;
  betweenness: number;
  structure: number;
  color: string;
  /** All S–V–O roles the term plays; more than one means it is drawn as a mixed-role term. */
  roles: Array<'SUBJECT' | 'ACTION' | 'OBJECT'>;
}

export interface VisualGraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  weight: number;
  /** Stories behind a PERFORM / TARGET relation (empty for analytical edges). */
  storyIds: string[];
}

export interface VisualGraph {
  nodes: VisualGraphNode[];
  edges: VisualGraphEdge[];
  elements: GraphElementDefinition[];
  warnings: string[];
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
  const raw = edge.weight ?? edge.score ?? edge.confidence ?? edge.lift ?? 0.5;
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
    const storyIds = edge.storyIds?.length ? [...edge.storyIds] : edge.storyId ? [edge.storyId] : [];
    edges.push({ id: `edge:${encodeURIComponent(key)}`, source: edge.from, target: edge.to, type, weight: edgeWeight(edge), storyIds });
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
    // Roles come from the backend (Neo4j labels + edges); edge hints cover older backends without `roles`.
    const roleSet = new Set<GraphNodeType>(roleHints.get(node.id));
    (node.roles ?? []).forEach((role) => {
      const normalized = normalizeNodeType(role);
      if (normalized === 'SUBJECT' || normalized === 'ACTION' || normalized === 'OBJECT') roleSet.add(normalized);
    });
    if (apiType === 'SUBJECT' || apiType === 'ACTION' || apiType === 'OBJECT') roleSet.add(apiType);
    const roles = (['SUBJECT', 'ACTION', 'OBJECT'] as const).filter((role) => roleSet.has(role));
    let type = apiType;
    if (apiType !== 'USER_STORY') {
      if (roles.length === 1) type = roles[0];
      else if (roles.length > 1) type = 'TERM';
    }
    return {
      roles,
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

const SVO_NODE_TYPES: ReadonlySet<GraphNodeType> = new Set(['SUBJECT', 'ACTION', 'OBJECT', 'TERM']);
const SVO_EDGE_TYPES: ReadonlySet<GraphEdgeType> = new Set(['PERFORM', 'TARGET', 'SIMILAR', 'ASSOCIATED']);

/**
 * Keeps only the semantic layer of the graph: subject, action and object terms
 * (plus terms used in several roles) and the relations between them. User story
 * nodes and their RELATES_TO links are dropped so the overview stays readable.
 */
export function toSvoGraph(graph: VisualGraph): VisualGraph {
  const nodes = graph.nodes.filter((node) => SVO_NODE_TYPES.has(node.type));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => SVO_EDGE_TYPES.has(edge.type) && ids.has(edge.source) && ids.has(edge.target));
  const degree = new Map(nodes.map((node) => [node.id, new Set<string>()]));
  edges.forEach((edge) => {
    degree.get(edge.source)?.add(edge.target);
    degree.get(edge.target)?.add(edge.source);
  });
  const connected = nodes
    .filter((node) => (degree.get(node.id)?.size ?? 0) > 0 || node.type !== 'TERM')
    .map((node) => ({ ...node, degree: degree.get(node.id)?.size ?? 0 }));
  const maxDegree = Math.max(1, ...connected.map((node) => node.degree));
  const maxBetweenness = Math.max(1e-9, ...connected.map((node) => node.betweenness));
  const svoNodes = connected.map((node) => ({
    ...node,
    structure: 0.5 * (node.degree / maxDegree) + 0.5 * (node.betweenness / maxBetweenness),
  }));
  const keptIds = new Set(svoNodes.map((node) => node.id));
  const svoEdges = edges.filter((edge) => keptIds.has(edge.source) && keptIds.has(edge.target));
  return {
    nodes: svoNodes,
    edges: svoEdges,
    warnings: graph.warnings,
    elements: [
      ...svoNodes.map((node) => ({ data: { ...node } })),
      ...svoEdges.map((edge) => ({ data: { ...edge } })),
    ],
  };
}

export function roleName(type: GraphNodeType) {
  if (type === 'SUBJECT') return 'Subject';
  if (type === 'ACTION') return 'Action (verb)';
  if (type === 'OBJECT') return 'Object';
  if (type === 'TERM') return 'Mixed-role term';
  return type.replace('_', ' ').toLowerCase();
}

/** Human-readable role description, e.g. "Subject + Object" for a mixed-role term. */
export function describeRoles(node: Pick<VisualGraphNode, 'type' | 'roles'>) {
  if (node.type === 'TERM' && node.roles.length > 1) return node.roles.map(roleName).join(' + ');
  return roleName(node.type);
}

const STORY_EDGE_TYPES: ReadonlySet<GraphEdgeType> = new Set(['PERFORM', 'TARGET']);

/** User stories whose S–V–O triple contains the given term, in first-seen order. */
export function storyIdsForNode(graph: Pick<VisualGraph, 'edges'>, nodeId: string): string[] {
  const ids = new Set<string>();
  graph.edges.forEach((edge) => {
    if (STORY_EDGE_TYPES.has(edge.type) && (edge.source === nodeId || edge.target === nodeId)) {
      edge.storyIds.forEach((id) => ids.add(id));
    }
  });
  return [...ids];
}

/** The subject, action and object terms produced by one story (used to highlight its path). */
export function termIdsForStory(graph: Pick<VisualGraph, 'edges'>, storyId: string): Set<string> {
  const ids = new Set<string>();
  graph.edges.forEach((edge) => {
    if (STORY_EDGE_TYPES.has(edge.type) && edge.storyIds.includes(storyId)) {
      ids.add(edge.source);
      ids.add(edge.target);
    }
  });
  return ids;
}
