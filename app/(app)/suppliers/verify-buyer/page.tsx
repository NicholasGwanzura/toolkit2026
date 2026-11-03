'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { verifyTechnician, type VerifyTechnicianResult } from '@/lib/api';
import type { VerificationMethod } from '@/lib/platformStore';
import type { Technician } from '@/types/index';

type LookupTab = 'reg_number' | 'qr' | 'name';

function ResultPanel({ data }: { data: VerifyTechnicianResult }) {
    const { technician: tech, result } = data;
    const isClear = result === 'valid';

    return (
        <div className="mt-6 space-y-4">
            {isClear ? (
                <div className="rounded-lg border border-emerald-300 bg-emerald-600 px-5 py-4 text-base font-bold text-white">
                    Registered Sale authorized
                </div>
            ) : (
                <div className="rounded-lg border border-rose-300 bg-rose-600 px-5 py-4 text-base font-bold text-white">
                    DO NOT SELL {result === 'not_found' ? 'Technician not found' : result === 'expired' ? 'Registration expired' : 'Registration revoked'}
                </div>
            )}

            {tech ? (
                <div className="rounded-lg rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm">
                        <InfoRow label="Name" value={tech.name} />
                        <InfoRow label="Registration no." value={tech.registrationNumber} />
                        <InfoRow label="Region / Province" value={`${tech.region} ${tech.province}`} />
                        <InfoRow label="Registration status" value={tech.status} />
                        <InfoRow label="Registered" value={tech.registrationDate} />
                        <InfoRow label="Expiry" value={tech.expiryDate} />
                        {tech.employer && <InfoRow label="Employer" value={tech.employer} />}
                        <InfoRow label="RAC Sub-sector" value={tech.specialization} />
                    </div>

                    {tech.certifications.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-2">Certifications</p>
                            <div className="space-y-2">
                                {tech.certifications.map(cert => (
                                    <div key={cert.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-gray-900">{cert.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{cert.issuingBody} · #{cert.certificateNumber}</p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                                cert.status === 'valid'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : cert.status === 'expired'
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {cert.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Issued {cert.dateIssued} · Expires {cert.expiryDate}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                    No technician record found.
                </div>
            )}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 capitalize">{value}</p>
        </div>
    );
}

export default function VerifyBuyerPage() {
    const { user: session, isLoading } = useAuth();

    const [activeTab, setActiveTab] = useState<LookupTab>('reg_number');
    const [regInput, setRegInput] = useState('');
    const [qrInput, setQrInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [result, setResult] = useState<VerifyTechnicianResult | null>(null);
    const [nameResults, setNameResults] = useState<Technician[]>([]);
    const [looking, setLooking] = useState(false);
    const [lookupError, setLookupError] = useState('');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-8 w-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!session || (session.role !== 'vendor' && session.role !== 'org_admin')) {
        return (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                Access restricted. This page is for vendors and admins only.
            </div>
        );
    }

    async function doVerify(method: VerificationMethod, query: string) {
        setLooking(true);
        setLookupError('');
        setResult(null);
        try {
            const res = await verifyTechnician({ method, query });
            setResult(res);
        } catch (err) {
            setLookupError((err as Error).message);
        } finally {
            setLooking(false);
        }
    }

    async function handleNameSearch() {
        if (!nameInput.trim()) {
            setNameResults([]);
            return;
        }
        setLooking(true);
        setLookupError('');
        try {
            const res = await fetch(`/api/technicians?q=${encodeURIComponent(nameInput.trim())}`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error(`Search failed: ${res.status}`);
            const data = await res.json() as Technician[];
            setNameResults(data);
            setResult(null);
        } catch (err) {
            setLookupError((err as Error).message);
        } finally {
            setLooking(false);
        }
    }

    async function selectFromNameResults(tech: Technician) {
        setNameResults([]);
        await doVerify('name', tech.name);
    }

    const TABS: { id: LookupTab; label: string }[] = [
        { id: 'reg_number', label: 'By registration number' },
        { id: 'qr', label: 'By QR token' },
        { id: 'name', label: 'By name search' },
    ];

    return (
        <div className="space-y-8">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Vendor workspace</p>
                    <h1 className="text-2xl font-bold text-gray-900">Verify Technician Before Sale</h1>
                    <p className="max-w-2xl text-sm leading-6 text-gray-600">
                        Look up a technician by their registration number, QR code token, or name. Each lookup is logged for audit purposes.
                    </p>
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex border-b border-gray-200">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActiveTab(tab.id);
                                setResult(null);
                                setNameResults([]);
                                setLookupError('');
                            }}
                            className={`px-4 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    {activeTab === 'reg_number' && (
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={regInput}
                                onChange={e => setRegInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && doVerify('reg_number', regInput.trim())}
                                placeholder="e.g. TEC-2024-001"
                                className="flex-1 border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => doVerify('reg_number', regInput.trim())}
                                disabled={looking || !regInput.trim()}
                                className="bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                            >
                                {looking ? 'Looking up...' : 'Lookup'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'qr' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500">
                                Paste the QR code token string below.
                            </p>
                            <div className="flex gap-3">
                                <textarea
                                    value={qrInput}
                                    onChange={e => setQrInput(e.target.value)}
                                    rows={3}
                                    placeholder="Paste QR token here..."
                                    className="flex-1 border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => doVerify('qr', qrInput.trim())}
                                    disabled={looking || !qrInput.trim()}
                                    className="self-start bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {looking ? 'Looking up...' : 'Lookup'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'name' && (
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={e => {
                                        setNameInput(e.target.value);
                                        if (!e.target.value.trim()) setNameResults([]);
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && handleNameSearch()}
                                    placeholder="Enter part of technician name or reg number"
                                    className="flex-1 border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleNameSearch}
                                    disabled={looking || !nameInput.trim()}
                                    className="bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                                >
                                    Search
                                </button>
                            </div>

                            {nameResults.length > 0 && (
                                <div className="border border-gray-200 divide-y divide-gray-100">
                                    {nameResults.map(tech => (
                                        <button
                                            key={tech.id}
                                            type="button"
                                            onClick={() => selectFromNameResults(tech)}
                                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition hover:bg-gray-50"
                                        >
                                            <div>
                                                <p className="font-semibold text-gray-900">{tech.name}</p>
                                                <p className="text-xs text-gray-500">{tech.registrationNumber} · {tech.province}</p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                                tech.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                tech.status === 'suspended' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                'bg-gray-50 text-gray-600 border-gray-200'
                                            }`}>
                                                {tech.status}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {nameInput.trim() && nameResults.length === 0 && !result && !looking && (
                                <p className="text-sm text-gray-500">No matches. Try a broader term or check for spelling.</p>
                            )}
                        </div>
                    )}

                    {lookupError && (
                        <div className="mt-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {lookupError}
                        </div>
                    )}

                    {result && <ResultPanel data={result} />}
                </div>
            </div>

        </div>
    );
}
