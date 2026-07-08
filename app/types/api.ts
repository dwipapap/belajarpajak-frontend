// API contract types — mirror backend response/request schemas.

export type Role = 'superadmin' | 'admin' | 'guru' | 'siswa'
export type TenantType = 'smk' | 'kampus' | 'lembaga'

export interface Tenant {
  id: number
  name: string
  slug: string
  type: TenantType
  is_active: boolean
}

export interface User {
  id: number
  email: string
  full_name: string
  role: Role
  tenant_id: number | null
  is_active: boolean
}

export interface Me extends User {
  tenant_name: string | null
}

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
}

export interface ClassDetail extends SchoolClass {
  guru: User | null
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

// BP26 shares the BP21 slip lifecycle; only the SPT flag is BP26-specific.
export type Bp26Status = Bp21Status
export type Bp26TaxNature = Bp21TaxNature
export type Bp26TaxFacility = Bp21TaxFacility
export type Bp26SptFlag =
  | 'reported_in_spt'
  | 'objection_in_progress'
  | 'objection_completed'
  | 'objection_rejected_formal'
  | 'objection_withdrawal_review'
  | 'objection_withdrawal_accepted'
  | 'spt_audited'
  | 'spt_legal_process'

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
