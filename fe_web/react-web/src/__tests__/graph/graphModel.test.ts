import { describe, expect, it } from 'vitest';
import { adaptGraphData, describeRoles, normalizeEdgeType, normalizeNodeType, storyIdsForNode, termIdsForStory, toSvoGraph } from '@/lib/graph/graphModel';
import type { GraphData } from '@/services/graphService';

const data: GraphData = {
  nodes: [
    { id: 's', label: 'operator', type: 'SUBJECT', priority: 1 },
    { id: 'v', label: 'reviews', type: 'ACTION', priority: 'medium' },
    { id: 'o', label: 'flight plan', type: 'OBJECT' },
    { id: 'story', label: 'story-id', type: 'USER_STORY' },
  ],
  edges: [
    { from: 's', to: 'v', type: 'PERFORM' },
    { from: 'v', to: 'o', type: 'TARGET' },
    { from: 'story', to: 's', type: 'RELATES_TO' },
    { from: 'o', to: 's', type: 'SIMILAR', score: 0.8 },
  ],
};

describe('graph adapter', () => {
  it('maps the API contract without reversing edge direction', () => {
    const graph = adaptGraphData(data, new Map([['story', 'As an operator, I want a safe plan']]));
    expect(graph.edges.map(({ source, target, type }) => ({ source, target, type }))).toEqual([
      { source: 's', target: 'v', type: 'PERFORM' },
      { source: 'v', target: 'o', type: 'TARGET' },
      { source: 'story', target: 's', type: 'HAS_STORY' },
      { source: 'o', target: 's', type: 'SIMILAR' },
    ]);
    expect(new Set(graph.edges.map((edge) => edge.id)).size).toBe(graph.edges.length);
    expect(graph.nodes.find((node) => node.id === 's')?.degree).toBe(3);
    expect(graph.nodes.find((node) => node.id === 'v')?.priority).toBe(0.65);
    expect(graph.nodes.find((node) => node.id === 'story')?.label).toBe('As an operator, I want a safe plan');
  });

  it('drops duplicate nodes, duplicate edges, self edges and dangling edges', () => {
    const graph = adaptGraphData({
      nodes: [...data.nodes, data.nodes[0]],
      edges: [...data.edges, data.edges[0], { from: 's', to: 's', type: 'PERFORM' }, { from: 'missing', to: 'o', type: 'TARGET' }],
    });
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(4);
    expect(graph.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('Duplicate node'),
      expect.stringContaining('Self edge'),
      expect.stringContaining('Dangling edge'),
    ]));
  });

  it('keeps backend TERM neutral and maps only known relationship aliases', () => {
    expect(normalizeNodeType('TERM')).toBe('TERM');
    expect(normalizeNodeType('something-new')).toBe('UNKNOWN');
    expect(normalizeEdgeType('RELATES_TO')).toBe('HAS_STORY');
    expect(normalizeEdgeType('something-new')).toBe('UNKNOWN');
  });

  it('derives an unambiguous TERM role from the verified PERFORM/TARGET contract', () => {
    const graph = adaptGraphData({
      nodes: [
        { id: 's', label: 'operator', type: 'TERM' },
        { id: 'v', label: 'reviews', type: 'TERM' },
        { id: 'o', label: 'plan', type: 'TERM' },
      ],
      edges: [
        { from: 's', to: 'v', type: 'PERFORM' },
        { from: 'v', to: 'o', type: 'TARGET' },
      ],
    });
    expect(graph.nodes.map((node) => node.type)).toEqual(['SUBJECT', 'ACTION', 'OBJECT']);
  });
});

describe('S–V–O only view', () => {
  it('drops user story nodes and their RELATES_TO links', () => {
    const graph = toSvoGraph(adaptGraphData({
      nodes: [
        { id: 's', label: 'operator', type: 'TERM' },
        { id: 'v', label: 'reviews', type: 'TERM' },
        { id: 'o', label: 'plan', type: 'TERM' },
        { id: 'story-1', label: 'story-1', type: 'USER_STORY' },
      ],
      edges: [
        { from: 's', to: 'v', type: 'PERFORM' },
        { from: 'v', to: 'o', type: 'TARGET' },
        { from: 'story-1', to: 's', type: 'RELATES_TO' },
      ],
    }));
    expect(graph.nodes.map((node) => [node.id, node.type])).toEqual([['s', 'SUBJECT'], ['v', 'ACTION'], ['o', 'OBJECT']]);
    expect(graph.edges.map((edge) => edge.type)).toEqual(['PERFORM', 'TARGET']);
    expect(graph.nodes.find((node) => node.id === 's')?.degree).toBe(1);
  });

  it('keeps similarity links between terms but removes isolated mixed terms', () => {
    const graph = toSvoGraph(adaptGraphData({
      nodes: [
        { id: 'a', label: 'account', type: 'OBJECT' },
        { id: 'b', label: 'profile', type: 'OBJECT' },
        { id: 'lonely', label: 'lonely', type: 'TERM' },
      ],
      edges: [{ from: 'a', to: 'b', type: 'SIMILAR', score: 0.8 }],
    }));
    expect(graph.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(graph.edges).toHaveLength(1);
  });
});

describe('backend roles', () => {
  it('uses roles from the API and marks multi-role terms as mixed', () => {
    const graph = adaptGraphData({
      nodes: [
        { id: 'pm', label: 'product manager', type: 'TERM', roles: ['SUBJECT'] },
        { id: 'backlog', label: 'backlog', type: 'TERM', roles: ['OBJECT', 'SUBJECT'] },
      ],
      edges: [],
    });
    expect(graph.nodes.map((node) => node.type)).toEqual(['SUBJECT', 'TERM']);
    expect(graph.nodes[1].roles).toEqual(['SUBJECT', 'OBJECT']);
    expect(describeRoles(graph.nodes[1])).toBe('Subject + Object');
  });

  it('uses the story count as the weight of S–V–O edges', () => {
    const graph = adaptGraphData({
      nodes: [{ id: 's', label: 's', type: 'TERM' }, { id: 'v', label: 'v', type: 'TERM' }],
      edges: [{ from: 's', to: 'v', type: 'PERFORM', weight: 3, storyIds: ['a', 'b', 'c'] }],
    });
    expect(graph.edges[0].weight).toBe(3);
  });
});

describe('stories behind terms', () => {
  const graph = adaptGraphData({
    nodes: [
      { id: 'member', label: 'team member', type: 'TERM' },
      { id: 'add', label: 'add', type: 'TERM' },
      { id: 'find', label: 'find', type: 'TERM' },
      { id: 'comment', label: 'comment', type: 'TERM' },
      { id: 'story', label: 'story', type: 'TERM' },
    ],
    edges: [
      { from: 'member', to: 'add', type: 'PERFORM', storyIds: ['s1'] },
      { from: 'add', to: 'comment', type: 'TARGET', storyIds: ['s1'] },
      { from: 'member', to: 'find', type: 'PERFORM', storyIds: ['s2'] },
      { from: 'find', to: 'story', type: 'TARGET', storyId: 's2' },
      { from: 'comment', to: 'story', type: 'SIMILAR', score: 0.8 },
    ],
  });

  it('lists every story whose triple contains the term', () => {
    expect(storyIdsForNode(graph, 'member')).toEqual(['s1', 's2']);
    expect(storyIdsForNode(graph, 'story')).toEqual(['s2']);
  });

  it('ignores analytical edges when collecting stories', () => {
    expect(storyIdsForNode(graph, 'comment')).toEqual(['s1']);
  });

  it('returns the S–V–O path of one story', () => {
    expect([...termIdsForStory(graph, 's2')].sort()).toEqual(['find', 'member', 'story']);
  });
});
