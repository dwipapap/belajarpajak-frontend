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

export interface UserListResponse {
  items: User[]
  total: number
  page: number
  size: number
}

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

export interface Bp21ListResponse {
  items: Bp21Read[]
  total: number
  page: number
  size: number
}

export interface Bp21Summary {
  draft: number
  issued: number
  invalid: number
  total: number
}
