// Judging a scan: how much it found, which of two attempts is better, and an honest confidence figure.
import type { OcrScanRecord } from '@/types/index';
import type { FieldConfidence } from './nameplateScan';

type Detected = Pick<OcrScanRecord, 'refrigerantCode' | 'manufacturer' | 'model' | 'serialNumber'>;

export function detectedFields(record: Detected): number {
  return [record.refrigerantCode, record.manufacturer, record.model, record.serialNumber].filter((value) => Boolean(value && value.trim())).length;
}

export const hasAnyDetails = (record: Detected): boolean => detectedFields(record) > 0;

/** Higher is better. A refrigerant the registry knows counts most, because it drives the safety information. */
export function scanScore(record: Detected & Pick<OcrScanRecord, 'whatGasMatch'>, ocrConfidence: number): number {
  return (record.whatGasMatch ? 4 : record.refrigerantCode ? 1 : 0)
    + (record.model ? 2 : 0)
    + (record.serialNumber ? 2 : 0)
    + (record.manufacturer ? 1 : 0)
    + ocrConfidence / 100;
}

/**
 * One 0 to 1 figure for how well the plate was read: the average OCR confidence of the fields that were found,
 * capped at 0.5 when a refrigerant was found that the registry does not know. Nothing found gives 0.
 */
export function overallConfidence(record: Detected & Pick<OcrScanRecord, 'whatGasMatch'>, confidence: FieldConfidence): number {
  const values = ([
    ['refrigerantCode', record.refrigerantCode],
    ['manufacturer', record.manufacturer],
    ['model', record.model],
    ['serialNumber', record.serialNumber],
  ] as const)
    .filter(([, value]) => Boolean(value && value.trim()))
    .map(([key]) => confidence[key] ?? 0);
  if (values.length === 0) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length / 100;
  const capped = record.refrigerantCode && !record.whatGasMatch ? Math.min(average, 0.5) : average;
  return Math.round(capped * 100) / 100;
}
