import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Inbox, ListPlus, Plus, Rocket, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserStoryCard } from './UserStoryCard';
import { Button } from '@/components/ui/button';
import type { UserStory } from '@/types/userStory';

interface BacklogListProps {
  stories: UserStory[];
  isLoading?: boolean;
  isCreating?: boolean;
  onCreateStories: (texts: string[]) => Promise<void>;
  onStartSprint: () => void;
}

export function BacklogList({ stories, isLoading = false, isCreating = false, onCreateStories, onStartSprint }: BacklogListProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [storyText, setStoryText] = useState('');
  const [error, setError] = useState('');
  const { setNodeRef, isOver } = useDroppable({ id: 'backlog-drop-zone', data: { type: 'backlog' } });

  const parsedStories = useMemo(() => {
    if (mode === 'single') return storyText.trim() ? [storyText.trim()] : [];
    return storyText.split(/\r?\n/).map((line) => line.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean);
  }, [mode, storyText]);

  const closeComposer = () => {
    if (isCreating) return;
    setComposerOpen(false);
    setStoryText('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!parsedStories.length) return setError('Enter at least one user story.');
    if (parsedStories.length > 50) return setError('Add up to 50 stories in one batch.');
    setError('');
    try {
      await onCreateStories(parsedStories);
      closeComposer();
    } catch {
      setError('Stories could not be created. Check the connection and try again.');
    }
  };

  if (isLoading) {
    return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-busy="true" aria-label="Loading backlog">
      <div className="flex h-14 items-center border-b border-slate-200 px-5 dark:border-slate-700"><div className="h-5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /></div>
      <div className="space-y-2 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}</div>
    </section>;
  }

  return <section ref={setNodeRef} className={cn('overflow-hidden rounded-xl border bg-white shadow-sm transition-colors dark:bg-slate-900', isOver ? 'border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-950' : 'border-slate-200 dark:border-slate-700')} aria-labelledby="backlog-heading">
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
      <div className="flex items-center gap-2"><ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" /><h2 id="backlog-heading" className="text-base font-semibold text-slate-950 dark:text-white">Backlog</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300" aria-label={`${stories.length} stories`}>{stories.length}</span></div>
      <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setComposerOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Add stories</Button><Button size="sm" onClick={onStartSprint}><Rocket className="h-4 w-4" aria-hidden="true" /> Create sprint</Button></div>
    </header>

    <div className="min-h-32">{stories.length === 0 ? <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Inbox className="h-6 w-6" aria-hidden="true" /></span>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Build your first backlog</h3><p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">Add a user story or paste a list. TaskFlow will queue every story for background analysis.</p>
      <Button className="mt-5" onClick={() => setComposerOpen(true)}><ListPlus className="h-4 w-4" aria-hidden="true" /> Add user stories</Button>
    </div> : <SortableContext items={stories.map((story) => story.id)} strategy={verticalListSortingStrategy}><div className="divide-y divide-slate-100 dark:divide-slate-800">{stories.map((story) => <UserStoryCard key={story.id} story={story} draggable />)}</div></SortableContext>}</div>

    {stories.length > 0 && <button type="button" onClick={() => setComposerOpen(true)} className="flex min-h-11 w-full cursor-pointer items-center gap-2 border-t border-slate-200 px-5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Plus className="h-4 w-4" aria-hidden="true" /> Create story</button>}

    <AnimatePresence>{composerOpen && <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && closeComposer()}>
      <motion.form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-2xl" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} role="dialog" aria-modal="true" aria-labelledby="story-composer-title">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700"><div><h2 id="story-composer-title" className="text-lg font-semibold text-slate-950 dark:text-white">Add user stories</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create one story or paste a list to add them together.</p></div><button type="button" onClick={closeComposer} aria-label="Close story composer" className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" aria-hidden="true" /></button></div>
        <div className="space-y-4 p-5">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" aria-label="Story entry mode">{(['single', 'bulk'] as const).map((entryMode) => <button key={entryMode} type="button" onClick={() => { setMode(entryMode); setStoryText(''); setError(''); }} className={cn('min-h-9 rounded-md px-4 text-sm font-medium transition-colors', mode === entryMode ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300')} aria-pressed={mode === entryMode}>{entryMode === 'single' ? 'Single story' : 'Bulk add'}</button>)}</div>
          <div><label htmlFor="story-text" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">{mode === 'single' ? 'User story' : 'User stories'}</label><textarea id="story-text" autoFocus rows={mode === 'single' ? 4 : 9} value={storyText} onChange={(event) => setStoryText(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void handleSubmit(event); if (event.key === 'Escape') closeComposer(); }} placeholder={mode === 'single' ? 'As a user, I want to… so that…' : 'One story per line\nAs a manager, I want to…\nAs a member, I want to…'} className="min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-base leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:focus:ring-indigo-950" aria-describedby="story-helper story-error" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p id="story-helper" className="text-xs text-slate-500 dark:text-slate-400">{mode === 'bulk' ? 'Each non-empty line becomes one story (maximum 50).' : 'Tip: use the “As a…, I want…, so that…” format.'}</p><span className="text-xs font-medium tabular-nums text-slate-500" aria-live="polite">{parsedStories.length} {parsedStories.length === 1 ? 'story' : 'stories'}</span></div>{error && <p id="story-error" role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>Stories are saved immediately. Analysis continues in the background; rebuild the story map when processing is ready.</p></div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700"><Button type="button" variant="ghost" onClick={closeComposer} disabled={isCreating}>Cancel</Button><Button type="submit" isLoading={isCreating} disabled={!parsedStories.length || parsedStories.length > 50}>Add {parsedStories.length || ''} {parsedStories.length === 1 ? 'story' : 'stories'}</Button></div>
      </motion.form>
    </motion.div>}</AnimatePresence>
  </section>;
}
