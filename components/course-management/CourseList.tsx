'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/base/buttons/button';
import { Pagination } from '@/components/base/pagination/pagination';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/base/table/table';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/lib/auth';
import { deleteCourse, useCourses, useTrainerCourseStats } from '@/lib/api';
import { formatMinutes, totalMinutes } from '@/lib/course-readiness';
import type { CourseStatus, ManagedCourse } from '@/lib/platformStore';
import { NewCourseDialog } from './NewCourseDialog';
import { STATUS_META, StatusPill, isEditable } from './status';

const PAGE_SIZE = 10;
type Filter = 'all' | CourseStatus;
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'pending_nou', label: 'Awaiting approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Needs changes' },
];

const formatDate = (iso: string) => new Intl.DateTimeFormat('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

export function CourseList() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'org_admin';
  const { data: courses, error, isLoading } = useCourses();
  const { data: stats } = useTrainerCourseStats(!isAdmin);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<ManagedCourse | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: 0, draft: 0, pending_nou: 0, approved: 0, rejected: 0 };
    for (const course of courses ?? []) { result.all++; result[course.status]++; }
    return result;
  }, [courses]);

  const statsById = useMemo(() => new Map((stats?.courses ?? []).map((entry) => [entry.courseId, entry])), [stats]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (courses ?? [])
      .filter((course) => filter === 'all' || course.status === filter)
      .filter((course) => !term || `${course.title} ${course.description} ${course.lecturerName}`.toLowerCase().includes(term))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [courses, filter, search]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteCourse(toDelete.id);
      setToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the course.');
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <p role="alert" className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load your courses: {error.message}</p>;
  if (isLoading || !courses) return <p className="p-4 text-sm text-stone-500">Loading your courses…</p>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(['draft', 'pending_nou', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => { setFilter(status); setPage(1); }}
            aria-pressed={filter === status}
            className={`rounded-lg border p-4 text-left transition hover:bg-stone-50 ${filter === status ? 'border-[#D97706] bg-amber-50/50' : 'border-stone-200 bg-white'}`}
          >
            <p className="text-sm font-medium text-stone-600">{STATUS_META[status].label}</p>
            <p className="mt-1 text-3xl font-bold text-stone-900">{counts[status]}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="overflow-x-auto">
          <SegmentedControl
            aria-label="Filter courses by status"
            selectedKeys={[filter]}
            onSelectionChange={(keys) => { const next = [...keys][0] as Filter | undefined; if (next) { setFilter(next); setPage(1); } }}
          >
            {FILTERS.map((item) => (
              <SegmentedControlItem key={item.id} id={item.id}>{item.label} {counts[item.id]}</SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative block flex-1 lg:w-64">
            <span className="sr-only">Search courses</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search courses" className="min-h-10 w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20" />
          </label>
          <Button leadingIcon={Plus} onClick={() => setCreating(true)}>New course</Button>
        </div>
      </div>

      {deleteError && <p role="alert" className="text-sm font-medium text-rose-700">{deleteError}</p>}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center">
          <BookOpen className="mx-auto h-9 w-9 text-stone-300" aria-hidden="true" />
          <p className="mt-3 font-semibold text-stone-800">{courses.length === 0 ? 'You have not created a course yet.' : 'No courses match.'}</p>
          <p className="mt-1 text-sm text-stone-600">{courses.length === 0 ? 'A course is a set of modules learners work through, then an exam you grade.' : 'Change the filter or the search.'}</p>
          {courses.length === 0 && <div className="mt-4"><Button leadingIcon={Plus} onClick={() => setCreating(true)}>Create your first course</Button></div>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <Table aria-label="Courses" onRowAction={(key) => router.push(`/learn/manage/${String(key)}`)}>
            <TableHeader>
              <TableColumn isRowHeader>Course</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Content</TableColumn>
              <TableColumn>Learners</TableColumn>
              <TableColumn>Updated</TableColumn>
              <TableColumn>Actions</TableColumn>
            </TableHeader>
            <TableBody>
              {rows.map((course) => {
                const entry = statsById.get(course.id);
                return (
                  <TableRow key={course.id} id={course.id} textValue={course.title} className="cursor-pointer hover:bg-stone-50">
                    <TableCell>
                      <p className="max-w-xs truncate font-semibold text-stone-900">{course.title}</p>
                      <p className="max-w-xs truncate text-xs text-stone-500">{isAdmin ? `${course.lecturerName}. ` : ''}{course.description}</p>
                    </TableCell>
                    <TableCell><StatusPill status={course.status} /></TableCell>
                    <TableCell>
                      <span className="whitespace-nowrap text-sm text-stone-700">{course.modules.length} module{course.modules.length === 1 ? '' : 's'}</span>
                      <span className="block text-xs text-stone-500">{formatMinutes(totalMinutes(course.modules))}</span>
                    </TableCell>
                    <TableCell>
                      {course.status === 'approved' && entry ? (
                        <>
                          <span className="whitespace-nowrap text-sm text-stone-700">{entry.enrolled} enrolled</span>
                          <span className="block text-xs text-stone-500">{entry.passRate === null ? 'no graded exams yet' : `${Math.round(entry.passRate)}% pass rate`}{entry.pendingGrading > 0 ? `, ${entry.pendingGrading} to grade` : ''}</span>
                        </>
                      ) : <span className="text-xs text-stone-400">Not live</span>}
                    </TableCell>
                    <TableCell><span className="whitespace-nowrap text-xs text-stone-600">{formatDate(course.updatedAt)}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                      <button type="button" aria-label={`${isEditable(course.status) ? 'Edit' : 'Open'} ${course.title}`} onClick={(event) => { event.stopPropagation(); router.push(`/learn/manage/${course.id}`); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 transition hover:border-[#D97706] hover:text-[#B45309]">
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        {isEditable(course.status) ? 'Edit' : 'Open'}
                      </button>
                      {isEditable(course.status) && (
                        <button type="button" aria-label={`Delete ${course.title}`} onClick={() => { setDeleteError(''); setToDelete(course); }} className="rounded p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-700">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {pageCount > 1 && (
            <div className="border-t border-stone-200 p-3">
              <Pagination page={current} totalPages={pageCount} onChange={setPage} aria-label="Courses pages" />
            </div>
          )}
        </div>
      )}

      <NewCourseDialog isOpen={creating} onOpenChange={setCreating} />
      <ConfirmModal
        open={toDelete !== null}
        title={`Delete "${toDelete?.title ?? ''}"?`}
        description="The course and its uploaded files are removed. This cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete course'}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
