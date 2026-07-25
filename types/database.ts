// =============================================================================
// ClinicPulse — Supabase Database Type Stubs
// The Database generic is used to type Supabase client queries.
// These must match the actual Supabase DB column names exactly.
// =============================================================================

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

// config-driven: setting_key (text) + setting_value (jsonb)
type CpSettingRow = {
  id: string;
  setting_key: string;
  setting_value: unknown; // jsonb
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type CpSettingInsert = {
  id?: string;
  setting_key: string;
  setting_value: unknown;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

// payment_method is a direct enum slug, NOT a FK to a separate table
type CpPaymentMethodRow = {
  id: string;
  method: "cash" | "jazzcash" | "easypaisa" | "bank_transfer";
  label: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
};

type CpDoctorRow = {
  id: string;
  name: string;
  specialization: string | null;
  phone: string | null;
  email: string | null;
  earning_model: "salaried" | "commission";
  monthly_salary: number | null; // bigint (paisas)
  commission_pct: number | null; // numeric (direct %, 0-100)
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpPatientRow = {
  id: string;
  patient_no: number; // serial
  name: string;
  phone: string | null;
  gender: "male" | "female" | "other";
  blood_group: string | null;
  date_of_birth: string | null;
  address: string | null;
  history: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpPatientVisitRow = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  visit_date: string;
  voucher_no: number | null;
  fee_paisas: number; // bigint
  payment_method: "cash" | "jazzcash" | "easypaisa" | "bank_transfer" | null;
  payment_status: "paid" | "due" | "partial";
  paid_amount_paisas: number | null; // bigint; partial payment amount; NULL = full fee paid
  chief_complaint: string | null;
  diagnosis: string | null;
  prescription: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type CpPharmacyInventoryRow = {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  unit: string;
  stock_qty: number;
  reorder_level: number;
  cost_price_paisas: number; // bigint
  sale_price_paisas: number; // bigint
  batch_number: string | null;
  expiry_date: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// pharmacy uses header + line-items pattern
type CpPharmacySaleRow = {
  id: string;
  sale_date: string;
  patient_id: string | null;
  patient_name: string | null;
  doctor_id: string | null;
  total_paisas: number; // bigint
  discount_paisas: number; // bigint
  payment_method: "cash" | "jazzcash" | "easypaisa" | "bank_transfer" | null;
  notes: string | null;
  sold_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type CpPharmacySaleItemRow = {
  id: string;
  sale_id: string;
  inventory_id: string;
  qty: number;
  unit_price_paisas: number; // bigint
  total_paisas: number; // bigint
  created_at: string;
};

type CpLabTestRow = {
  id: string;
  name: string;
  category: string | null;
  price_paisas: number; // bigint
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
  specimen_type: string | null;
  methodology: string | null;
  department: string | null;
  specialties: string[];
};

type CpLabTestLogRow = {
  id: string;
  test_date: string; // date
  patient_id: string | null;
  patient_name: string | null;
  test_id: string;
  test_name: string;
  price_paisas: number; // bigint
  payment_method: "cash" | "jazzcash" | "easypaisa" | "bank_transfer" | null;
  doctor_id: string | null;
  result: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  payment_status: "pending" | "completed" | "refunded" | null;
  qty: number | null;
  deleted_at: string | null;
};

type CpLabChemicalRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  cost_price_paisas: number;
  supplier: string | null;
  last_restocked: string | null;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpLabMachineryRow = {
  id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  last_service: string | null;
  next_service: string | null;
  status: string;
  purchase_price_paisas: number | null; // bigint (paisas)
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpLabMaintenanceRow = {
  id: string;
  machinery_id: string;
  service_date: string;
  description: string | null;
  cost_paisas: number;
  technician: string | null;
  next_service: string | null;
  created_by: string | null;
  created_at: string;
};

// no gross_amount — it's amount_paisas; no payment_method_id — direct enum
type CpXrayRevenueRow = {
  id: string;
  revenue_date: string;
  patient_name: string | null;
  patient_id: string | null;
  service_type: string | null;
  amount_paisas: number; // bigint
  payment_method: "cash" | "jazzcash" | "easypaisa" | "bank_transfer" | null;
  payment_status: "paid" | "due";
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

// no partner_name — just name; no partner_type; split_pct direct on partner
type CpXrayPartnerRow = {
  id: string;
  name: string;
  phone: string | null;
  split_pct: number; // numeric (direct %, 0-100)
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpXrayPartnerInsert = {
  id?: string;
  name: string;
  phone?: string | null;
  split_pct?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

// unified expense table — no cp_departments FK, department is direct enum
type CpExpenseRow = {
  id: string;
  expense_date: string;
  head_id: string | null;
  head_name: string;
  department: "opd" | "pharmacy" | "lab" | "xray" | "general";
  amount_paisas: number; // bigint
  payment_method: "cash" | "jazzcash" | "easypaisa" | "bank_transfer" | null;
  description: string | null;
  status: "active" | "void";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type CpExpenseInsert = {
  id?: string;
  expense_date?: string;
  head_id?: string | null;
  head_name: string;
  department: "opd" | "pharmacy" | "lab" | "xray" | "general";
  amount_paisas: number;
  payment_method?: "cash" | "jazzcash" | "easypaisa" | "bank_transfer" | null;
  description?: string | null;
  status?: "active" | "void";
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

// department is a direct enum, not a FK to cp_departments
type CpExpenseHeadRow = {
  id: string;
  name: string;
  department: "opd" | "pharmacy" | "lab" | "xray" | "general";
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  deleted_at: string | null;
};

type CpExpenseHeadInsert = {
  id?: string;
  name: string;
  department?: "opd" | "pharmacy" | "lab" | "xray" | "general";
  is_active?: boolean;
  is_system?: boolean;
  sort_order?: number;
  created_at?: string;
  deleted_at?: string | null;
};

type CpStaffRow = {
  id: string;
  name: string;
  phone: string | null;
  staff_type: string; // StaffType enum text
  department: string | null;
  doctor_id: string | null;
  monthly_salary: number; // bigint (paisas)
  join_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CpBpLogRow = {
  id: string;
  patient_id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  notes: string | null;
  recorded_at: string;
  recorded_by: string | null;
  created_at: string;
};

type CpBpLogInsert = {
  id?: string;
  patient_id: string;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  notes?: string | null;
  recorded_at?: string;
  recorded_by?: string | null;
  created_at?: string;
};

type CpSalaryRecordRow = {
  id: string;
  staff_id: string;
  month: string; // date (first day of month)
  base_salary: number; // bigint (paisas)
  deductions: number;
  net_salary: number;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type CpPharmacyRevenueSplitRow = {
  id: string;
  doctor_pct: number;
  clinic_pct: number;
  staff_pct: number;
  effective_from: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type CpPharmacyRevenueSplitInsert = {
  id?: string;
  doctor_pct: number;
  clinic_pct: number;
  staff_pct: number;
  effective_from?: string;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
};

type CpXrayPartnerSplitRow = {
  id: string;
  revenue_id: string;
  partner_id: string;
  split_pct: number;
  split_amount: number;
  created_at: string;
};

type CpXrayPartnerSplitInsert = {
  id?: string;
  revenue_id: string;
  partner_id: string;
  split_pct: number;
  split_amount: number;
  created_at?: string;
};

type CpLabTestParameterRow = {
  id: string;
  test_id: string;
  name: string;
  unit: string | null;
  group_name: string | null;
  sort_order: number;
  input_type: "numeric" | "text" | "option" | "formula";
  formula: string | null;
  options: string[] | null;
  code: string | null;
  decimals: number;
  default_value: string | null;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
};

type CpLabTestParameterInsert = {
  test_id: string;
  name: string;
  unit?: string | null;
  group_name?: string | null;
  sort_order?: number;
  input_type?: "numeric" | "text" | "option" | "formula";
  formula?: string | null;
  options?: string[] | null;
  code?: string | null;
  decimals?: number;
  default_value?: string | null;
  is_active?: boolean;
};

type CpLabReferenceRangeRow = {
  id: string;
  parameter_id: string;
  sex: "any" | "male" | "female";
  age_min_years: number | null;
  age_max_years: number | null;
  low: number | null;
  high: number | null;
  text_value: string | null;
  critical_low: number | null;
  critical_high: number | null;
  note: string | null;
  created_at: string;
};

type CpLabReferenceRangeInsert = {
  parameter_id: string;
  sex?: "any" | "male" | "female";
  age_min_years?: number | null;
  age_max_years?: number | null;
  low?: number | null;
  high?: number | null;
  text_value?: string | null;
  critical_low?: number | null;
  critical_high?: number | null;
  note?: string | null;
};

type CpLabResultValueRow = {
  id: string;
  test_log_id: string;
  parameter_id: string;
  value_numeric: number | null;
  value_text: string | null;
  flag: "normal" | "low" | "high" | "critical_low" | "critical_high" | null;
  created_at: string;
  updated_at: string;
};

type CpLabResultValueInsert = {
  test_log_id: string;
  parameter_id: string;
  value_numeric?: number | null;
  value_text?: string | null;
  flag?: "normal" | "low" | "high" | "critical_low" | "critical_high" | null;
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
      cp_payment_methods: Tbl<CpPaymentMethodRow>;
      cp_doctors: Tbl<CpDoctorRow>;
      cp_patients: Tbl<CpPatientRow>;
      cp_patient_visits: Tbl<CpPatientVisitRow>;
      cp_pharmacy_inventory: Tbl<CpPharmacyInventoryRow>;
      cp_pharmacy_sales: Tbl<CpPharmacySaleRow>;
      cp_pharmacy_sale_items: Tbl<CpPharmacySaleItemRow>;
      cp_lab_tests: Tbl<CpLabTestRow>;
      cp_lab_test_logs: Tbl<CpLabTestLogRow>;
      cp_lab_test_parameters: Tbl<CpLabTestParameterRow, CpLabTestParameterInsert>;
      cp_lab_reference_ranges: Tbl<CpLabReferenceRangeRow, CpLabReferenceRangeInsert>;
      cp_lab_result_values: Tbl<CpLabResultValueRow, CpLabResultValueInsert>;
      cp_lab_chemicals: Tbl<CpLabChemicalRow>;
      cp_lab_machinery: Tbl<CpLabMachineryRow>;
      cp_lab_maintenance: Tbl<CpLabMaintenanceRow>;
      cp_xray_revenue: Tbl<CpXrayRevenueRow>;
      cp_xray_partners: Tbl<CpXrayPartnerRow, CpXrayPartnerInsert>;
      cp_expenses: Tbl<CpExpenseRow, CpExpenseInsert>;
      cp_expense_heads: Tbl<CpExpenseHeadRow, CpExpenseHeadInsert>;
      cp_staff: Tbl<CpStaffRow>;
      cp_bp_logs: Tbl<CpBpLogRow, CpBpLogInsert>;
      cp_salary_records: Tbl<CpSalaryRecordRow>;
      cp_pharmacy_revenue_split: Tbl<CpPharmacyRevenueSplitRow, CpPharmacyRevenueSplitInsert>;
      cp_xray_partner_splits: Tbl<CpXrayPartnerSplitRow, CpXrayPartnerSplitInsert>;
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
        Relationships: [];
      };
    };
    Functions: {
      get_my_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      /** Atomically replaces every reference range on a parameter. */
      replace_parameter_ranges: {
        Args: { p_parameter_id: string; p_ranges: unknown };
        Returns: CpLabReferenceRangeRow[];
      };
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
