/**
 * Helper to trigger browser download of a Blob data as a file.
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const isXlsx = filename.toLowerCase().endsWith('.xlsx')
  const mimeType = isXlsx
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv;charset=utf-8;'

  const fileBlob = blob.type ? blob : new Blob([blob], { type: mimeType })
  const url = window.URL.createObjectURL(fileBlob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

