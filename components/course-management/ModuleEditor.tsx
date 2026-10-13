'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Download, Loader2, Paperclip, Trash2, X } from 'lucide-react';
import { Input } from '@/components/base/input/input';
import { getCourseMaterialDownloadUrl, uploadCourseMaterial } from '@/lib/api';
import type { CourseAttachment, CourseModule } from '@/lib/platformStore';
import { cn } from '@/lib/utils';

const fileSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`);

interface ModuleEditorProps {
  courseId: string;
  module: CourseModule;
  index: number;
  count: number;
  readOnly: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<CourseModule>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  /** Called with the module's attachments after an upload, so the editor can save straight away. */
  onUploaded: (attachments: CourseAttachment[]) => void;
  onRemoveAttachment: (attachment: CourseAttachment) => void;
}

export function ModuleEditor({ courseId, module, index, count, readOnly, open, onToggle, onChange, onMove, onRemove, onUploaded, onRemoveAttachment }: ModuleEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const attachments = module.attachments ?? [];
  const incomplete = !module.title.trim() || !module.content.trim();
  const panelId = `module-panel-${index}`;

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    setError('');
    setProgress(0);
    try {
      const uploaded: CourseAttachment[] = [];
      for (const [i, file] of files.entries()) {
        uploaded.push(await uploadCourseMaterial(courseId, file, (percent) => setProgress(Math.round(((i + percent / 100) / files.length) * 100))));
      }
      onUploaded([...attachments, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The upload failed.');
    } finally {
      setProgress(null);
    }
  };

  const download = async (attachment: CourseAttachment) => {
    try {
      window.open(await getCourseMaterialDownloadUrl(courseId, attachment.r2Key), '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the file.');
    }
  };

  return (
    <li className="rounded-lg border border-stone-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="flex min-w-0 flex-1 items-center gap-3 rounded p-1 text-left">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-700">{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-stone-900">{module.title.trim() || 'Untitled module'}</span>
            <span className="block text-xs text-stone-500">
              {module.minutes} min{attachments.length > 0 ? `, ${attachments.length} file${attachments.length === 1 ? '' : 's'}` : ''}
              {incomplete && <span className="ml-2 font-semibold text-amber-700">Needs a title and content</span>}
            </span>
          </span>
          <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-stone-400 transition', open && 'rotate-180')} aria-hidden="true" />
        </button>
        {!readOnly && (
          <div className="flex shrink-0 items-center">
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move module ${index + 1} up`} className="rounded p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move module ${index + 1} down`} className="rounded p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={onRemove} disabled={count === 1} aria-label={`Remove module ${index + 1}`} title={count === 1 ? 'A course needs at least one module' : undefined} className="rounded p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        )}
      </div>

      {open && (
        <div id={panelId} className="space-y-4 border-t border-stone-200 p-4">
          <Input label="Module title" value={module.title} onChange={(value) => onChange({ title: value })} isDisabled={readOnly} />
          <div className="space-y-1.5">
            <label htmlFor={`${panelId}-content`} className="text-sm font-medium text-stone-800">Learning content</label>
            <textarea
              id={`${panelId}-content`}
              rows={8}
              value={module.content}
              disabled={readOnly}
              onChange={(e) => onChange({ content: e.target.value })}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 disabled:bg-stone-50 disabled:text-stone-500"
            />
          </div>
          <div className="max-w-40">
            <Input label="Time (minutes)" type="number" value={String(module.minutes)} onChange={(value) => onChange({ minutes: Number(value) })} isDisabled={readOnly} hint="1 to 480" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-800">Files for learners</p>
            {attachments.length === 0 && <p className="text-xs text-stone-500">No files attached. PDFs, images and documents work.</p>}
            <ul className="space-y-1.5">
              {attachments.map((attachment) => (
                <li key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-stone-800">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />
                    <span className="truncate">{attachment.fileName}</span>
                    <span className="shrink-0 text-xs text-stone-500">{fileSize(attachment.sizeBytes)}</span>
                  </span>
                  <span className="flex shrink-0 items-center">
                    <button type="button" onClick={() => void download(attachment)} aria-label={`Download ${attachment.fileName}`} className="rounded p-2 text-stone-500 hover:bg-white hover:text-blue-700"><Download className="h-4 w-4" aria-hidden="true" /></button>
                    {!readOnly && <button type="button" onClick={() => onRemoveAttachment(attachment)} aria-label={`Remove ${attachment.fileName}`} className="rounded p-2 text-stone-500 hover:bg-white hover:text-rose-700"><X className="h-4 w-4" aria-hidden="true" /></button>}
                  </span>
                </li>
              ))}
            </ul>
            {!readOnly && (
              <div>
                <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => void upload(e)} aria-label={`Add files to module ${index + 1}`} />
                <button type="button" onClick={() => fileInput.current?.click()} disabled={progress !== null} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-[#D97706] hover:text-[#b45309] disabled:opacity-60">
                  {progress !== null ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Uploading {progress}%</> : <><Paperclip className="h-4 w-4" aria-hidden="true" /> Add files</>}
                </button>
              </div>
            )}
            {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
          </div>
        </div>
      )}
    </li>
  );
}
