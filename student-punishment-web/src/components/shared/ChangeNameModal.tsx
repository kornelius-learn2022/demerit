import { useState, useEffect } from 'react'
import Modal from './Modal'
import { updateProfile } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import { showToast } from '../../utils/toast'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ChangeNameModal({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { language } = useLanguageStore()

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && user?.name) {
      setName(user.name)
      setError('')
    }
  }, [open, user?.name])

  if (!open) return null

  const handleClose = () => {
    setError('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError(language === 'en' ? 'Name is required' : 'Nama wajib diisi')
      return
    }
    if (trimmed.length < 2) {
      setError(language === 'en' ? 'Name must be at least 2 characters' : 'Nama minimal 2 karakter')
      return
    }

    setSaving(true)
    setError('')

    try {
      const updatedUser = await updateProfile({ name: trimmed })
      setUser(updatedUser)
      showToast(
        language === 'en' ? 'Profile name updated successfully!' : 'Nama profil berhasil diperbarui!',
        'success'
      )
      handleClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || (language === 'en' ? 'Failed to update name' : 'Gagal memperbarui nama'))
    } finally {
      setSaving(false)
    }
  }

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrator'
      : user?.role === 'pc1'
      ? `Wali Kelas ${user?.classroom?.name || ''}`.trim()
      : 'Guru Mata Pelajaran'

  return (
    <Modal
      title={language === 'en' ? 'Change Display Name' : 'Ubah Nama Guru'}
      onClose={handleClose}
      footer={
        <>
          <button type="button" onClick={handleClose} className="btn-secondary" disabled={saving}>
            {language === 'en' ? 'Cancel' : 'Batal'}
          </button>
          <button
            type="submit"
            form="change-name-form"
            className="btn-primary"
            disabled={saving || !name.trim()}
          >
            {saving
              ? language === 'en'
                ? 'Saving…'
                : 'Menyimpan…'
              : language === 'en'
              ? 'Save Name'
              : 'Simpan Perubahan'}
          </button>
        </>
      }
    >
      <form id="change-name-form" onSubmit={handleSubmit} className="space-y-4">
        {/* User Card Info */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
            {name.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 font-medium">
              {language === 'en' ? 'Current Account' : 'Akun Pengguna'}
            </p>
            <p className="text-xs font-semibold text-slate-700 truncate">
              {user?.username ? `@${user.username}` : user?.email}
            </p>
            <div className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-100">
              {roleLabel}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {language === 'en' ? 'Display Name / Title' : 'Nama Lengkap / Panggilan'}
          </label>
          <input
            type="text"
            className="input-field"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError('')
            }}
            placeholder={
              user?.role === 'pc1'
                ? 'Contoh: Ms Tina (Wali Kelas 3A)'
                : 'Contoh: Mr Ferdi / Guru Olahraga'
            }
            autoFocus
            maxLength={100}
            required
          />
          <p className="mt-1 text-[11px] text-slate-500">
            {language === 'en'
              ? 'This name will appear on reports, violation logs, and teacher notifications.'
              : 'Nama ini akan ditampilkan pada laporan, catatan demerit, serta notifikasi guru.'}
          </p>
        </div>
      </form>
    </Modal>
  )
}

