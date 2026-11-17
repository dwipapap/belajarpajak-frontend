// Empty-state lists for the e-Faktur menu entries the simulator does not model yet
// (Retur and Dokumen Lain). Columns and toolbar follow the reference captures
// (docs/PARITAS_CORETAX_BUPOT_EFAKTUR.md section 2.4).

export interface FakturPlaceholderConfig {
  title: string
  group: string
  /** Toolbar buttons, all disabled (no backend). `menu` buttons show a chevron. */
  toolbar: { label: string, icon: string, menu?: boolean }[]
  columns: string[]
}

const monitoring = { label: 'Monitoring', icon: 'i-lucide-info', menu: true }
const bulk = { label: 'Bulk Process', icon: 'i-lucide-layers', menu: true }

export const fakturPlaceholders: Record<string, FakturPlaceholderConfig> = {
  'retur-keluaran': {
    title: 'Retur Pajak Keluaran',
    group: 'e-Faktur',
    toolbar: [monitoring, bulk],
    columns: [
      'NPWP Pembeli', 'Nama Pembeli', 'Nomor Faktur', 'Tanggal Faktur', 'Nomor Retur', 'Tanggal Retur',
      'Masa Pajak', 'Tahun', 'Status', 'Harga Jual/Penggantian/DPP', 'DPP Nilai Lain/DPP', 'PPN', 'PPnBM',
      'Perekam', 'Dilaporkan'
    ]
  },
  'retur-masukan': {
    title: 'Retur Pajak Masukan',
    group: 'e-Faktur',
    toolbar: [
      { label: 'Buat Retur', icon: 'i-lucide-plus' },
      { label: 'Impor Data', icon: 'i-lucide-upload', menu: true },
      monitoring,
      bulk,
      { label: 'Upload Retur', icon: 'i-lucide-send' },
      { label: 'Delete Retur', icon: 'i-lucide-trash-2' }
    ],
    columns: [
      'NPWP Penjual', 'Nama Penjual', 'Nomor Faktur', 'Tanggal Faktur', 'Nomor Retur', 'Tanggal Retur',
      'Masa Pajak', 'Tahun', 'Status', 'ESignStatus', 'Dikreditkan', 'Harga Jual/Penggantian/DPP',
      'DPP Nilai Lain/DPP', 'PPN', 'PPnBM', 'Perekam', 'Dilaporkan'
    ]
  },
  'dokumen-lain-keluaran': {
    title: 'Dokumen Lain - Pajak Keluaran',
    group: 'Dokumen Lain',
    toolbar: [monitoring, bulk],
    columns: [
      'NPWP Pembeli', 'Nama Pembeli', 'Nomor Dokumen', 'Tanggal Dokumen', 'Jenis Transaksi', 'Masa Pajak',
      'Tahun', 'Status Dokumen', 'DPP', 'PPN', 'PPnBM', 'Keterangan', 'Perekam', 'Dilaporkan'
    ]
  },
  'dokumen-lain-masukan': {
    title: 'Dokumen Lain - Pajak Masukan',
    group: 'Dokumen Lain',
    toolbar: [monitoring, bulk],
    columns: [
      'NPWP Penjual', 'Nama Penjual', 'Nomor Dokumen', 'Tanggal Dokumen', 'Jenis Transaksi', 'Masa Pajak',
      'Tahun', 'Masa Pajak Pengkreditan', 'Tahun Pajak Pengkreditan', 'DPP', 'PPN', 'PPnBM', 'Status', 'Valid',
      'Dilaporkan', 'Keterangan', 'Perekam', 'Dibuat Oleh'
    ]
  },
  // TODO(paritas): columns/toolbar of the two Retur Dokumen Lain lists are not captured yet;
  // they mirror the Retur lists with "Nomor Dokumen" until verified.
  'retur-dokumen-lain-keluaran': {
    title: 'Retur Dokumen Lain Keluaran',
    group: 'Dokumen Lain',
    toolbar: [monitoring, bulk],
    columns: [
      'NPWP Pembeli', 'Nama Pembeli', 'Nomor Dokumen', 'Tanggal Dokumen', 'Nomor Retur', 'Tanggal Retur',
      'Masa Pajak', 'Tahun', 'Status', 'DPP', 'PPN', 'PPnBM', 'Perekam', 'Dilaporkan'
    ]
  },
  'retur-dokumen-lain-masukan': {
    title: 'Retur Dokumen Lain Masukan',
    group: 'Dokumen Lain',
    toolbar: [monitoring, bulk],
    columns: [
      'NPWP Penjual', 'Nama Penjual', 'Nomor Dokumen', 'Tanggal Dokumen', 'Nomor Retur', 'Tanggal Retur',
      'Masa Pajak', 'Tahun', 'Status', 'DPP', 'PPN', 'PPnBM', 'Perekam', 'Dilaporkan'
    ]
  }
}
