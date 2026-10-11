'use client';

import { useMemo, useState } from 'react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Building2,
    Download,
    FileText,
    Filter,
    PackageCheck,
    Search,
    Truck,
} from 'lucide-react';
import { useSupplierLedger, createLedgerEntry, useTechnicians } from '@/lib/api';
import { STORAGE_KEYS, readCollection } from '@/lib/platformStore';
import type { RefrigerantLog, SupplierLedgerDirection, SupplierLedgerEntry, SupplierRegistration } from '@/types/index';
import type { UserSession } from '@/lib/auth';

type ReportStatusFilter = 'all' | 'pending-nou' | 'pending-client' | 'fully-reported';
type SaleFormState = {
    technicianId: string;
    refrigerant: string;
    quantityKg: string;
    unitPriceUsd: string;
    transactionDate: string;
    invoiceNumber: string;
    reportedToNou: boolean;
    clientReported: boolean;
    notes: string;
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en-ZW', {
        dateStyle: 'medium',
    }).format(new Date(value));
}

function formatMonth(value: string) {
    return new Intl.DateTimeFormat('en-ZW', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(`${value}-01T00:00:00.000Z`));
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

function directionLabel(value: SupplierLedgerDirection) {
    return value === 'purchase' ? 'Purchase' : 'Sale';
}

function getStatusMatch(entry: SupplierLedgerEntry, filter: ReportStatusFilter) {
    if (filter === 'all') return true;
    if (filter === 'pending-nou') return !entry.reportedToNou;
    if (filter === 'pending-client') return !entry.clientReported;
    return entry.reportedToNou && entry.clientReported;
}

export default function VendorReportingPanel({
    session,
    application,
}: {
    session: UserSession;
    application?: SupplierRegistration;
}) {
    const [search, setSearch] = useState('');
    const [directionFilter, setDirectionFilter] = useState<'all' | SupplierLedgerDirection>('all');
    const [monthFilter, setMonthFilter] = useState('all');
    const [refrigerantFilter, setRefrigerantFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
    const [formMessage, setFormMessage] = useState('');
    const { data: techniciansData } = useTechnicians();
    const activeTechnicians = useMemo(
        () => (techniciansData ?? []).filter(technician => technician.status === 'active'),
        [techniciansData]
    );
    const [saleForm, setSaleForm] = useState<SaleFormState>({
        technicianId: '',
        refrigerant: application?.refrigerantsSupplied[0] ?? 'R-290',
        quantityKg: '25',
        unitPriceUsd: '28',
        transactionDate: new Date().toISOString().slice(0, 10),
        invoiceNumber: '',
        reportedToNou: false,
        clientReported: true,
        notes: '',
    });

    const { data: allEntries = [] } = useSupplierLedger();

    const supplierEntries = useMemo(() => {
        return allEntries.filter(entry => entry.supplierEmail === session.email);
    }, [allEntries, session.email]);

    const filteredEntries = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return supplierEntries.filter((entry) => {
            const matchesSearch =
                !searchValue ||
                [
                    entry.counterpartyName,
                    entry.refrigerant,
                    entry.invoiceNumber,
                    entry.province,
                    entry.notes ?? '',
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(searchValue);

            const matchesDirection = directionFilter === 'all' || entry.direction === directionFilter;
            const matchesMonth = monthFilter === 'all' || entry.referenceMonth === monthFilter;
            const matchesRefrigerant = refrigerantFilter === 'all' || entry.refrigerant === refrigerantFilter;
            const matchesStatus = getStatusMatch(entry, statusFilter);

            return matchesSearch && matchesDirection && matchesMonth && matchesRefrigerant && matchesStatus;
        });
    }, [directionFilter, monthFilter, refrigerantFilter, search, statusFilter, supplierEntries]);

    const uniqueMonths = useMemo(
        () => Array.from(new Set(supplierEntries.map(entry => entry.referenceMonth))).sort().reverse(),
        [supplierEntries]
    );

    const uniqueRefrigerants = useMemo(
        () => Array.from(new Set(supplierEntries.map(entry => entry.refrigerant))).sort(),
        [supplierEntries]
    );

    const totals = useMemo(() => {
        const purchasedKg = filteredEntries
            .filter(entry => entry.direction === 'purchase')
            .reduce((sum, entry) => sum + entry.quantityKg, 0);
        const soldKg = filteredEntries
            .filter(entry => entry.direction === 'sale')
            .reduce((sum, entry) => sum + entry.quantityKg, 0);
        const pendingNou = filteredEntries.filter(entry => !entry.reportedToNou).length;
        const pendingClient = filteredEntries.filter(entry => !entry.clientReported).length;
        const activeClients = new Set(
            filteredEntries
                .filter(entry => entry.direction === 'sale')
                .map(entry => entry.counterpartyName)
        ).size;
        const grossValue = filteredEntries.reduce((sum, entry) => sum + entry.totalValueUsd, 0);

        return {
            purchasedKg,
            soldKg,
            pendingNou,
            pendingClient,
            activeClients,
            grossValue,
            balanceKg: purchasedKg - soldKg,
        };
    }, [filteredEntries]);

    const supplierName =
        application?.tradingName ||
        application?.companyName ||
        supplierEntries[0]?.supplierName ||
        session.name;
    const selectedTechnician = activeTechnicians.find(technician => technician.id === saleForm.technicianId);

    const updateSaleForm = <K extends keyof SaleFormState>(key: K, value: SaleFormState[K]) => {
        setSaleForm((current) => ({ ...current, [key]: value }));
    };

    const handleSaleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const technician = activeTechnicians.find(item => item.id === saleForm.technicianId);
        const quantityKg = Number(saleForm.quantityKg);
        const unitPriceUsd = Number(saleForm.unitPriceUsd);

        if (!technician || !saleForm.refrigerant || !saleForm.transactionDate || !saleForm.invoiceNumber.trim()) {
            setFormMessage('Select a registered technician and complete the sale details before saving.');
            return;
        }

        if (!Number.isFinite(quantityKg) || quantityKg <= 0 || !Number.isFinite(unitPriceUsd) || unitPriceUsd <= 0) {
            setFormMessage('Quantity and unit price must both be greater than zero.');
            return;
        }

        const transactionDateIso = new Date(`${saleForm.transactionDate}T12:00:00.000Z`).toISOString();
        const linkedRefrigerantLog: RefrigerantLog = {
            id: `supplier-log-${Date.now()}`,
            technicianId: technician.id,
            technicianName: technician.name,
            clientName: technician.employer ?? technician.name,
            location: technician.province,
            jobType: 'COLD_ROOM',
            plannerJobId: undefined,
            refrigerantType: saleForm.refrigerant,
            amount: quantityKg,
            actionType: 'Charge',
            timestamp: transactionDateIso,
            approvedSupplierId: supplierName.toLowerCase().replace(/\s+/g, '-'),
            approvedSupplierName: supplierName,
            supplierVerified: true,
            pesepayTransactionId: saleForm.invoiceNumber.trim(),
        };

        try {
            await createLedgerEntry({
                supplierEmail: session.email,
                supplierName,
                direction: 'sale',
                technicianId: technician.id,
                technicianRegistrationNumber: technician.registrationNumber,
                counterpartyName: technician.name,
                counterpartyCompany: technician.employer ?? 'Independent technician',
                counterpartyType: 'technician',
                province: technician.province,
                refrigerant: saleForm.refrigerant,
                quantityKg,
                unitPriceUsd,
                totalValueUsd: quantityKg * unitPriceUsd,
                invoiceNumber: saleForm.invoiceNumber.trim(),
                transactionDate: transactionDateIso,
                referenceMonth: saleForm.transactionDate.slice(0, 7),
                reportedToNou: saleForm.reportedToNou,
                clientReported: saleForm.clientReported,
                notes: saleForm.notes.trim() || `Sold to registered technician ${technician.registrationNumber}.`,
            });

        } catch (err) {
            setFormMessage(err instanceof Error ? err.message : 'The sale could not be saved. Check the details and try again.');
            return;
        }

        // Note: No longer mirrors sale entries into fieldToolkitLogs localStorage.
        // The canonical record is the ledger entry above (DB-backed).
        setFormMessage(`Sale logged for ${technician.name} (${technician.registrationNumber}).`);
        setSaleForm((current) => ({
            ...current,
            quantityKg: '25',
            unitPriceUsd: current.unitPriceUsd,
            transactionDate: new Date().toISOString().slice(0, 10),
            invoiceNumber: '',
            reportedToNou: false,
            clientReported: true,
            notes: '',
        }));
    };

    const exportPdf = async () => {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(18);
        doc.text(`${supplierName} Refrigerant Ledger`, 14, 18);
        doc.setFontSize(10);
        doc.text(`Region: ${session.region}`, 14, 26);
        doc.text(`Filters: ${monthFilter === 'all' ? 'All months' : formatMonth(monthFilter)} | ${directionFilter === 'all' ? 'All directions' : directionLabel(directionFilter)} | ${refrigerantFilter === 'all' ? 'All refrigerants' : refrigerantFilter}`, 14, 32);
        doc.text(`Reporting: ${statusFilter.replace('-', ' ')} | Generated: ${new Date().toLocaleString('en-ZW')}`, 14, 38);

        doc.setFontSize(11);
        doc.text(
            `Purchased ${totals.purchasedKg} kg | Sold ${totals.soldKg} kg | Pending NOU ${totals.pendingNou} | Pending Client ${totals.pendingClient} | Gross ${formatCurrency(totals.grossValue)}`,
            14,
            47
        );

        autoTable(doc, {
            startY: 54,
            head: [['Date', 'Type', 'Counterparty', 'Province', 'Refrigerant', 'Kg', 'Value', 'NOU', 'Client', 'Invoice']],
            body: filteredEntries.map(entry => [
                formatDate(entry.transactionDate),
                directionLabel(entry.direction),
                entry.counterpartyCompany
                    ? `${entry.counterpartyName} / ${entry.counterpartyCompany}`
                    : entry.counterpartyName,
                entry.province,
                entry.refrigerant,
                entry.quantityKg,
                formatCurrency(entry.totalValueUsd),
                entry.reportedToNou ? 'Filed' : 'Pending',
                entry.clientReported ? 'Shared' : 'Pending',
                entry.invoiceNumber,
            ]),
            styles: { fontSize: 9, cellPadding: 2.5 },
            headStyles: { fillColor: [44, 36, 32] },
        });

        doc.save(`vendor-ledger-${monthFilter === 'all' ? 'all-periods' : monthFilter}.pdf`);
    };

    const kpis = [
        {
            label: 'Purchased Kg',
            value: totals.purchasedKg.toLocaleString(),
            hint: 'Inbound stock from suppliers',
            icon: ArrowDownLeft,
            tone: 'bg-emerald-50 text-emerald-700',
        },
        {
            label: 'Sold Kg',
            value: totals.soldKg.toLocaleString(),
            hint: 'Outbound sales to clients',
            icon: ArrowUpRight,
            tone: 'bg-blue-50 text-blue-700',
        },
        {
            label: 'Pending NOU',
            value: String(totals.pendingNou),
            hint: 'Ledger lines not yet filed',
            icon: FileText,
            tone: 'bg-amber-50 text-amber-700',
        },
        {
            label: 'Active Clients',
            value: String(totals.activeClients),
            hint: 'Filtered sales counterparties',
            icon: Building2,
            tone: 'bg-slate-50 text-slate-700',
        },
    ] as const;

    return (
        <section className="space-y-5 rounded-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Vendor reporting</p>
                    <h3 className="mt-2 text-2xl font-bold text-gray-900">Refrigerant purchase, sales, and NOU reporting</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        Track what you buy, what you sell to clients, and what still needs to be filed to the NOU.
                        Every filter below also controls the exported PDF report.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                        <p className="font-semibold text-gray-900">Inventory balance</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{totals.balanceKg.toLocaleString()} kg</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                        <p className="font-semibold text-gray-900">Gross value</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totals.grossValue)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={exportPdf}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2C2420] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                        <Download className="h-4 w-4" />
                        Export Filtered PDF
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;

                    return (
                        <article key={kpi.label} className="rounded-2xl rounded-lg border border-gray-200 bg-gray-50 p-5">
                            <div className="flex items-center justify-between">
                                <div className={`rounded-xl p-3 ${kpi.tone}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <PackageCheck className="h-4 w-4 text-gray-300" />
                            </div>
                            <p className="mt-4 text-3xl font-bold text-gray-900">{kpi.value}</p>
                            <p className="mt-1 text-sm font-semibold text-gray-700">{kpi.label}</p>
                            <p className="mt-1 text-xs text-gray-500">{kpi.hint}</p>
                        </article>
                    );
                })}
            </div>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <form onSubmit={handleSaleSubmit} className="rounded-2xl rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">New sale log</p>
                            <h4 className="mt-2 text-lg font-semibold text-gray-900">Log refrigerant sold to a registered technician</h4>
                            <p className="mt-1 text-sm text-gray-600">
                                Vendor clients are selected from the technician registry, and the technician company is attached automatically.
                            </p>
                        </div>
                        <PackageCheck className="h-5 w-5 text-gray-300" />
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Registered technician</span>
                            <select
                                value={saleForm.technicianId}
                                onChange={(event) => updateSaleForm('technicianId', event.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {activeTechnicians.map((technician) => (
                                    <option key={technician.id} value={technician.id}>
                                        {technician.name} · {technician.registrationNumber} · {technician.employer ?? 'Independent'}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Refrigerant</span>
                            <select
                                value={saleForm.refrigerant}
                                onChange={(event) => updateSaleForm('refrigerant', event.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {Array.from(new Set([...(application?.refrigerantsSupplied ?? []), ...uniqueRefrigerants, 'R-290']))
                                    .filter(Boolean)
                                    .map((refrigerant) => (
                                        <option key={refrigerant} value={refrigerant}>
                                            {refrigerant}
                                        </option>
                                    ))}
                            </select>
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Quantity (kg)</span>
                            <input
                                type="number"
                                min="1"
                                step="0.1"
                                value={saleForm.quantityKg}
                                onChange={(event) => updateSaleForm('quantityKg', event.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Unit price (USD)</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={saleForm.unitPriceUsd}
                                onChange={(event) => updateSaleForm('unitPriceUsd', event.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Sale date</span>
                            <input
                                type="date"
                                value={saleForm.transactionDate}
                                onChange={(event) => updateSaleForm('transactionDate', event.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Invoice number</span>
                            <input
                                value={saleForm.invoiceNumber}
                                onChange={(event) => updateSaleForm('invoiceNumber', event.target.value)}
                                placeholder="SL-260401"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                        <label className="space-y-2 text-sm md:col-span-2">
                            <span className="font-semibold text-gray-700">Notes</span>
                            <textarea
                                value={saleForm.notes}
                                onChange={(event) => updateSaleForm('notes', event.target.value)}
                                placeholder="Optional delivery or compliance note"
                                rows={3}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={saleForm.reportedToNou}
                                onChange={(event) => updateSaleForm('reportedToNou', event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            Report already filed to NOU
                        </label>
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={saleForm.clientReported}
                                onChange={(event) => updateSaleForm('clientReported', event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            Shared with technician/client
                        </label>
                    </div>
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2">
                        These are self-attested without a counter-signature. A future phase should add
                        NOU-side confirmation and client-facing acknowledgment for audit integrity.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-gray-600">
                            {selectedTechnician ? (
                                <span>
                                    Selling to <span className="font-semibold text-gray-900">{selectedTechnician.name}</span>
                                    {' '}under <span className="font-semibold text-gray-900">{selectedTechnician.employer ?? 'Independent technician'}</span>.
                                </span>
                            ) : (
                                <span>Select a technician from the registry.</span>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                        >
                            <ArrowUpRight className="h-4 w-4" />
                            Save Sale Log
                        </button>
                    </div>

                    {formMessage && (
                        <div className="mt-4 rounded-xl rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                            {formMessage}
                        </div>
                    )}
                </form>

                <div className="rounded-2xl rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Selected technician</p>
                    {selectedTechnician ? (
                        <div className="mt-4 space-y-4">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900">{selectedTechnician.name}</h4>
                                <p className="text-sm text-gray-600">{selectedTechnician.registrationNumber}</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl rounded-lg border border-gray-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Company</p>
                                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedTechnician.employer ?? 'Independent technician'}</p>
                                </div>
                                <div className="rounded-xl rounded-lg border border-gray-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Province</p>
                                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedTechnician.province}</p>
                                </div>
                                <div className="rounded-xl rounded-lg border border-gray-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Specialization</p>
                                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedTechnician.specialization}</p>
                                </div>
                                <div className="rounded-xl rounded-lg border border-gray-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Contact</p>
                                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedTechnician.contactNumber}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                            No registered technician is selected yet.
                        </div>
                    )}
                </div>
            </section>

            <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.9fr]">
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                    <Search className="h-4 w-4" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search counterparty, invoice, refrigerant..."
                        className="w-full bg-transparent outline-none placeholder:text-gray-400"
                    />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                    <Filter className="h-4 w-4" />
                    <select
                        value={monthFilter}
                        onChange={(event) => setMonthFilter(event.target.value)}
                        className="w-full bg-transparent outline-none"
                    >
                        <option value="all">All months</option>
                        {uniqueMonths.map((month) => (
                            <option key={month} value={month}>
                                {formatMonth(month)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                    <Truck className="h-4 w-4" />
                    <select
                        value={refrigerantFilter}
                        onChange={(event) => setRefrigerantFilter(event.target.value)}
                        className="w-full bg-transparent outline-none"
                    >
                        <option value="all">All refrigerants</option>
                        {uniqueRefrigerants.map((refrigerant) => (
                            <option key={refrigerant} value={refrigerant}>
                                {refrigerant}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                    <ArrowUpRight className="h-4 w-4" />
                    <select
                        value={directionFilter}
                        onChange={(event) => setDirectionFilter(event.target.value as 'all' | SupplierLedgerDirection)}
                        className="w-full bg-transparent outline-none"
                    >
                        <option value="all">All directions</option>
                        <option value="purchase">Purchases</option>
                        <option value="sale">Sales</option>
                    </select>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as ReportStatusFilter)}
                        className="w-full bg-transparent outline-none"
                    >
                        <option value="all">All reporting</option>
                        <option value="pending-nou">Pending NOU</option>
                        <option value="pending-client">Pending client</option>
                        <option value="fully-reported">Fully reported</option>
                    </select>
                </label>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
                <div className="grid grid-cols-[0.9fr_0.8fr_1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    <span>Date</span>
                    <span>Type</span>
                    <span>Counterparty</span>
                    <span>Refrigerant</span>
                    <span>Kg</span>
                    <span>Value</span>
                    <span>NOU</span>
                    <span>Client</span>
                </div>

                <div className="divide-y divide-gray-100">
                    {filteredEntries.length === 0 ? (
                        <div className="p-6 text-sm text-gray-500">
                            No ledger entries match the current filters.
                        </div>
                    ) : (
                        filteredEntries.map((entry) => (
                            <div
                                key={entry.id}
                                className="grid grid-cols-[0.9fr_0.8fr_1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 bg-white px-4 py-4 text-sm"
                            >
                                <div>
                                    <p className="font-semibold text-gray-900">{formatDate(entry.transactionDate)}</p>
                                    <p className="text-xs text-gray-500">{entry.invoiceNumber}</p>
                                </div>
                                <div>
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                            entry.direction === 'purchase'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-blue-50 text-blue-700'
                                        }`}
                                    >
                                        {directionLabel(entry.direction)}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-gray-900">{entry.counterpartyName}</p>
                                    <p className="truncate text-xs text-gray-500">
                                        {entry.counterpartyCompany
                                            ? `${entry.counterpartyCompany} · `
                                            : ''}
                                        {entry.counterpartyType.replace(/-/g, ' ')} · {entry.province}
                                        {entry.technicianRegistrationNumber
                                            ? ` · ${entry.technicianRegistrationNumber}`
                                            : ''}
                                    </p>
                                </div>
                                <div className="text-gray-700">{entry.refrigerant}</div>
                                <div className="font-semibold text-gray-900">{entry.quantityKg} kg</div>
                                <div className="font-semibold text-gray-900">{formatCurrency(entry.totalValueUsd)}</div>
                                <div>
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                            entry.reportedToNou
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700'
                                        }`}
                                    >
                                        {entry.reportedToNou ? 'Filed' : 'Pending'}
                                    </span>
                                </div>
                                <div>
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                            entry.clientReported
                                                ? 'bg-sky-50 text-sky-700'
                                                : 'bg-rose-50 text-rose-700'
                                        }`}
                                    >
                                        {entry.clientReported ? 'Shared' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
