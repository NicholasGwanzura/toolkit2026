
import React, { useState, useMemo, useEffect } from 'react';
import { SizingInputs, JobType, JobTypeLabels, JobTypeDefaults, JobTypeImages, JobTypeDescriptions, ProcessingMode, ProcessingModeLabels, ProcessingModeDescriptions } from '../types';
import { ChevronRight, ChevronLeft, Calculator, Thermometer, Shield, Sparkles, Download, Snowflake, ExternalLink, Gauge, ArrowUpDown, Droplets, Save, Info } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { REFRIGERANT_REFERENCE } from '@/constants/refrigerants';
import { calculateCoolingLoads } from '@/lib/sizing-calculations';
import EquipmentSelectionPanel from './EquipmentSelectionPanel';
import { SIZING_RESOURCES } from '@/lib/toolkit-resources';
import { computeSelection, defaultEquipmentSettings, defaultEvaporatorTd, type EquipmentSettings } from '@/lib/equipment-selection';
import { COMMON_PANEL_THICKNESSES_MM, INSULATION_TYPES, floorUValue, panelUValue, type InsulationType } from '@/lib/panel-insulation';

// HEVACRAZ brand palette (mirrors tailwind.config hevac-* colors) for PDF export
const PDF_BRAND = {
  primary: [44, 36, 32] as [number, number, number], // charcoal
  secondary: [212, 165, 116] as [number, number, number], // terracotta
  accent: [90, 125, 90] as [number, number, number], // sage
  highlight: [255, 107, 53] as [number, number, number], // electric orange
};
const PDF_LOGO_PATH = '/logos/hevacraz-logo.jpeg';

async function loadImageAsDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Technical references used to guide and cross-check the preliminary estimates. Kept in one shared list.
const SIZING_SOURCES = SIZING_RESOURCES;

const SIZING_REFERENCE_NOTE = 'These references inform methods and cross-checks; they do not certify this preliminary estimate. Confirm product-specific properties, site conditions, equipment ratings and applicable Zimbabwean requirements before design or procurement.';

type CalculatorTab = 'wizard' | 'superheat' | 'pt-chart' | 'leak-rate' | 'converter';
type RefrigerantCode = 'R-290' | 'R-32' | 'R-744' | 'R-22';
type ConverterType = 'temperature' | 'pressure' | 'mass' | 'airflow' | 'energy';

const PT_CURVES: Record<RefrigerantCode, { temp: number; pressure: number }[]> = {
  'R-290': [
    { temp: -20, pressure: 1.8 },
    { temp: -10, pressure: 2.4 },
    { temp: 0, pressure: 3.2 },
    { temp: 10, pressure: 4.3 },
    { temp: 20, pressure: 5.8 },
    { temp: 30, pressure: 7.7 },
    { temp: 40, pressure: 10.1 },
  ],
  'R-32': [
    { temp: -20, pressure: 4.8 },
    { temp: -10, pressure: 6.2 },
    { temp: 0, pressure: 7.9 },
    { temp: 10, pressure: 10.0 },
    { temp: 20, pressure: 12.5 },
    { temp: 30, pressure: 15.5 },
    { temp: 40, pressure: 19.2 },
  ],
  'R-744': [
    { temp: -20, pressure: 17.0 },
    { temp: -10, pressure: 22.0 },
    { temp: 0, pressure: 27.5 },
    { temp: 10, pressure: 34.5 },
    { temp: 20, pressure: 42.5 },
    { temp: 30, pressure: 52.0 },
    { temp: 40, pressure: 64.0 },
  ],
  'R-22': [
    { temp: -20, pressure: 2.4 },
    { temp: -10, pressure: 3.3 },
    { temp: 0, pressure: 4.6 },
    { temp: 10, pressure: 6.1 },
    { temp: 20, pressure: 8.1 },
    { temp: 30, pressure: 10.6 },
    { temp: 40, pressure: 13.6 },
  ],
};

const CONVERTER_OPTIONS: Record<ConverterType, { units: string[] }> = {
  temperature: { units: ['C', 'F', 'K'] },
  pressure: { units: ['bar', 'psi', 'Pa'] },
  mass: { units: ['kg', 'lb'] },
  airflow: { units: ['m3/h', 'CFM'] },
  energy: { units: ['kW', 'BTU/h'] },
};

const interpolateTempFromPressure = (curve: { temp: number; pressure: number }[], pressure: number) => {
  const sorted = [...curve].sort((a, b) => a.pressure - b.pressure);
  if (pressure <= sorted[0].pressure) return sorted[0].temp;
  if (pressure >= sorted[sorted.length - 1].pressure) return sorted[sorted.length - 1].temp;

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (pressure >= current.pressure && pressure <= next.pressure) {
      const ratio = (pressure - current.pressure) / (next.pressure - current.pressure);
      return current.temp + ratio * (next.temp - current.temp);
    }
  }

  return sorted[0].temp;
};

const convertValue = (value: number, type: ConverterType, from: string, to: string) => {
  if (from === to) return value;

  if (type === 'temperature') {
    const celsius =
      from === 'C' ? value :
      from === 'F' ? ((value - 32) * 5) / 9 :
      value - 273.15;

    return to === 'C' ? celsius : to === 'F' ? (celsius * 9) / 5 + 32 : celsius + 273.15;
  }

  if (type === 'pressure') {
    const bar = from === 'bar' ? value : from === 'psi' ? value / 14.5038 : value / 100000;
    return to === 'bar' ? bar : to === 'psi' ? bar * 14.5038 : bar * 100000;
  }

  if (type === 'mass') {
    const kg = from === 'kg' ? value : value / 2.20462;
    return to === 'kg' ? kg : kg * 2.20462;
  }

  if (type === 'airflow') {
    const metric = from === 'm3/h' ? value : value * 1.699;
    return to === 'm3/h' ? metric : metric / 1.699;
  }

  const kw = from === 'kW' ? value : value / 3412.142;
  return to === 'kW' ? kw : kw * 3412.142;
};

const SizingTool: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [inputs, setInputs] = useState<SizingInputs>({
    step: 1,
    facilityType: 'SUPERMARKET',
    jobType: 'COLD_ROOM',
    processingMode: 'FREEZING',
    roomWidth: 6,
    roomLength: 8,
    roomHeight: 3.5,
    insulationType: 'PU',
    wallPanelMm: 100,
    ceilingPanelMm: 100,
    floorInsulationMm: 100,
    wallUValue: panelUValue('PU', 100),
    ceilingUValue: panelUValue('PU', 100),
    floorUValue: floorUValue('PU', 100),
    ceilingBoundaryTempC: 35,
    floorBoundaryTempC: 20,
    ambientTemp: 35,
    ambientRH: 50,
    sitePressureKpa: 86,
    productTemp: 20,
    productTargetTempC: -18,
    productMass: 5000,
    productCp: 3.2,
    productCpFrozen: 1.8,
    productFreezingPointC: -2,
    productWaterFraction: 0.7,
    loadingTimeHours: 24,
    infiltrationAirflowM3h: 0,
    internalLoadKw: 0,
    defrostHeaterPowerKw: 0,
    designMarginPct: 0,
    blastAirTemp: -35,
    blastAirVelocity: 4.5,
    blastCycleDurationMinutes: 240,
    blastPharmaMode: false,
    holdTargetTemp: 2,
    holdRHPreset: 'general',
    holdRH: 65,
    holdDefrostCyclesPerDay: 4,
    holdDefrostDurationMin: 15,
    holdAirVelocity: 0.2,
    holdRecoveryTimeSec: 75,
    holdFloorClearanceCm: 15,
    holdAirflowClearanceCm: 7,
    freezeStorageTemp: -20,
    freezeRateCHour: 15,
    freezeAirVelocity: 3.0,
    freezeProductThicknessMm: 100,
    freezeBioStorage: false,
  });

  const setPanels = (patch: Partial<Pick<SizingInputs, 'insulationType' | 'wallPanelMm' | 'ceilingPanelMm' | 'floorInsulationMm'>>) => {
    const next = { ...inputs, ...patch };
    setInputs({
      ...next,
      wallUValue: panelUValue(next.insulationType, next.wallPanelMm),
      ceilingUValue: panelUValue(next.insulationType, next.ceilingPanelMm),
      floorUValue: floorUValue(next.insulationType, next.floorInsulationMm),
    });
  };

  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [activeCalculator, setActiveCalculator] = useState<CalculatorTab>('wizard');
  const [selectedRefrigerant, setSelectedRefrigerant] = useState<RefrigerantCode>('R-290');
  const [superheatInputs, setSuperheatInputs] = useState({
    suctionPressure: 3.2,
    suctionTemp: 8,
    liquidTemp: 28,
    liquidPressure: 7.7
  });
  const [leakInputs, setLeakInputs] = useState({
    leakRate: 12,
    refrigerantCode: 'R-32' as RefrigerantCode
  });
  const [converterType, setConverterType] = useState<ConverterType>('temperature');
  const [converterValue, setConverterValue] = useState(25);
  const [converterFrom, setConverterFrom] = useState('C');
  const [converterTo, setConverterTo] = useState('F');

  useEffect(() => {
    const [defaultFrom, defaultTo] = CONVERTER_OPTIONS[converterType].units;
    setConverterFrom(defaultFrom);
    setConverterTo(defaultTo ?? defaultFrom);
  }, [converterType]);

  useEffect(() => {
    setAiAdvice('');
    setSavedAt(null);
  }, [inputs]);

  const handleDownload = async () => {
    // Generate PDF using jsPDF
    const [{ jsPDF }, logoDataUrl] = await Promise.all([
      import('jspdf'),
      loadImageAsDataUrl(PDF_LOGO_PATH),
    ]);

    const doc = new jsPDF();
    const PAGE_WIDTH = doc.internal.pageSize.getWidth();

    const MARGIN_LEFT = 20;
    const INDENT = 25;
    const PAGE_BOTTOM = 280;
    const HEADER_HEIGHT = 36;
    let y = HEADER_HEIGHT + 10;
    let pageNum = 1;

    const drawPageChrome = () => {
      // Slim brand rule + page number, printed on every page
      doc.setFillColor(...PDF_BRAND.secondary);
      doc.rect(0, 0, PAGE_WIDTH, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'normal');
      doc.text(`HEVACRAZ · Page ${pageNum}`, PAGE_WIDTH - 40, 292);
      doc.setTextColor(20);
    };

    const drawTitleBand = () => {
      doc.setFillColor(...PDF_BRAND.primary);
      doc.rect(0, 3, PAGE_WIDTH, HEADER_HEIGHT - 3, 'F');
      const textX = logoDataUrl ? 42 : MARGIN_LEFT;
      if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, 'JPEG', 14, 8, 22, 22); } catch { /* logo optional */ }
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('HEVACRAZ TECHNICAL SIZING REPORT', textX, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_BRAND.secondary);
      doc.text(`HVAC-R Professionals Zimbabwe  ·  Generated ${new Date().toLocaleDateString()}`, textX, 26);
      doc.setTextColor(20);
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > PAGE_BOTTOM) {
        doc.addPage();
        pageNum += 1;
        drawPageChrome();
        y = 20;
      }
    };

    const heading = (text: string) => {
      ensureSpace(18);
      doc.setFillColor(...PDF_BRAND.highlight);
      doc.rect(MARGIN_LEFT, y - 4, 3, 3, 'F');
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_BRAND.primary);
      doc.text(text, MARGIN_LEFT + 6, y);
      y += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20);
    };

    const line = (text: string) => {
      const wrapped: string[] = doc.splitTextToSize(text, PAGE_WIDTH - INDENT - 15);
      wrapped.forEach((part: string, i: number) => {
        ensureSpace(9);
        doc.text(part, i === 0 ? INDENT : INDENT + 4, y);
        y += i === wrapped.length - 1 ? 9 : 6;
      });
    };

    drawPageChrome();
    drawTitleBand();

    // Technician
    heading('Technician');
    line(`Name: ${user?.name || 'Technician'}`);
    y += 5;

    // Job Type & Processing Mode
    heading('Job Configuration');
    line(`Type: ${JobTypeLabels[inputs.jobType as JobType] || 'Cold Room'}`);
    line(`Mode: ${ProcessingModeLabels[inputs.processingMode]}`);

    if (inputs.processingMode === 'BLASTING') {
      line(`Air Temp: ${inputs.blastAirTemp}°C`);
      line(`Air Velocity: ${inputs.blastAirVelocity.toFixed(1)} m/s`);
      line(`Core Target: -18°C`);
      line(`Cycle Duration: ${inputs.blastCycleDurationMinutes} min`);
      if (inputs.blastPharmaMode) line('Pharmaceutical Mode: Active');
    } else if (inputs.processingMode === 'HOLDING') {
      line(`Target Temp: ${inputs.holdTargetTemp}°C`);
      line(`Relative Humidity: ${inputs.holdRH}%`);
      line(`Defrost: ${inputs.holdDefrostCyclesPerDay}x/day, ${inputs.holdDefrostDurationMin} min`);
      line(`Air Velocity: ${inputs.holdAirVelocity.toFixed(2)} m/s`);
      line(`Floor Clearance: ${inputs.holdFloorClearanceCm}cm · Wall Clearance: ${inputs.holdAirflowClearanceCm}cm`);
    } else if (inputs.processingMode === 'FREEZING') {
      line(`Storage Temp: ${inputs.freezeStorageTemp}°C`);
      if (inputs.freezeBioStorage) line('Biological Storage: Active (down to -80°C)');
    }
    y += 5;

    // Room Dimensions
    heading('Room Dimensions');
    line(`Width: ${inputs.roomWidth}m`);
    line(`Length: ${inputs.roomLength}m`);
    line(`Height: ${inputs.roomHeight}m`);
    y += 5;

    // Envelope assumptions
    heading('Envelope & Boundary Conditions');
    line(`Panel type: ${INSULATION_TYPES[inputs.insulationType].label}`);
    line(`Walls: ${inputs.wallPanelMm} mm panel (U ≈ ${inputs.wallUValue.toFixed(3)} W/m²·K)`);
    line(`Ceiling: ${inputs.ceilingPanelMm} mm panel (U ≈ ${inputs.ceilingUValue.toFixed(3)} W/m²·K)`);
    line(`Floor: ${inputs.floorInsulationMm} mm insulation under slab (U ≈ ${inputs.floorUValue.toFixed(3)} W/m²·K)`);
    line(`Ceiling/floor adjacent temperatures: ${inputs.ceilingBoundaryTempC}°C / ${inputs.floorBoundaryTempC}°C`);
    y += 5;

    // Operating Conditions
    heading('Operating Conditions');
    line(`Ambient Temperature: ${inputs.ambientTemp}°C`);
    line(`Room Target Temperature: ${roomTempC}°C`);
    line(`Ambient / room RH: ${inputs.ambientRH}% / ${inputs.holdRH}%`);
    line(`Product: ${inputs.productMass}kg from ${inputs.productTemp}°C to ${inputs.productTargetTempC}°C`);
    line(`Product water fraction: ${(inputs.productWaterFraction * 100).toFixed(0)}%`);
    line(`Infiltration airflow: ${inputs.infiltrationAirflowM3h} m³/h at ${inputs.sitePressureKpa} kPa`);
    line(`Product load period: ${results.productLoadHours.toFixed(2)} hours`);
    y += 5;

    // Calculated Results
    heading('Calculated Results');
    ensureSpace(20);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_BRAND.highlight);
    doc.text(`${results.total.toFixed(2)} kW`, INDENT, y + 6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text('PRELIMINARY AVERAGE LOAD', INDENT, y + 13);
    doc.setTextColor(20);
    doc.setFontSize(11);
    y += 22;
    line(`Transmission: ${results.transmission.toFixed(2)} kW`);
    line(`Product sensible above freezing: ${results.productSensibleAboveFreeze.toFixed(2)} kW`);
    line(`Product latent freezing: ${results.productLatent.toFixed(2)} kW`);
    line(`Product sensible below freezing: ${results.productSensibleBelowFreeze.toFixed(2)} kW`);
    line(`Infiltration (moist-air enthalpy): ${results.infiltration.toFixed(2)} kW`);
    line(`Internal load: ${results.internal.toFixed(2)} kW`);
    line(`Defrost daily average: ${results.defrost.toFixed(2)} kW`);
    line(`Subtotal: ${results.subtotal.toFixed(2)} kW`);
    line(`Explicit design margin (${results.safetyPct.toFixed(0)}%): ${results.safetyMargin.toFixed(2)} kW`);
    y += 5;

    // Transmission detail
    heading('Transmission Load Breakdown');
    line(`Wall area: ${results.wallAreaM2.toFixed(2)} m² · Ceiling and floor area: ${results.floorAreaM2.toFixed(2)} m² each`);
    line(`Walls: ${results.wallAreaM2.toFixed(2)} m² × ${inputs.wallUValue.toFixed(3)} W/m²·K × (${inputs.ambientTemp} − ${roomTempC})°C = ${results.wallTransmission.toFixed(2)} kW`);
    line(`Ceiling: ${results.floorAreaM2.toFixed(2)} m² × ${inputs.ceilingUValue.toFixed(3)} W/m²·K × (${inputs.ceilingBoundaryTempC} − ${roomTempC})°C = ${results.ceilingTransmission.toFixed(2)} kW`);
    line(`Floor: ${results.floorAreaM2.toFixed(2)} m² × ${inputs.floorUValue.toFixed(3)} W/m²·K × (${inputs.floorBoundaryTempC} − ${roomTempC})°C = ${results.floorTransmission.toFixed(2)} kW`);
    line(`Total transmission: ${results.transmission.toFixed(2)} kW (${results.subtotal ? ((results.transmission / results.subtotal) * 100).toFixed(0) : 0}% of the pre-margin subtotal)`);
    line('A surface at or below the room temperature adds no load. U-values are estimated from the panel type and thickness; joints and thermal bridges are not modelled.');
    y += 5;

    if (equipment) {
      const evapTd = equipmentSettings.evaporatorTdK ?? defaultEvaporatorTd(roomTempC);
      heading('Indicative Equipment and Line Sizes');
      line(`Refrigerant: ${equipmentSettings.refrigerant} · ${equipmentSettings.runtimeHoursPerDay} h/day run time · evaporator TD ${evapTd} K · condenser TD ${equipmentSettings.condenserTdK} K`);
      line(`Design point: ${equipment.evaporatingC.toFixed(0)}°C evaporating (${equipment.evaporatingBar.toFixed(1)} bar abs) / ${equipment.condensingC.toFixed(0)}°C condensing (${equipment.condensingBar.toFixed(1)} bar abs), pressure ratio ${equipment.pressureRatio.toFixed(1)}`);
      line(`Required capacity: ${equipment.designCapacityKw.toFixed(1)} kW`);
      line(`Compressor: ${equipment.compressor.sweptVolumeM3h.toFixed(0)} m³/h swept volume, about ${equipment.compressor.electricalKw.toFixed(1)} kW input (COP ${equipment.compressor.cop.toFixed(1)}). ${equipment.compressor.type}`);
      line(`Condenser: ${equipment.condenser.heatRejectionKw.toFixed(1)} kW heat rejection at ${equipmentSettings.condenserTdK} K above ${inputs.ambientTemp}°C ambient`);
      line(`Evaporator: ${equipment.evaporator.capacityKw.toFixed(1)} kW, air flow ${Math.round(equipment.evaporator.airflowM3h)} m³/h (${equipment.evaporator.airDeltaTK} K air drop)`);
      line(`Expansion device: ${equipment.expansion.requiredKw.toFixed(1)} kW (${equipment.expansion.requiredTr.toFixed(1)} TR) needed, typical class ${equipment.expansion.nominalClassTr ?? 'above standard range'} TR. ${equipment.expansion.type}`);
      line(`Copper lines (ACR OD): suction ${equipment.lines.suction.size} (${equipment.lines.suction.velocityMs.toFixed(1)} m/s), discharge ${equipment.lines.discharge.size} (${equipment.lines.discharge.velocityMs.toFixed(1)} m/s), liquid ${equipment.lines.liquid.size} (${equipment.lines.liquid.velocityMs.toFixed(2)} m/s)`);
      equipment.warnings.forEach((w) => line(`Note: ${w}`));
      y += 5;
    }

    heading('Design Limitations');
    line(equipment
      ? 'Equipment and line sizes are indicative first-pass values from estimated refrigerant properties. Lines are sized on velocity only; check pressure drop and oil return for the real route.'
      : 'No compressor, evaporator, expansion-device or line size has been selected by this report.');
    line('Confirm all equipment against manufacturer selection data at the design conditions before ordering.');
    line('Packaging heat, produce respiration, freezing time and peak door/defrost coincidence are not modelled.');
    line('Use verified manufacturer assembly U-values, door/infiltration data, product properties and coincident load schedules.');
    line('The reported load is preliminary; validate the design with a qualified refrigeration engineer.');
    y += 5;

    // Sources
    heading('References & Sources');
    doc.setFontSize(8);
    doc.setTextColor(70);
    SIZING_SOURCES.forEach((source, index) => {
      const referenceLines = doc.splitTextToSize(`${index + 1}. ${source.name} — ${source.description}\n${source.url}`, PAGE_WIDTH - MARGIN_LEFT - 20);
      referenceLines.forEach((referenceLine: string) => {
        ensureSpace(6);
        doc.text(referenceLine, MARGIN_LEFT, y);
        y += 5;
      });
      y += 1;
    });
    doc.setFontSize(8);
    doc.setTextColor(100);
    const noteLines = doc.splitTextToSize(SIZING_REFERENCE_NOTE, PAGE_WIDTH - MARGIN_LEFT - 20);
    noteLines.forEach((noteLine: string) => {
      ensureSpace(6);
      doc.text(noteLine, MARGIN_LEFT, y);
      y += 5;
    });
    doc.setTextColor(0);

    // Footer
    y += 5;
    ensureSpace(10);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text('Generated by HEVACRAZ Digital Toolkit', MARGIN_LEFT, y);
    doc.setTextColor(20);

    // AI Advice if available
    if (aiAdvice) {
      doc.addPage();
      pageNum += 1;
      drawPageChrome();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_BRAND.primary);
      doc.text('AI Technical Advice', 20, 20);
      doc.setTextColor(20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const splitText = doc.splitTextToSize(aiAdvice, 170);
      doc.text(splitText, 20, 35);
    }

    // Save
    doc.save(`HEVACRAZ_Sizing_Report_${Date.now()}.pdf`);
  };

  const saveSizingCase = () => {
    if (sizingInputIssues.length > 0) return;
    const entry = { id: crypto.randomUUID(), savedAt: new Date().toISOString(), inputs, calculatedLoadKw: results.total };
    const existing = JSON.parse(localStorage.getItem('hevacraz-sizing-cases') ?? '[]') as unknown[];
    localStorage.setItem('hevacraz-sizing-cases', JSON.stringify([entry, ...existing].slice(0, 20)));
    setSavedAt(entry.savedAt);
  };

  const isHolding = inputs.processingMode === 'HOLDING';
  const isBlasting = inputs.processingMode === 'BLASTING';
  const roomTempC = isHolding ? inputs.holdTargetTemp : isBlasting ? inputs.blastAirTemp : inputs.freezeStorageTemp;

  const sizingInputIssues = [
    ...(Object.values(inputs).some((value) => typeof value === 'number' && !Number.isFinite(value))
      ? ['Every numeric input must be finite.'] : []),
    ...(['roomWidth', 'roomLength', 'roomHeight', 'wallUValue', 'ceilingUValue', 'floorUValue', 'sitePressureKpa', 'productCp', 'productCpFrozen'] as const)
      .filter((key) => inputs[key] <= 0)
      .map((key) => `${key} must be greater than zero.`),
    ...(['productMass', 'infiltrationAirflowM3h', 'internalLoadKw', 'defrostHeaterPowerKw'] as const)
      .filter((key) => !Number.isFinite(inputs[key]) || inputs[key] < 0)
      .map((key) => `${key} must be zero or greater.`),
    ...(inputs.productTargetTempC > inputs.productTemp ? ['Final product temperature cannot be warmer than its entering temperature for a cooling load.'] : []),
    ...(inputs.productWaterFraction < 0 || inputs.productWaterFraction > 1 ? ['Product water fraction must be between 0 and 1.'] : []),
    ...([['Ambient relative humidity', inputs.ambientRH], ['Room relative humidity', inputs.holdRH]] as const)
      .filter(([, value]) => value < 0 || value > 100)
      .map(([label]) => `${label} must be between 0% and 100%.`),
    ...(inputs.sitePressureKpa < 60 || inputs.sitePressureKpa > 110 ? ['Site pressure must be between 60 and 110 kPa.'] : []),
    ...(inputs.productFreezingPointC < -30 || inputs.productFreezingPointC > 5 ? ['Product freezing point must be between -30°C and 5°C.'] : []),
    ...(inputs.designMarginPct < 0 || inputs.designMarginPct > 100 ? ['Design margin must be between 0% and 100%; use 0% unless an engineer specifies otherwise.'] : []),
    ...(inputs.holdDefrostCyclesPerDay < 0 || inputs.holdDefrostDurationMin < 0 ? ['Defrost cycles and duration cannot be negative.'] : []),
    ...(!isBlasting && inputs.loadingTimeHours <= 0 ? ['Product load period must be greater than zero.'] : []),
    ...(isBlasting && inputs.blastCycleDurationMinutes <= 0 ? ['Blast-cycle duration must be greater than zero.'] : []),
  ];
  const sizingInputsValid = sizingInputIssues.length === 0;

  const results = useMemo(() => {
    if (!sizingInputsValid) {
      return {
        wallAreaM2: 0, floorAreaM2: 0,
        transmission: 0, wallTransmission: 0, ceilingTransmission: 0, floorTransmission: 0,
        product: 0, productSensibleAboveFreeze: 0, productLatent: 0, productSensibleBelowFreeze: 0,
        infiltration: 0, outdoorAirEnthalpy: 0, roomAirEnthalpy: 0, dryAirMassFlow: 0,
        defrost: 0, internal: 0, subtotal: 0, total: 0, safetyMargin: 0, safetyPct: 0,
        productEnergyKjKg: 0, productLoadHours: 0, isHolding, isFreezing: inputs.processingMode === 'FREEZING',
        isBlasting, roomTempC,
      };
    }
    const productLoadHours = isBlasting ? inputs.blastCycleDurationMinutes / 60 : inputs.loadingTimeHours;
    const load = calculateCoolingLoads({
      roomWidth: inputs.roomWidth,
      roomLength: inputs.roomLength,
      roomHeight: inputs.roomHeight,
      wallUValue: inputs.wallUValue,
      ceilingUValue: inputs.ceilingUValue,
      floorUValue: inputs.floorUValue,
      ambientTemp: inputs.ambientTemp,
      ceilingBoundaryTempC: inputs.ceilingBoundaryTempC,
      floorBoundaryTempC: inputs.floorBoundaryTempC,
      roomTempC,
      ambientRH: inputs.ambientRH,
      roomRH: inputs.holdRH,
      sitePressureKpa: inputs.sitePressureKpa,
      infiltrationAirflowM3h: inputs.infiltrationAirflowM3h,
      productMass: inputs.productMass,
      productTemp: inputs.productTemp,
      productTargetTempC: inputs.productTargetTempC,
      productCp: inputs.productCp,
      productCpFrozen: inputs.productCpFrozen,
      productFreezingPointC: inputs.productFreezingPointC,
      productWaterFraction: inputs.productWaterFraction,
      productLoadHours,
      internalLoadKw: inputs.internalLoadKw,
      defrostHeaterPowerKw: inputs.defrostHeaterPowerKw,
      defrostDurationMin: inputs.holdDefrostDurationMin,
      defrostCyclesPerDay: inputs.holdDefrostCyclesPerDay,
      designMarginPct: inputs.designMarginPct,
    });
    return {
      wallAreaM2: load.wallAreaM2,
      floorAreaM2: load.floorAreaM2,
      transmission: load.transmissionKw,
      wallTransmission: load.wallTransmissionKw,
      ceilingTransmission: load.ceilingTransmissionKw,
      floorTransmission: load.floorTransmissionKw,
      product: load.productKw,
      productSensibleAboveFreeze: load.productSensibleAboveFreezeKw,
      productLatent: load.productLatentKw,
      productSensibleBelowFreeze: load.productSensibleBelowFreezeKw,
      infiltration: load.infiltrationKw,
      outdoorAirEnthalpy: load.outdoorAirEnthalpyKjKg,
      roomAirEnthalpy: load.roomAirEnthalpyKjKg,
      dryAirMassFlow: load.dryAirMassFlowKgS,
      defrost: load.defrostKw,
      internal: load.internalKw,
      subtotal: load.subtotalKw,
      total: load.totalKw,
      safetyMargin: load.designMarginKw,
      safetyPct: load.designMarginPct,
      productEnergyKjKg: load.productEnergyKjKg,
      productLoadHours: load.productLoadHours,
      isHolding,
      isFreezing: inputs.processingMode === 'FREEZING',
      isBlasting,
      roomTempC,
    };
  }, [inputs, isBlasting, isHolding, roomTempC, sizingInputsValid]);

  const [equipmentSettings, setEquipmentSettings] = useState<EquipmentSettings>(() => defaultEquipmentSettings(roomTempC));
  const equipment = useMemo(
    () => computeSelection(equipmentSettings, results.total, roomTempC, inputs.ambientTemp),
    [equipmentSettings, results.total, roomTempC, inputs.ambientTemp],
  );

  const liveEstimate = (
    <div className="border border-blue-200 bg-blue-50 px-4 py-2 lg:p-4" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Live estimate</p>
      {sizingInputsValid ? (
        <>
          <p className="mt-1 text-2xl font-bold text-blue-900 lg:text-3xl">{results.total.toFixed(2)} kW</p>
          <p className="text-xs text-blue-800">Preliminary average load, including {results.safetyPct.toFixed(0)}% margin</p>
          {equipment && (
            <p className="mt-2 hidden text-xs text-blue-900 lg:block">
              Compressor {equipment.compressor.sweptVolumeM3h.toFixed(0)} m³/h · suction {equipment.lines.suction.size} · liquid {equipment.lines.liquid.size}
              <span className="block text-blue-700">{equipmentSettings.refrigerant}, see Summary step for details</span>
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-sm text-rose-800">Correct the highlighted inputs to see an estimate.</p>
      )}
    </div>
  );

  const handleAiConsult = async () => {
    if (!sizingInputsValid) return;
    setIsLoadingAi(true);
    const prompt = `Review this commercial refrigeration sizing design for a ${JobTypeLabels[inputs.jobType as JobType] || 'Cold Room'}:
    Room: ${inputs.roomWidth}x${inputs.roomLength}x${inputs.roomHeight}m
    Envelope: ${INSULATION_TYPES[inputs.insulationType].label}, walls ${inputs.wallPanelMm} mm, ceiling ${inputs.ceilingPanelMm} mm, floor insulation ${inputs.floorInsulationMm} mm (estimated U-values ${inputs.wallUValue.toFixed(3)} / ${inputs.ceilingUValue.toFixed(3)} / ${inputs.floorUValue.toFixed(3)} W/m²·K).
    Product: ${inputs.productMass}kg, ${inputs.productTemp}C entering to ${inputs.productTargetTempC}C, estimated product energy ${results.productEnergyKjKg.toFixed(1)} kJ/kg.
    Ambient: ${inputs.ambientTemp}C / ${inputs.ambientRH}% RH; room: ${roomTempC}C / ${inputs.holdRH}% RH; infiltration airflow ${inputs.infiltrationAirflowM3h} m3/h.
    Calculated preliminary average load: ${results.total.toFixed(2)}kW (subtotal ${results.subtotal.toFixed(2)} kW plus explicit ${inputs.designMarginPct}% design margin).
    Do not select or verify compressor, evaporator, expansion device, or line sizes from this information (the app shows separate indicative sizes). Identify missing design inputs and explain that manufacturer selection at specified evaporating/condensing conditions is required.
    Please provide:
    1. Check the arithmetic and assumptions in this preliminary load breakdown.
    2. List missing data and uncertainty that could materially change the result.
    3. Provide a short engineer's verification checklist. Do not invent equipment selections or certify code compliance.`;
    
    try {
      const res = await fetch('/api/sizing-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      setAiAdvice(res.ok ? (data.advice ?? '') : (data.error ?? 'Technical assistant unavailable.'));
    } catch {
      setAiAdvice('Technical assistant unavailable. Please check your network connection.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const steps = [
    { num: 1, label: 'Dimensions' },
    { num: 2, label: 'Conditions' },
    { num: 3, label: 'Summary' }
  ];

  const saturationTempLow = useMemo(
    () => interpolateTempFromPressure(PT_CURVES[selectedRefrigerant], superheatInputs.suctionPressure),
    [selectedRefrigerant, superheatInputs.suctionPressure]
  );

  const saturationTempHigh = useMemo(
    () => interpolateTempFromPressure(PT_CURVES[selectedRefrigerant], superheatInputs.liquidPressure),
    [selectedRefrigerant, superheatInputs.liquidPressure]
  );

  const superheatValue = Number((superheatInputs.suctionTemp - saturationTempLow).toFixed(1));
  const subcoolingValue = Number((saturationTempHigh - superheatInputs.liquidTemp).toFixed(1));

  const superheatStatus =
    superheatValue < 5 ? 'Low' : superheatValue > 12 ? 'High' : 'Optimal';
  const subcoolingStatus =
    subcoolingValue < 3 ? 'Low' : subcoolingValue > 10 ? 'High' : 'Optimal';

  const leakEquivalent = useMemo(() => {
    const refrigerant = REFRIGERANT_REFERENCE[leakInputs.refrigerantCode];
    const co2eq = (leakInputs.leakRate * refrigerant.gwp) / 1000;
    const carJourneys = Math.round(co2eq * 245);
    return {
      co2eq: Number(co2eq.toFixed(2)),
      carJourneys,
      refrigerant
    };
  }, [leakInputs]);

  const convertedValue = useMemo(
    () => convertValue(converterValue, converterType, converterFrom, converterTo),
    [converterFrom, converterTo, converterType, converterValue]
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 sm:space-y-8 lg:pb-0">
      <div className="border border-gray-200 bg-white p-2 shadow-sm sm:p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-5">
          {[
            { id: 'wizard', label: 'Cooling Load Wizard', icon: Calculator },
            { id: 'superheat', label: 'Superheat & Subcooling', icon: Thermometer },
            { id: 'pt-chart', label: 'P-T Chart', icon: Gauge },
            { id: 'leak-rate', label: 'Leak Rate & CO2-eq', icon: Droplets },
            { id: 'converter', label: 'Unit Converter', icon: ArrowUpDown },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCalculator === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCalculator(tab.id as CalculatorTab)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-all sm:shrink ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="note" className="flex gap-3 border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 sm:p-4 sm:text-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Preliminary load estimate only.</strong> Results depend on the panel type and thickness, airflow, humidity and product data. Equipment and pipe sizes are indicative only and do not replace manufacturer selection, a site survey or a qualified design review.</p>
      </div>

      {activeCalculator === 'wizard' ? (
        <>
      {sizingInputIssues.length > 0 && (
        <div role="alert" className="border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Correct the sizing inputs before using this estimate.</p>
          <ul className="mt-2 list-inside list-disc">{sizingInputIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
        </div>
      )}
      {/* Step Indicator */}
      <p className="text-center text-sm font-semibold text-blue-700 sm:hidden" aria-live="polite">Step {step} of {steps.length}: {steps[step - 1].label}</p>
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className={`flex items-center gap-2 ${step >= s.num ? 'text-blue-600' : 'text-gray-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-colors ${
                  step >= s.num ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}>
                  {s.num}
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 sm:w-12 h-0.5 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="sticky top-14 z-20 lg:hidden">{liveEstimate}</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div key={step} className="sizing-step-enter bg-white p-4 sm:p-8 border border-gray-200 shadow-sm">
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100">
                    <Snowflake className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Job Type & Dimensions</h3>
                </div>
                
                {/* Job Type Selection */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-gray-700">Select Job Type</label>
                  <HelpNote>Job type is a report label and preset only; the load is calculated from explicit dimensions, boundary conditions, product, airflow and internal-load inputs. No hidden job-type multipliers are applied.</HelpNote>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(JobTypeLabels) as JobType[]).map((type) => (
                      <button 
                        key={type}
                        onClick={() => {
                          const defaults = JobTypeDefaults[type];
                          setInputs({
                            ...inputs, 
                            jobType: type,
                            productTargetTempC: inputs.processingMode === 'HOLDING' ? defaults.targetTemp : inputs.productTargetTempC,
                            ...(inputs.processingMode === 'HOLDING' ? { holdTargetTemp: defaults.targetTemp } : {}),
                            ...(inputs.processingMode === 'BLASTING' ? { blastAirTemp: defaults.targetTemp } : {}),
                            ...(inputs.processingMode === 'FREEZING' && defaults.targetTemp <= 0 ? { freezeStorageTemp: defaults.targetTemp } : {}),
                            loadingTimeHours: defaults.defaultLoadingTime
                          });
                        }}
                        className={`p-4 border-2 text-sm font-semibold transition-all ${
                          inputs.jobType === type 
                            ? 'border-blue-600 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <img 
                            src={JobTypeImages[type]} 
                            alt={JobTypeLabels[type]} 
                            className="w-full h-24 object-cover "
                          />
                          <div className="text-center w-full">
                            <div className="flex items-center justify-center gap-1 font-semibold">
                              {JobTypeLabels[type]}
                            </div>
                            <p className="text-xs mt-1 opacity-70">{JobTypeDescriptions[type]}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Processing Mode Selection */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <label className="text-sm font-semibold text-gray-700">
                    Processing Mode
                    <span className="ml-2 text-xs font-normal text-gray-400">Freezer / Holding · Blast Freezing · Holding / Storage</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(Object.keys(ProcessingModeLabels) as ProcessingMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setInputs({
                            ...inputs,
                            processingMode: mode,
                            // Keep room setpoint and product end temperature aligned to the selected process.
                            holdTargetTemp: mode === 'HOLDING' ? 2 : inputs.holdTargetTemp,
                            blastAirTemp: mode === 'BLASTING' ? -35 : inputs.blastAirTemp,
                            freezeStorageTemp: mode === 'FREEZING' ? -18 : inputs.freezeStorageTemp,
                            productTargetTempC: mode === 'HOLDING' ? 2 : -18,
                            loadingTimeHours: mode === 'BLASTING' ? 4 : mode === 'FREEZING' ? 12 : mode === 'HOLDING' ? 24 : inputs.loadingTimeHours,
                          });
                        }}
                        className={`p-4 border-2 text-sm font-semibold transition-all ${
                          inputs.processingMode === mode
                            ? mode === 'BLASTING'
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : mode === 'FREEZING'
                                ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                                : 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg">
                            {mode === 'BLASTING' ? '❄️' : mode === 'FREEZING' ? '🧊' : '📦'}
                          </span>
                          <span className="font-semibold">{ProcessingModeLabels[mode]}</span>
                          <span className="text-xs opacity-70 leading-tight mt-0.5">{ProcessingModeDescriptions[mode]}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blasting Parameter Panel */}
                {inputs.processingMode === 'BLASTING' && (
                  <div className="p-5 border-2 border-blue-200 bg-blue-50/50 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">❄️</span>
                      <h4 className="text-sm font-bold text-blue-900">Blast Freezer / Holding Parameters</h4>
                    </div>
                    <HelpNote>Blast-air temperature and cycle duration feed this load estimate. Air velocity is recorded for process context only; this tool does not calculate product core freezing time.</HelpNote>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                          Air Temperature
                          <span className="block font-normal normal-case text-blue-600">(industrial: -30°C to -40°C)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={inputs.blastPharmaMode ? -120 : -65}
                            max="-25"
                            step="1"
                            value={inputs.blastAirTemp}
                            onChange={(e) => setInputs({ ...inputs, blastAirTemp: Number(e.target.value) })}
                            className="flex-1 accent-blue-600"
                          />
                          <span className="text-sm font-bold text-blue-800 min-w-[4.5rem] shrink-0 whitespace-nowrap text-right">{inputs.blastAirTemp}°C</span>
                        </div>
                        <div className="flex justify-between text-xs text-blue-500">
                          <span>{inputs.blastPharmaMode ? '-120°C' : '-65°C'}</span>
                          <span>{inputs.blastPharmaMode ? '(pharma range)' : '(industrial)'}</span>
                          <span>-25°C</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                          Air Velocity
                          <span className="block font-normal normal-case text-blue-600">(3.0 - 6.0 m/s)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={inputs.blastAirVelocity}
                          onChange={(e) => setInputs({ ...inputs, blastAirVelocity: Number(e.target.value) })}
                          className="w-full border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                          Cycle Duration
                          <span className="block font-normal normal-case text-blue-600">(max 240 min)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="30"
                            max="240"
                            step="5"
                            value={inputs.blastCycleDurationMinutes}
                            onChange={(e) => {
                              const minutes = Number(e.target.value);
                              setInputs({ ...inputs, blastCycleDurationMinutes: minutes, loadingTimeHours: minutes / 60 });
                            }}
                            className="flex-1 accent-blue-600" />
                          <span className="text-sm font-bold text-blue-800 min-w-[4.5rem] shrink-0 whitespace-nowrap text-right">{inputs.blastCycleDurationMinutes} min</span>
                        </div>
                        <div className="flex justify-between text-xs text-blue-500">
                          <span>30 min</span>
                          <span>240 min</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                          Target Core Temperature
                        </label>
                        <div className="min-h-[42px] flex flex-wrap items-center px-3 py-2 border border-blue-200 bg-white">
                          <span className="text-sm font-bold text-blue-900">{inputs.productTargetTempC}°C</span>
                          <span className="ml-2 text-xs text-blue-500">(set the required product endpoint below)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inputs.blastPharmaMode}
                          onChange={(e) => {
                            setInputs({
                              ...inputs,
                              blastPharmaMode: e.target.checked,
                              blastAirTemp: e.target.checked ? -80 : -35,
                            });
                          }}
                          className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-semibold text-blue-800">
                          Pharmaceutical mode
                          <span className="ml-1 font-normal text-blue-500">(-65°C to -120°C)</span>
                        </span>
                      </label>
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1">
                        <span>⚠️</span>
                        <span>Use the product specification and verified process limit; no core-time estimate is made here.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Holding Parameter Panel */}
                {inputs.processingMode === 'HOLDING' && (
                  <div className="p-5 border-2 border-emerald-200 bg-emerald-50/50 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <h4 className="text-sm font-bold text-emerald-900">Holding / Storage Parameters</h4>
                    </div>
                    <HelpNote>Room humidity feeds the infiltration enthalpy calculation. Enter airflow directly in the Conditions step; door recovery time and air velocity are not used as airflow proxies.</HelpNote>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                          Target Air Temperature
                          <span className="block font-normal normal-case text-emerald-600">(1°C to 3.3°C)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="8"
                          step="0.1"
                          value={inputs.holdTargetTemp}
                          onChange={(e) => setInputs({ ...inputs, holdTargetTemp: Number(e.target.value) })}
                          className="w-full border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1">
                          ⚠️ Max allowable: 4°C — above this enters the Danger Zone
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                          Relative Humidity
                          <span className="block font-normal normal-case text-emerald-600">(60-75% general / 85-90% meat-produce)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="40"
                            max="95"
                            step="1"
                            value={inputs.holdRH}
                            onChange={(e) => setInputs({ ...inputs, holdRH: Number(e.target.value) })}
                            className="flex-1 accent-emerald-600"
                          />
                          <span className="text-sm font-bold text-emerald-800 w-12 text-right">{inputs.holdRH}%</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setInputs({ ...inputs, holdRH: 65, holdRHPreset: 'general' })}
                            className={`px-2 py-1 text-xs font-semibold border transition-all ${
                              inputs.holdRHPreset === 'general'
                                ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            General (65%)
                          </button>
                          <button
                            onClick={() => setInputs({ ...inputs, holdRH: 88, holdRHPreset: 'meat-produce' })}
                            className={`px-2 py-1 text-xs font-semibold border transition-all ${
                              inputs.holdRHPreset === 'meat-produce'
                                ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            Meat/Produce (88%)
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                          Defrost Cycles
                          <span className="block font-normal normal-case text-emerald-600">(4-6x/day, 15-20 min)</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs text-emerald-600 block">Cycles per day</span>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              step="1"
                              value={inputs.holdDefrostCyclesPerDay}
                              onChange={(e) => setInputs({ ...inputs, holdDefrostCyclesPerDay: Number(e.target.value) })}
                              className="w-full border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-emerald-600 block">Duration (min)</span>
                            <input
                              type="number"
                              min="5"
                              max="45"
                              step="5"
                              value={inputs.holdDefrostDurationMin}
                              onChange={(e) => setInputs({ ...inputs, holdDefrostDurationMin: Number(e.target.value) })}
                              className="w-full border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                          Air Velocity
                          <span className="block font-normal normal-case text-emerald-600">(0.1 - 0.3 m/s)</span>
                        </label>
                        <input
                          type="number"
                          min="0.05"
                          max="1.0"
                          step="0.05"
                          value={inputs.holdAirVelocity}
                          onChange={(e) => setInputs({ ...inputs, holdAirVelocity: Number(e.target.value) })}
                          className="w-full border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="text-xs text-emerald-600">High airflow dries out uncovered products</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                          Recovery Time
                          <span className="block font-normal normal-case text-emerald-600">(60-90 sec after door opening)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="30"
                            max="180"
                            step="5"
                            value={inputs.holdRecoveryTimeSec}
                            onChange={(e) => setInputs({ ...inputs, holdRecoveryTimeSec: Number(e.target.value) })}
                            className="flex-1 accent-emerald-600"
                          />
                          <span className="text-sm font-bold text-emerald-800 min-w-[4.5rem] shrink-0 whitespace-nowrap text-right">{inputs.holdRecoveryTimeSec}s</span>
                        </div>
                        <div className="flex justify-between text-xs text-emerald-500">
                          <span>30s</span>
                          <span>90s (standard)</span>
                          <span>180s</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                          Airflow Clearance Rules
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-3 py-2 bg-white border border-emerald-200">
                            <span className="text-xs text-emerald-700">Floor clearance</span>
                            <span className="text-sm font-bold text-emerald-900">{inputs.holdFloorClearanceCm} cm</span>
                          </div>
                          <div className="flex items-center justify-between px-3 py-2 bg-white border border-emerald-200">
                            <span className="text-xs text-emerald-700">Wall/fan clearance</span>
                            <span className="text-sm font-bold text-emerald-900">{inputs.holdAirflowClearanceCm} cm</span>
                          </div>
                          <div className="text-xs text-emerald-600 px-1">
                            15 cm min from floor · 5-10 cm from back wall
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100/50 px-3 py-2">
                      <span>ℹ️</span>
                      <span>Holding fridges maintain already-cold inventory — not designed to cool hot food down</span>
                    </div>
                  </div>
                )}

                {/* Freezing Parameter Panel */}
                {inputs.processingMode === 'FREEZING' && (
                  <div className="p-5 border-2 border-cyan-200 bg-cyan-50/50 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧊</span>
                      <h4 className="text-sm font-bold text-cyan-900">Freezing Parameters</h4>
                    </div>
                    <HelpNote>Storage setpoint affects envelope load. The rate, air velocity and thickness controls are not used to predict freezing time; no time estimate is presented.</HelpNote>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">
                          Storage Temperature
                          <span className="block font-normal normal-case text-cyan-600">(-18°C to -25°C)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={inputs.freezeBioStorage ? -80 : -30}
                            max="-15"
                            step="1"
                            value={inputs.freezeStorageTemp}
                            onChange={(e) => setInputs({ ...inputs, freezeStorageTemp: Number(e.target.value) })}
                            className="flex-1 accent-cyan-600"
                          />
                          <span className="text-sm font-bold text-cyan-800 min-w-[4.5rem] shrink-0 whitespace-nowrap text-right">{inputs.freezeStorageTemp}°C</span>
                        </div>
                        <div className="flex justify-between text-xs text-cyan-500">
                          <span>{inputs.freezeBioStorage ? '-80°C' : '-30°C'}</span>
                          <span>{inputs.freezeBioStorage ? '(biological storage)' : '(standard)'}</span>
                          <span>-15°C</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={inputs.freezeBioStorage}
                            onChange={(e) => {
                              setInputs({
                                ...inputs,
                                freezeBioStorage: e.target.checked,
                                freezeStorageTemp: e.target.checked ? -60 : -20,
                              });
                            }}
                            className="w-4 h-4 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
                          />
                          <span className="text-xs font-semibold text-cyan-800">
                            Biological / medical storage
                            <span className="ml-1 font-normal text-cyan-500">(down to -80°C)</span>
                          </span>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">
                          Freezing Rate
                          <span className="block font-normal normal-case text-cyan-600">(blast: 5-30°C/hr)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="1"
                            max="30"
                            step="1"
                            value={inputs.freezeRateCHour}
                            onChange={(e) => setInputs({ ...inputs, freezeRateCHour: Number(e.target.value) })}
                            className="flex-1 accent-cyan-600"
                          />
                          <span className="text-sm font-bold text-cyan-800 min-w-[4.5rem] shrink-0 whitespace-nowrap text-right">{inputs.freezeRateCHour}°C/hr</span>
                        </div>
                        <div className="flex justify-between text-xs text-cyan-500">
                          <span>1°C/hr (slow)</span>
                          <span>5-30°C/hr (blast)</span>
                          <span>30°C/hr</span>
                        </div>
                        <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 mt-1">
                          ⚠️ Critical zone (-1°C to -5°C): pass through as fast as possible to prevent large ice crystals
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">
                          Air Velocity
                          <span className="block font-normal normal-case text-cyan-600">(1.5 - 6.0 m/s)</span>
                        </label>
                        <input
                          type="number"
                          min="0.5"
                          max="10"
                          step="0.5"
                          value={inputs.freezeAirVelocity}
                          onChange={(e) => setInputs({ ...inputs, freezeAirVelocity: Number(e.target.value) })}
                          className="w-full border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-cyan-900 outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">
                          Product Thickness
                          <span className="block font-normal normal-case text-cyan-600">(max 150 mm)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="10"
                            max="250"
                            step="5"
                            value={inputs.freezeProductThicknessMm}
                            onChange={(e) => setInputs({ ...inputs, freezeProductThicknessMm: Number(e.target.value) })}
                            className="flex-1 accent-cyan-600"
                          />
                          <span className="text-sm font-bold text-cyan-800 min-w-[4.5rem] shrink-0 whitespace-nowrap text-right">{inputs.freezeProductThicknessMm} mm</span>
                        </div>
                        <div className="flex justify-between text-xs text-cyan-500">
                          <span>10 mm</span>
                          <span>150 mm (max block)</span>
                          <span>250 mm</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs text-cyan-700 bg-cyan-100/50 px-3 py-2">
                        <span>ℹ️</span>
                        <span>Thicker items need lower freezing rate to avoid core freeze delay</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-cyan-700 bg-cyan-100/50 px-3 py-2">
                        <span>ℹ️</span>
                        <span>Target core temp: -18°C (universal standard for safe long-term preservation)</span>
                      </div>
                    </div>
                  </div>
                )}

                <HelpNote>Air velocity, recovery-time and clearance controls above are operational guidance only; they do not alter the calculated kW. Freezing-time prediction is intentionally omitted until product geometry and heat-transfer data are available.</HelpNote>

                <div className="grid grid-cols-3 gap-4">
                  <InputGroup label="Width (m)" value={inputs.roomWidth} min={0.1} onChange={(v: number) => setInputs({...inputs, roomWidth: v})} />
                  <InputGroup label="Length (m)" value={inputs.roomLength} min={0.1} onChange={(v: number) => setInputs({...inputs, roomLength: v})} />
                  <InputGroup label="Height (m)" value={inputs.roomHeight} min={0.1} onChange={(v: number) => setInputs({...inputs, roomHeight: v})} />
                </div>
                
                <div className="space-y-4 border-t border-gray-100 pt-5">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">Envelope heat transfer</h4>
                    <HelpNote>Choose the panel type and enter the panel thickness in millimetres, as written on the panel or the quote (common sizes: 75, 100, 150 mm). The tool works out the U-value from that. Put 0 for the floor if the slab has no insulation.</HelpNote>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Panel type</label>
                    <select
                      value={inputs.insulationType}
                      onChange={(e) => setPanels({ insulationType: e.target.value as InsulationType })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                      {(Object.keys(INSULATION_TYPES) as InsulationType[]).map((type) => (
                        <option key={type} value={type}>{INSULATION_TYPES[type].label}</option>
                      ))}
                    </select>
                  </div>
                  <datalist id="panel-thicknesses">
                    {COMMON_PANEL_THICKNESSES_MM.map((mm) => <option key={mm} value={mm} />)}
                  </datalist>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <ThicknessInput label="Wall panel (mm)" value={inputs.wallPanelMm} min={1} uValue={inputs.wallUValue} onChange={(v) => setPanels({ wallPanelMm: v })} />
                    <ThicknessInput label="Ceiling panel (mm)" value={inputs.ceilingPanelMm} min={1} uValue={inputs.ceilingUValue} onChange={(v) => setPanels({ ceilingPanelMm: v })} />
                    <ThicknessInput label="Floor insulation (mm)" value={inputs.floorInsulationMm} min={0} uValue={inputs.floorUValue} onChange={(v) => setPanels({ floorInsulationMm: v })} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputGroup label="Ceiling adjacent temp (°C)" value={inputs.ceilingBoundaryTempC} onChange={(v) => setInputs({ ...inputs, ceilingBoundaryTempC: v })} />
                    <InputGroup label="Floor/ground temp (°C)" value={inputs.floorBoundaryTempC} onChange={(v) => setInputs({ ...inputs, floorBoundaryTempC: v })} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100">
                    <Thermometer className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Operating Conditions</h3>
                </div>
                <div className="space-y-5">
                  <section className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800">Room air & infiltration</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InputGroup label="Outdoor air temp (°C)" value={inputs.ambientTemp} onChange={(v) => setInputs({ ...inputs, ambientTemp: v })} />
                      <InputGroup label="Room air target (°C)" value={roomTempC} onChange={(v) => setInputs({ ...inputs, ...(isHolding ? { holdTargetTemp: v } : isBlasting ? { blastAirTemp: v } : { freezeStorageTemp: v }) })} />
                      <InputGroup label="Outdoor relative humidity (%)" value={inputs.ambientRH} min={0} onChange={(v) => setInputs({ ...inputs, ambientRH: v })} />
                      <InputGroup label="Room relative humidity (%)" value={inputs.holdRH} min={0} onChange={(v) => setInputs({ ...inputs, holdRH: v })} />
                      <InputGroup label="Infiltration airflow (m³/h)" value={inputs.infiltrationAirflowM3h} min={0} onChange={(v) => setInputs({ ...inputs, infiltrationAirflowM3h: v })} />
                      <InputGroup label="Site pressure (kPa)" value={inputs.sitePressureKpa} min={60} onChange={(v) => setInputs({ ...inputs, sitePressureKpa: v })} />
                    </div>
                    <HelpNote>Use a measured/design airflow or calculate it from door dimensions and traffic. Zero means the estimate assumes no incoming air. Pressure defaults to an approximate Harare value; adjust for the actual site elevation.</HelpNote>
                  </section>

                  <section className="space-y-3 border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-800">Product batch</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InputGroup label="Entering product temp (°C)" value={inputs.productTemp} onChange={(v) => setInputs({ ...inputs, productTemp: v })} />
                      <InputGroup label="Final product temp (°C)" value={inputs.productTargetTempC} onChange={(v) => setInputs({ ...inputs, productTargetTempC: v })} />
                      <InputGroup label="Batch mass (kg)" value={inputs.productMass} min={0} onChange={(v) => setInputs({ ...inputs, productMass: v })} />
                      <InputGroup label="Batch pull-down time (h)" value={isBlasting ? inputs.blastCycleDurationMinutes / 60 : inputs.loadingTimeHours} min={0.1} onChange={(v) => setInputs({ ...inputs, loadingTimeHours: v, ...(isBlasting ? { blastCycleDurationMinutes: v * 60 } : {}) })} />
                      <InputGroup label="Cp above freezing (kJ/kg·K)" value={inputs.productCp} min={0.01} onChange={(v) => setInputs({ ...inputs, productCp: v })} />
                      <InputGroup label="Product freezing point (°C)" value={inputs.productFreezingPointC} onChange={(v) => setInputs({ ...inputs, productFreezingPointC: v })} />
                      <InputGroup label="Water fraction (0–1)" value={inputs.productWaterFraction} min={0} onChange={(v) => setInputs({ ...inputs, productWaterFraction: v })} />
                      <InputGroup label="Cp below freezing (kJ/kg·K)" value={inputs.productCpFrozen} min={0.01} onChange={(v) => setInputs({ ...inputs, productCpFrozen: v })} />
                    </div>
                    <HelpNote>Replace the example food properties with product-specific data. Latent heat is estimated as water fraction × 333.55 kJ/kg and is included only when the product temperature crosses its freezing point. Packaging heat and produce respiration are not included.</HelpNote>
                  </section>

                  <section className="space-y-3 border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-800">Other average loads</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InputGroup label="Internal equipment / lights / people (kW)" value={inputs.internalLoadKw} min={0} onChange={(v) => setInputs({ ...inputs, internalLoadKw: v })} />
                      <InputGroup label="Defrost heater input power (kW)" value={inputs.defrostHeaterPowerKw} min={0} onChange={(v) => setInputs({ ...inputs, defrostHeaterPowerKw: v })} />
                      <InputGroup label="Defrost cycles per day" value={inputs.holdDefrostCyclesPerDay} min={0} onChange={(v) => setInputs({ ...inputs, holdDefrostCyclesPerDay: v })} />
                      <InputGroup label="Defrost duration per cycle (min)" value={inputs.holdDefrostDurationMin} min={0} onChange={(v) => setInputs({ ...inputs, holdDefrostDurationMin: v })} />
                      <InputGroup label="Explicit design margin (%)" value={inputs.designMarginPct} min={0} onChange={(v) => setInputs({ ...inputs, designMarginPct: v })} />
                    </div>
                    <HelpNote>These are explicit inputs rather than room-area guesses. Defrost is shown as a daily-average load and assumes all heater electricity ultimately becomes refrigeration load. Margin defaults to zero; only enter a margin specified by the responsible designer.</HelpNote>
                  </section>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {/* Results Card */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900 p-4 text-white sm:flex-nowrap sm:gap-6 sm:p-6">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 break-words text-sm font-medium text-gray-400">{JobTypeLabels[inputs.jobType as JobType] || 'Cold Room'} - Preliminary Average Cooling Load</p>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-4xl font-bold text-blue-400 sm:text-5xl">{results.total.toFixed(2)}</span>
                      <span className="text-lg font-medium text-gray-400">kW</span>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gray-700 bg-gray-800 sm:h-14 sm:w-14">
                    <Thermometer className="h-5 w-5 text-blue-400 sm:h-7 sm:w-7" />
                  </div>
                </div>
                
                {/* Breakdown */}
                <section className="space-y-3" aria-labelledby="load-breakdown-heading">
                  <div>
                    <h3 id="load-breakdown-heading" className="text-sm font-semibold text-gray-800">Heat gain breakdown</h3>
                    <p className="mt-1 text-xs text-gray-500">Expand a load to inspect its inputs and calculation. Shares are of the pre-margin subtotal.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <LoadDrilldown label="Transmission" value={results.transmission} sharePct={results.subtotal ? results.transmission / results.subtotal * 100 : 0}>
                      <p>Areas: walls {results.wallAreaM2.toFixed(2)} m²; ceiling and floor {results.floorAreaM2.toFixed(2)} m² each.</p>
                      <p>Walls: max(0, {results.wallAreaM2.toFixed(2)} × {inputs.wallUValue.toFixed(3)} × [{inputs.ambientTemp} − {roomTempC}] ÷ 1000) = {results.wallTransmission.toFixed(2)} kW.</p>
                      <p>Ceiling: max(0, {results.floorAreaM2.toFixed(2)} × {inputs.ceilingUValue.toFixed(3)} × [{inputs.ceilingBoundaryTempC} − {roomTempC}] ÷ 1000) = {results.ceilingTransmission.toFixed(2)} kW.</p>
                      <p>Floor: max(0, {results.floorAreaM2.toFixed(2)} × {inputs.floorUValue.toFixed(3)} × [{inputs.floorBoundaryTempC} − {roomTempC}] ÷ 1000) = {results.floorTransmission.toFixed(2)} kW.</p>
                      <p className="font-medium">U-values are estimated from panel type and thickness; thermal bridges and door-panel effects are not separately modelled.</p>
                    </LoadDrilldown>
                    <LoadDrilldown label="Product load" value={results.product} sharePct={results.subtotal ? results.product / results.subtotal * 100 : 0}>
                      <BreakdownLine label="Sensible above freezing" value={results.productSensibleAboveFreeze} />
                      <BreakdownLine label="Latent heat of freezing" value={results.productLatent} />
                      <BreakdownLine label="Sensible below freezing" value={results.productSensibleBelowFreeze} />
                      <p>Batch: {inputs.productMass} kg, {inputs.productTemp}°C → {inputs.productTargetTempC}°C over {results.productLoadHours.toFixed(2)} h.</p>
                      <p>Properties: Cp {inputs.productCp} kJ/kg·K above freezing; Cp {inputs.productCpFrozen} kJ/kg·K below; freeze point {inputs.productFreezingPointC}°C; water fraction {(inputs.productWaterFraction * 100).toFixed(0)}%.</p>
                      <p>Estimated energy change: {results.productEnergyKjKg.toFixed(2)} kJ/kg. Latent term is water fraction × 333.55 kJ/kg and applies only when the product crosses its freezing point.</p>
                    </LoadDrilldown>
                    <LoadDrilldown label="Infiltration" value={results.infiltration} sharePct={results.subtotal ? results.infiltration / results.subtotal * 100 : 0}>
                      <p>Airflow {inputs.infiltrationAirflowM3h} m³/h; outdoor {inputs.ambientTemp}°C / {inputs.ambientRH}% RH; room {roomTempC}°C / {inputs.holdRH}% RH; pressure {inputs.sitePressureKpa} kPa.</p>
                      <p>Dry-air mass flow: {results.dryAirMassFlow.toFixed(4)} kg/s. Outdoor/room enthalpy: {results.outdoorAirEnthalpy.toFixed(2)} / {results.roomAirEnthalpy.toFixed(2)} kJ/kg dry air.</p>
                      <p>Load = max(0, dry-air mass flow × [outdoor enthalpy − room enthalpy]) = {results.infiltration.toFixed(2)} kW, including sensible and moisture-related enthalpy.</p>
                      <p className="font-medium">Airflow must represent the design door-opening/infiltration condition; this tool does not infer it from room volume.</p>
                    </LoadDrilldown>
                    <LoadDrilldown label="Internal loads" value={results.internal} sharePct={results.subtotal ? results.internal / results.subtotal * 100 : 0}>
                      <p>Entered combined internal load: {inputs.internalLoadKw} kW.</p>
                      <p>Represents the user&apos;s combined allowance for people, lighting and equipment. No occupancy or duty-cycle breakdown is inferred.</p>
                    </LoadDrilldown>
                    <LoadDrilldown label="Defrost average" value={results.defrost} sharePct={results.subtotal ? results.defrost / results.subtotal * 100 : 0}>
                      <p>Heater {inputs.defrostHeaterPowerKw} kW × {inputs.holdDefrostDurationMin} min/cycle × {inputs.holdDefrostCyclesPerDay} cycles/day ÷ 1440 min/day = {results.defrost.toFixed(2)} kW daily average.</p>
                      <p>Assumes the full heater input becomes a refrigeration load. Peak coincidence and heat rejected outside the room are not modelled.</p>
                    </LoadDrilldown>
                    <LoadDrilldown label={`Design margin (${results.safetyPct.toFixed(0)}%)`} value={results.safetyMargin} sharePct={results.subtotal ? results.safetyMargin / results.subtotal * 100 : 0}>
                      <p>Pre-margin subtotal {results.subtotal.toFixed(2)} kW × {results.safetyPct.toFixed(1)}% = {results.safetyMargin.toFixed(2)} kW.</p>
                      <p>This is an explicit user-entered margin, not an automatically selected safety factor.</p>
                    </LoadDrilldown>
                  </div>
                </section>
                {(inputs.infiltrationAirflowM3h === 0 || inputs.internalLoadKw === 0 || (inputs.defrostHeaterPowerKw === 0 && inputs.holdDefrostCyclesPerDay > 0)) && (
                  <div role="note" className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                    Zero airflow or internal-load inputs are treated as zero load, not as missing data. Confirm these are intentional; otherwise enter design airflow and equipment/occupancy loads before relying on the estimate.
                  </div>
                )}
                
                <div className="p-4 bg-emerald-50 border border-emerald-100">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-emerald-900">Engineering handoff</p>
                    <button type="button" onClick={saveSizingCase} disabled={sizingInputIssues.length > 0} className="inline-flex items-center gap-1.5 border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {savedAt ? 'Case saved locally' : 'Save sizing case'}</button>
                  </div>
                  <EquipmentSelectionPanel loadKw={results.total} roomTempC={roomTempC} ambientTempC={inputs.ambientTemp} settings={equipmentSettings} onChange={setEquipmentSettings} sel={equipment} />
                </div>
                
                {/* Calculation Formula */}
                <details className="group border border-blue-100 bg-blue-50">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-blue-950 [&::-webkit-details-marker]:hidden">
                    <span>Calculation method, total and limitations</span>
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
                  </summary>
                  <div className="space-y-3 border-t border-blue-100 px-4 pb-4 pt-3 text-xs leading-5 text-blue-950">
                    <p><strong>Subtotal:</strong> transmission + product + infiltration + internal loads + daily-average defrost = {results.subtotal.toFixed(2)} kW.</p>
                    <p><strong>Final estimate:</strong> subtotal + explicit {results.safetyPct.toFixed(1)}% margin ({results.safetyMargin.toFixed(2)} kW) = <strong>{results.total.toFixed(2)} kW.</strong></p>
                    {results.isFreezing && <p><strong>Freeze time is not estimated.</strong> A defensible prediction requires product geometry, product-specific properties and a heat-transfer coefficient for the actual airflow/process.</p>}
                    <HelpNote>This is an average load estimate, not peak capacity selection. Check input quality, load coincidence and design period with a refrigeration designer.</HelpNote>
                  </div>
                </details>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <button 
                onClick={() => setStep(s => Math.max(1, s-1))}
                className={`flex items-center gap-2 px-2 py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors ${step === 1 ? 'invisible' : ''}`}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep(s => Math.min(3, s+1))}
                  className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 font-semibold hover:bg-gray-800 transition-colors"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleAiConsult}
                  disabled={isLoadingAi || !sizingInputsValid}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoadingAi ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Engineering Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AI Advice Panel */}
        <div className="space-y-4">
          <div className="hidden lg:block">{liveEstimate}</div>
          {aiAdvice ? (
            <div className="bg-gray-900 text-gray-50 p-6 shadow-lg">
              <h4 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <div className="p-1.5 bg-blue-500">
                  <Shield className="h-4 w-4" />
                </div>
                Expert Verification
              </h4>
              <div className="text-sm leading-relaxed space-y-3 opacity-90">
                {aiAdvice.split('\n').map((line, i) => (
                  line.trim() && <p key={i}>{line}</p>
                ))}
              </div>
              <button
                onClick={handleDownload}
                disabled={!sizingInputsValid}
                className="flex items-center justify-center gap-2 w-full mt-6 py-2.5 bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Technical Sheet
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center min-h-[200px]">
              <div className="w-14 h-14 bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                <Shield className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Awaiting Sizing Completion</p>
              <p className="text-xs text-gray-400 mt-2 px-4">
                Complete the sizing wizard to unlock AI-powered engineering verification.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Technical Sources Section */}
      <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 p-6 border border-amber-100">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-bold text-gray-900">Calculation References</h3>
        </div>
        <p className="mb-4 text-xs leading-5 text-gray-600">{SIZING_REFERENCE_NOTE}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SIZING_SOURCES.map((source, index) => (
            <div key={index} className="flex items-start gap-3 bg-white/60 p-3 ">
              <div className="w-8 h-8 bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-amber-700">{index + 1}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{source.name}</p>
                <p className="text-xs text-gray-600">{source.description}</p>
                {source.url && (
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 mt-1"
                  >
                    View source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      ) : activeCalculator === 'superheat' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Superheat & Subcooling Calculator</h3>
              <p className="mt-1 text-sm text-gray-500">
                Use suction and liquid pressures against the selected refrigerant curve to estimate field conditions.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Reference Refrigerant</label>
                <select
                  value={selectedRefrigerant}
                  onChange={(e) => setSelectedRefrigerant(e.target.value as RefrigerantCode)}
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                >
                  {Object.keys(PT_CURVES).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <InputGroup label="Suction Pressure (bar)" value={superheatInputs.suctionPressure} onChange={(v: number) => setSuperheatInputs({ ...superheatInputs, suctionPressure: v })} />
              <InputGroup label="Suction Temp (°C)" value={superheatInputs.suctionTemp} onChange={(v: number) => setSuperheatInputs({ ...superheatInputs, suctionTemp: v })} />
              <InputGroup label="Liquid Pressure (bar)" value={superheatInputs.liquidPressure} onChange={(v: number) => setSuperheatInputs({ ...superheatInputs, liquidPressure: v })} />
              <InputGroup label="Liquid Temp (°C)" value={superheatInputs.liquidTemp} onChange={(v: number) => setSuperheatInputs({ ...superheatInputs, liquidTemp: v })} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-semibold text-gray-500">Evaporator Saturation Temp</p>
                <p className="mt-3 text-3xl font-bold text-gray-900">{saturationTempLow.toFixed(1)}°C</p>
                <p className="mt-2 text-xs text-gray-500">Interpolated from suction pressure</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-semibold text-gray-500">Condensing Saturation Temp</p>
                <p className="mt-3 text-3xl font-bold text-gray-900">{saturationTempHigh.toFixed(1)}°C</p>
                <p className="mt-2 text-xs text-gray-500">Interpolated from liquid pressure</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 bg-gray-900 p-6 text-white shadow-lg">
              <p className="text-sm font-semibold text-gray-300">Superheat</p>
              <p className="mt-3 text-4xl font-bold text-blue-400">{superheatValue.toFixed(1)}°C</p>
              <p className="mt-2 text-sm text-gray-300">Status: {superheatStatus}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">Subcooling</p>
              <p className="mt-3 text-4xl font-bold text-gray-900">{subcoolingValue.toFixed(1)}°C</p>
              <p className="mt-2 text-sm text-gray-500">Status: {subcoolingStatus}</p>
            </div>
            <div className="border border-amber-100 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">Field Guidance</p>
              <ul className="mt-3 space-y-2 text-sm text-amber-800">
                <li>Optimal superheat target: 5°C to 12°C</li>
                <li>Optimal subcooling target: 3°C to 10°C</li>
                <li>Always confirm pressure readings against refrigerant safety class before adjustment.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : activeCalculator === 'pt-chart' ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Pressure-Temperature Chart</h3>
              <p className="mt-1 text-sm text-gray-500">
                Review simplified reference curves and compare them to safe operating thresholds.
              </p>
            </div>
            <div className="w-full sm:w-60">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Highlight Refrigerant</label>
              <select
                value={selectedRefrigerant}
                onChange={(e) => setSelectedRefrigerant(e.target.value as RefrigerantCode)}
                className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
              >
                {Object.keys(PT_CURVES).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-gray-200 bg-slate-950 p-4">
            <svg viewBox="0 0 700 320" className="h-[320px] w-full">
              <rect x="0" y="0" width="700" height="320" fill="#020617" rx="20" />
              {Array.from({ length: 6 }).map((_, index) => (
                <line
                  key={`h-${index}`}
                  x1="70"
                  y1={40 + index * 40}
                  x2="660"
                  y2={40 + index * 40}
                  stroke="rgba(255,255,255,0.08)"
                />
              ))}
              {Array.from({ length: 7 }).map((_, index) => (
                <line
                  key={`v-${index}`}
                  x1={90 + index * 80}
                  y1="30"
                  x2={90 + index * 80}
                  y2="280"
                  stroke="rgba(255,255,255,0.08)"
                />
              ))}
              {Object.entries(PT_CURVES).map(([code, curve]) => {
                const points = curve
                  .map((point) => {
                    const x = 90 + ((point.temp + 20) / 60) * 480;
                    const y = 260 - (point.pressure / 64) * 220;
                    return `${x},${y}`;
                  })
                  .join(' ');

                const color =
                  code === 'R-290' ? '#22c55e' :
                  code === 'R-32' ? '#38bdf8' :
                  code === 'R-744' ? '#f59e0b' :
                  '#cbd5e1';

                return (
                  <g key={code}>
                    <polyline
                      fill="none"
                      stroke={color}
                      strokeWidth={code === selectedRefrigerant ? 4 : 2}
                      opacity={code === selectedRefrigerant ? 1 : 0.5}
                      points={points}
                    />
                    <text x="600" y={60 + Object.keys(PT_CURVES).indexOf(code as RefrigerantCode) * 22} fill={color} fontSize="12" fontWeight="700">
                      {code}
                    </text>
                  </g>
                );
              })}
              <text x="320" y="305" fill="#cbd5e1" fontSize="12">Temperature (°C)</text>
              <text x="14" y="160" fill="#cbd5e1" fontSize="12" transform="rotate(-90 14 160)">Pressure (bar)</text>
            </svg>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-semibold text-gray-500">Selected Curve</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{selectedRefrigerant}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-semibold text-gray-500">Safety Class</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{REFRIGERANT_REFERENCE[selectedRefrigerant].ashraeSafetyClass}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">Reference range</p>
              <p className="mt-2 text-sm text-amber-800">Illustrative chart only; not an operating limit or service setpoint.</p>
            </div>
          </div>
        </div>
      ) : activeCalculator === 'leak-rate' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Leak Rate & CO2-eq Calculator</h3>
              <p className="mt-1 text-sm text-gray-500">
                Translate annual refrigerant leakage into climate impact and explain it in field-ready terms.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputGroup label="Leak Rate (kg/year)" value={leakInputs.leakRate} onChange={(v: number) => setLeakInputs({ ...leakInputs, leakRate: v })} />
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Refrigerant</label>
                <select
                  value={leakInputs.refrigerantCode}
                  onChange={(e) => setLeakInputs({ ...leakInputs, refrigerantCode: e.target.value as RefrigerantCode })}
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                >
                  {Object.keys(REFRIGERANT_REFERENCE).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-semibold text-gray-500">Handling Precautions</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {leakEquivalent.refrigerant.handlingPrecautions.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 bg-gray-900 p-6 text-white shadow-lg">
              <p className="text-sm font-semibold text-gray-300">CO2 Equivalent</p>
              <p className="mt-3 text-4xl font-bold text-emerald-400">{leakEquivalent.co2eq} tCO2-eq</p>
              <p className="mt-2 text-sm text-gray-300">Based on {leakEquivalent.refrigerant.gwp} GWP for {leakInputs.refrigerantCode}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">Equivalent Car Journeys</p>
              <p className="mt-3 text-4xl font-bold text-gray-900">{leakEquivalent.carJourneys}</p>
              <p className="mt-2 text-sm text-gray-500">Approximate one-way urban journeys for context.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Unit Converter</h3>
              <p className="mt-1 text-sm text-gray-500">
                Convert temperature, pressure, mass, airflow, and energy values for field calculations.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Category</label>
                <select
                  value={converterType}
                  onChange={(e) => setConverterType(e.target.value as ConverterType)}
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                >
                  <option value="temperature">Temperature</option>
                  <option value="pressure">Pressure</option>
                  <option value="mass">Mass</option>
                  <option value="airflow">Airflow</option>
                  <option value="energy">Energy</option>
                </select>
              </div>
              <InputGroup label="Value" value={converterValue} onChange={(v: number) => setConverterValue(v)} />
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">From</label>
                <select
                  value={converterFrom}
                  onChange={(e) => setConverterFrom(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                >
                  {CONVERTER_OPTIONS[converterType].units.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">To</label>
                <select
                  value={converterTo}
                  onChange={(e) => setConverterTo(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
                >
                  {CONVERTER_OPTIONS[converterType].units.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-gray-900 p-6 text-white shadow-lg">
            <p className="text-sm font-semibold text-gray-300">Converted Result</p>
            <p className="mt-4 text-4xl font-bold text-blue-400">{convertedValue.toFixed(2)}</p>
            <p className="mt-2 text-sm text-gray-300">
              {converterValue} {converterFrom} = {convertedValue.toFixed(2)} {converterTo}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, value, onChange, min }: { label: string; value: number; onChange: (v: number) => void; min?: number }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
    <input
      type="number"
      value={value}
      min={min}
      onChange={e => {
        const parsed = Number(e.target.value);
        const next = Number.isFinite(parsed) ? parsed : 0;
        onChange(min !== undefined ? Math.max(min, next) : next);
      }}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
    />
  </div>
);

const ThicknessInput = ({ label, value, onChange, min, uValue }: { label: string; value: number; onChange: (v: number) => void; min: number; uValue: number }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
    <input
      type="number"
      list="panel-thicknesses"
      value={value}
      min={min}
      step={5}
      onChange={e => {
        const parsed = Number(e.target.value);
        onChange(Math.max(min, Number.isFinite(parsed) ? parsed : 0));
      }}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
    />
    <p className="text-xs text-gray-500">U ≈ {uValue.toFixed(3)} W/m²·K</p>
  </div>
);

const HelpNote = ({ children }: { children: React.ReactNode }) => (
  <p className="flex items-start gap-2 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
    <Info className="mt-0.5 h-4 w-4 shrink-0" />
    <span>{children}</span>
  </p>
);

const BreakdownLine = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <span className="text-xs font-semibold text-gray-900">{value.toFixed(2)} kW</span>
  </div>
);

const LoadDrilldown = ({ label, value, sharePct, children }: {
  label: string;
  value: number;
  sharePct: number;
  children: React.ReactNode;
}) => (
  <details className="group min-w-0 border border-gray-200 bg-white open:border-slate-300 open:shadow-sm">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 break-words text-sm font-semibold text-gray-800">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-right text-sm font-bold tabular-nums text-gray-950">{value.toFixed(2)} kW</span>
        <span className="hidden text-xs tabular-nums text-gray-500 sm:inline">{sharePct.toFixed(1)}%</span>
        <ChevronRight className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-90" aria-hidden="true" />
      </span>
    </summary>
    <div className="space-y-2 border-t border-gray-100 px-3 py-3 text-xs leading-5 text-gray-600 [overflow-wrap:anywhere] sm:px-4">
      <p className="sm:hidden">{sharePct.toFixed(1)}% of pre-margin subtotal</p>
      {children}
    </div>
  </details>
);

export default SizingTool;
