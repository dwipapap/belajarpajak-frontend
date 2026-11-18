/** Shared helpers for the role dashboards. */

const MONITOR_PATHS: Record<string, string> = {
  bp21: '/guru/bp21',
  bp23: '/guru/bppu',
  bp26: '/guru/bp26',
  bppu: '/guru/bppu',
  bpmp: '/guru/bpmp',
  bpnr: '/guru/bpnr',
  sp: '/guru/sp',
  cy: '/guru/cy',
  'faktur-keluaran': '/guru/e-faktur/keluaran',
  'faktur-masukan': '/guru/e-faktur/masukan',
  spt: '/guru/spt',
  tugas: '/guru/tugas'
}

/** Guru monitor page for a dashboard module key. */
export function guruMonitorPath(module: string): string {
  return MONITOR_PATHS[module] ?? '/guru'
}

const SISWA_PATHS: Record<string, string> = {
  bp21: '/siswa/bp21',
  bp23: '/siswa/bppu',
  bp26: '/siswa/bp26',
  bppu: '/siswa/bppu',
  bpmp: '/siswa/bpmp',
  bpnr: '/siswa/bpnr',
  sp: '/siswa/sp',
  cy: '/siswa/cy',
  'faktur-keluaran': '/siswa/e-faktur/keluaran',
  'faktur-masukan': '/siswa/e-faktur/masukan',
  spt: '/siswa/spt',
  tugas: '/siswa/tugas'
}

/** Siswa list/detail page for a document of a dashboard module. */
export function siswaDocumentPath(module: string, id?: number): string {
  const base = SISWA_PATHS[module] ?? '/siswa'
  if (id !== undefined && (module === 'faktur-keluaran' || module === 'faktur-masukan' || module === 'spt' || module === 'tugas')) {
    return `${base}/${id}`
  }
  return base
}

/** "3 jam lalu" style label; falls back to the date for anything older than 30 days. */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '-'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '-'
  const diff = Math.max(0, Date.now() - then)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(then))
}

export function formatDateId(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

/** Percent 0-100 of used/limit; null limit means unlimited. */
export function quotaPercent(used: number, limit: number | null): number {
  if (!limit) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export function quotaFillClass(used: number, limit: number | null): string {
  if (!limit) return ''
  if (used >= limit) return 'is-full'
  return used / limit >= 0.85 ? 'is-warn' : ''
}
