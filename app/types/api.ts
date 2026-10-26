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
  berlaku_sampai: string | null
  max_guru: number | null
  max_siswa: number | null
  max_kelas: number | null
  deactivated_reason: string | null
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

export interface Me extends User {
  tenant_name: string | null
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
  guru_id: number
  guru: User | null
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
export type Bp21TaxFacility = 'none' | 'dtp' | 'skb' | 'rate_0'

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
  tax_object_code: string
  income_type: string
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
// BP23 and BP26 share the BP21 slip lifecycle; only the SPT flag is BP26-specific.
export type Bp23Status = Bp21Status
export type Bp23TaxNature = Bp21TaxNature
export type Bp23TaxFacility = Bp21TaxFacility

export type Bp26Status = Bp21Status
export type Bp26TaxNature = Bp21TaxNature
export type Bp26TaxFacility = Bp21TaxFacility

export type Bp23Create = Omit<Bp21Create, 'ptkp_status' | 'negara_treaty' | 'pasal_treaty' | 'nomor_skd' | 'tarif_treaty_basis_points'>
export type Bp23Read = Omit<Bp21Read, 'ptkp_status'> & { ptkp_status: string | null }
export type Bp23ListResponse = Paginated<Bp23Read>
export type Bp23Summary = Bp21Summary
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
export type Bp23SptFlag = Bp26SptFlag

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
export type Bp23ImportResult = Bp26ImportResult
export type Bp23BulkIssueResult = Bp26BulkIssueResult

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
  gross_income: number
  dpp_percent: number
  rate_percent: number
  kap_kjs?: string | null
  document_type?: string | null
  document_number?: string | null
  document_date?: string | null
  document_nitku?: string | null
}

export type BppuListResponse = Paginated<BppuRead>
export type BppuSummary = Bp21Summary

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
  invoice_number: string | null
  issued_at: string | null
  invalid_reason: string | null
  electronic_signature_status: string

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

export interface TaxInvoiceBulkIssueResult {
  issued: number
  skipped: number
  errors: string[]
}

/* --- e-Faktur: Pajak Masukan --- */

export type TaxInputCreditStatus = 'not_credited' | 'credited'

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
  invoice_number: string | null
  issued_at: string | null
  invalid_reason: string | null
  electronic_signature_status: string
  credit_status: TaxInputCreditStatus
  credited_at: string | null
  source_invoice_id: number | null
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

export interface TaxInputBulkDeleteResult {
  deleted: number
  skipped: number
  errors: string[]
}

/* --- SPT Masa --- */

export type TaxReturnType = 'ppn' | 'pph_unifikasi'
export type TaxReturnKind = 'normal' | 'pembetulan'
export type TaxReturnStatus = 'draft' | 'awaiting_payment' | 'reported'
export type SignerCapacity = 'wajib_pajak' | 'kuasa_wajib_pajak'
export type BillingStatus = 'unpaid' | 'paid'

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
  paid_at: string | null
  created_at: string | null
  updated_at: string | null
}

export type BillingListResponse = Paginated<BillingRead>
