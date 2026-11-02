/** Clinic service categories; `emoji` is used by the online catalog cards. */
import { t } from '@core/i18n';
export const SERVICE_CATEGORIES = [
  { value: 'CONSULTATION', label: t('Consultation'), emoji: '🩺' },
  { value: 'PROCEDURE', label: t('Procedure'), emoji: '⚕️' },
  { value: 'SURGERY', label: t('Surgery'), emoji: '🏥' },
  { value: 'DIAGNOSTIC', label: t('Diagnostic'), emoji: '🔬' },
  { value: 'LAB_TEST', label: t('Lab test'), emoji: '🧪' },
  { value: 'IMAGING', label: t('X-ray / Ultrasound'), emoji: '📷' },
  { value: 'VACCINATION', label: t('Vaccine'), emoji: '💉' },
  { value: 'DENTAL', label: t('Dental'), emoji: '🦷' },
  { value: 'PHYSIOTHERAPY', label: t('Physiotherapy'), emoji: '💪' },
  { value: 'COUNSELING', label: t('Counseling'), emoji: '🧘' },
  { value: 'HEALTH_PACKAGE', label: t('Health package'), emoji: '📦' },
  { value: 'EMERGENCY', label: t('Emergency'), emoji: '🚨' },
  { value: 'HOME_VISIT', label: t('Ghar par visit'), emoji: '🏠' },
  { value: 'TELEMEDICINE', label: t('Online consultation'), emoji: '📹' },
  { value: 'OTHER', label: t('Other'), emoji: '🩹' },
] as const;

export const COMMON_TESTS = [
  'CBC', 'Urine R/E', 'Blood Sugar (Fasting)', 'Blood Sugar (Random)', 'HbA1c', 'Lipid Profile', 'LFT', 'RFT', 'Thyroid (TSH)',
  'Widal', 'Typhidot', 'Dengue NS1', 'Malaria (MP)', 'Hepatitis B (HBsAg)', 'Hepatitis C (Anti-HCV)', 'ECG', 'X-Ray Chest', 'Ultrasound Abdomen',
];

export const URGENCY_LEVELS = [
  { value: 'ROUTINE', label: t('Aam') },
  { value: 'URGENT', label: t('Jaldi') },
  { value: 'STAT', label: t('Foran (STAT)') },
] as const;
