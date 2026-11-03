/** Clinic endpoints (same paths and shapes as apps/web/src/industries/clinic/api). They need the server; screens show the last saved data offline. */

import { http } from '../_shared/serviceKit';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'ARRIVED' | 'IN_CONSULTATION' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';
export interface AptPatient { id: string; fullName: string; mrn: string; phonePrimary?: string | null; gender?: string | null; dateOfBirth?: string | null; allergies?: string[] }
export interface AptDoctor { id: string; fullName: string; title?: string | null; specialties?: string[]; consultationFee?: number; followUpFee?: number }
export interface Appointment {
  id: string; appointmentNumber: string; tokenNumber?: number | null; patientId: string; doctorId: string; status: AppointmentStatus; visitType: string; isEmergency: boolean;
  scheduledStart: string; chiefComplaint?: string | null; consultationFee: number; otherCharges: number; discount: number; total: number; paidAmount: number; paymentStatus: string;
  patient?: AptPatient | null; doctor?: AptDoctor | null; panel?: { id: string; name: string } | null;
}
export interface Vitals { bpSystolic?: number; bpDiastolic?: number; pulseRate?: number; temperatureC?: number; spo2?: number; bloodSugar?: number; weightKg?: number; heightCm?: number; notes?: string }
export interface Encounter { id: string; appointmentId: string; provisionalDiagnosis?: string; finalDiagnosis?: string; advice?: string; followUpDate?: string; subjective?: string; plan?: string; prescriptions?: Prescription[]; labOrders?: LabOrder[] }
export interface PrescriptionItem { drugName: string; strength?: string; dose?: string; frequency?: string; durationDays?: number; instructions?: string }
export interface Prescription { id: string; prescriptionNumber: string; status: string; issuedAt: string; totalItems: number; items: PrescriptionItem[] }
export interface LabTest { id?: string; testName: string; price: number; result?: string; unit?: string; referenceRange?: string; isAbnormal?: boolean }
export interface LabOrder { id: string; orderNumber: string; status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REPORTED' | 'CANCELLED'; orderedAt: string; totalCost: number; paidAmount: number; urgency: string; tests: LabTest[]; patient?: AptPatient | null; doctor?: AptDoctor | null }
export interface AptDetail extends Appointment { patient: (AptPatient & { allergies: string[] }) | null; encounter: (Encounter & { prescriptions: Prescription[]; labOrders: LabOrder[] }) | null; vitals: Vitals | null; bills: Array<{ id: string; saleNumber: string; amount: number }> }
export interface AptPage { items: Appointment[]; total: number; summary: { fees: number; billed: number; due: number; byStatus: Partial<Record<AppointmentStatus, number>> } }
export interface Patient { id: string; mrn: string; fullName: string; fatherOrHusbandName?: string; cnic?: string; dateOfBirth?: string; gender?: string; phonePrimary?: string; city?: string; allergies: string[]; chronicConditions: string[]; totalVisits: number; totalSpent: number; lastVisitAt?: string; notes?: string; outstandingBalance: number; khataBalance?: number }
export interface PatientHistory { patient: Patient; appointments: Array<Appointment & { encounter: Encounter | null; vitals: Vitals | null }>; prescriptions: Prescription[]; labOrders: LabOrder[]; vaccinations: Vaccination[]; customer: { balance: number } | null }
export interface Doctor {
  id: string; title?: string; fullName: string; specialties: string[]; qualifications: string[]; consultationFee: number; followUpFee: number; followUpDays: number; slotDurationMin: number; workStartTime: string; workEndTime: string; workingDays: number[];
  commissionPct: number; commissionType?: string; isActive: boolean; totalPatients: number; totalRevenue: number;
}
export interface Vaccination { id: string; vaccineName: string; doseNumber?: number; dueDate: string; administeredAt?: string; status: 'DUE' | 'ADMINISTERED' | 'DELAYED' | 'SKIPPED' | 'CONTRAINDICATED'; patient?: { id: string; fullName: string; mrn: string; phonePrimary?: string | null } | null }
export interface Panel { id: string; name: string; creditLimit: number; isActive: boolean; patients: number; balance: number }
export interface ClinicOverview { totals?: { pendingLabOrders?: number; dueVaccinations?: number; totalDoctors?: number; activePatients?: number }; monthly?: { revenue: number; collected: number } }
export interface FeeSale { id: string; saleNumber: string }

export interface DentalRecord { id: string; patientId: string; doctorId?: string | null; toothNumber: string; surface?: string | null; condition: string; treatment?: string | null; notes?: string | null; performedAt: string; isActive: boolean }
export interface AncVisit { id: string; visitNumber: number; gestationWeeks?: number | null; weightKg?: number | null; bpSystolic?: number | null; bpDiastolic?: number | null; fundalHeightCm?: number | null; fetalHeartRate?: number | null; fetalPosition?: string | null; urineProtein?: string | null; edema?: string | null; advice?: string | null; nextVisitDate?: string | null; visitDate: string }
export interface PhysioSession { id: string; therapistId: string; sessionNumber: number; totalSessionsPrescribed?: number | null; painScore?: number | null; exercisesPerformed?: string[] | null; modalitiesUsed: string[]; durationMin?: number | null; progressNotes?: string | null; homeExercises?: string | null; nextSessionDate?: string | null; sessionDate: string }
export interface VitalsRow { id: string; recordedAt: string; weightKg?: number; heightCm?: number; headCircumferenceCm?: number; bpSystolic?: number; bpDiastolic?: number; pulseRate?: number; temperatureC?: number; spo2?: number }
export interface DoctorPayout { id: string; doctorId: string; amount: number; periodFrom: string; periodTo: string; expenseId: string | null; note: string | null; createdAt: string; doctor: { id: string; fullName: string; title?: string | null } | null; expense: { id: string; expenseNumber: string; paymentMethod: string } | null }
export interface PayoutDue {
  doctor: { id: string; fullName: string; title?: string | null; commissionPct: number }; from: string; to: string; seen: number; fees: number; labFees: number; bills: number;
  commissionType: 'PERCENTAGE' | 'FIXED'; commissionPct: number; share: number; paid: number; due: number; payouts: Array<{ id: string; amount: number; periodFrom: string; periodTo: string; createdAt: string }>;
}
export interface PanelBill { id: string; saleNumber: string; status: string; createdAt: string; total: number; paidAmount: number; creditAmount: number; returned: number; line: string | null; appointment: { id: string; appointmentNumber: string } | null; patient: { id: string; fullName: string; mrn: string } | null }
export interface PanelPayment { id: string; amount: number; balanceAfter: number; reference?: string | null; note?: string | null; paymentMethod?: string | null; createdAt: string }
export interface PanelStatement { panel: { id: string; name: string; creditLimit: number; isActive: boolean }; customer: { id: string; name: string; balance: number; creditLimit: number } | null; bills: PanelBill[]; payments: PanelPayment[]; totals: { billed: number; onKhata: number; received: number } }

export const clinicApi = {
  specialty: {
    dental: (id: string) => http.get<DentalRecord[]>(`/clinic/specialty/dental/patient/${id}`),
    addDental: (d: Record<string, unknown>) => http.post<DentalRecord>('/clinic/specialty/dental', d),
    removeDental: (id: string) => http.del(`/clinic/specialty/dental/${id}`),
    anc: (id: string) => http.get<AncVisit[]>(`/clinic/specialty/anc/patient/${id}`),
    addAnc: (d: Record<string, unknown>) => http.post<AncVisit>('/clinic/specialty/anc', d),
    physio: (id: string) => http.get<PhysioSession[]>(`/clinic/specialty/physio/patient/${id}`),
    addPhysio: (d: Record<string, unknown>) => http.post<PhysioSession>('/clinic/specialty/physio', d),
  },
  vitalsOf: (patientId: string) => http.get<VitalsRow[]>(`/clinic/vitals/patient/${patientId}`),
  payouts: {
    list: (p: { doctorId?: string; page?: number; limit?: number }) => http.get<{ items: DoctorPayout[]; total: number; summary: { paid: number } }>('/clinic/doctor-payouts', p),
    due: (doctorId: string, from: string, to: string) => http.get<PayoutDue>('/clinic/doctor-payouts/due', { doctorId, from, to }),
    pay: (d: { doctorId: string; from: string; to: string; amount: number; paymentMethod: string; note?: string }) => http.post<DoctorPayout & { expenseNumber: string }>('/clinic/doctor-payouts', d),
  },
  panelStatement: (id: string, from?: string, to?: string) => http.get<PanelStatement>(`/clinic/panels/${id}/statement`, { from, to }),
  overview: () => http.get<ClinicOverview>('/clinic/dashboard/overview'),
  appointments: {
    list: (p?: { from?: string; to?: string; status?: string; doctorId?: string }) => http.get<Appointment[]>('/clinic/appointments', p),
    page: (p: { status?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) => http.get<AptPage>('/clinic/appointments', { page: 1, ...p }),
    queue: (doctorId: string | undefined, date: string) => http.get<Array<Appointment & { vitals?: Vitals | null }>>('/clinic/appointments/queue', { doctorId, date }),
    feeQuote: (doctorId: string, patientId?: string) => http.get<{ visitType: string; fee: number; lastVisitAt: string | null }>('/clinic/appointments/fee-quote', { doctorId, patientId }),
    getOne: (id: string) => http.get<AptDetail>(`/clinic/appointments/${id}`),
    create: (d: Record<string, unknown>) => http.post<Appointment>('/clinic/appointments', d),
    status: (id: string, status: AppointmentStatus, cancellationReason?: string) => http.patch<Appointment>(`/clinic/appointments/${id}/status`, { status, cancellationReason }),
    pay: (id: string, d: { amount: number; paymentMethod?: string; onCredit?: boolean; paid?: number }) => http.post<Appointment & { sale: FeeSale }>(`/clinic/appointments/${id}/payment`, d),
    dayClose: (date: string) => http.get<{ rows: Array<{ doctorId: string; doctor: AptDoctor | null; seen: number; fees: number; labFees: number; collected: number; khata: number; share: number; clinicKeeps: number }>; totals: { seen: number; fees: number; labFees: number; collected: number; khata: number; share: number } }>('/clinic/appointments/day-close', { date }),
  },
  vitals: { record: (appointmentId: string, d: Vitals) => http.post(`/clinic/vitals/appointment/${appointmentId}`, d) },
  encounters: { upsert: (appointmentId: string, d: Partial<Encounter>) => http.post<Encounter>(`/clinic/encounters/appointment/${appointmentId}`, d) },
  prescriptions: {
    page: (p: { search?: string; page?: number; limit?: number }) => http.get<{ items: Array<Prescription & { patient: AptPatient | null; doctor: AptDoctor | null; encounter: { finalDiagnosis?: string | null; provisionalDiagnosis?: string | null } | null }>; total: number }>('/clinic/prescriptions', { page: 1, ...p }),
    create: (d: { encounterId: string; generalInstructions?: string; items: PrescriptionItem[] }) => http.post<Prescription>('/clinic/prescriptions', d),
  },
  labs: {
    page: (p: { status?: string; search?: string; page?: number; limit?: number }) => http.get<{ items: LabOrder[]; total: number; summary: { fees: number; billed: number; due: number; byStatus: Record<string, number> } }>('/clinic/lab-orders', { page: 1, ...p }),
    create: (d: { patientId?: string; doctorId?: string; encounterId?: string; urgency?: string; notes?: string; tests: Array<{ testName: string; price: number }> }) => http.post<LabOrder>('/clinic/lab-orders', d),
    status: (id: string, status: LabOrder['status']) => http.patch<LabOrder>(`/clinic/lab-orders/${id}/status`, { status }),
    result: (testId: string, d: { result: string; referenceRange?: string; unit?: string; isAbnormal?: boolean }) => http.patch(`/clinic/lab-orders/tests/${testId}/result`, d),
    pay: (id: string, d: { amount: number; paymentMethod?: string; onCredit?: boolean; paid?: number }) => http.post<LabOrder & { sale: FeeSale }>(`/clinic/lab-orders/${id}/payment`, d),
  },
  patients: {
    page: (p: { search?: string; page?: number; limit?: number }) => http.get<{ items: Patient[]; total: number; summary: { all: number; withAllergy: number; newThisMonth: number } }>('/clinic/patients', { page: 1, ...p }),
    list: (p?: { search?: string }) => http.get<Patient[]>('/clinic/patients', p),
    history: (id: string) => http.get<PatientHistory>(`/clinic/patients/${id}/history`),
    create: (d: Record<string, unknown>) => http.post<Patient>('/clinic/patients', d),
    update: (id: string, d: Record<string, unknown>) => http.patch<Patient>(`/clinic/patients/${id}`, d),
  },
  doctors: {
    list: (p?: { active?: boolean }) => http.get<Doctor[]>('/clinic/doctors', p),
    upsert: (d: Record<string, unknown>) => http.post<Doctor>('/clinic/doctors', d),
  },
  vaccinations: {
    page: (p: { status?: string; search?: string; page?: number; limit?: number }) => http.get<{ items: Vaccination[]; total: number; summary: { overdue: number; thisWeek: number; givenThisMonth: number } }>('/clinic/vaccinations', { page: 1, ...p }),
    schedule: (d: { patientId: string; vaccineName: string; dueDate: string; doseNumber?: number }) => http.post<Vaccination>('/clinic/vaccinations', d),
    bulkEpi: (patientId: string, birthDate?: string) => http.post<{ added: number }>('/clinic/vaccinations/bulk-epi', { patientId, birthDate }),
    administer: (id: string, d: { batchNumber?: string; administeredBy?: string }) => http.post<Vaccination>(`/clinic/vaccinations/${id}/administer`, d),
  },
  panels: {
    list: () => http.get<{ items: Panel[]; summary: { panels: number; due: number; overLimit: number } }>('/clinic/panels'),
    create: (d: { name: string; creditLimit?: number }) => http.post<Panel>('/clinic/panels', d),
    update: (id: string, d: { name?: string; creditLimit?: number; isActive?: boolean }) => http.patch<Panel>(`/clinic/panels/${id}`, d),
  },
};
