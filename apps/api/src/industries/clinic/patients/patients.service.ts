import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClinicBloodGroup, ClinicGender, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { PanelsService } from '../panels/panels.service';

const GENDERS = Object.values(ClinicGender);
const BLOOD = Object.values(ClinicBloodGroup);
const TEXT_FIELDS = [
  'fatherOrHusbandName', 'maritalStatus', 'occupation', 'religion', 'nationality', 'photoUrl', 'phoneAlternate', 'email', 'address', 'city',
  'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation', 'pastSurgeries', 'familyHistory', 'smokingStatus', 'alcoholStatus',
  'gravidaPara', 'menstrualCycle', 'vaccinationStatus', 'motherName', 'birthType', 'insuranceProvider', 'insuranceNumber', 'preferredDoctorId',
  'preferredLanguage', 'notes',
] as const;
const NUM_FIELDS = ['heightCm', 'weightKg', 'waistCm', 'birthWeight'] as const;
const LIST_FIELDS = ['allergies', 'chronicConditions', 'currentMedications'] as const;
const DATE_FIELDS = ['dateOfBirth', 'lmpDate', 'edd', 'insuranceExpiry'] as const;

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const text = (v: unknown, max = 2000) => (v === undefined ? undefined : v === null || String(v).trim() === '' ? null : String(v).trim().slice(0, max));

/** Patient fields a form may set; ids, counters and the tenant are never taken from the body. */
function readPatient(dto: any, partial: boolean): Prisma.ClinicPatientProfileUncheckedUpdateInput {
  const out: Record<string, unknown> = {};
  if (dto.fullName !== undefined) {
    const name = String(dto.fullName ?? '').trim();
    if (name.length < 2) throw new BadRequestException('Mareez ka naam likhein');
    out.fullName = name.slice(0, 120);
  } else if (!partial) throw new BadRequestException('Mareez ka naam likhein');
  if (dto.phonePrimary !== undefined) {
    const p = digits(dto.phonePrimary);
    if (p && (p.length < 10 || p.length > 13)) throw new BadRequestException('Phone number sahi likhein (03xx…)');
    out.phonePrimary = p || null;
  }
  if (dto.cnic !== undefined) {
    const c = digits(dto.cnic);
    if (c && c.length !== 13) throw new BadRequestException('CNIC 13 hindsay ka hota hai');
    out.cnic = c ? `${c.slice(0, 5)}-${c.slice(5, 12)}-${c.slice(12)}` : null;
  }
  if (dto.gender !== undefined) {
    if (dto.gender && !GENDERS.includes(dto.gender)) throw new BadRequestException('Gender ghalat hai');
    out.gender = dto.gender || null;
  }
  if (dto.bloodGroup !== undefined) {
    if (dto.bloodGroup && !BLOOD.includes(dto.bloodGroup)) throw new BadRequestException('Blood group ghalat hai');
    out.bloodGroup = dto.bloodGroup || null;
  }
  for (const k of TEXT_FIELDS) if (dto[k] !== undefined) out[k] = text(dto[k]);
  for (const k of NUM_FIELDS) {
    if (dto[k] === undefined) continue;
    const n = dto[k] === null || dto[k] === '' ? null : Number(dto[k]);
    if (n !== null && (!Number.isFinite(n) || n < 0)) throw new BadRequestException(`${k} sahi likhein`);
    out[k] = n;
  }
  for (const k of LIST_FIELDS) {
    if (dto[k] === undefined) continue;
    const arr = Array.isArray(dto[k]) ? dto[k] : String(dto[k] ?? '').split(',');
    out[k] = arr.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 50).map((x: string) => x.slice(0, 120));
  }
  for (const k of DATE_FIELDS) {
    if (dto[k] === undefined) continue;
    if (!dto[k]) { out[k] = null; continue; }
    const d = new Date(dto[k]);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Tareekh sahi likhein');
    if (k === 'dateOfBirth' && d > new Date()) throw new BadRequestException('Paidaish ki tareekh aage ki nahi ho sakti');
    out[k] = d;
  }
  if (dto.ageYears !== undefined && dto.dateOfBirth === undefined && dto.ageYears !== '' && dto.ageYears !== null) {
    const age = Number(dto.ageYears);
    if (!(age >= 0 && age <= 130)) throw new BadRequestException('Umar sahi likhein');
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - Math.floor(age));
    out.dateOfBirth = dob;
  }
  for (const k of ['hasInsurance', 'isPregnant'] as const) if (dto[k] !== undefined) out[k] = dto[k] === null ? null : !!dto[k];
  return out as Prisma.ClinicPatientProfileUncheckedUpdateInput;
}

function bmiOf(heightCm?: number | null, weightKg?: number | null) {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return Number((weightKg / (m * m)).toFixed(2));
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly panels: PanelsService,
  ) {}

  /** A company panel on the record also marks the patient as a panel patient. */
  private async withPanel(tenantId: string, dto: any, data: Prisma.ClinicPatientProfileUncheckedUpdateInput) {
    if (dto?.panelId === undefined) return;
    data.panelId = await this.panels.usable(tenantId, dto.panelId);
    if (data.panelId) data.hasInsurance = true;
  }

  /**
   * Registers a patient. Every patient is also a customer (khata, bills),
   * so a customer is found by phone or created when none is given.
   */
  async create(user: AuthenticatedUser, scope: ShopScope, dto: any) {
    const data = readPatient(dto ?? {}, false) as Prisma.ClinicPatientProfileUncheckedCreateInput;
    await this.withPanel(user.tenantId, dto, data);
    if (data.phonePrimary || data.cnic) {
      const dup = await this.prisma.clinicPatientProfile.findFirst({
        where: { tenantId: user.tenantId, isActive: true, OR: [...(data.cnic ? [{ cnic: data.cnic as string }] : []), ...(data.phonePrimary ? [{ phonePrimary: data.phonePrimary as string, fullName: { equals: data.fullName as string, mode: 'insensitive' as const } }] : [])] },
        select: { mrn: true, fullName: true },
      });
      if (dup && !dto.allowDuplicate) throw new ConflictException(`${dup.fullName} pehle se registered hai (${dup.mrn})`);
    }

    let customerId: string | undefined = dto.customerId;
    if (customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
      const taken = await this.prisma.clinicPatientProfile.findUnique({ where: { customerId }, select: { mrn: true } });
      if (taken) throw new ConflictException(`Is customer ka record pehle se hai (${taken.mrn})`);
    } else {
      const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope).catch(() => null);
      const defaults = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { defaultCreditLimit: true } });
      const c = await this.prisma.customer.create({
        data: {
          tenantId: user.tenantId, shopId, name: data.fullName as string, phone: (data.phonePrimary as string) || undefined,
          cnic: (data.cnic as string) || undefined, address: (data.address as string) || undefined, city: (data.city as string) || undefined,
          gender: data.gender === 'MALE' || data.gender === 'FEMALE' ? data.gender : undefined,
          dateOfBirth: (data.dateOfBirth as Date) ?? null, creditLimit: defaults?.defaultCreditLimit ?? 0, notes: 'Clinic mareez',
        },
        select: { id: true },
      });
      customerId = c.id;
    }

    for (let attempt = 0; ; attempt += 1) {
      const last = await this.prisma.clinicPatientProfile.findFirst({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, select: { mrn: true } });
      const seq = Number(/(\d+)$/.exec(last?.mrn ?? '')?.[1] ?? 0) + 1 + attempt;
      try {
        return await this.prisma.clinicPatientProfile.create({
          data: {
            ...data,
            tenantId: user.tenantId,
            customerId: customerId!,
            mrn: `MRN-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`,
            bmi: bmiOf(data.heightCm as number, data.weightKg as number),
          },
        });
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  /** Without `page`: the old array (200 most recent). With `page`: a page, total and counts. */
  async list(user: AuthenticatedUser, params: Record<string, string | undefined>) {
    const q = params.search?.trim();
    const qDigits = q ? digits(q) : '';
    const where: Prisma.ClinicPatientProfileWhereInput = {
      tenantId: user.tenantId,
      isActive: params.status === 'inactive' ? false : true,
      ...(params.gender && GENDERS.includes(params.gender as ClinicGender) && { gender: params.gender as ClinicGender }),
      ...(params.bloodGroup && BLOOD.includes(params.bloodGroup as ClinicBloodGroup) && { bloodGroup: params.bloodGroup as ClinicBloodGroup }),
      ...(params.insurance === 'yes' && { hasInsurance: true }),
      ...(params.panelId && { panelId: params.panelId }),
      ...(params.allergies === 'yes' && { NOT: { allergies: { isEmpty: true } } }),
      ...(q && {
        OR: [
          { mrn: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
          { fatherOrHusbandName: { contains: q, mode: 'insensitive' } },
          ...(qDigits.length >= 3 ? [{ phonePrimary: { contains: qDigits } }, { cnic: { contains: q } }] : []),
        ],
      }),
    };
    if (!params.page) {
      return this.prisma.clinicPatientProfile.findMany({ where, orderBy: [{ lastVisitAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }], take: 200 });
    }
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 200);
    const orderBy: Prisma.ClinicPatientProfileOrderByWithRelationInput[] = params.sort === 'name' ? [{ fullName: 'asc' }]
      : params.sort === 'visits' ? [{ totalVisits: 'desc' }]
        : params.sort === 'new' ? [{ createdAt: 'desc' }]
          : [{ lastVisitAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
    const base = { tenantId: user.tenantId, isActive: true };
    const [items, total, all, withAllergy, newThisMonth, withInsurance] = await Promise.all([
      this.prisma.clinicPatientProfile.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.clinicPatientProfile.count({ where }),
      this.prisma.clinicPatientProfile.count({ where: base }),
      this.prisma.clinicPatientProfile.count({ where: { ...base, NOT: { allergies: { isEmpty: true } } } }),
      this.prisma.clinicPatientProfile.count({ where: { ...base, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
      this.prisma.clinicPatientProfile.count({ where: { ...base, hasInsurance: true } }),
    ]);
    // What each patient owes on their khata.
    const balances = await this.prisma.customer.findMany({ where: { tenantId: user.tenantId, id: { in: items.map((p) => p.customerId) } }, select: { id: true, balance: true } });
    const bal = new Map(balances.map((b) => [b.id, b.balance]));
    return {
      items: items.map((p) => ({ ...p, khataBalance: bal.get(p.customerId) ?? 0 })),
      total, page, limit,
      summary: { all, withAllergy, newThisMonth, withInsurance },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.clinicPatientProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Mareez nahi mila');
    return p;
  }

  async byMrn(user: AuthenticatedUser, mrn: string) {
    return this.prisma.clinicPatientProfile.findFirst({ where: { mrn, tenantId: user.tenantId } });
  }

  /** Updates the record and keeps the linked customer's name and phone in step. */
  async update(user: AuthenticatedUser, id: string, dto: any) {
    const p = await this.getOne(user, id);
    const data = readPatient(dto ?? {}, true);
    await this.withPanel(user.tenantId, dto, data);
    if (dto?.isActive !== undefined) data.isActive = !!dto.isActive;
    const heightCm = (data.heightCm as number | null | undefined) === undefined ? p.heightCm : (data.heightCm as number | null);
    const weightKg = (data.weightKg as number | null | undefined) === undefined ? p.weightKg : (data.weightKg as number | null);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.clinicPatientProfile.update({ where: { id }, data: { ...data, bmi: bmiOf(heightCm, weightKg) } });
      const sync: Prisma.CustomerUpdateInput = {};
      if (data.fullName !== undefined) sync.name = data.fullName as string;
      if (data.phonePrimary !== undefined) sync.phone = (data.phonePrimary as string | null) ?? null;
      if (data.cnic !== undefined) sync.cnic = (data.cnic as string | null) ?? null;
      if (Object.keys(sync).length) await tx.customer.updateMany({ where: { id: p.customerId, tenantId: user.tenantId }, data: sync as Prisma.CustomerUpdateManyMutationInput });
      return row;
    });
  }

  /** Everything about one patient: visits, prescriptions, labs, vaccines, vitals and khata. */
  async history(user: AuthenticatedUser, id: string) {
    const patient = await this.getOne(user, id);
    const [appointments, prescriptions, labOrders, vaccinations, vitalsHistory, customer, doctors, panel] = await Promise.all([
      this.prisma.clinicAppointment.findMany({
        where: { patientId: id, tenantId: user.tenantId },
        include: { encounter: true, vitals: true },
        orderBy: { scheduledStart: 'desc' },
        take: 100,
      }),
      this.prisma.clinicPrescription.findMany({ where: { patientId: id, tenantId: user.tenantId }, include: { items: { orderBy: { displayOrder: 'asc' } } }, orderBy: { issuedAt: 'desc' }, take: 50 }),
      this.prisma.clinicLabOrder.findMany({ where: { patientId: id, tenantId: user.tenantId }, include: { tests: true }, orderBy: { orderedAt: 'desc' }, take: 50 }),
      this.prisma.clinicVaccination.findMany({ where: { patientId: id, tenantId: user.tenantId }, orderBy: { dueDate: 'asc' } }),
      this.prisma.clinicVitals.findMany({ where: { patientId: id, appointment: { tenantId: user.tenantId } }, orderBy: { recordedAt: 'desc' }, take: 30 }),
      this.prisma.customer.findFirst({ where: { id: patient.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, balance: true, totalSpent: true } }),
      this.prisma.clinicDoctorProfile.findMany({ where: { tenantId: user.tenantId }, select: { id: true, fullName: true, title: true } }),
      patient.panelId ? this.prisma.clinicPanel.findFirst({ where: { id: patient.panelId, tenantId: user.tenantId }, select: { id: true, name: true, isActive: true, customerId: true } }) : null,
    ]);
    return { patient, appointments, prescriptions, labOrders, vaccinations, vitalsHistory, customer, doctors, panel };
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.clinicPatientProfile.update({ where: { id }, data: { isActive: false } });
  }
}
