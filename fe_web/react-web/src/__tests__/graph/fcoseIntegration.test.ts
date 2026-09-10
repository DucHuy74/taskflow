import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { describe, expect, it } from 'vitest';
import { adaptGraphData, buildSvoConstraints } from '@/lib/graph/graphModel';

cytoscape.use(fcose);

describe('fCoSE SVO integration', () => {
  it('honors left-to-right relative constraints in headless mode', () => {
    const graph = adaptGraphData({
      nodes: [
        { id: 'subject', label: 'Operator', type: 'SUBJECT' },
        { id: 'action', label: 'reviews', type: 'ACTION' },
        { id: 'object', label: 'flight plan', type: 'OBJECT' },
      ],
      edges: [
        { from: 'subject', to: 'action', type: 'PERFORM' },
        { from: 'action', to: 'object', type: 'TARGET' },
      ],
    });
    const { constraints } = buildSvoConstraints(graph, 80);
    const cy = cytoscape({ headless: true, elements: graph.elements });

    cy.layout({
      name: 'fcose',
      animate: false,
      quality: 'default',
      randomize: true,
      relativePlacementConstraint: constraints,
    } as unknown as cytoscape.LayoutOptions).run();

    expect(cy.getElementById('action').position('x') - cy.getElementById('subject').position('x')).toBeGreaterThanOrEqual(79);
    expect(cy.getElementById('object').position('x') - cy.getElementById('action').position('x')).toBeGreaterThanOrEqual(79);
    cy.destroy();
  });
});
