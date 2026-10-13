'use client';

import { ArrowDown, ArrowUp, CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/base/buttons/button';
import { MAX_OPTIONS, MAX_QUESTIONS, MIN_OPTIONS, type ExamQuestion } from '@/lib/exam';
import { examProblem } from '@/lib/course-readiness';

interface ExamEditorProps {
  questions: ExamQuestion[];
  readOnly: boolean;
  onChange: (questions: ExamQuestion[]) => void;
}

const field = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 disabled:bg-stone-50 disabled:text-stone-500';
const newId = () => crypto.randomUUID();

export function ExamEditor({ questions, readOnly, onChange }: ExamEditorProps) {
  const choiceCount = questions.filter((q) => q.type === 'choice').length;
  const writtenCount = questions.length - choiceCount;

  const patch = (index: number, change: Partial<ExamQuestion>) => onChange(questions.map((q, i) => (i === index ? { ...q, ...change } : q)));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const addChoice = () => onChange([...questions, { id: newId(), type: 'choice', text: '', options: ['', ''], correctIndex: undefined }]);
  const addWritten = () => onChange([...questions, { id: newId(), type: 'written', text: '' }]);

  const setOption = (qIndex: number, oIndex: number, value: string) => {
    const options = [...(questions[qIndex].options ?? [])];
    options[oIndex] = value;
    patch(qIndex, { options });
  };
  const addOption = (qIndex: number) => patch(qIndex, { options: [...(questions[qIndex].options ?? []), ''] });
  const removeOption = (qIndex: number, oIndex: number) => {
    const q = questions[qIndex];
    const options = (q.options ?? []).filter((_, i) => i !== oIndex);
    let correctIndex = q.correctIndex;
    if (correctIndex === oIndex) correctIndex = undefined;
    else if (correctIndex !== undefined && correctIndex > oIndex) correctIndex -= 1;
    patch(qIndex, { options, correctIndex });
  };

  const problem = examProblem(questions);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <p>Learners answer these questions after they have started the course. <strong>Multiple choice is marked automatically</strong> when they submit, and the result counts straight away. <strong>Written questions</strong> wait for you to read and grade them.</p>
        <p className="mt-2 text-stone-600">Learners never see which option is correct. They get three attempts.</p>
      </div>

      {questions.length > 0 && (
        <p className="text-sm font-medium text-stone-700" aria-live="polite">
          {questions.length} question{questions.length === 1 ? '' : 's'}: {choiceCount} multiple choice (automatic), {writtenCount} written (you grade).
          {problem && <span className="ml-2 font-semibold text-amber-700">{problem}</span>}
        </p>
      )}

      <ol className="space-y-4">
        {questions.map((question, qIndex) => (
          <li key={question.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-stone-800">Question {qIndex + 1} <span className="ml-2 rounded bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">{question.type === 'choice' ? 'Multiple choice' : 'Written'}</span></p>
              {!readOnly && (
                <div className="flex items-center">
                  <button type="button" onClick={() => move(qIndex, -1)} disabled={qIndex === 0} aria-label={`Move question ${qIndex + 1} up`} className="rounded p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => move(qIndex, 1)} disabled={qIndex === questions.length - 1} aria-label={`Move question ${qIndex + 1} down`} className="rounded p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => onChange(questions.filter((_, i) => i !== qIndex))} aria-label={`Remove question ${qIndex + 1}`} className="rounded p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              )}
            </div>

            <label htmlFor={`q-${question.id}`} className="sr-only">Question {qIndex + 1} text</label>
            <textarea id={`q-${question.id}`} rows={2} value={question.text} disabled={readOnly} onChange={(e) => patch(qIndex, { text: e.target.value })} placeholder="Write the question" className={`mt-2 ${field}`} />

            {question.type === 'choice' && (
              <fieldset className="mt-3 space-y-2">
                <legend className="text-xs font-semibold text-stone-600">Options. Select the circle beside the correct one.</legend>
                {(question.options ?? []).map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={question.correctIndex === oIndex}
                      disabled={readOnly}
                      onChange={() => patch(qIndex, { correctIndex: oIndex })}
                      aria-label={`Option ${oIndex + 1} is the correct answer`}
                      className="h-5 w-5 shrink-0 accent-[#D97706]"
                    />
                    <input value={option} disabled={readOnly} onChange={(e) => setOption(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} aria-label={`Question ${qIndex + 1} option ${oIndex + 1}`} className={field} />
                    {question.correctIndex === oIndex && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Correct answer" />}
                    {!readOnly && (question.options?.length ?? 0) > MIN_OPTIONS && (
                      <button type="button" onClick={() => removeOption(qIndex, oIndex)} aria-label={`Remove option ${oIndex + 1}`} className="rounded p-2 text-stone-400 hover:bg-stone-100 hover:text-rose-700"><X className="h-4 w-4" aria-hidden="true" /></button>
                    )}
                  </div>
                ))}
                {!readOnly && (question.options?.length ?? 0) < MAX_OPTIONS && (
                  <button type="button" onClick={() => addOption(qIndex)} className="text-sm font-semibold text-[#b45309] underline">Add an option</button>
                )}
              </fieldset>
            )}
            {question.type === 'written' && <p className="mt-2 text-xs text-stone-500">The learner writes an answer, and you grade it from the Grading tab.</p>}
          </li>
        ))}
      </ol>

      {questions.length === 0 && <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-600">No questions yet. A course needs at least one before it can be submitted.</p>}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leadingIcon={Plus} onClick={addChoice} disabled={questions.length >= MAX_QUESTIONS}>Add multiple choice</Button>
          <Button variant="secondary" leadingIcon={Plus} onClick={addWritten} disabled={questions.length >= MAX_QUESTIONS}>Add written question</Button>
        </div>
      )}
    </div>
  );
}
