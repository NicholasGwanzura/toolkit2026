'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react';
import { ZIMBABWE_PROVINCES, TECHNICIAN_SPECIALIZATIONS } from '@/constants/registry';
import { TECHNICIAN_SKILLS } from '@/lib/technician-skills';
import { createTechnicianApplication } from '@/lib/api';
import { SELF_SIGNUP_OPEN } from '@/lib/signup-config';
import { ApplicationSubmittedNotice } from '@/components/marketing/ApplicationSubmittedNotice';
import { SignupClosedNotice } from '@/components/marketing/SignupClosedNotice';
import { SectorSurveyFields } from '@/components/technician/SectorSurveyFields';
import type { TechnicianApplication, TechnicianApplicationCertification, TechnicianSurveyData } from '@/types/index';

const ACCENT = '#1E40AF';
const ACCENT_TINT = 'rgba(30,64,175,0.10)';
const BORDER = '#E5E0DB';
const BG_INPUT = '#FAFAF9';

const REFRIGERANTS = ['R-290', 'R-32', 'R-744', 'R-410A', 'R-134a', 'R-22'];

type FormState = {
  name: string;
  nationalId: string;
  email: string;
  password: string;
  confirmPassword: string;
  contactNumber: string;
  province: string;
  district: string;
  specialization: string;
  technicianSkills: string;
  employmentStatus: 'employed' | 'self-employed' | 'unemployed';
  employer: string;
  yearsExperience: number;
  refrigerantsHandled: string[];
  certifications: TechnicianApplicationCertification[];
  surveyData: TechnicianSurveyData;
  agree: boolean;
};

const INITIAL: FormState = {
  name: '',
  nationalId: '',
  email: '',
  password: '',
  confirmPassword: '',
  contactNumber: '',
  province: '',
  district: '',
  specialization: '',
  technicianSkills: '',
  employmentStatus: 'employed',
  employer: '',
  yearsExperience: 0,
  refrigerantsHandled: [],
  certifications: [],
  surveyData: {},
  agree: false,
};

export default function JoinTechnicianPage() {
  if (!SELF_SIGNUP_OPEN.technician) {
    return <SignupClosedNotice title="Technician registration is closed" accent={ACCENT} />;
  }

  return <JoinTechnicianForm />;
}

function JoinTechnicianForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [application, setApplication] = useState<TechnicianApplication | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProvince = useMemo(
    () => ZIMBABWE_PROVINCES.find((p) => p.name === form.province),
    [form.province],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleRefrigerant = (code: string) =>
    setForm((f) => ({
      ...f,
      refrigerantsHandled: f.refrigerantsHandled.includes(code)
        ? f.refrigerantsHandled.filter((c) => c !== code)
        : [...f.refrigerantsHandled, code],
    }));

  const addCertification = () =>
    setForm((f) => ({
      ...f,
      certifications: [...f.certifications, { name: '', issuingBody: '', certificateNumber: '' }],
    }));

  const updateCertification = (
    index: number,
    field: keyof TechnicianApplicationCertification,
    value: string,
  ) =>
    setForm((f) => ({
      ...f,
      certifications: f.certifications.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));

  const removeCertification = (index: number) =>
    setForm((f) => ({
      ...f,
      certifications: f.certifications.filter((_, i) => i !== index),
    }));

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
      const record = await createTechnicianApplication({
        name: form.name.trim(),
        nationalId: form.nationalId.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        contactNumber: form.contactNumber.trim(),
        province: form.province,
        district: form.district,
        region: form.province,
        specialization: form.specialization,
        technicianSkills: form.technicianSkills,
        employmentStatus: form.employmentStatus,
        employer: form.employmentStatus === 'unemployed' ? undefined : form.employer.trim() || undefined,
        yearsExperience: Number(form.yearsExperience),
        certifications: form.certifications.filter((c) => c.name && c.issuingBody),
        refrigerantsHandled: form.refrigerantsHandled,
        surveyData: Object.keys(form.surveyData).length > 0 ? form.surveyData : undefined,
      });
      setApplication(record);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
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
              style={{ backgroundColor: ACCENT_TINT, color: ACCENT }}
            >
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <p
                className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-2"
                style={{ color: ACCENT }}
              >
                Technician Registration
              </p>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1]"
                style={{ color: '#1C1917' }}
              >
                Register on the national
                <br className="hidden sm:block" /> technician registry
              </h1>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Submit your credentials for review by HEVACRAZ. Once approved, you appear in the public
                verification portal and can be hired by any business needing certified refrigerant
                handlers in Zimbabwe.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border p-6 sm:p-8 rounded-xl" style={{ borderColor: BORDER }}>
            {application ? (
              <ApplicationSubmittedNotice
                name={application.name}
                email={application.email}
                reference={application.id}
                role="technician"
                accent={ACCENT}
                accentTint={ACCENT_TINT}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset className="space-y-5">
                  <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">
                    Identity
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Full name" required>
                      <Input
                        value={form.name}
                        onChange={(v) => update('name', v)}
                        required
                        placeholder="As on national ID"
                      />
                    </Field>
                    <Field label="National ID" required>
                      <Input
                        value={form.nationalId}
                        onChange={(v) => update('nationalId', v)}
                        required
                        placeholder="12-3456789A12"
                      />
                    </Field>
                    <Field label="Years of experience">
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={String(form.yearsExperience)}
                        onChange={(v) => update('yearsExperience', Number(v) || 0)}
                      />
                    </Field>
                    <Field label="Email" required>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(v) => update('email', v)}
                        required
                      />
                    </Field>
                    <Field label="Mobile" required>
                      <Input
                        type="tel"
                        value={form.contactNumber}
                        onChange={(v) => update('contactNumber', v)}
                        required
                        placeholder="+263..."
                      />
                    </Field>
                    <Field label="Password" required>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(v) => update('password', v)}
                        required
                      />
                    </Field>
                    <Field label="Confirm password" required>
                      <Input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(v) => update('confirmPassword', v)}
                        required
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-gray-500">
                    This will be your sign-in password once your registration is approved. Minimum 8 characters.
                  </p>
                  <p className="text-xs text-gray-500">
                    Your HEVACRAZ registration number is issued automatically once your application is
                    submitted — you don&apos;t need to supply one.
                  </p>
                </fieldset>

                <fieldset
                  className="space-y-5 pt-5 border-t"
                  style={{ borderColor: BORDER }}
                >
                  <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">
                    Practice
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="RAC Sub-sector" required>
                      <Select
                        value={form.specialization}
                        onChange={(v) => update('specialization', v)}
                        required
                      >
                        <option value="">Select...</option>
                        {TECHNICIAN_SPECIALIZATIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Technician Skills" required>
                      <Select
                        value={form.technicianSkills}
                        onChange={(v) => update('technicianSkills', v)}
                        required
                      >
                        <option value="">Select...</option>
                        {TECHNICIAN_SKILLS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Employment status" required>
                      <Select
                        value={form.employmentStatus}
                        onChange={(v) => update('employmentStatus', v as FormState['employmentStatus'])}
                        required
                      >
                        <option value="employed">Employed</option>
                        <option value="self-employed">Self-employed</option>
                        <option value="unemployed">Unemployed</option>
                      </Select>
                    </Field>
                    {form.employmentStatus !== 'unemployed' && (
                      <Field label="Employer">
                        <Input
                          value={form.employer}
                          onChange={(v) => update('employer', v)}
                          placeholder="Company or contracting business"
                        />
                      </Field>
                    )}
                    <Field label="Province" required>
                      <Select
                        value={form.province}
                        onChange={(v) => {
                          update('province', v);
                          update('district', '');
                        }}
                        required
                      >
                        <option value="">Select...</option>
                        {ZIMBABWE_PROVINCES.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="District" required>
                      <Select
                        value={form.district}
                        onChange={(v) => update('district', v)}
                        required
                        disabled={!selectedProvince}
                      >
                        <option value="">Select...</option>
                        {selectedProvince?.districts.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: '#1C1917' }}
                    >
                      Refrigerants you handle
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {REFRIGERANTS.map((r) => {
                        const active = form.refrigerantsHandled.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggleRefrigerant(r)}
                            className="px-3 py-2.5 text-sm font-semibold border transition-colors rounded-lg"
                            style={{
                              borderColor: active ? ACCENT : BORDER,
                              backgroundColor: active ? ACCENT_TINT : '#ffffff',
                              color: active ? ACCENT : '#1C1917',
                            }}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-4 pt-5 border-t" style={{ borderColor: BORDER }}>
                  <div className="flex items-center justify-between">
                    <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Certifications (optional)
                    </legend>
                    <button
                      type="button"
                      onClick={addCertification}
                      className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:underline"
                      style={{ color: ACCENT }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add certificate
                    </button>
                  </div>
                  {form.certifications.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      You can attach training and trade certificates here. Skip if your registration
                      number alone is sufficient — HEVACRAZ will follow up if more is needed.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {form.certifications.map((cert, idx) => (
                        <div
                          key={idx}
                          className="border p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg"
                          style={{ borderColor: BORDER, backgroundColor: BG_INPUT }}
                        >
                          <Input
                            value={cert.name}
                            onChange={(v) => updateCertification(idx, 'name', v)}
                            placeholder="Certificate name"
                          />
                          <Input
                            value={cert.issuingBody}
                            onChange={(v) => updateCertification(idx, 'issuingBody', v)}
                            placeholder="Issuing body"
                          />
                          <div className="flex gap-2">
                            <Input
                              value={cert.certificateNumber ?? ''}
                              onChange={(v) => updateCertification(idx, 'certificateNumber', v)}
                              placeholder="Certificate #"
                            />
                            <button
                              type="button"
                              onClick={() => removeCertification(idx)}
                              className="shrink-0 p-2 border text-rose-600 hover:bg-rose-50 transition-colors rounded-lg"
                              style={{ borderColor: BORDER }}
                              aria-label="Remove certification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </fieldset>

                <div className="pt-5 border-t" style={{ borderColor: BORDER }}>
                  <SectorSurveyFields
                    value={form.surveyData}
                    onChange={(surveyData) => update('surveyData', surveyData)}
                  />
                </div>

                <fieldset className="pt-5 border-t" style={{ borderColor: BORDER }}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.agree}
                      onChange={(e) => update('agree', e.target.checked)}
                      className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]"
                      required
                    />
                    <span className="text-sm text-gray-600 leading-relaxed">
                      I confirm the information above is accurate. I consent to HEVACRAZ verifying my
                      credentials with the issuing bodies and listing my approved registration on the
                      public verification portal.
                    </span>
                  </label>
                </fieldset>

                {error && (
                  <div
                    className="rounded border px-4 py-3 text-sm"
                    style={{ borderColor: '#F87171', backgroundColor: '#FEF2F2', color: '#991B1B' }}
                  >
                    {error}
                  </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <button
                    type="submit"
                    disabled={!form.agree || submitting}
                    className="group inline-flex items-center justify-center gap-2 font-semibold py-3.5 px-8 text-white text-sm transition-all duration-200 hover:brightness-110 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 rounded-lg"
                    style={{ backgroundColor: ACCENT }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit registration
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                  <p className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <ShieldCheck className="h-4 w-4" style={{ color: ACCENT }} />
                    HEVACRAZ verifies all submissions before publication.
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

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: '#1C1917' }}>
        {label}
        {required ? <span className="ml-1" style={{ color: '#DC2626' }}>*</span> : null}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full px-4 py-3 border text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent rounded-lg"
      style={{ borderColor: BORDER }}
    />
  );
}

function Select({
  value,
  onChange,
  required,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className="w-full px-4 py-3 border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
      style={{ borderColor: BORDER }}
    >
      {children}
    </select>
  );
}

