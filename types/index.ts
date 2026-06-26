// =============================================================================
// ClinicPulse — TypeScript Types
// Mirrors the Supabase PostgreSQL schema exactly
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

/** Matches the department enum used in cp_expense_heads and cp_expenses */
export type DepartmentType = "opd" | "pharmacy" | "lab" | "xray" | "general";

export type PaymentMethodEnum =
  | "cash"
  | "jazzcash"
  | "easypaisa"
  | "bank_transfer";

export type StaffType = "full_time" | "part_time" | "shift_based";

export type LabPaymentStatus = "pending" | "completed" | "refunded";

export type ExpenseStatus = "active" | "void";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

// ─── cp_users ─────────────────────────────────────────────────────────────────

export interface CpUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── cp_settings ──────────────────────────────────────────────────────────────

export interface CpSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

// ─── cp_payment_methods ───────────────────────────────────────────────────────

export interface CpPaymentMethod {
  id: string;
  method: PaymentMethodEnum;
  label: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
}

// ─── cp_expense_heads ─────────────────────────────────────────────────────────

export interface CpExpenseHead {
  id: string;
  name: string;
  department: DepartmentType;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  deleted_at: string | null;
}

// ─── cp_doctors ───────────────────────────────────────────────────────────────

export interface CpDoctor {
  id: string;
  name: string;
  specialization: string | null;
  phone: string | null;
  email: string | null;
  earning_model: DoctorEarningModel;
  monthly_salary: number | null; // paisas (bigint)
  commission_pct: number | null; // numeric
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── cp_staff ─────────────────────────────────────────────────────────────────

export interface CpStaff {
  id: string;
  name: string;
  phone: string | null;
  staff_type: StaffType;
  department: string | null;
  doctor_id: string | null;
  monthly_salary: number; // bigint
  join_date: string | null; // date
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── cp_patients ──────────────────────────────────────────────────────────────

export interface CpPatient {
  id: string;
  patient_no: number; // serial added via migration
  name: string;
  phone: string | null;
  gender: GenderType;
  blood_group: BloodGroupType | null;
  date_of_birth: string | null; // date
  address: string | null;
  history: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── cp_bp_logs ───────────────────────────────────────────────────────────────

export interface CpBpLog {
  id: string;
  patient_id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  notes: string | null;
  recorded_at: string;
  recorded_by: string | null;
}

// ─── cp_patient_visits ────────────────────────────────────────────────────────

export interface CpPatientVisit {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  visit_date: string; // date
  fee_paisas: number; // bigint
  payment_method: PaymentMethodEnum | null;
  diagnosis: string | null;
  prescription: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ─── cp_pharmacy_inventory ────────────────────────────────────────────────────

export interface CpPharmacyInventory {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  unit: string;
  stock_qty: number; // integer
  reorder_level: number; // integer
  cost_price_paisas: number; // bigint
  sale_price_paisas: number; // bigint
  expiry_date: string | null; // date
  batch_number: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── cp_pharmacy_sales (HEADER) ───────────────────────────────────────────────

export interface CpPharmacySale {
  id: string;
  sale_date: string; // date
  patient_id: string | null;
  doctor_id: string | null;
  total_paisas: number; // bigint
  payment_method: PaymentMethodEnum | null;
  discount_paisas: number; // bigint
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ─── cp_pharmacy_sale_items (LINE ITEMS) ──────────────────────────────────────

export interface CpPharmacySaleItem {
  id: string;
  sale_id: string;
  inventory_id: string;
  qty: number; // integer
  unit_price_paisas: number; // bigint
  total_paisas: number; // bigint
}

// ─── cp_lab_tests ─────────────────────────────────────────────────────────────

export interface CpLabTest {
  id: string;
  name: string;
  test_code: string | null;
  category: string | null;
  price_paisas: number; // bigint
  reference_range: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── cp_lab_test_logs ─────────────────────────────────────────────────────────

export interface CpLabTestLog {
  id: string;
  test_date: string; // date
  patient_id: string | null;
  patient_name: string | null;
  test_id: string;
  test_name: string;
  price_paisas: number; // bigint
  payment_method: PaymentMethodEnum | null;
  doctor_id: string | null;
  result: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Added via migration:
  payment_status: LabPaymentStatus | null;
  qty: number | null; // integer
  deleted_at: string | null;
}

// ─── cp_lab_chemicals ─────────────────────────────────────────────────────────

export interface CpLabChemical {
  id: string;
  name: string;
  quantity: number; // numeric
  unit: string;
  reorder_level: number; // numeric
  cost_price_paisas: number;
  supplier: string | null;
  last_restocked: string | null; // date or timestamptz
  expiry_date: string | null; // date
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null; // added via migration
}

// ─── cp_lab_machinery ─────────────────────────────────────────────────────────

export interface CpLabMachinery {
  id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null; // date
  last_service: string | null; // date
  next_service: string | null; // date
  status: string; // text (free-form)
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null; // added via migration
}

// ─── cp_lab_maintenance ───────────────────────────────────────────────────────

export interface CpLabMaintenance {
  id: string;
  machinery_id: string;
  service_date: string; // date
  description: string | null;
  cost_paisas: number; // bigint
  technician: string | null;
  next_service: string | null; // date
  created_by: string | null;
  created_at: string;
}

// ─── cp_xray_partners ─────────────────────────────────────────────────────────

export interface CpXrayPartner {
  id: string;
  name: string;
  phone: string | null;
  split_pct: number; // numeric
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── cp_xray_revenue ──────────────────────────────────────────────────────────

export interface CpXrayRevenue {
  id: string;
  revenue_date: string; // date
  patient_name: string | null;
  patient_id: string | null;
  service_type: string | null;
  amount_paisas: number; // bigint
  payment_method: PaymentMethodEnum | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ─── cp_expenses ──────────────────────────────────────────────────────────────

export interface CpExpense {
  id: string;
  expense_date: string; // date
  head_id: string | null;
  head_name: string;
  department: DepartmentType;
  amount_paisas: number; // bigint
  payment_method: PaymentMethodEnum | null;
  description: string | null;
  status: ExpenseStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── cp_salary_records ────────────────────────────────────────────────────────

export interface CpSalaryRecord {
  id: string;
  staff_id: string;
  month: string; // date (first of month)
  base_salary_paisas: number;
  working_days: number;
  present_days: number;
  earned_paisas: number; // generated column
  deductions_paisas: number;
  net_paisas: number;
  payment_method: PaymentMethodEnum | null;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ─── cp_audit_logs ────────────────────────────────────────────────────────────

export interface CpAuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ─── Joined / Enriched types (for UI) ────────────────────────────────────────

export interface PatientVisitWithRelations extends CpPatientVisit {
  patient?: CpPatient;
  doctor?: CpDoctor;
  created_by_user?: Pick<CpUser, "id" | "full_name">;
}

export interface PharmacySaleWithRelations extends CpPharmacySale {
  items?: (CpPharmacySaleItem & { inventory?: CpPharmacyInventory })[];
  patient?: CpPatient;
  doctor?: CpDoctor;
}

export interface LabTestLogWithRelations extends CpLabTestLog {
  test?: CpLabTest;
  patient?: CpPatient;
  doctor?: CpDoctor;
}

export interface LabMaintenanceWithRelations extends CpLabMaintenance {
  machinery?: CpLabMachinery;
}

export interface XrayRevenueWithRelations extends CpXrayRevenue {
  patient?: CpPatient;
}

export interface SalaryRecordWithRelations extends CpSalaryRecord {
  staff?: CpStaff;
}

// ─── Utility / UI types ───────────────────────────────────────────────────────

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
  lowStockCount: number;
  monthRevenue: number; // paisas
}
