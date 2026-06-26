// =============================================================================
// ClinicPulse — TypeScript Types
// Mirrors the Supabase PostgreSQL schema
// All monetary values are BIGINT in DB (paisas) — typed as number here
// All timestamps are TIMESTAMPTZ in DB — typed as string (ISO 8601)
// =============================================================================

// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "accountant";

export type GenderType = "male" | "female" | "other";

export type BloodGroupType =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-"
  | "unknown";

export type DoctorEarningModel = "salaried" | "commission";

export type DepartmentType =
  | "opd"
  | "pharmacy"
  | "laboratory"
  | "xray"
  | "general";

export type PaymentStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "refunded";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export type SalaryStatus = "paid" | "pending" | "partial";

export type PaymentMethodSlug =
  | "cash"
  | "jazzcash"
  | "easypaisa"
  | "bank_transfer";

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface CpUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpSetting {
  id: string;
  setting_group: string;
  key: string;
  value: string;
  label: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CpDepartment {
  id: string;
  name: string;
  slug: string;
  dept_type: DepartmentType;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpPaymentMethod {
  id: string;
  name: string;
  slug: PaymentMethodSlug;
  icon_name: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CpExpenseHead {
  id: string;
  name: string;
  slug: string;
  department_id: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Doctors ─────────────────────────────────────────────────────────────────

export interface CpDoctor {
  id: string;
  full_name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  cnic: string | null;
  earning_model: DoctorEarningModel;
  monthly_salary: number | null; // paisas
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpDoctorCommission {
  id: string;
  doctor_id: string;
  commission_pct: number; // basis points
  effective_from: string; // date
  effective_to: string | null; // date, null = current
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export interface CpPatient {
  id: string;
  patient_no: string;
  full_name: string;
  father_name: string | null;
  gender: GenderType;
  date_of_birth: string | null; // date
  age_years: number | null;
  blood_group: BloodGroupType;
  cnic: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  known_allergies: string | null;
  chronic_conditions: string | null;
  notes: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpPatientVisit {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  visit_date: string; // date
  visit_time: string; // timetz
  chief_complaint: string | null;
  diagnosis: string | null;
  prescription: string | null;
  consultation_fee: number; // paisas
  discount_amount: number; // paisas
  net_fee: number; // paisas — generated column
  payment_method_id: string | null;
  payment_status: PaymentStatus;
  follow_up_date: string | null; // date
  is_follow_up: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpBpLog {
  id: string;
  patient_id: string;
  visit_id: string | null;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measured_at: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

// ─── Pharmacy ─────────────────────────────────────────────────────────────────

export interface CpPharmacyInventory {
  id: string;
  medicine_name: string;
  generic_name: string | null;
  manufacturer: string | null;
  batch_no: string | null;
  barcode: string | null;
  unit: string;
  pack_size: number;
  cost_price_per_unit: number; // paisas
  selling_price_per_unit: number; // paisas
  quantity: number;
  low_stock_threshold: number;
  expiry_date: string | null; // date
  location: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpPharmacySale {
  id: string;
  sale_date: string; // date
  patient_id: string | null;
  visit_id: string | null;
  inventory_item_id: string;
  quantity_sold: number;
  unit_price: number; // paisas
  discount_amount: number; // paisas
  total_amount: number; // paisas — generated column
  payment_method_id: string | null;
  payment_status: PaymentStatus;
  notes: string | null;
  sold_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpPharmacyRevenueSplit {
  id: string;
  clinic_pct: number; // basis points
  doctor_pct: number; // basis points
  staff_pct: number; // basis points
  effective_from: string; // date
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Laboratory ───────────────────────────────────────────────────────────────

export interface CpLabTest {
  id: string;
  test_name: string;
  test_code: string | null;
  category: string | null;
  price: number; // paisas
  cost: number; // paisas
  reference_range: string | null;
  unit: string | null;
  turnaround_time: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpLabTestLog {
  id: string;
  log_date: string; // date
  patient_id: string | null;
  visit_id: string | null;
  test_id: string;
  quantity: number;
  unit_price: number; // paisas
  discount_amount: number; // paisas
  total_amount: number; // paisas — generated column
  result_value: string | null;
  result_unit: string | null;
  is_abnormal: boolean;
  result_notes: string | null;
  payment_method_id: string | null;
  payment_status: PaymentStatus;
  report_issued: boolean;
  report_issued_at: string | null;
  performed_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpLabChemical {
  id: string;
  chemical_name: string;
  manufacturer: string | null;
  batch_no: string | null;
  unit: string;
  quantity_in_stock: number;
  low_stock_threshold: number;
  cost_per_unit: number; // paisas
  expiry_date: string | null; // date
  location: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpLabMachinery {
  id: string;
  machine_name: string;
  model_no: string | null;
  serial_no: string | null;
  manufacturer: string | null;
  purchase_date: string | null; // date
  purchase_cost: number | null; // paisas
  warranty_expiry: string | null; // date
  last_maintenance_date: string | null; // date
  next_maintenance_date: string | null; // date
  maintenance_interval_days: number | null;
  is_active: boolean;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpLabMachineryMaintenance {
  id: string;
  machine_id: string;
  maintenance_date: string; // date
  maintenance_type: string;
  cost: number; // paisas
  performed_by: string | null;
  notes: string | null;
  next_due_date: string | null; // date
  created_by: string | null;
  created_at: string;
}

export interface CpLabExpense {
  id: string;
  expense_date: string; // date
  expense_head_id: string | null;
  custom_head: string | null;
  amount: number; // paisas
  description: string | null;
  receipt_url: string | null;
  payment_method_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpLabStaff {
  id: string;
  full_name: string;
  designation: string;
  phone: string | null;
  cnic: string | null;
  monthly_salary: number; // paisas
  join_date: string | null; // date
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── X-Ray ────────────────────────────────────────────────────────────────────

export interface CpXrayPartner {
  id: string;
  partner_name: string;
  partner_type: string;
  phone: string | null;
  bank_account: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpXrayRevenue {
  id: string;
  revenue_date: string; // date
  gross_amount: number; // paisas
  description: string | null;
  patient_count: number;
  payment_method_id: string | null;
  payment_status: PaymentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpXrayPartnerSplit {
  id: string;
  revenue_id: string;
  partner_id: string;
  split_pct: number; // basis points
  split_amount: number | null; // paisas
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpXrayExpense {
  id: string;
  expense_date: string; // date
  revenue_id: string | null;
  expense_head_id: string | null;
  custom_head: string | null;
  amount: number; // paisas
  description: string | null;
  receipt_url: string | null;
  payment_method_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface CpExpense {
  id: string;
  expense_date: string; // date
  department_id: string | null;
  expense_head_id: string | null;
  custom_head: string | null;
  amount: number; // paisas
  description: string;
  receipt_url: string | null;
  payment_method_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpPayment {
  id: string;
  payment_date: string; // date
  department_id: string;
  payment_method_id: string;
  amount: number; // paisas
  reference_no: string | null;
  source_type: string;
  source_id: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Staff & Payroll ──────────────────────────────────────────────────────────

export interface CpStaff {
  id: string;
  full_name: string;
  designation: string;
  department_id: string | null;
  phone: string | null;
  cnic: string | null;
  email: string | null;
  join_date: string | null; // date
  monthly_salary: number; // paisas
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CpStaffSalary {
  id: string;
  staff_id: string;
  salary_month: string; // date (first of month)
  base_salary: number; // paisas
  bonus: number; // paisas
  deductions: number; // paisas
  net_salary: number; // paisas — generated column
  payment_method_id: string | null;
  status: SalaryStatus;
  paid_at: string | null;
  paid_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface CpAuditLog {
  id: number;
  table_name: string;
  record_id: string | null;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: string;
}

// ─── View Types ───────────────────────────────────────────────────────────────

export interface DailyRevenueSummary {
  summary_date: string;
  department: string;
  revenue_paisas: number;
}

export interface LowStockAlert {
  source: "pharmacy" | "laboratory";
  id: string;
  item_name: string;
  current_stock: number;
  low_stock_threshold: number;
  expiry_date: string | null;
}

// ─── Joined / Enriched types (for UI) ────────────────────────────────────────

export interface PatientVisitWithRelations extends CpPatientVisit {
  patient?: CpPatient;
  doctor?: CpDoctor;
  payment_method?: CpPaymentMethod;
  created_by_user?: Pick<CpUser, "id" | "full_name">;
}

export interface PharmacySaleWithRelations extends CpPharmacySale {
  inventory_item?: CpPharmacyInventory;
  patient?: CpPatient;
  payment_method?: CpPaymentMethod;
}

export interface LabTestLogWithRelations extends CpLabTestLog {
  test?: CpLabTest;
  patient?: CpPatient;
  payment_method?: CpPaymentMethod;
}

export interface XrayRevenueWithSplits extends CpXrayRevenue {
  splits?: (CpXrayPartnerSplit & { partner: CpXrayPartner })[];
  payment_method?: CpPaymentMethod;
}

// ─── UI / Form types ──────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DateRangeFilter {
  from: string;
  to: string;
}

export interface DashboardStats {
  totalPatients: number;
  todayVisits: number;
  todayRevenue: number; // paisas
  pendingPayments: number;
  lowStockCount: number;
  monthRevenue: number; // paisas
}
