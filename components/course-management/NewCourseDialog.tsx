'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { createCourse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Dialog } from './Dialog';

const textareaClass = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20';

/** Starts a draft from a title and description, with one empty module to fill in, then opens the editor. */
export function NewCourseDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ready = title.trim() && description.trim();

  const create = async () => {
    if (!user || !ready) return;
    setBusy(true);
    setError('');
    try {
      const course = await createCourse({
        lecturerId: user.id,
        lecturerName: user.name,
        title: title.trim(),
        description: description.trim(),
        modules: [{ title: 'Module 1', content: '', minutes: 30 }],
      });
      onOpenChange(false);
      router.push(`/learn/manage/${course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the course.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} title="New course" description="Start with the basics. Nothing is visible to learners until an administrator approves it.">
      <form onSubmit={(event) => { event.preventDefault(); void create(); }} className="space-y-4">
        <Input label="Course title" value={title} onChange={setTitle} placeholder="Safe handling of R-290" isRequired />
        <div className="space-y-1.5">
          <label htmlFor="new-course-description" className="text-sm font-medium text-stone-800">What will learners get from it?</label>
          <textarea id="new-course-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={textareaClass} />
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
          <p className="font-semibold text-stone-900">Before an administrator can approve it, the course needs</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>at least one module with a title, content and a time</li>
            <li>an exam with at least one question, and a pass mark</li>
          </ul>
          <p className="mt-1 text-xs text-stone-500">You add these in the editor next. Your work saves automatically.</p>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={!ready || busy}>{busy ? 'Creating…' : 'Create draft'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
