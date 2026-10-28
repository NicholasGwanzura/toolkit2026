'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GraduationCap, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { createStudentApplication } from '@/lib/api';
import { SELF_SIGNUP_OPEN } from '@/lib/signup-config';
import { ApplicationSubmittedNotice } from '@/components/marketing/ApplicationSubmittedNotice';
import { SignupClosedNotice } from '@/components/marketing/SignupClosedNotice';
import type { StudentApplication } from '@/types/index';

const POLYTECHS = [
  'Harare Polytechnic',
  'Bulawayo Polytechnic',
  'Mutare Polytechnic',
  'Gweru Polytechnic',
  'Kwekwe Polytechnic',
  'Masvingo Polytechnic',
  'Kushinga Phikelela Polytechnic',
  'Other',
];

const FIELDS_OF_STUDY = [
  'HVAC-R / Refrigeration',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Building Services',
  'Other',
];

export default function JoinStudentPage() {
  if (!SELF_SIGNUP_OPEN.student) {
    return <SignupClosedNotice title="Student registration is closed" accent="#5A7D5A" />;
  }

  return <JoinStudentForm />;
}

function JoinStudentForm() {
  const [application, setApplication] = useState<StudentApplication | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    polytech: '',
    studentId: '',
    fieldOfStudy: '',
    enrolmentYear: new Date().getFullYear(),
    password: '',
    confirmPassword: '',
    agree: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agree || submitting) return;
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const record = await createStudentApplication({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        polytech: form.polytech,
        fieldOfStudy: form.fieldOfStudy,
        studentIdNumber: form.studentId.trim(),
        enrolmentYear: Number(form.enrolmentYear),
      });
      setApplication(record);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      <section className="pt-28 sm:pt-32 pb-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/join"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1C1917] transition-colors mb-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to paths
          </Link>
          <div className="flex items-start gap-4">
            <div
              className="shrink-0 p-2.5 mt-1 rounded-lg"
              style={{ backgroundColor: 'rgba(90,125,90,0.12)', color: '#5A7D5A' }}
            >
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[#5A7D5A] text-[11px] font-semibold tracking-[0.22em] uppercase mb-2">
                Student Registration
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1]" style={{ color: '#1C1917' }}>
                Verify your Polytechnic
                <br className="hidden sm:block" /> enrolment
              </h1>
              <p className="mt-4 text-gray-600 leading-relaxed">
                The $7/year Student plan is for currently-enrolled Polytechnic students in Zimbabwe.
                After you confirm your email you can upload your student ID; our team verifies within two working days.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border p-6 sm:p-8 rounded-xl" style={{ borderColor: '#E5E0DB' }}>
            {application ? (
              <ApplicationSubmittedNotice
                name={application.firstName}
                email={application.email}
                reference={application.id}
                role="student"
                accent="#5A7D5A"
                accentTint="rgba(90,125,90,0.12)"
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset className="space-y-5">
                  <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">
                    Your details
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        First name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => update('firstName', e.target.value)}
                        className="w-full px-4 py-3 border text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        Last name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(e) => update('lastName', e.target.value)}
                        className="w-full px-4 py-3 border text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        className="w-full px-4 py-3 border text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        Mobile
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        placeholder="+263..."
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        className="w-full px-4 py-3 border text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        required
                        minLength={8}
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        className="w-full px-4 py-3 border text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        Confirm password
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        required
                        minLength={8}
                        value={form.confirmPassword}
                        onChange={(e) => update('confirmPassword', e.target.value)}
                        className="w-full px-4 py-3 border text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    This will be your sign-in password once your application is approved. Minimum 8 characters.
                  </p>
                </fieldset>

                <fieldset className="space-y-5 pt-5 border-t" style={{ borderColor: '#E5E0DB' }}>
                  <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">
                    Enrolment
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="polytech" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        Polytechnic
                      </label>
                      <select
                        id="polytech"
                        required
                        value={form.polytech}
                        onChange={(e) => update('polytech', e.target.value)}
                        className="w-full px-4 py-3 border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      >
                        <option value="">Select...</option>
                        {POLYTECHS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="fieldOfStudy" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        Field of study
                      </label>
                      <select
                        id="fieldOfStudy"
                        required
                        value={form.fieldOfStudy}
                        onChange={(e) => update('fieldOfStudy', e.target.value)}
                        className="w-full px-4 py-3 border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      >
                        <option value="">Select...</option>
                        {FIELDS_OF_STUDY.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="studentId" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        Student ID number
                      </label>
                      <input
                        id="studentId"
                        type="text"
                        required
                        value={form.studentId}
                        onChange={(e) => update('studentId', e.target.value)}
                        className="w-full px-4 py-3 border text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="enrolmentYear" className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
                        Enrolment year
                      </label>
                      <input
                        id="enrolmentYear"
                        type="number"
                        required
                        min={2020}
                        max={new Date().getFullYear() + 1}
                        value={form.enrolmentYear}
                        onChange={(e) => update('enrolmentYear', Number(e.target.value))}
                        className="w-full px-4 py-3 border text-sm focus:outline-none focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent rounded-lg"
                        style={{ borderColor: '#E5E0DB' }}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 text-sm leading-6" style={{ borderColor: '#E5E0DB', backgroundColor: '#FAFAF9', color: '#44403C' }}>
                    <strong style={{ color: '#1C1917' }}>Your student ID comes next.</strong> After you submit, we email you a link. When you
                    confirm your email you can upload your student ID or enrolment letter (PDF, JPG or PNG, up to 5 MB).
                  </div>
                </fieldset>

                <fieldset className="pt-5 border-t" style={{ borderColor: '#E5E0DB' }}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.agree}
                      onChange={(e) => update('agree', e.target.checked)}
                      className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-[#5A7D5A] focus:ring-[#5A7D5A]"
                      required
                    />
                    <span className="text-sm text-gray-600 leading-relaxed">
                      I confirm the information above is accurate and consent to HEVACRAZ verifying my
                      enrolment with the Polytechnic. I understand that my account will be suspended if
                      verification fails or expires.
                    </span>
                  </label>
                </fieldset>

                {error && (
                  <div className="rounded border px-4 py-3 text-sm" style={{ borderColor: '#F87171', backgroundColor: '#FEF2F2', color: '#991B1B' }}>
                    {error}
                  </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <button
                    type="submit"
                    disabled={!form.agree || submitting}
                    className="group inline-flex items-center justify-center gap-2 font-semibold py-3.5 px-8 text-white text-sm transition-all duration-200 hover:brightness-110 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 rounded-lg"
                    style={{ backgroundColor: '#5A7D5A' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit application
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500">
                    No payment is taken through this form. The HEVACRAZ team reviews every application.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
