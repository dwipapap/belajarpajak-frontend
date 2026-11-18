import type { AssignmentDocType, AssignmentStatus } from '~/types/api'

export interface DocTypeOption {
  label: string
  value: AssignmentDocType
  group: string
}

export const DOC_TYPE_OPTIONS: DocTypeOption[] = [
  { label: 'BPPU — Bukti Pemotongan PPh Unifikasi', value: 'bppu', group: 'e-Bupot' },
  { label: 'BP 21 — Bukti Pemotongan Selain Pegawai Tetap', value: 'bp21', group: 'e-Bupot' },
  { label: 'BP 26 — Bukti Pemotongan Wajib Pajak Luar Negeri', value: 'bp26', group: 'e-Bupot' },
  { label: 'BPMP — Bukti Pemotongan Bulanan Pegawai Tetap', value: 'bpmp', group: 'e-Bupot' },
  { label: 'BPNR — Bukti Pemotongan Non-Residen', value: 'bpnr', group: 'e-Bupot' },
  { label: 'SP — Penyetoran Sendiri', value: 'sp', group: 'e-Bupot' },
  { label: 'CY — Pemotongan Secara Digunggung', value: 'cy', group: 'e-Bupot' },
  { label: 'Faktur Pajak Keluaran', value: 'faktur_keluaran', group: 'e-Faktur' },
  { label: 'Faktur Pajak Masukan', value: 'faktur_masukan', group: 'e-Faktur' },
  { label: 'SPT Masa PPN', value: 'spt_ppn', group: 'SPT Masa' },
  { label: 'SPT Masa PPh Unifikasi', value: 'spt_pph_unifikasi', group: 'SPT Masa' },
  { label: 'SPT Masa PPh 21/26', value: 'spt_pph_21_26', group: 'SPT Masa' }
]

const DOC_TYPE_LABELS: Record<AssignmentDocType, string> = {
  bp21: 'BP 21 (Selain Pegawai Tetap)',
  bp26: 'BP 26 (WP Luar Negeri)',
  bppu: 'BPPU (PPh Unifikasi)',
  bpmp: 'BPMP (Bulanan Pegawai Tetap)',
  bpnr: 'BPNR (Non-Residen)',
  sp: 'SP (Penyetoran Sendiri)',
  cy: 'CY (Digunggung)',
  faktur_keluaran: 'Faktur Pajak Keluaran',
  faktur_masukan: 'Faktur Pajak Masukan',
  spt_ppn: 'SPT Masa PPN',
  spt_pph_unifikasi: 'SPT Masa PPh Unifikasi',
  spt_pph_21_26: 'SPT Masa PPh 21/26',
  spt_pph21_26: 'SPT Masa PPh 21/26'
}

export function docTypeLabel(docType: AssignmentDocType | string): string {
  return DOC_TYPE_LABELS[docType as AssignmentDocType] ?? docType
}

/** Route for a student to create/manage a document of the given assignment doc_type. */
export function siswaCreateDocPath(docType: AssignmentDocType | string): string {
  switch (docType) {
    case 'bp21':
      return '/siswa/bp21/create'
    case 'bp26':
      return '/siswa/bp26/create'
    case 'bppu':
      return '/siswa/bppu/create'
    case 'bpmp':
      return '/siswa/bpmp/create'
    case 'bpnr':
      return '/siswa/bpnr/create'
    case 'sp':
      return '/siswa/sp/create'
    case 'cy':
      return '/siswa/cy/create'
    case 'faktur_keluaran':
      return '/siswa/e-faktur/keluaran/create'
    case 'faktur_masukan':
      return '/siswa/e-faktur/masukan'
    case 'spt_ppn':
    case 'spt_pph_unifikasi':
    case 'spt_pph_21_26':
    case 'spt_pph21_26':
      return '/siswa/spt/create'
    default:
      return '/siswa'
  }
}

/** Route for a teacher to inspect/monitor documents of the given assignment doc_type. */
export function guruDocMonitorPath(docType: AssignmentDocType | string, docId?: number | null): string {
  switch (docType) {
    case 'bp21':
      return '/guru/bp21'
    case 'bp26':
      return '/guru/bp26'
    case 'bppu':
      return '/guru/bppu'
    case 'bpmp':
      return '/guru/bpmp'
    case 'bpnr':
      return '/guru/bpnr'
    case 'sp':
      return '/guru/sp'
    case 'cy':
      return '/guru/cy'
    case 'faktur_keluaran':
      return '/guru/e-faktur/keluaran'
    case 'faktur_masukan':
      return '/guru/e-faktur/masukan'
    case 'spt_ppn':
    case 'spt_pph_unifikasi':
    case 'spt_pph_21_26':
    case 'spt_pph21_26':
      return docId ? `/guru/spt/${docId}` : '/guru/spt'
    default:
      return '/guru'
  }
}

export function assignmentStatusLabel(status: AssignmentStatus | string): string {
  switch (status) {
    case 'draft':
      return 'Draf'
    case 'published':
      return 'Terbit'
    case 'closed':
      return 'Ditutup'
    default:
      return status
  }
}

export function assignmentStatusColor(status: AssignmentStatus | string): 'neutral' | 'success' | 'warning' {
  switch (status) {
    case 'published':
      return 'success'
    case 'closed':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function formatDateTimeId(iso: string | null | undefined): string {
  if (!iso) return 'Tanpa tenggat'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
