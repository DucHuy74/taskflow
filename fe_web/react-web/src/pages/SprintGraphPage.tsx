import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { graphService } from '@/services/graphService';
import { sprintService } from '@/services/sprintService';
import { cn } from '@/lib/utils';

// SVO Graph component for React
interface NodePosition {
  id: string;
  x: number;
  y: number;
  type: 'subject' | 'verb' | 'object';
  label: string;
  status?: string;
}

const NODE_COLORS = {
  subject: { light: '#0052CC', dark: '#58A6FF' },
  verb: { light: '#5243AA', dark: '#7C3AED' },
  object: { light: '#00B8D9', dark: '#22D3EE' },
};

const STATUS_COLORS: Record<string, string> = {
  ToDo: '#6B778C',
  InProgress: '#FFC400',
  Done: '#36B37E',
};

export function SprintGraphPage() {
  const { workspaceId, sprintId } = useParams<{ workspaceId: string; sprintId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Fetch sprint info
  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', workspaceId],
    queryFn: () => sprintService.getSprints(workspaceId!),
    enabled: !!workspaceId,
  });

  const sprint = sprints.find((s) => s.id === sprintId) || sprints[0];

  // Fetch graph data from Neo4j
  const { isLoading } = useQuery({
    queryKey: ['sprint-graph', workspaceId, sprintId],
    queryFn: () => graphService.getSprintGraph(workspaceId!, sprintId!),
    enabled: !!workspaceId && !!sprintId,
  });

  // Fetch stories for SVO parsing
  const { data: stories = [] } = useQuery({
    queryKey: ['sprint-stories', sprintId],
    queryFn: () => sprintService.getSprintStories(sprintId!),
    enabled: !!sprintId,
  });

  // Parse SVO from stories
  const parseSVO = useCallback((text: string): { subject: string; verb: string; object: string } => {
    const lower = text.toLowerCase();
    let subject = 'User';
    let verb = 'action';
    let object = 'target';

    const iWantToIdx = lower.indexOf('i want to');
    if (iWantToIdx !== -1) {
      const asAIdx = lower.indexOf('as a');
      if (asAIdx !== -1 && asAIdx < iWantToIdx) {
        const commaIdx = lower.indexOf(',', asAIdx);
        if (commaIdx !== -1 && commaIdx < iWantToIdx) {
          subject = text.substring(asAIdx + 4, commaIdx).trim();
        }
      }
      const afterWant = lower.substring(iWantToIdx + 9).trim();
      const parts = afterWant.split(' ');
      if (parts.length > 0) {
        verb = parts[0];
        if (parts.length > 1) {
          const soThatIdx = lower.indexOf('so that');
          object = soThatIdx !== -1
            ? afterWant.substring(afterWant.indexOf(' ') + 1, soThatIdx).trim()
            : afterWant.substring(afterWant.indexOf(' ') + 1).trim();
        }
      }
    }

    return { subject, verb, object };
  }, []);

  // Calculate node positions (SVO layout)
  const calculateLayout = useCallback((): NodePosition[] => {
    if (!stories.length) return [];

    const nodes: NodePosition[] = [];
    const subjects = new Map<string, number>();
    const verbs = new Map<string, number>();
    const objects = new Map<string, number>();

    // Parse all stories and collect unique SVO
    stories.forEach((story) => {
      const svo = parseSVO(story.storyText);
      subjects.set(svo.subject, (subjects.get(svo.subject) || 0) + 1);
      verbs.set(svo.verb, (verbs.get(svo.verb) || 0) + 1);
      objects.set(svo.object, (objects.get(svo.object) || 0) + 1);
    });

    // Layout positions
    let ySubject = 100;
    const xSubject = 200;
    const xVerb = 500;
    const xObject = 800;
    const spacing = 100;

    // Subject nodes (left)
    Array.from(subjects.keys()).forEach((subj) => {
      nodes.push({
        id: `sub_${subj}`,
        x: xSubject,
        y: ySubject,
        type: 'subject',
        label: subj,
      });
      ySubject += spacing;
    });

    // Verb nodes (center)
    let yVerb = 100;
    Array.from(verbs.keys()).forEach((v) => {
      nodes.push({
        id: `verb_${v}`,
        x: xVerb,
        y: yVerb,
        type: 'verb',
        label: v,
      });
      yVerb += spacing;
    });

    // Object nodes (right)
    let yObject = 100;
    Array.from(objects.keys()).forEach((obj) => {
      nodes.push({
        id: `obj_${obj}`,
        x: xObject,
        y: yObject,
        type: 'object',
        label: obj,
      });
      yObject += spacing;
    });

    return nodes;
  }, [stories, parseSVO]);

  const nodes = calculateLayout();

  // Generate edges from SVO parsing
  const edges = stories.map((story) => {
    const svo = parseSVO(story.storyText);
    return {
      from: `sub_${svo.subject}`,
      to: `verb_${svo.verb}`,
      status: story.status,
    };
  }).concat(
    stories.map((story) => {
      const svo = parseSVO(story.storyText);
      return {
        from: `verb_${svo.verb}`,
        to: `obj_${svo.object}`,
        status: story.status,
      };
    })
  );

  const getNodeById = (id: string) => nodes.find((n) => n.id === id);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * delta, 0.2), 3),
    }));
  };

  // Pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!workspaceId || !sprintId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Sprint not found</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-screen overflow-hidden relative',
        isDark ? 'bg-[#0D1117]' : 'bg-[#F4F5F7]'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Header */}
      <div className={cn(
        'absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between border-b',
        isDark ? 'bg-[#161B22] border-[#30363D] text-white' : 'bg-white border-gray-200 text-[#172B4D]'
      )}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/workspace/${workspaceId}/backlog`)} className="p-2 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold">{sprint?.name || 'Sprint Graph'}</h1>
            <p className="text-sm text-gray-500">SVO Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className={cn(
            'flex items-center gap-4 text-sm px-4 py-2 rounded-lg',
            isDark ? 'bg-[#161B22] border border-[#30363D]' : 'bg-white border border-gray-200'
          )}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.subject.light }} />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Actor (S)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.verb.light }} />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Action (V)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: NODE_COLORS.object.light }} />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Object (O)</span>
            </div>
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            className={cn(
              'p-2 rounded-lg',
              isDark ? 'bg-[#30363D] text-white' : 'bg-gray-100 text-gray-700'
            )}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="absolute inset-0 pt-16">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500">Loading graph...</p>
            </div>
          </div>
        ) : stories.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg text-gray-500 mb-2">No stories in this sprint</p>
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/backlog`)}
                className="text-blue-500 hover:underline"
              >
                Go back to backlog
              </button>
            </div>
          </div>
        ) : (
          <svg
            className="w-full h-full"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Edges */}
            <g>
              {edges.map((edge, i) => {
                const fromNode = getNodeById(edge.from);
                const toNode = getNodeById(edge.to);
                if (!fromNode || !toNode) return null;

                return (
                  <motion.line
                    key={`edge-${i}`}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={STATUS_COLORS[edge.status] || '#DFE1E6'}
                    strokeWidth={2}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            {nodes.map((node) => (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="cursor-pointer"
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              >
                {node.type === 'subject' && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={30}
                    fill={isDark ? NODE_COLORS.subject.dark : NODE_COLORS.subject.light}
                    stroke={isDark ? NODE_COLORS.subject.dark : NODE_COLORS.subject.light}
                    strokeWidth={2}
                    whileHover={{ scale: 1.1 }}
                  />
                )}
                {node.type === 'verb' && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={25}
                    fill={isDark ? NODE_COLORS.verb.dark : NODE_COLORS.verb.light}
                    stroke={isDark ? NODE_COLORS.verb.dark : NODE_COLORS.verb.light}
                    strokeWidth={2}
                    whileHover={{ scale: 1.1 }}
                  />
                )}
                {node.type === 'object' && (
                  <motion.rect
                    x={node.x - 40}
                    y={node.y - 15}
                    width={80}
                    height={30}
                    rx={4}
                    fill={isDark ? '#0D1117' : 'white'}
                    stroke={isDark ? NODE_COLORS.object.dark : NODE_COLORS.object.light}
                    strokeWidth={2}
                    whileHover={{ scale: 1.05 }}
                  />
                )}
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  className={cn(
                    'text-xs font-medium pointer-events-none select-none',
                    isDark ? 'fill-white' : 'fill-[#172B4D]'
                  )}
                >
                  {node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label}
                </text>
              </motion.g>
            ))}
          </svg>
        )}
      </div>

      {/* Stats Panel */}
      <div className={cn(
        'absolute bottom-4 left-4 px-4 py-3 rounded-lg shadow-lg',
        isDark ? 'bg-[#161B22] border border-[#30363D] text-white' : 'bg-white border border-gray-200 text-[#172B4D]'
      )}>
        <div className="text-sm">
          <span className="font-semibold">{stories.length}</span> stories
          <span className="mx-2">•</span>
          <span className="font-semibold">{nodes.length}</span> nodes
        </div>
      </div>
    </div>
  );
}
