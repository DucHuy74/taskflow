import { describe, expect, it } from 'vitest';
import { adaptGraphData, buildSvoConstraints, normalizeEdgeType, normalizeNodeType } from '@/lib/graph/graphModel';
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

describe('SVO relative constraints', () => {
  it('creates left-to-right constraints only for PERFORM and TARGET', () => {
    const graph = adaptGraphData(data);
    expect(buildSvoConstraints(graph).constraints).toEqual([
      { left: 's', right: 'v', gap: 100 },
      { left: 'v', right: 'o', gap: 100 },
    ]);
  });

  it('skips a constraint that would create a cycle', () => {
    const graph = adaptGraphData({
      nodes: data.nodes.slice(0, 3),
      edges: [
        { from: 's', to: 'v', type: 'PERFORM' },
        { from: 'v', to: 'o', type: 'TARGET' },
        { from: 'o', to: 's', type: 'TARGET' },
      ],
    });
    const result = buildSvoConstraints(graph, 90);
    expect(result.constraints).toEqual([
      { left: 's', right: 'v', gap: 90 },
      { left: 'v', right: 'o', gap: 90 },
    ]);
    expect(result.warnings).toEqual([expect.stringContaining('Cyclic SVO constraint')]);
  });
});
