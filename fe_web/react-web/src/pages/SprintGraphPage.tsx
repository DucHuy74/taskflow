import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, GitBranch, List, Network, RefreshCw } from 'lucide-react';
import { FcoseGraphCanvas } from '@/components/graph/FcoseGraphCanvas';
import { Button } from '@/components/ui/button';
import { adaptGraphData, type VisualGraphNode } from '@/lib/graph/graphModel';
import { graphService, type GraphData } from '@/services/graphService';
import { sprintService } from '@/services/sprintService';

const EMPTY_GRAPH: GraphData = { nodes: [], edges: [] };

export function SprintGraphPage() {
  const { workspaceId, sprintId } = useParams<{ workspaceId: string; sprintId: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<VisualGraphNode | null>(null);
  const [showTable, setShowTable] = useState(false);
  const { data: sprints = [] } = useQuery({ queryKey: ['sprints', workspaceId], queryFn: () => sprintService.getSprints(workspaceId!), enabled: Boolean(workspaceId) });
  const sprint = sprints.find((item) => item.id === sprintId);
  const graphQuery = useQuery({ queryKey: ['sprint-graph', workspaceId, sprintId], queryFn: () => graphService.getSprintGraph(workspaceId!, sprintId!), enabled: Boolean(workspaceId && sprintId) });
  const { data: stories = [] } = useQuery({ queryKey: ['sprint-stories', sprintId], queryFn: () => sprintService.getSprintStories(sprintId!), enabled: Boolean(sprintId) });
  const storyLabels = useMemo(() => new Map(stories.map((story) => [story.id, story.storyText])), [stories]);
  const graph = useMemo(() => adaptGraphData(graphQuery.data ?? EMPTY_GRAPH, storyLabels), [graphQuery.data, storyLabels]);
  const handleNodeSelected = useCallback((node: VisualGraphNode | null) => setSelected(node), []);

  if (!workspaceId || !sprintId) return <Navigate to="/" replace />;
  return <div className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1540px]">
    <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-start gap-3"><Button size="icon" variant="outline" aria-label="Back to backlog" onClick={() => navigate(`/workspace/${workspaceId}/backlog`)}><ArrowLeft aria-hidden="true" className="h-4 w-4" /></Button><div className="min-w-0"><p className="text-xs font-medium text-slate-500">Sprint overview</p><h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{sprint?.name || 'Sprint graph'}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">S–V–O relationships from backend analysis, arranged with semantic fCoSE constraints.</p></div></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setShowTable((current) => !current)}><List aria-hidden="true" className="h-4 w-4" />{showTable ? 'Graph view' : 'Accessible table'}</Button><Button variant="outline" onClick={() => void graphQuery.refetch()} disabled={graphQuery.isFetching}><RefreshCw aria-hidden="true" className={`h-4 w-4 ${graphQuery.isFetching ? 'animate-spin' : ''}`} /> Refresh</Button></div>
    </header>
    <section className="mb-4 flex flex-wrap gap-3 text-sm" aria-label="Sprint graph summary"><Summary label="Nodes" value={graph.nodes.length} /><Summary label="Relationships" value={graph.edges.length} /><Summary label="Sprint" value={sprint?.status || 'Loading'} /></section>
    {graphQuery.isLoading ? <div className="grid min-h-[560px] place-items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" role="status"><div className="text-center"><RefreshCw aria-hidden="true" className="mx-auto h-8 w-8 animate-spin text-indigo-600 motion-reduce:animate-none" /><p className="mt-3 text-sm">Loading sprint graph…</p></div></div> : !graph.nodes.length ? <div className="grid min-h-[560px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-900"><div><Network aria-hidden="true" className="mx-auto h-10 w-10 text-indigo-600" /><h2 className="mt-4 text-lg font-semibold">No analyzed graph for this sprint</h2><p className="mt-1 text-sm text-slate-500">Move stories into the sprint, wait for analysis, then refresh this view.</p><Button className="mt-5" onClick={() => navigate(`/workspace/${workspaceId}/backlog`)}>Open backlog</Button></div></div> : showTable ? <SprintGraphTable nodes={graph.nodes} onSelect={(node) => { setSelected(node); setShowTable(false); }} /> : <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <FcoseGraphCanvas graph={graph} storageKey={`taskflow:graph-layout:sprint:${workspaceId}:${sprintId}`} selectedNodeId={selected?.id ?? null} onNodeSelected={handleNodeSelected} className="h-[min(76vh,860px)]" />
      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-live="polite">{selected ? <><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{selected.type.replace('_', ' ')}</p><h2 className="mt-1 break-words text-lg font-semibold text-slate-950 dark:text-white">{selected.label}</h2><dl className="mt-4 grid grid-cols-2 gap-2"><Metric label="Degree" value={String(selected.degree)} /><Metric label="Priority" value={selected.priority.toFixed(2)} /><Metric label="Structure" value={selected.structure.toFixed(2)} /><Metric label="Betweenness" value={selected.betweenness.toFixed(2)} /></dl></> : <><GitBranch aria-hidden="true" className="h-5 w-5 text-indigo-600" /><h2 className="mt-2 font-semibold">Sprint graph</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Select a node for details. Drag a node to pin it; use the visible controls to zoom, focus, unpin or reset.</p></>}</aside>
    </div>}
  </div></div>;
}

function Summary({ label, value }: { label: string; value: string | number }) { return <div className="min-w-32 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-950 dark:text-white">{value}</p></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd></div>; }
function SprintGraphTable({ nodes, onSelect }: { nodes: VisualGraphNode[]; onSelect: (node: VisualGraphNode) => void }) { return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><table className="w-full min-w-[560px] text-left text-sm"><caption className="sr-only">Sprint graph nodes</caption><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr><th scope="col" className="px-4 py-3">Node</th><th scope="col" className="px-4 py-3">Type</th><th scope="col" className="px-4 py-3 text-right">Degree</th><th scope="col" className="px-4 py-3 text-right">Priority</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{nodes.map((node) => <tr key={node.id}><td className="px-4 py-3"><button type="button" onClick={() => onSelect(node)} className="cursor-pointer font-medium text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">{node.label}</button></td><td className="px-4 py-3">{node.type.replace('_', ' ')}</td><td className="px-4 py-3 text-right tabular-nums">{node.degree}</td><td className="px-4 py-3 text-right tabular-nums">{node.priority.toFixed(2)}</td></tr>)}</tbody></table></div>; }
