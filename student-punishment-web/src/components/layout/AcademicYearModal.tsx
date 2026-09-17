import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateAcademicYear } from '../../api/settings'
import { useLanguageStore } from '../../stores/languageStore'
import Modal from '../shared/Modal'
import { showToast } from '../../utils/toast'

interface AcademicYearModalProps {
  isOpen: boolean
  onClose: () => void
  currentYear: string
}

export default function AcademicYearModal({ isOpen, onClose, currentYear }: AcademicYearModalProps) {
  const qc = useQueryClient()
  const { t } = useLanguageStore()
  const yearT = t().academicYear

  const [yearInput, setYearInput] = useState(currentYear)
  const [error, setError] = useState('')

  const updateMutation = useMutation({
    mutationFn: updateAcademicYear,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      showToast(yearT.updateSuccess, 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to update academic year')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = yearInput.trim()
    if (!trimmed) {
      setError('Please enter a valid school year')
      return
    }
    setError('')
    updateMutation.mutate(trimmed)
  }

  const presets = ['2023/2024', '2024/2025', '2025/2026', '2026/2027']

  if (!isOpen) return null

  return (
    <Modal onClose={onClose} title={yearT.changeTitle} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs text-slate-500 leading-relaxed">
          {yearT.changeSubtitle}
        </p>

        <div>
          <label className="label">{yearT.label}</label>
          <input
            type="text"
            className={`input font-medium text-slate-900 ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder={yearT.placeholder}
            value={yearInput}
            onChange={(e) => {
              setYearInput(e.target.value)
              setError('')
            }}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        {/* Quick Presets */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Preset Options:</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setYearInput(p)
                  setError('')
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  yearInput === p
                    ? 'bg-primary-50 text-primary-700 border-primary-300 ring-2 ring-primary-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
            disabled={updateMutation.isPending}
          >
            {t().common.cancel}
          </button>
          <button
            type="submit"
            className="btn-primary text-xs"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? yearT.saving : yearT.save}
          </button>
        </div>
      </form>
    </Modal>
  )
}

