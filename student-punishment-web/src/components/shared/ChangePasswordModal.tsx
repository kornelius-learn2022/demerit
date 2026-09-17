import { useState } from 'react'
import Modal from './Modal'
import { changePassword } from '../../api/auth'
import { showToast } from '../../utils/toast'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ open, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleClose = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setErrors({})
    onClose()
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!currentPassword) errs.current_password = 'Password saat ini wajib diisi'
    if (!newPassword) {
      errs.new_password = 'Password baru wajib diisi'
    } else if (newPassword.length < 8) {
      errs.new_password = 'Password baru minimal 8 karakter'
    } else if (newPassword === currentPassword) {
      errs.new_password = 'Password baru harus berbeda dari password saat ini'
    }

    if (!confirmPassword) {
      errs.new_password_confirmation = 'Konfirmasi password baru wajib diisi'
    } else if (newPassword !== confirmPassword) {
      errs.new_password_confirmation = 'Konfirmasi password baru tidak cocok'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setErrors({})

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      })
      showToast('Password berhasil diubah!', 'success')
      handleClose()
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string; data?: Record<string, string[]> } } })?.response?.data
      if (resp?.data) {
        const backendErrs: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(resp.data)) {
          if (Array.isArray(msgs) && msgs.length > 0) {
            backendErrs[key] = msgs[0]
          }
        }
        setErrors(backendErrs)
      } else if (resp?.message) {
        setErrors({ general: resp.message })
      } else {
        setErrors({ general: 'Gagal mengubah password. Silakan coba lagi.' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Ubah Password"
      onClose={handleClose}
      footer={
        <>
          <button type="button" onClick={handleClose} className="btn-secondary" disabled={saving}>
            Batal
          </button>
          <button
            type="submit"
            form="change-password-form"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Menyimpan…' : 'Simpan Password Baru'}
          </button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errors.general}
          </div>
        )}

        {/* Current Password */}
        <div>
          <label className="label">Password Saat Ini *</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            className={`input ${errors.current_password ? 'border-red-400' : ''}`}
            placeholder="Masukkan password saat ini"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          {errors.current_password && (
            <p className="mt-1 text-xs text-red-500">{errors.current_password}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label className="label">Password Baru *</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            className={`input ${errors.new_password ? 'border-red-400' : ''}`}
            placeholder="Min. 8 karakter"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          {errors.new_password && (
            <p className="mt-1 text-xs text-red-500">{errors.new_password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="label">Konfirmasi Password Baru *</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            className={`input ${errors.new_password_confirmation ? 'border-red-400' : ''}`}
            placeholder="Ketik ulang password baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          {errors.new_password_confirmation && (
            <p className="mt-1 text-xs text-red-500">{errors.new_password_confirmation}</p>
          )}
        </div>

        {/* Show password toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="show-pw"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
          <label htmlFor="show-pw" className="text-xs text-gray-600 cursor-pointer select-none">
            Tampilkan password
          </label>
        </div>
      </form>
    </Modal>
  )
}

