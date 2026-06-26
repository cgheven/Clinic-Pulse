// =============================================================================
// ClinicPulse — Supabase Database Type Stubs
// The Database generic is used to type Supabase client queries.
// Expand row-level types here as needed per table.
// =============================================================================

// Shared reusable row types
type CpUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "accountant";
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpSettingRow = {
  id: string;
  setting_group: string;
  key: string;
  value: string;
  label: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type CpDepartmentRow = {
  id: string;
  name: string;
  slug: string;
  dept_type: "opd" | "pharmacy" | "laboratory" | "xray" | "general";
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpPaymentMethodRow = {
  id: string;
  name: string;
  slug: string;
  icon_name: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type CpDoctorRow = {
  id: string;
  full_name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  cnic: string | null;
  earning_model: "salaried" | "commission";
  monthly_salary: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpPatientRow = {
  id: string;
  patient_no: string;
  full_name: string;
  father_name: string | null;
  gender: "male" | "female" | "other";
  date_of_birth: string | null;
  age_years: number | null;
  blood_group: string;
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
};

type CpPatientVisitRow = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  visit_date: string;
  visit_time: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  prescription: string | null;
  consultation_fee: number;
  discount_amount: number;
  net_fee: number;
  payment_method_id: string | null;
  payment_status: "pending" | "completed" | "cancelled" | "refunded";
  follow_up_date: string | null;
  is_follow_up: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpPharmacyInventoryRow = {
  id: string;
  medicine_name: string;
  generic_name: string | null;
  manufacturer: string | null;
  batch_no: string | null;
  barcode: string | null;
  unit: string;
  pack_size: number;
  cost_price_per_unit: number;
  selling_price_per_unit: number;
  quantity: number;
  low_stock_threshold: number;
  expiry_date: string | null;
  location: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpPharmacySaleRow = {
  id: string;
  sale_date: string;
  patient_id: string | null;
  visit_id: string | null;
  inventory_item_id: string;
  quantity_sold: number;
  unit_price: number;
  discount_amount: number;
  total_amount: number;
  payment_method_id: string | null;
  payment_status: "pending" | "completed" | "cancelled" | "refunded";
  notes: string | null;
  sold_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpLabTestRow = {
  id: string;
  test_name: string;
  test_code: string | null;
  category: string | null;
  price: number;
  cost: number;
  reference_range: string | null;
  unit: string | null;
  turnaround_time: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpLabTestLogRow = {
  id: string;
  log_date: string;
  patient_id: string | null;
  visit_id: string | null;
  test_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total_amount: number;
  result_value: string | null;
  result_unit: string | null;
  is_abnormal: boolean;
  result_notes: string | null;
  payment_method_id: string | null;
  payment_status: "pending" | "completed" | "cancelled" | "refunded";
  report_issued: boolean;
  report_issued_at: string | null;
  performed_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpLabChemicalRow = {
  id: string;
  chemical_name: string;
  manufacturer: string | null;
  batch_no: string | null;
  unit: string;
  quantity_in_stock: number;
  low_stock_threshold: number;
  cost_per_unit: number;
  expiry_date: string | null;
  location: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpLabMachineryRow = {
  id: string;
  machine_name: string;
  model_no: string | null;
  serial_no: string | null;
  manufacturer: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  warranty_expiry: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_interval_days: number | null;
  is_active: boolean;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpXrayRevenueRow = {
  id: string;
  revenue_date: string;
  gross_amount: number;
  description: string | null;
  patient_count: number;
  payment_method_id: string | null;
  payment_status: "pending" | "completed" | "cancelled" | "refunded";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpXrayPartnerRow = {
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
};

type CpXrayPartnerSplitRow = {
  id: string;
  revenue_id: string;
  partner_id: string;
  split_pct: number;
  split_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpExpenseRow = {
  id: string;
  expense_date: string;
  department_id: string | null;
  expense_head_id: string | null;
  custom_head: string | null;
  amount: number;
  description: string;
  receipt_url: string | null;
  payment_method_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpExpenseInsert = {
  id?: string;
  expense_date?: string;
  department_id?: string | null;
  expense_head_id?: string | null;
  custom_head?: string | null;
  amount: number;
  description: string;
  receipt_url?: string | null;
  payment_method_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

type CpStaffRow = {
  id: string;
  full_name: string;
  designation: string;
  department_id: string | null;
  phone: string | null;
  cnic: string | null;
  email: string | null;
  join_date: string | null;
  monthly_salary: number;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// ─── Added for Settings module ────────────────────────────────────────────────

type CpExpenseHeadRow = {
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
};

type CpExpenseHeadInsert = {
  id?: string;
  name: string;
  slug: string;
  department_id?: string | null;
  is_active?: boolean;
  is_system?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

type CpPharmacyRevenueSplitRow = {
  id: string;
  clinic_pct: number;
  doctor_pct: number;
  staff_pct: number;
  effective_from: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type CpPharmacyRevenueSplitInsert = {
  id?: string;
  clinic_pct: number;
  doctor_pct: number;
  staff_pct: number;
  effective_from?: string;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

type CpDoctorCommissionRow = {
  id: string;
  doctor_id: string;
  commission_pct: number;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type CpDoctorCommissionInsert = {
  id?: string;
  doctor_id: string;
  commission_pct: number;
  effective_from?: string;
  effective_to?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ─── Precise Insert types for settings mutations ──────────────────────────────

type CpSettingInsert = {
  id?: string;
  setting_group: string;
  key: string;
  value: string;
  label?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

type CpXrayPartnerInsert = {
  id?: string;
  partner_name: string;
  partner_type?: string;
  phone?: string | null;
  bank_account?: string | null;
  is_active?: boolean;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

type CpXrayExpenseRow = {
  id: string;
  expense_date: string;
  revenue_id: string | null;
  expense_head_id: string | null;
  custom_head: string | null;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  payment_method_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpXrayExpenseInsert = {
  id?: string;
  expense_date?: string;
  revenue_id?: string | null;
  expense_head_id?: string | null;
  custom_head?: string | null;
  amount: number;
  description?: string | null;
  receipt_url?: string | null;
  payment_method_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

// ─── OPD — cp_bp_logs ────────────────────────────────────────────────────────

type CpBpLogRow = {
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
};

type CpBpLogInsert = {
  id?: string;
  patient_id: string;
  visit_id?: string | null;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  measured_at?: string;
  notes?: string | null;
  recorded_by?: string | null;
  created_at?: string;
};

// ─── Lab expenses ─────────────────────────────────────────────────────────────

type CpLabExpenseRow = {
  id: string;
  expense_date: string;
  expense_head_id: string | null;
  custom_head: string | null;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  payment_method_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpLabExpenseInsert = {
  id?: string;
  expense_date?: string;
  expense_head_id?: string | null;
  custom_head?: string | null;
  amount: number;
  description?: string | null;
  receipt_url?: string | null;
  payment_method_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

// ─── Lab machinery maintenance ────────────────────────────────────────────────

type CpLabMachineryMaintenanceRow = {
  id: string;
  machine_id: string;
  maintenance_date: string;
  maintenance_type: string;
  cost: number;
  performed_by: string | null;
  notes: string | null;
  next_due_date: string | null;
  created_by: string | null;
  created_at: string;
};

type CpLabMachineryMaintenanceInsert = {
  id?: string;
  machine_id: string;
  maintenance_date?: string;
  maintenance_type: string;
  cost?: number;
  performed_by?: string | null;
  notes?: string | null;
  next_due_date?: string | null;
  created_by?: string | null;
  created_at?: string;
};

// Helper: every table must have Relationships for Supabase v2 TypeScript SDK
type Tbl<R, I = Partial<R>, U = Partial<R>> = {
  Row: R;
  Insert: I;
  Update: U;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      cp_users: Tbl<CpUserRow>;
      cp_settings: Tbl<CpSettingRow, CpSettingInsert>;
      cp_departments: Tbl<CpDepartmentRow>;
      cp_payment_methods: Tbl<CpPaymentMethodRow>;
      cp_doctors: Tbl<CpDoctorRow>;
      cp_patients: Tbl<CpPatientRow>;
      cp_patient_visits: Tbl<CpPatientVisitRow>;
      cp_pharmacy_inventory: Tbl<CpPharmacyInventoryRow>;
      cp_pharmacy_sales: Tbl<CpPharmacySaleRow>;
      cp_lab_tests: Tbl<CpLabTestRow>;
      cp_lab_test_logs: Tbl<CpLabTestLogRow>;
      cp_lab_chemicals: Tbl<CpLabChemicalRow>;
      cp_lab_machinery: Tbl<CpLabMachineryRow>;
      cp_lab_expenses: Tbl<CpLabExpenseRow, CpLabExpenseInsert>;
      cp_lab_machinery_maintenance: Tbl<CpLabMachineryMaintenanceRow, CpLabMachineryMaintenanceInsert>;
      cp_xray_revenue: Tbl<CpXrayRevenueRow>;
      cp_xray_partners: Tbl<CpXrayPartnerRow, CpXrayPartnerInsert>;
      cp_xray_partner_splits: Tbl<CpXrayPartnerSplitRow>;
      cp_xray_expenses: Tbl<CpXrayExpenseRow, CpXrayExpenseInsert>;
      cp_expenses: Tbl<CpExpenseRow, CpExpenseInsert>;
      cp_staff: Tbl<CpStaffRow>;
      cp_expense_heads: Tbl<CpExpenseHeadRow, CpExpenseHeadInsert>;
      cp_pharmacy_revenue_split: Tbl<CpPharmacyRevenueSplitRow, CpPharmacyRevenueSplitInsert>;
      cp_doctor_commissions: Tbl<CpDoctorCommissionRow, CpDoctorCommissionInsert>;
      cp_bp_logs: Tbl<CpBpLogRow, CpBpLogInsert>;
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
        Relationships: [];
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [key: string]: string;
    };
  };
};
