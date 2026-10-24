import { api } from './api';

const API_KEY = import.meta.env.VITE_API_KEY || '';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  priority?: number | string | null;
  degree?: number | null;
  betweenness?: number | null;
  /** Every S–V–O role the term plays (SUBJECT / ACTION / OBJECT); empty for stories. */
  roles?: string[] | null;
  graphRelevanceScore?: number | null;
  duplicateScore?: number | null;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
  score?: number | null;
  confidence?: number | null;
  lift?: number | null;
  storyId?: string | null;
  /** Stories that produced this PERFORM / TARGET relation. */
  storyIds?: string[] | null;
  /** Number of distinct stories behind a PERFORM / TARGET relation. */
  weight?: number | null;
  source?: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type GraphSource = 'REALTIME' | 'BATCH';

interface GraphQLResponse {
  data?: {
    workspaceGraph?: GraphData;
  };
  errors?: Array<{ message: string }>;
}

const WORKSPACE_GRAPH_QUERY = `
  query WorkspaceGraph(
    $workspaceId: ID!
    $backlogId: ID
    $sprintId: ID
    $source: String
    $includeSimilarity: Boolean
    $includeAssociation: Boolean
    $minScore: Float
    $minConfidence: Float
  ) {
    workspaceGraph(
      workspaceId: $workspaceId
      backlogId: $backlogId
      sprintId: $sprintId
      source: $source
      includeSimilarity: $includeSimilarity
      includeAssociation: $includeAssociation
      minScore: $minScore
      minConfidence: $minConfidence
    ) {
      nodes { id label type priority degree betweenness roles graphRelevanceScore duplicateScore }
      edges { from to type score confidence lift storyId storyIds weight source }
    }
  }
`;

export const graphService = {
  /**
   * Get workspace backlog graph from Neo4j
   */
  async getBacklogGraph(
    workspaceId: string,
    options?: {
      backlogId?: string;
      sprintId?: string;
      /** Omit to merge realtime and batch S–V–O edges; similarity/association edges are always included. */
      source?: GraphSource;
      includeSimilarity?: boolean;
      includeAssociation?: boolean;
      minScore?: number;
      minConfidence?: number;
    }
  ): Promise<GraphData | null> {
    const {
      backlogId,
      sprintId,
      source,
      includeSimilarity = true,
      includeAssociation = true,
      minScore = 0.5,
      minConfidence = 0.3,
    } = options || {};

    try {
      const response = await api.post<GraphQLResponse>(
        '/graphql',
        {
          query: WORKSPACE_GRAPH_QUERY,
          variables: {
            workspaceId,
            backlogId: backlogId || null,
            sprintId: sprintId || null,
            source: source ?? null,
            includeSimilarity,
            includeAssociation,
            minScore,
            minConfidence,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'x-api-key': API_KEY,
          },
        }
      );

      if (response.data.errors) {
        console.error('GraphQL Errors:', response.data.errors);
        return null;
      }

      return response.data.data?.workspaceGraph ?? null;
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
    return this.getBacklogGraph(workspaceId, { sprintId });
  },
};
