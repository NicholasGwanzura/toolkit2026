'use client';

import React from 'react';
import {
  SELECTABLE_REFRIGERANTS,
  defaultEvaporatorTd,
  type EquipmentSelection,
  type EquipmentSettings,
  type SelectableRefrigerant,
} from '@/lib/equipment-selection';

interface Props {
  loadKw: number;
  roomTempC: number;
  ambientTempC: number;
  settings: EquipmentSettings;
  onChange: (settings: EquipmentSettings) => void;
  sel: EquipmentSelection | null;
}

const controlClass = 'block h-11 w-full border border-emerald-200 bg-white px-3 text-base text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 sm:text-sm';

// Label, control and hint in fixed rows so every field lines up, whatever the hint length.
const Field = ({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) => (
  <label className="flex min-w-0 flex-col gap-1">
    <span className="text-xs font-semibold text-gray-800">{label}</span>
    {children}
    <span className="text-xs leading-4 text-gray-600">{hint}</span>
  </label>
);

const Row = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-emerald-100 py-2 last:border-b-0">
    <dt className="text-xs font-semibold text-gray-700">{label}</dt>
    <dd className="text-right text-sm font-semibold text-gray-900">
      {value}
      {note && <span className="block text-xs font-normal text-gray-600">{note}</span>}
    </dd>
  </div>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border border-emerald-100 bg-white p-3">
    <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">{title}</h4>
    <dl className="mt-1">{children}</dl>
  </section>
);

const EquipmentSelectionPanel: React.FC<Props> = ({ loadKw, roomTempC, ambientTempC, settings, onChange, sel }) => {
  const refrigerant = settings.refrigerant;
  const runtime = settings.runtimeHoursPerDay;
  const evaporatorTdK = settings.evaporatorTdK ?? defaultEvaporatorTd(roomTempC);
  const condTd = settings.condenserTdK;
  const setRefrigerant = (r: SelectableRefrigerant) => onChange({ ...settings, refrigerant: r });
  const setRuntime = (v: number) => onChange({ ...settings, runtimeHoursPerDay: v });
  const setEvapTd = (v: number) => onChange({ ...settings, evaporatorTdK: v });
  const setCondTd = (v: number) => onChange({ ...settings, condenserTdK: v });

  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-semibold text-emerald-900">Indicative equipment and pipe sizes</p>
      <div className="grid grid-cols-2 items-start gap-x-3 gap-y-4 xl:grid-cols-4">
        <Field label="Refrigerant" hint="Pick one that suits the room temperature.">
          <select className={`${controlClass} appearance-none bg-[right_0.75rem_center] bg-no-repeat pr-9`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} value={refrigerant} onChange={(e) => setRefrigerant(e.target.value as SelectableRefrigerant)}>
            {SELECTABLE_REFRIGERANTS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Run time (h/day)" hint="Hours the compressor may run, 8 to 24.">
          <input type="number" inputMode="decimal" min={8} max={24} step={1} className={controlClass} value={runtime} onChange={(e) => setRuntime(num(e.target.value))} />
        </Field>
        <Field label="Evaporator TD (K)" hint="Room air minus refrigerant temperature.">
          <input type="number" inputMode="decimal" min={2} max={15} step={1} className={controlClass} value={evaporatorTdK} onChange={(e) => setEvapTd(num(e.target.value))} />
        </Field>
        <Field label="Condenser TD (K)" hint="Condensing temperature above ambient.">
          <input type="number" inputMode="decimal" min={5} max={25} step={1} className={controlClass} value={condTd} onChange={(e) => setCondTd(num(e.target.value))} />
        </Field>
      </div>

      {!sel && <p className="text-xs text-amber-900">Enter a cooling load above zero and a run time between 8 and 24 hours to see sizes.</p>}

      {sel && (
        <>
          <p className="text-xs leading-5 text-emerald-900">
            Design point: evaporating {sel.evaporatingC.toFixed(0)} °C ({sel.evaporatingBar.toFixed(1)} bar abs), condensing {sel.condensingC.toFixed(0)} °C ({sel.condensingBar.toFixed(1)} bar abs), pressure ratio {sel.pressureRatio.toFixed(1)}.
            Required capacity {sel.designCapacityKw.toFixed(1)} kW (average load {loadKw.toFixed(1)} kW over {runtime} h/day).
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <Card title="Compressor">
              <Row label="Capacity needed" value={`${sel.compressor.capacityKw.toFixed(1)} kW`} note={`at ${sel.evaporatingC.toFixed(0)} / ${sel.condensingC.toFixed(0)} °C`} />
              <Row label="Swept volume" value={`${sel.compressor.sweptVolumeM3h.toFixed(0)} m³/h`} />
              <Row label="Electrical input" value={`about ${sel.compressor.electricalKw.toFixed(1)} kW`} note={`COP about ${sel.compressor.cop.toFixed(1)}`} />
              <Row label="Type" value={sel.compressor.type} />
            </Card>
            <Card title="Condenser">
              <Row label="Heat rejection" value={`${sel.condenser.heatRejectionKw.toFixed(1)} kW`} note={`at ${condTd} K above ${ambientTempC} °C ambient`} />
            </Card>
            <Card title="Evaporator (air cooler)">
              <Row label="Capacity" value={`${sel.evaporator.capacityKw.toFixed(1)} kW`} note={`at ${evaporatorTdK} K TD`} />
              <Row label="Air flow" value={`${Math.round(sel.evaporator.airflowM3h).toLocaleString()} m³/h`} note={`${sel.evaporator.airDeltaTK} K air temperature drop`} />
            </Card>
            <Card title="Expansion device">
              <Row label="Valve capacity needed" value={`${sel.expansion.requiredKw.toFixed(1)} kW`} note={`${sel.expansion.requiredTr.toFixed(1)} TR`} />
              <Row label="Typical nominal class" value={sel.expansion.nominalClassTr ? `${sel.expansion.nominalClassTr} TR` : 'Above standard range'} note="includes a 25% allowance" />
              <Row label="Suggested type" value={sel.expansion.type} />
            </Card>
          </div>
          <Card title="Copper line sizes (ACR, outside diameter)">
            <Row label="Suction line" value={sel.lines.suction.size} note={`${sel.lines.suction.velocityMs.toFixed(1)} m/s`} />
            <Row label="Discharge line" value={sel.lines.discharge.size} note={`${sel.lines.discharge.velocityMs.toFixed(1)} m/s`} />
            <Row label="Liquid line" value={sel.lines.liquid.size} note={`${sel.lines.liquid.velocityMs.toFixed(2)} m/s`} />
          </Card>
          {sel.warnings.length > 0 && (
            <ul role="note" className="list-disc space-y-1 border border-amber-200 bg-amber-50 py-3 pl-7 pr-4 text-xs leading-5 text-amber-900">
              {sel.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <p className="text-xs leading-5 text-emerald-900">
            These are first-pass sizes from estimated refrigerant properties. Lines are sized on velocity only (suction 12 m/s, discharge 15 m/s, liquid 1.2 m/s maximum), so check pressure drop for the real route and length, and oil return in risers.
            Confirm every item against the manufacturer&apos;s selection software at the design conditions before ordering. Charge limits, safety class and local codes still apply.
          </p>
        </>
      )}
    </div>
  );
};

export default EquipmentSelectionPanel;
