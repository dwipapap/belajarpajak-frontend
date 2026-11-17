/** CSV export of the faktur list for one period (Download CSV by Period). */
export function useFakturExport(
  apiBase: string,
  period: () => { month?: number, year?: number },
  filename: string
) {
  const { apiFetch } = useApi()
  const toast = useToast()

  async function downloadCsv() {
    const { month, year } = period()
    const query = new URLSearchParams()
    if (month) query.set('tax_month', String(month))
    if (year) query.set('tax_year', String(year))
    const text = query.toString()
    try {
      const blob = await apiFetch<Blob>(
        `${apiBase}/export-csv${text ? `?${text}` : ''}`,
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.add({
        title: 'Unduhan gagal',
        description: apiErrorMessage(error),
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
    }
  }

  return { downloadCsv }
}
