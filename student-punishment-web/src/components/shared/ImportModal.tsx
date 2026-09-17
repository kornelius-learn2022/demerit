import { useState, useRef } from 'react'
import Modal from './Modal'
import type { ImportResult } from '../../types'
import { showToast } from '../../utils/toast'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  onDownloadTemplate: () => Promise<void>
  onImport: (file: File) => Promise<ImportResult>
  onSuccess: () => void
}

export default function ImportModal({
  isOpen,
  onClose,
  title,
  description,
  onDownloadTemplate,
  onImport,
  onSuccess,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const resetState = () => {
    setFile(null)
    setErrors([])
    setSuccessMsg(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    if (importing) return
    resetState()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      const validExtensions = ['.xlsx', '.xls', '.csv', '.txt']
      const lowerName = selected.name.toLowerCase()
      const isValid = validExtensions.some((ext) => lowerName.endsWith(ext))
      if (!isValid) {
        setErrors(['Hanya file Excel (.xlsx, .xls) atau CSV (.csv) yang diperbolehkan.'])
        setFile(null)
        return
      }
      setFile(selected)
      setErrors([])
      setSuccessMsg(null)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await onDownloadTemplate()
      showToast('Template downloaded successfully', 'success')
    } catch {
      showToast('Failed to download template', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setErrors(['Silakan pilih file CSV terlebih dahulu.'])
      return
    }

    setImporting(true)
    setErrors([])
    setSuccessMsg(null)

    try {
      const res = await onImport(file)
      if (res.success) {
        setSuccessMsg(res.message || `Berhasil mengimpor ${res.imported_count} data.`)
        showToast(res.message || 'Import successful!', 'success')
        setTimeout(() => {
          handleClose()
          onSuccess()
        }, 1200)
      } else {
        setErrors(res.errors && res.errors.length > 0 ? res.errors : [res.message || 'Import gagal.'])
      }
    } catch (err: unknown) {
      // Axios error handling
      const responseData = (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data
      if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        setErrors(responseData.errors)
      } else if (responseData?.message) {
        setErrors([responseData.message])
      } else {
        setErrors(['Terjadi kesalahan saat mengunggah atau memproses file CSV.'])
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={handleClose}
      size="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="btn-primary flex items-center gap-2"
            disabled={!file || importing}
          >
            {importing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Importing...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>Upload & Import</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {description && <p className="text-sm text-gray-600">{description}</p>}

        {/* Step 1: Download Template */}
        <div className="bg-primary-50/70 border border-primary-100 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-primary-950">Gunakan Format Template</h4>
            <p className="text-xs text-primary-800 mt-0.5">
              Unduh file template Excel (.xlsx) untuk memastikan kolom dan format data sesuai.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 rounded-lg text-xs font-medium shadow-sm transition-colors"
          >
            {downloading ? (
              <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-primary-600 border-t-transparent rounded-full" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            <span>Download Template (.xlsx)</span>
          </button>
        </div>

        {/* Step 2: File Selector */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Pilih File Excel (.xlsx) atau CSV (.csv)</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file
                ? 'border-primary-400 bg-primary-50/30'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB — Klik untuk ganti file</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Klik untuk memilih file Excel (.xlsx) atau CSV (.csv)
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Mendukung format .xlsx, .xls, .csv (Maksimal 10 MB)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert with Scrollable List */}
        {errors.length > 0 && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm space-y-2">
            <div className="flex items-center gap-2 font-semibold text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Ditemukan {errors.length} masalah pada file CSV:</span>
            </div>
            <div className="max-h-40 overflow-y-auto pl-7 space-y-1 text-xs text-red-700 list-disc">
              {errors.map((err, idx) => (
                <div key={idx} className="leading-relaxed">
                  • {err}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

