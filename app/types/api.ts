// API contract types — mirror backend response/request schemas.

export type Role = 'superadmin' | 'admin' | 'guru' | 'siswa'
export type TenantType = 'smk' | 'kampus' | 'lembaga' | 'pt'

export interface Tenant {
  id: number
  name: string
  slug: string
  type: TenantType
  is_active: boolean
  contact_wa: string | null
  berlaku_dari: string | null
  berlaku_sampai: string | null
  max_guru: number | null
  max_siswa: number | null
  max_kelas: number | null
  deactivated_reason: string | null
  allowed_modules?: string[] | null
}

export interface TenantAdminInput {
  email: string
  full_name: string
  password?: string
}

export interface TenantCreate {
  name: string
  slug: string
  type: TenantType
  contact_wa?: string | null
  masa_berlaku_bulan: number
  max_guru?: number | null
  max_siswa?: number | null
  max_kelas?: number | null
  admin: TenantAdminInput
}

export interface TenantUpdate {
  name?: string
  type?: TenantType
  contact_wa?: string | null
  masa_berlaku_bulan?: number
  max_guru?: number | null
  max_siswa?: number | null
  max_kelas?: number | null
  allowed_modules?: string[] | null
}

/**
 * Per-tenant usage summary for the superadmin console.
 * Served by GET /api/v1/tenants/{id}/summary when the backend provides it;
 * the frontend must tolerate its absence (404) and render a "memuat…"
 * fallback from the tenant list data instead of mocking numbers.
 */
export interface TenantQuotaUsage {
  used: number | null
  limit: number | null
}

export interface TenantSummary {
  tenant_id: number
  guru: TenantQuotaUsage | null
  siswa: TenantQuotaUsage | null
  kelas: TenantQuotaUsage | null
  berlaku_sampai: string | null
  berlaku_dari: string | null
  days_remaining: number | null
  expired_soon: boolean
  admins?: User[] | null
}

export interface User {
  id: number
  email: string
  username: string | null
  full_name: string
  role: Role
  tenant_id: number | null
  is_active: boolean
  must_change_password: boolean
}

export interface LearningSettings {
  show_auto_check_details: boolean
  allow_late_submission: boolean
  allow_resubmission: boolean
}

export interface Me extends User {
  tenant_name: string | null
  enabled_modules?: string[]
  settings?: LearningSettings
}

export interface UserBulkItemInput {
  full_name: string
  email?: string | null
  username?: string | null
  password?: string | null
}

export interface UserBulkCreate {
  role: Role
  accounts: UserBulkItemInput[]
  tenant_id?: number | null
}

export interface UserBulkResultRow {
  index: number
  ok: boolean
  detail: string
  user_id: number | null
  email: string | null
  username: string | null
}

export interface UserBulkResult {
  created: number
  failed: number
  results: UserBulkResultRow[]
}

export interface AuditLog {
  id: number
  tenant_id: number | null
  actor_id: number | null
  actor_email: string
  actor_role: string
  action: string
  entity: string
  entity_id: number | null
  summary: string
  created_at: string | null
}

export type AuditLogListResponse = Paginated<AuditLog>

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AccessTokenResponse {
  access_token: string
  token_type: string
}

export type UserListResponse = Paginated<User>

export interface SchoolClass {
  id: number
  tenant_id: number
  name: string
  academic_year: string
  archived?: boolean
  guru_id: number
  guru: User | null
}

export interface ClassCreate {
  name: string
  academic_year: string
  guru_id: number
}

export interface EnrollmentCreate {
  siswa_id: number
}

export interface ClassDetail extends SchoolClass {
  students: User[]
}

export interface DashboardSummary {
  tenants?: number | null
  users?: number | null
  classes?: number | null
  guru?: number | null
  siswa?: number | null
}

export type Bp21Status = 'draft' | 'issued' | 'invalid'
export type Bp21TaxNature = 'final' | 'non_final'
/** `treaty` = SKD (kode fasilitas 7), `lainnya` = Fasilitas Lainnya (8); `skb`/`rate_0` are legacy values. */
export type Bp21TaxFacility = 'none' | 'dtp' | 'treaty' | 'lainnya' | 'skb' | 'rate_0'

/** One row of GET /referensi/objek-pajak (katalog objek pajak resmi, resolved for a facility). */
export interface ObjekPajak {
  kode: string
  nama: string
  pasal: string
  sifat: string | null
  kap_kjs: string
  tarif: number | null
  tarif_manual: boolean
  pph_manual: boolean
}

export interface Bp21Read {
  id: number
  tenant_id: number
  class_id: number | null
  siswa_id: number
  created_by_id: number
  status: Bp21Status
  withholding_number: string | null
  issued_at: string | null
  invalid_reason: string | null
  spt_flag: Bp21SptFlag | null
  tax_month: number
  tax_year: number
  electronic_signature_status: string
  withholder_npwp: string | null
  withholder_name: string | null
  withholder_nitku: string | null
  recipient_identity_number: string
  recipient_name: string
  recipient_address: string | null
  recipient_nitku: string | null
  ptkp_status: string | null
  ter_category: string | null
  calculation_method: string | null
  signer_id: number | null
  signer_name: string | null
  tax_object_code: string
  income_type: string
  tax_type: string | null
  tax_nature: Bp21TaxNature
  tax_facility: Bp21TaxFacility
  previous_gross_income: number
  gross_income: number
  dpp: number
  dpp_percent: number
  rate_percent: number
  income_tax: number
  kap_kjs: string | null
  document_type: string | null
  document_number: string | null
  document_date: string | null
  document_nitku: string | null
  score: number | null
  teacher_feedback: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Bp21Create {
  class_id?: number | null
  siswa_id?: number | null
  tax_month: number
  tax_year: number
  withholder_npwp?: string | null
  withholder_name?: string | null
  withholder_nitku?: string | null
  recipient_identity_number: string
  recipient_name: string
  recipient_address?: string | null
  recipient_nitku?: string | null
  ptkp_status?: string | null
  ter_category?: string | null
  tax_object_code: string
  income_type: string
  tax_nature: Bp21TaxNature
  tax_facility: Bp21TaxFacility
  previous_gross_income?: number
  gross_income: number
  dpp_percent: number
  rate_percent: number
  kap_kjs?: string | null
  document_type?: string | null
  document_number?: string | null
  document_date?: string | null
  document_nitku?: string | null
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export type Bp21ListResponse = Paginated<Bp21Read>

export interface Bp21Summary {
  draft: number
  issued: number
  invalid: number
  total: number
}
// BP26 shares the BP21 slip lifecycle; only the SPT flag is BP26-specific.
export type Bp26Status = Bp21Status
export type Bp26TaxNature = Bp21TaxNature
export type Bp26TaxFacility = Bp21TaxFacility

// Base shape for SP/CY (no treaty fields).
export type SetorBaseCreate = Omit<Bp21Create, 'ptkp_status' | 'negara_treaty' | 'pasal_treaty' | 'nomor_skd' | 'tarif_treaty_basis_points'>
export type SetorBaseRead = Omit<Bp21Read, 'ptkp_status'> & { ptkp_status: string | null }

// Unifikasi (Fase 5): BPNR/SP/CY reuse shared slip shapes via aliases.
// BPPU uses the full interface below (tax_type + tax_object_name + income_type).
export type BpnrStatus = Bp21Status
export type BpnrTaxNature = Bp21TaxNature
export type BpnrTaxFacility = Bp21TaxFacility
/** BPNR foreign-recipient fields (all optional on the wire). */
export interface BpnrExtra {
  recipient_address: string | null
  recipient_country: string | null
  recipient_birth_date: string | null
  recipient_birth_place: string | null
  recipient_passport_number: string | null
  recipient_kitas_number: string | null
  payment_method: string | null
  sp2d_number: string | null
}
export type BpnrRead = Bp26Read & Partial<BpnrExtra>
export type BpnrCreate = Bp26Create & Partial<BpnrExtra>
export type BpnrListResponse = Paginated<BpnrRead>
export type BpnrSummary = Bp21Summary
export type SpStatus = Bp21Status
export type SpTaxNature = Bp21TaxNature
export type SpTaxFacility = Bp21TaxFacility
// SP/CY have no counterparty: recipient fields are always null and DPP is
// entered directly (PPh = DPP x tarif), mirroring backend NO_COUNTERPARTY_TYPES.
export type SetorRead = Omit<SetorBaseRead, 'recipient_identity_number' | 'recipient_name'> & {
  recipient_identity_number: string | null
  recipient_name: string | null
}
export type SetorCreate = Omit<
  SetorBaseCreate,
  | 'recipient_identity_number'
  | 'recipient_name'
  | 'recipient_address'
  | 'recipient_nitku'
  | 'previous_gross_income'
  | 'gross_income'
  | 'dpp_percent'
> & { dpp: number }
export type SpRead = SetorRead
export type SpCreate = SetorCreate
export type SpListResponse = Paginated<SpRead>
export type SpSummary = Bp21Summary
export type CyStatus = Bp21Status
export type CyTaxNature = Bp21TaxNature
export type CyTaxFacility = Bp21TaxFacility
export type CyRead = SetorRead
export type CyCreate = SetorCreate
export type CyListResponse = Paginated<CyRead>
export type CySummary = Bp21Summary
export type Bp26SptFlag =
  | 'reported_in_spt'
  | 'objection_in_progress'
  | 'objection_completed'
  | 'objection_rejected_formal'
  | 'objection_withdrawal_review'
  | 'objection_withdrawal_accepted'
  | 'spt_audited'
  | 'spt_legal_process'

export type Bp21SptFlag = Bp26SptFlag

export interface Bp26Read {
  id: number
  tenant_id: number
  class_id: number | null
  siswa_id: number
  created_by_id: number
  status: Bp26Status
  withholding_number: string | null
  issued_at: string | null
  invalid_reason: string | null
  spt_flag: Bp26SptFlag | null
  tax_month: number
  tax_year: number
  electronic_signature_status: string
  recipient_identity_number: string
  recipient_name: string
  tax_type: string
  tax_object_code: string
  tax_object_name: string
  tax_nature: Bp26TaxNature
  tax_facility: Bp26TaxFacility
  gross_income: number
  dpp: number
  dpp_percent: number
  rate_percent: number
  income_tax: number
  kap_kjs: string | null
  negara_treaty: string | null
  pasal_treaty: string | null
  nomor_skd: string | null
  tarif_treaty_basis_points: number | null
  ter_category: string | null
  calculation_method: string | null
  signer_id: number | null
  signer_name: string | null
  document_type: string | null
  document_number: string | null
  document_date: string | null
  document_nitku: string | null
  score: number | null
  teacher_feedback: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Bp26Create {
  class_id?: number | null
  siswa_id?: number | null
  tax_month: number
  tax_year: number
  recipient_identity_number: string
  recipient_name: string
  tax_type?: string
  tax_object_code: string
  tax_object_name: string
  tax_nature: Bp26TaxNature
  tax_facility: Bp26TaxFacility
  gross_income: number
  dpp_percent: number
  rate_percent: number
  kap_kjs?: string | null
  negara_treaty?: string | null
  pasal_treaty?: string | null
  nomor_skd?: string | null
  tarif_treaty_basis_points?: number | null
  document_type?: string | null
  document_number?: string | null
  document_date?: string | null
  document_nitku?: string | null
}

export type Bp26ListResponse = Paginated<Bp26Read>
export type Bp26Summary = Bp21Summary

export interface Bp26ImportRowResult {
  row: number
  success: boolean
  id: number | null
  error: string | null
}

export interface Bp26ImportResult {
  total_rows: number
  imported: number
  failed: number
  results: Bp26ImportRowResult[]
}

export interface Bp26BulkIssueResult {
  issued: number
  failed: number
  results: Bp26ImportRowResult[]
}

export type Bp21ImportResult = Bp26ImportResult
export type Bp21BulkIssueResult = Bp26BulkIssueResult

/* --- BPPU: Bukti Pemotongan PPh Unifikasi (WPDN/BUT: PPh 4(2)/15/22/23) --- */

export type BppuStatus = Bp21Status
export type BppuTaxNature = Bp21TaxNature
export type BppuTaxFacility = Bp21TaxFacility
export type BppuSptFlag = Bp26SptFlag

export interface BppuRead {
  id: number
  tenant_id: number
  class_id: number | null
  siswa_id: number
  created_by_id: number
  status: BppuStatus
  withholding_number: string | null
  issued_at: string | null
  invalid_reason: string | null
  spt_flag: BppuSptFlag | null
  tax_month: number
  tax_year: number
  electronic_signature_status: string
  withholder_npwp: string | null
  withholder_name: string | null
  withholder_nitku: string | null
  recipient_identity_number: string
  recipient_name: string
  recipient_address: string | null
  recipient_nitku: string | null
  ptkp_status: string | null
  tax_type: string | null
  tax_object_code: string
  tax_object_name: string | null
  income_type: string | null
  tax_nature: BppuTaxNature
  tax_facility: BppuTaxFacility
  previous_gross_income: number
  gross_income: number
  dpp: number
  dpp_percent: number
  rate_percent: number
  income_tax: number
  kap_kjs: string | null
  negara_treaty: string | null
  pasal_treaty: string | null
  nomor_skd: string | null
  tarif_treaty_basis_points: number | null
  document_type: string | null
  document_number: string | null
  document_date: string | null
  document_nitku: string | null
  score: number | null
  teacher_feedback: string | null
  created_at: string | null
  updated_at: string | null
}

export interface BppuCreate {
  class_id?: number | null
  siswa_id?: number | null
  tax_month: number
  tax_year: number
  withholder_npwp?: string | null
  withholder_name?: string | null
  withholder_nitku?: string | null
  recipient_identity_number: string
  recipient_name: string
  recipient_address?: string | null
  recipient_nitku?: string | null
  tax_type?: string | null
  tax_object_code: string
  tax_object_name?: string | null
  income_type?: string | null
  tax_nature: BppuTaxNature
  tax_facility: BppuTaxFacility
  previous_gross_income?: number
  gross_income?: number
  dpp_percent?: number
  /** Dasar Pengenaan Pajak entered directly (BPPU form); backend stores it at 100%. */
  dpp?: number
  rate_percent: number
  kap_kjs?: string | null
  document_type?: string | null
  document_number?: string | null
  document_date?: string | null
  document_nitku?: string | null
}

export type BppuListResponse = Paginated<BppuRead>
export type BppuSummary = Bp21Summary

/* --- BPMP: Bukti Pemotongan Bulanan Pegawai Tetap (PPh 21 TER) --- */

export type BpmpStatus = Bp21Status
export type BpmpTaxNature = Bp21TaxNature
export type BpmpTaxFacility = Bp21TaxFacility
export type BpmpSptFlag = Bp26SptFlag
export type BpmpRead = Omit<BppuRead, never>
export type BpmpCreate = Omit<BppuCreate, never> & { ptkp_status?: string | null }
export type BpmpListResponse = Paginated<BpmpRead>
export type BpmpSummary = Bp21Summary
export type BpmpImportResult = BppuImportResult
export type BpmpBulkIssueResult = BppuBulkIssueResult

/* --- 1721-A1 / 1721-A2: read-only annual aggregates of issued BPMP slips --- */

export interface A1A2MonthlyRow {
  tax_month: number
  gross_income: number
  income_tax: number
  withholding_number: string | null
}

export interface A1A2Summary {
  form: string
  recipient_identity_number: string
  recipient_name: string
  tax_year: number
  annual_gross: number
  annual_tax: number
  months_covered: number[]
  slips_count: number
  ter_category: string | null
}

export interface A1A2Detail extends A1A2Summary {
  rows: A1A2MonthlyRow[]
}

export interface A1A2ListResponse {
  items: A1A2Summary[]
  total: number
}

export interface BppuImportRowResult {
  row: number
  success: boolean
  id: number | null
  error: string | null
}

export interface BppuImportResult {
  total_rows: number
  imported: number
  failed: number
  results: BppuImportRowResult[]
}

export interface BppuBulkIssueResult {
  issued: number
  failed: number
  results: BppuImportRowResult[]
}

export interface TierPtkp {
  id: number
  status_kode: string
  jumlah_ptkp: number
  tahun_pajak: number
  keterangan: string | null
  is_active: boolean
}

export interface TierPtkpCreate {
  status_kode: string
  jumlah_ptkp: number
  tahun_pajak: number
  keterangan?: string | null
  is_active?: boolean
}

export type TierPtkpUpdate = Partial<TierPtkpCreate>

export interface TarifProgresifPasal17 {
  id: number
  batas_bawah: number
  batas_atas: number | null
  persentase_basis_points: number
  tahun_pajak: number
  keterangan: string | null
  is_active: boolean
}

export interface TarifProgresifCreate {
  batas_bawah: number
  batas_atas?: number | null
  persentase_basis_points: number
  tahun_pajak: number
  keterangan?: string | null
  is_active?: boolean
}

export type TarifProgresifUpdate = Partial<TarifProgresifCreate>

export type TierPtkpList = TierPtkp[]
export type TarifProgresifList = TarifProgresifPasal17[]

/* --- e-Faktur: Pajak Keluaran --- */

export type TaxInvoiceStatus = Bp21Status

/** Derived display status of a faktur (reference "Status Faktur"), see utils/faktur.ts. */
export type StatusFaktur =
  | 'AMENDED' | 'APPROVED' | 'CANCELED' | 'CREATED' | 'CREDITED' | 'DELETED'
  | 'REPORTED' | 'SAVED_INVALID' | 'SIGNING_IN_PROGRESS' | 'UNCREDITED'
  | 'WAITING_FOR_AMENDMENT' | 'WAITING_FOR_CANCELLATION'
export type TaxInvoiceKind = 'normal' | 'pengganti' | 'dibatalkan'
export type TaxInvoiceLineType = 'barang' | 'jasa'
export type BuyerIdentityType = 'npwp' | 'nik' | 'paspor' | 'identitas_lain'

export interface TaxInvoiceLineCreate {
  line_type: TaxInvoiceLineType
  item_code?: string | null
  item_name: string
  unit: string
  unit_price: number
  quantity: number
  discount: number
  use_dpp_other: boolean
  ppn_rate_percent: number
  ppnbm_rate_percent: number
}

export interface TaxInvoiceLineRead extends TaxInvoiceLineCreate {
  id: number
  invoice_id: number
  line_order: number
  /** Derived server-side: unit_price x quantity. */
  total_price: number
  dpp: number
  dpp_other: number
  ppn: number
  ppnbm: number
}

export interface TaxInvoiceCreate {
  class_id?: number | null
  siswa_id?: number | null
  is_advance_payment: boolean
  is_settlement: boolean
  transaction_code: string
  invoice_date: string
  invoice_kind: TaxInvoiceKind
  tax_month: number
  tax_year: number
  reference?: string | null
  seller_npwp?: string | null
  seller_name?: string | null
  seller_address?: string | null
  seller_idtku?: string | null
  buyer_siswa_id?: number | null
  buyer_identity_type: BuyerIdentityType
  buyer_identity_number: string
  buyer_country: string
  buyer_document_number?: string | null
  buyer_name: string
  buyer_address?: string | null
  buyer_idtku?: string | null
  buyer_email?: string | null
  lines: TaxInvoiceLineCreate[]
}

export type TaxInvoiceUpdate = Partial<TaxInvoiceCreate>

export interface TaxInvoiceRead {
  id: number
  tenant_id: number
  class_id: number | null
  siswa_id: number
  created_by_id: number

  status: TaxInvoiceStatus
  status_faktur: StatusFaktur
  spt_flag: Bp21SptFlag | null
  invoice_number: string | null
  issued_at: string | null
  invalid_reason: string | null
  electronic_signature_status: string
  signer_id: number | null
  signer_name: string | null

  is_advance_payment: boolean
  is_settlement: boolean
  transaction_code: string
  invoice_date: string
  invoice_kind: TaxInvoiceKind
  tax_month: number
  tax_year: number
  reference: string | null

  seller_npwp: string | null
  seller_name: string | null
  seller_address: string | null
  seller_idtku: string | null

  buyer_identity_type: BuyerIdentityType
  buyer_identity_number: string
  buyer_country: string
  buyer_document_number: string | null
  buyer_name: string
  buyer_address: string | null
  buyer_idtku: string | null
  buyer_email: string | null

  buyer_siswa_id: number | null

  /** All totals are computed by the backend from the lines. */
  total_price: number
  total_discount: number
  total_dpp: number
  total_dpp_other: number
  total_ppn: number
  total_ppnbm: number

  score: number | null
  teacher_feedback: string | null
  created_at: string | null
  updated_at: string | null

  lines: TaxInvoiceLineRead[]
}

export type TaxInvoiceListResponse = Paginated<TaxInvoiceRead>

export interface TaxInvoiceSummary {
  draft: number
  issued: number
  invalid: number
  total: number
}

export interface TaxInvoiceIssue {
  signer_name?: string | null
  kode_otorisasi: string
}

export interface TaxInvoiceBulkIssue {
  ids: number[]
  signer_name?: string | null
  kode_otorisasi: string
}

export interface TaxInvoiceBulkIssueResult {
  issued: number
  skipped: number
  errors: string[]
}

/* --- e-Faktur: Pajak Masukan --- */

export type TaxInputCreditStatus = 'not_credited' | 'credited' | 'uncredited'
export type TaxInputOrigin = 'prepopulated' | 'manual'

export interface TaxInputLineCreate {
  line_type: TaxInvoiceLineType
  item_code?: string | null
  item_name: string
  unit: string
  unit_price: number
  quantity: number
  discount: number
  use_dpp_other: boolean
  ppn_rate_percent: number
  ppnbm_rate_percent: number
}

export interface TaxInputLineRead extends TaxInputLineCreate {
  id: number
  invoice_id: number
  line_order: number
  total_price: number
  dpp: number
  dpp_other: number
  ppn: number
  ppnbm: number
}

export interface TaxInputCreate {
  class_id?: number | null
  siswa_id?: number | null
  source_invoice_id?: number | null
  is_advance_payment: boolean
  is_settlement: boolean
  transaction_code: string
  invoice_date: string
  invoice_kind: TaxInvoiceKind
  tax_month: number
  tax_year: number
  reference?: string | null
  seller_npwp?: string | null
  seller_name?: string | null
  seller_address?: string | null
  seller_idtku?: string | null
  buyer_identity_type: BuyerIdentityType
  buyer_identity_number: string
  buyer_country: string
  buyer_document_number?: string | null
  buyer_name: string
  buyer_address?: string | null
  buyer_idtku?: string | null
  buyer_email?: string | null
  lines: TaxInputLineCreate[]
}

export type TaxInputUpdate = Partial<TaxInputCreate>

export interface TaxInputRead {
  id: number
  tenant_id: number
  class_id: number | null
  siswa_id: number
  created_by_id: number
  status: TaxInvoiceStatus
  status_faktur: StatusFaktur
  spt_flag: Bp21SptFlag | null
  invoice_number: string | null
  issued_at: string | null
  invalid_reason: string | null
  electronic_signature_status: string
  credit_status: TaxInputCreditStatus
  credited_at: string | null
  source_invoice_id: number | null
  origin: TaxInputOrigin
  is_advance_payment: boolean
  is_settlement: boolean
  transaction_code: string
  invoice_date: string
  invoice_kind: TaxInvoiceKind
  tax_month: number
  tax_year: number
  reference: string | null

  seller_npwp: string | null
  seller_name: string | null
  seller_address: string | null
  seller_idtku: string | null
  buyer_identity_type: BuyerIdentityType
  buyer_identity_number: string
  buyer_country: string
  buyer_document_number: string | null
  buyer_name: string
  buyer_address: string | null
  buyer_idtku: string | null
  buyer_email: string | null
  total_price: number
  total_discount: number
  total_dpp: number
  total_dpp_other: number
  total_ppn: number
  total_ppnbm: number
  score: number | null
  teacher_feedback: string | null
  created_at: string | null
  updated_at: string | null
  lines: TaxInputLineRead[]
}

export type TaxInputListResponse = Paginated<TaxInputRead>

export interface TaxInputSummary {
  draft: number
  credited: number
  not_credited: number
  uncredited: number
  invalid: number
  total: number
}

export interface TaxInputBulkCreditResult {
  credited: number
  skipped: number
  errors: string[]
}

export interface TaxInputBulkUncreditResult {
  uncredited: number
  skipped: number
  errors: string[]
}

export interface TaxInputBulkDecisionResult {
  updated: number
  skipped: number
  errors: string[]
}

export interface TaxInputBulkDeleteResult {
  deleted: number
  skipped: number
  errors: string[]
}

/* --- SPT Masa --- */

// Backend accepts both PPh 21/26 spellings; keep both literals.
export type TaxReturnType = 'ppn' | 'pph_unifikasi' | 'pph_21_26' | 'pph21_26'
export type TaxReturnKind = 'normal' | 'pembetulan'
export type TaxReturnStatus = 'draft' | 'awaiting_payment' | 'reported'
export type SignerCapacity = 'wajib_pajak' | 'kuasa_wajib_pajak'
export type BillingStatus = 'unpaid' | 'paid' | 'cancelled'
export type LbTreatment = 'kompensasi' | 'restitusi'

export interface TaxReturnLineRead {
  id: number
  return_id: number
  section: string
  code: string
  description: string
  dpp: number
  dpp_nilai_lain: number
  ppn: number
  ppnbm: number
  setor_sendiri: number
  pemotongan: number
  ditanggung_pemerintah: number
  dibayar_dari_spt_dibetulkan: number
}

export interface TaxReturnRead {
  id: number
  tenant_id: number
  class_id: number | null
  siswa_id: number
  created_by_id: number

  return_type: TaxReturnType
  kind: TaxReturnKind
  correction_no: number
  status: TaxReturnStatus
  tax_month: number
  tax_year: number

  signer_npwp: string | null
  signer_name: string | null
  signer_capacity: SignerCapacity
  submitted_at: string | null
  submitted_by_id: number | null

  bpe_number: string | null
  received_at: string | null

  penyerahan_dpp: number
  penyerahan_dpp_nilai_lain: number
  penyerahan_ppn: number
  penyerahan_ppnbm: number
  masukan_dpp: number
  masukan_dpp_nilai_lain: number
  masukan_ppn: number
  kompensasi_lebih_bayar: number
  ppn_kurang_bayar: number
  ppn_lebih_bayar: number
  lb_treatment: LbTreatment | null
  total_income_tax: number
  amount_due: number

  score: number | null
  teacher_feedback: string | null
  created_at: string | null
  updated_at: string | null

  lines: TaxReturnLineRead[]
}

export type TaxReturnListResponse = Paginated<TaxReturnRead>

export interface TaxReturnSummary {
  draft: number
  awaiting_payment: number
  reported: number
  total: number
}

export interface TaxReturnCreate {
  return_type: TaxReturnType
  tax_month: number
  tax_year: number
  kind?: TaxReturnKind
  class_id?: number | null
  siswa_id?: number | null
}

export interface TaxReturnPernyataan {
  signer_name: string
  signer_npwp?: string | null
  signer_capacity: SignerCapacity
}

export interface TaxReturnSubmit {
  passphrase: string
  lb_treatment?: LbTreatment | null
}

export interface SptLampiranRow {
  nama: string
  identitas: string | null
  nomor_dokumen: string | null
  tanggal_dokumen: string | null
  dpp: number
  ppn: number
  ppnbm: number
  kjs: string | null
  pph: number
  source_type: string
  source_id: number
}

export type SptLampiranListResponse = Paginated<SptLampiranRow>

export interface BillingLineRead {
  id: number
  billing_id: number
  kap_kjs: string
  masa_pajak: string
  amount: number
}

export interface BillingRead {
  id: number
  tenant_id: number
  siswa_id: number
  spt_id: number | null
  code: string
  status: BillingStatus
  amount: number
  kap_kjs: string
  masa_pajak: string
  uraian: string | null
  ntpn: string | null
  no_bpn: string | null
  kanal: string | null
  kanal_label: string | null
  tagihan_id: number | null
  metode: string | null
  paid_at: string | null
  created_at: string | null
  updated_at: string | null
  lines: BillingLineRead[]
}

export type BillingChannel = 'teller' | 'atm' | 'mbanking' | 'ibanking' | 'pos'

export type DokumenSayaJenis = 'spt' | 'bpe_spt' | 'bukti_potong' | 'faktur' | 'kode_billing'

export interface DokumenSayaRow {
  jenis: DokumenSayaJenis
  nomor: string
  tanggal: string | null
  uraian: string
  masa: string
  download_path: string
}

export interface DokumenSayaListResponse {
  items: DokumenSayaRow[]
  total: number
}

export interface BillingPay {
  kanal?: BillingChannel | null
}

export interface BillingCreate {
  kap_kjs: string
  masa_pajak: string
  amount: number
  uraian?: string | null
  siswa_id?: number | null
}

export type BillingListResponse = Paginated<BillingRead>

/* --- Deposit / Saldo Pajak --- */

export interface DepositMutation {
  id: number
  jenis: string
  amount: number
  ref_type: string | null
  ref_id: number | null
  note: string | null
  created_at: string | null
}

export interface DepositRead {
  saldo: number
  mutasi: DepositMutation[]
}

/* --- Pemindahbukuan (PbK) --- */

export type PbkStatus = 'diajukan' | 'disetujui' | 'ditolak'

export interface PbkRead {
  id: number
  tenant_id: number
  user_id: number
  dari_kap: string
  ke_kap: string
  amount: number
  masa: string
  alasan: string
  status: PbkStatus
  decided_by_id: number | null
  created_at: string | null
}

export interface PbkCreate {
  dari_kap: string
  ke_kap: string
  amount: number
  masa: string
  alasan: string
}

export type PbkListResponse = Paginated<PbkRead>

/* --- Tagihan Pajak --- */

export interface TagihanRead {
  id: number
  tenant_id: number
  user_id: number
  jenis: string
  kap_kjs: string
  masa: string
  amount: number
  status: string
  billing_id: number | null
}

export type TagihanListResponse = Paginated<TagihanRead>

/* --- Angsuran / Cicilan --- */

export type CicilanStatus = 'belum_bayar' | 'dibayar' | string

export interface CicilanRead {
  id: number
  ke: number
  jatuh_tempo: string
  amount: number
  status: CicilanStatus
  paid_at: string | null
  kanal: string | null
}

export interface AngsuranRead {
  id: number
  billing_id: number
  n_cicilan: number
  status: string
  cicilan: CicilanRead[]
}

export type AngsuranListResponse = Paginated<AngsuranRead>

export interface AngsuranCreate {
  billing_id: number
  n: number
}

// ---- Retur Pajak Masukan / Keluaran -----------------------------------------

export interface TaxReturLineInput {
  input_line_id: number
  return_quantity: number
  return_discount: number
}

export interface TaxReturCreate {
  input_invoice_id: number
  return_number: string
  return_date: string
  is_creditable: boolean | null
  lines: TaxReturLineInput[]
}

export interface TaxReturUpdate {
  return_number?: string
  return_date?: string
  is_creditable?: boolean
  lines?: TaxReturLineInput[]
}

export interface TaxReturLineRead {
  id: number
  input_line_id: number
  line_order: number
  line_type: TaxInvoiceLineType
  item_code: string | null
  item_name: string
  unit: string
  unit_price: number
  original_quantity: number
  original_discount: number
  ppn_rate_percent: number
  ppnbm_rate_percent: number
  use_dpp_other: boolean
  already_returned_quantity: number
  max_return_quantity: number
  return_quantity: number
  return_discount: number
  return_total_price: number
  dpp: number
  dpp_other: number
  ppn: number
  ppnbm: number
}

export interface TaxReturRead {
  id: number
  tenant_id: number
  class_id: number | null
  siswa_id: number
  created_by_id: number
  input_invoice_id: number
  status: TaxInvoiceStatus
  status_faktur: StatusFaktur
  return_number: string
  return_date: string
  tax_month: number
  tax_year: number
  is_creditable: boolean
  issued_at: string | null
  electronic_signature_status: string
  signer_name: string | null
  invoice_number: string | null
  invoice_date: string
  transaction_code: string
  seller_npwp: string | null
  seller_name: string | null
  buyer_identity_type: BuyerIdentityType
  buyer_identity_number: string
  buyer_name: string
  credit_status: TaxInputCreditStatus
  total_dpp: number
  total_dpp_other: number
  total_ppn: number
  total_ppnbm: number
  lines: TaxReturLineRead[]
}

export type TaxReturListResponse = Paginated<TaxReturRead>

// ---- Role dashboards (GET /dashboard/guru|siswa|tenant|platform) -------------

export interface GuruClassOption {
  id: number
  name: string
  academic_year: string
  archived: boolean
  student_count: number
  pending_grading: number
}

export interface GuruStudentProgress {
  id: number
  full_name: string
  identifier: string | null
  ebupot_issued: number
  ebupot_draft: number
  faktur_keluaran_issued: number
  faktur_masukan_credited: number
  spt_reported: number
  spt_ppn: number
  spt_pph_unifikasi: number
  spt_pph_21_26: number
  billing_paid: number
  pending_grading: number
  last_activity_at: string | null
  has_activity: boolean
}

export interface GradingItem {
  module: string
  module_label: string
  id: number
  title: string
  period: string | null
  siswa_id: number
  siswa_name: string
  at: string | null
}

export interface GradingModuleCount {
  module: string
  module_label: string
  count: number
}

export interface GuruDashboard {
  classes: GuruClassOption[]
  class_id: number | null
  students: GuruStudentProgress[]
  grading_total: number
  tugas_pending_grading?: number
  grading_by_module: GradingModuleCount[]
  grading_items: GradingItem[]
}

export interface DashStatusCounts {
  draft: number
  issued: number
  invalid: number
  total: number
}

export interface SiswaDocument {
  module: string
  module_label: string
  id: number
  title: string
  period: string | null
  status: string
  amount: number | null
  score: number | null
  teacher_feedback: string | null
  at: string | null
}

export interface SiswaTodo {
  module: string
  id: number | null
  kind: 'draft' | 'spt' | 'billing' | 'masukan' | 'tugas'
  title: string
  detail: string | null
  module_label: string
  at: string | null
}

export interface SiswaDashboard {
  classes: number
  open_tugas_count?: number
  ebupot: DashStatusCounts
  ebupot_by_type: Record<string, DashStatusCounts>
  faktur_keluaran: DashStatusCounts
  faktur_masukan: { not_credited: number, credited: number, uncredited: number, total: number }
  spt: { draft: number, awaiting_payment: number, reported: number, unreported: number, total: number }
  billing: { unpaid: number, unpaid_amount: number, paid: number, tagihan_open: number }
  grades: { reviewed: number, average: number | null }
  todos: SiswaTodo[]
  todo_total: number
  recent: SiswaDocument[]
  graded: SiswaDocument[]
}

export interface DashQuotaUsage {
  used: number
  limit: number | null
  full: boolean
}

export interface TenantOverview {
  tenant_id: number
  name: string
  slug: string
  type: string
  is_active: boolean
  berlaku_dari: string | null
  berlaku_sampai: string | null
  days_remaining: number | null
  expired: boolean
  expired_soon: boolean
  guru: DashQuotaUsage
  siswa: DashQuotaUsage
  kelas: DashQuotaUsage
  active_classes: number
}

export interface PlatformDashboard {
  tenants_total: number
  tenants_active: number
  tenants_expiring: number
  users: number
  classes: number
  tenants: TenantOverview[]
}

// ---- Tugas (Assignments & Auto-Grading) ------------------------------------

export type AssignmentStatus = 'draft' | 'published' | 'closed'

export type AssignmentDocType =
  | 'bp21'
  | 'bp26'
  | 'bppu'
  | 'bpmp'
  | 'bpnr'
  | 'sp'
  | 'cy'
  | 'faktur_keluaran'
  | 'faktur_masukan'
  | 'spt_ppn'
  | 'spt_pph_unifikasi'
  | 'spt_pph_21_26'
  | 'spt_pph21_26'

export interface AutoCheckRead {
  code: string
  label: string
  passed: boolean
  message: string
  weight: number
}

export interface CandidateDocRead {
  id: number
  doc_type: AssignmentDocType
  number: string | null
  status: string
  tax_month: number
  tax_year: number
  counterparty_name: string | null
  dpp_amount: number
  tax_amount: number
  created_at: string
}

export interface SubmissionRead {
  id: number | null
  assignment_id: number
  siswa_id: number
  siswa_name: string
  siswa_nis: string | null
  siswa_email: string
  submitted: boolean
  doc_id: number | null
  doc_number: string | null
  doc_period: string | null
  doc_status: string | null
  doc_tax_amount: number | null
  submitted_at: string | null
  is_late: boolean
  auto_score: number | null
  auto_checks: AutoCheckRead[]
  auto_checks_hidden?: boolean
  final_score: number | null
  displayed_score: number | null
  teacher_feedback: string | null
  graded_by: number | null
  graded_at: string | null
}

export interface AssignmentRead {
  id: number
  tenant_id: number
  class_id: number
  class_name: string | null
  created_by: number
  creator_name: string | null
  title: string
  instructions: string
  doc_type: AssignmentDocType
  due_at: string | null
  status: AssignmentStatus
  created_at: string | null
  updated_at: string | null
  enrolled_count: number
  submitted_count: number
  graded_count: number
  my_submission: SubmissionRead | null
}

export interface AssignmentDetailRead extends AssignmentRead {
  submissions: SubmissionRead[]
}

export interface AssignmentCreate {
  class_id: number
  title: string
  instructions: string
  doc_type: AssignmentDocType
  due_at?: string | null
  publish?: boolean
}

export interface AssignmentUpdate {
  title?: string
  instructions?: string
  doc_type?: AssignmentDocType
  due_at?: string | null
  class_id?: number
}

export interface SubmissionGradeRequest {
  final_score: number
  teacher_feedback?: string | null
}

// ---- Pengaturan Instansi ----------------------------------------------------

export interface ModuleCatalogItem {
  key: string
  label: string
  group: string
  depends_on: string[]
  dependency_hint: string | null
}

export interface PengaturanQuotas {
  guru: TenantQuotaUsage
  siswa: TenantQuotaUsage
  kelas: TenantQuotaUsage
}

export interface PengaturanProfile {
  tenant_id: number
  name: string
  slug: string
  type: TenantType
  is_active: boolean
  contact_wa: string | null
  berlaku_dari: string | null
  berlaku_sampai: string | null
  days_remaining: number | null
  expired: boolean
  expired_soon: boolean
  quotas: PengaturanQuotas
}

export interface PengaturanRead {
  profile: PengaturanProfile
  module_catalog: ModuleCatalogItem[]
  allowed_modules: string[]
  enabled_modules: string[]
  effective: string[]
  settings: LearningSettings
}

export interface PengaturanUpdate {
  enabled_modules?: string[]
  settings?: Partial<LearningSettings>
}

export interface PaketModulUpdate {
  allowed_modules: string[] | null
}

