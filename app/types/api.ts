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
