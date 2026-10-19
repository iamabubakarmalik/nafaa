/** Clinic service categories; `emoji` is used by the online catalog cards. */
export const SERVICE_CATEGORIES = [
  { value: 'CONSULTATION', label: 'Consultation', emoji: '🩺' },
  { value: 'PROCEDURE', label: 'Procedure', emoji: '⚕️' },
  { value: 'SURGERY', label: 'Surgery', emoji: '🏥' },
  { value: 'DIAGNOSTIC', label: 'Diagnostic', emoji: '🔬' },
  { value: 'LAB_TEST', label: 'Lab test', emoji: '🧪' },
  { value: 'IMAGING', label: 'X-ray / Ultrasound', emoji: '📷' },
  { value: 'VACCINATION', label: 'Vaccine', emoji: '💉' },
  { value: 'DENTAL', label: 'Dental', emoji: '🦷' },
  { value: 'PHYSIOTHERAPY', label: 'Physiotherapy', emoji: '💪' },
  { value: 'COUNSELING', label: 'Counseling', emoji: '🧘' },
  { value: 'HEALTH_PACKAGE', label: 'Health package', emoji: '📦' },
  { value: 'EMERGENCY', label: 'Emergency', emoji: '🚨' },
  { value: 'HOME_VISIT', label: 'Ghar par visit', emoji: '🏠' },
  { value: 'TELEMEDICINE', label: 'Online consultation', emoji: '📹' },
  { value: 'OTHER', label: 'Other', emoji: '🩹' },
] as const;

export const COMMON_TESTS = [
  'CBC', 'Urine R/E', 'Blood Sugar (Fasting)', 'Blood Sugar (Random)', 'HbA1c', 'Lipid Profile', 'LFT', 'RFT', 'Thyroid (TSH)',
  'Widal', 'Typhidot', 'Dengue NS1', 'Malaria (MP)', 'Hepatitis B (HBsAg)', 'Hepatitis C (Anti-HCV)', 'ECG', 'X-Ray Chest', 'Ultrasound Abdomen',
];

export const URGENCY_LEVELS = [
  { value: 'ROUTINE', label: 'Aam' },
  { value: 'URGENT', label: 'Jaldi' },
  { value: 'STAT', label: 'Foran (STAT)' },
] as const;
