import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  priority?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
  score?: number;
  confidence?: number;
  lift?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphQLResponse {
  data?: {
    workspaceGraph?: GraphData;
  };
  errors?: Array<{ message: string }>;
}

export const graphService = {
  /**
   * Get workspace backlog graph from Neo4j
   */
  async getBacklogGraph(
    workspaceId: string,
    options?: {
      backlogId?: string;
      sprintId?: string;
      source?: 'REALTIME' | 'BATCH';
      includeSimilarity?: boolean;
      includeAssociation?: boolean;
      minScore?: number;
      minConfidence?: number;
    }
  ): Promise<GraphData | null> {
    const {
      backlogId,
      sprintId,
      source = 'REALTIME',
      includeSimilarity = true,
      includeAssociation = true,
      minScore = 0.5,
      minConfidence = 0.3,
    } = options || {};

    const useSim = includeSimilarity ? 'true' : 'null';
    const useAssoc = includeAssociation ? 'true' : 'null';

    const query = `
      query WorkspaceGraph($workspaceId: ID!, $backlogId: ID, $sprintId: ID) {
        workspaceGraph(
          workspaceId: $workspaceId
          includeSimilarity: ${useSim}
          includeAssociation: ${useAssoc}
          minScore: ${minScore}
          minConfidence: ${minConfidence}
          sprintId: $sprintId
          backlogId: $backlogId
          source: "${source}"
        ) {
          nodes {
            id
            label
            type
            priority
          }
          edges {
            from
            to
            type
            score
            confidence
            lift
          }
        }
      }
    `;

    try {
      const token = localStorage.getItem('accessToken');

      const response = await axios.post<GraphQLResponse>(
        `${API_BASE_URL}/graphql`,
        {
          query,
          variables: {
            workspaceId,
            backlogId: backlogId || null,
            sprintId: sprintId || null,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': token ? `Bearer ${token}` : '',
            'x-api-key': API_KEY,
          },
        }
      );

      if (response.data.errors) {
        console.error('GraphQL Errors:', response.data.errors);
        return null;
      }

      if (response.data.data?.workspaceGraph) {
        return response.data.data.workspaceGraph;
      }

      return null;
    } catch (error) {
      console.error('Error fetching graph:', error);
      return null;
    }
  },

  /**
   * Get sprint graph with SVO breakdown
   */
  async getSprintGraph(
    workspaceId: string,
    sprintId: string
  ): Promise<GraphData | null> {
    return this.getBacklogGraph(workspaceId, {
      sprintId,
      source: 'REALTIME',
    });
  },
};
