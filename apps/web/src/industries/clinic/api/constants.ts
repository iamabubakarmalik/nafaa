export const SERVICE_CATEGORIES = [
  { value: 'CONSULTATION', label: 'Consultation', emoji: '🩺', color: 'from-blue-500 to-cyan-600' },
  { value: 'PROCEDURE', label: 'Procedure', emoji: '⚕️', color: 'from-violet-500 to-purple-600' },
  { value: 'SURGERY', label: 'Surgery', emoji: '🔪', color: 'from-red-500 to-rose-700' },
  { value: 'DIAGNOSTIC', label: 'Diagnostic', emoji: '🔬', color: 'from-cyan-500 to-teal-600' },
  { value: 'LAB_TEST', label: 'Lab Test', emoji: '🧪', color: 'from-purple-500 to-fuchsia-600' },
  { value: 'IMAGING', label: 'Imaging', emoji: '📷', color: 'from-indigo-500 to-blue-700' },
  { value: 'VACCINATION', label: 'Vaccination', emoji: '💉', color: 'from-emerald-500 to-green-600' },
  { value: 'DENTAL', label: 'Dental', emoji: '🦷', color: 'from-sky-500 to-cyan-700' },
  { value: 'PHYSIOTHERAPY', label: 'Physiotherapy', emoji: '💪', color: 'from-orange-500 to-red-500' },
  { value: 'COUNSELING', label: 'Counseling', emoji: '🧘', color: 'from-pink-500 to-rose-600' },
  { value: 'HEALTH_PACKAGE', label: 'Health Package', emoji: '📦', color: 'from-amber-500 to-orange-600' },
  { value: 'EMERGENCY', label: 'Emergency', emoji: '🚨', color: 'from-red-600 to-rose-800' },
  { value: 'HOME_VISIT', label: 'Home Visit', emoji: '🏠', color: 'from-teal-500 to-emerald-600' },
  { value: 'TELEMEDICINE', label: 'Telemedicine', emoji: '📹', color: 'from-purple-500 to-violet-700' },
  { value: 'OTHER', label: 'Other', emoji: '🩹', color: 'from-slate-500 to-slate-700' },
] as const;

export const COMMON_TESTS = [
  '🩸 Complete Blood Count (CBC)', '💧 Urine Analysis', '🍬 Blood Sugar Fasting',
  '❤️ ECG', '📷 X-Ray Chest', '🫀 Echocardiography', '🧠 CT Brain',
  '🫁 Ultrasound Abdomen', '🧬 Thyroid Panel', '🩺 Liver Function Test',
  '🫘 Kidney Function Test', '💊 Lipid Profile', '🦠 Widal Test', '🔬 Culture & Sensitivity',
];

export const COMMON_PROCEDURES = [
  '💉 Injection', '💊 IV Drip', '🩹 Wound Dressing', '🩸 Blood Draw',
  '🔬 Biopsy', '🩺 Stitching', '👂 Ear Wax Removal', '👁️ Eye Wash',
  '💧 Nebulization', '📈 Blood Pressure Check', '💉 Vaccine Shot',
];

export const HEALTH_PACKAGES = [
  '🏥 Basic Health Checkup', '💎 Executive Health Package', '❤️ Cardiac Screening',
  '👶 Child Wellness Package', '🤰 Antenatal Package', '👵 Senior Citizen Package',
  '💼 Pre-Employment Package', '💒 Pre-Marital Package', '🎗️ Cancer Screening',
];

export const URGENCY_LEVELS = [
  { value: 'ROUTINE', label: 'Routine', emoji: '📋', color: 'bg-blue-500' },
  { value: 'URGENT', label: 'Urgent', emoji: '⚡', color: 'bg-amber-500' },
  { value: 'STAT', label: 'STAT (Immediate)', emoji: '🚨', color: 'bg-red-600' },
];
