import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  exportUsers,
  getUsersTemplate,
  importUsers,
} from '../../api/users'
import { getClassrooms } from '../../api/classrooms'
import DataTable, { type Column } from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'
import ImportModal from '../../components/shared/ImportModal'
import { showToast } from '../../utils/toast'
import { downloadBlob } from '../../utils/export'
import type { User } from '../../types'

interface UserFormData {
  name: string
  email: string
  username: string
  password: string
  role: 'admin' | 'pc1' | 'subject'
  classroom_id: number | ''
  classroom_ids: number[]
}

const empty: UserFormData = {
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'subject',
  classroom_id: '',
  classroom_ids: [],
}

const roleColors = {
  admin: 'bg-purple-100 text-purple-700',
  pc1: 'bg-blue-100 text-blue-700',
  subject: 'bg-green-100 text-green-700',
}
const roleLabels = { admin: 'Admin', pc1: 'Homeroom', subject: 'Subject' }

export default function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormData>(empty)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Import / Export state
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportUsers(roleFilter ? { role: roleFilter } : undefined)
      downloadBlob(blob, `users_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('Users exported successfully', 'success')
    } catch {
      showToast('Failed to export users', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    const blob = await getUsersTemplate()
    downloadBlob(blob, 'users_template.xlsx')
  }

  const handleImportSuccess = () => {
    qc.invalidateQueries({ queryKey: ['users'] })
  }

  const usersQuery = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => getUsers(roleFilter ? { role: roleFilter } : undefined),
  })

  const classroomsQuery = useQuery({ queryKey: ['classrooms'], queryFn: getClassrooms })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      showToast('User created successfully', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to create user' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserFormData> }) => {
      const payload = { ...data }
      if (!payload.password) delete payload.password
      if (payload.username !== undefined) payload.username = payload.username.trim()
      return updateUser(id, {
        ...payload,
        classroom_id: data.classroom_id ? Number(data.classroom_id) : undefined,
        classroom_ids: data.role === 'subject' ? data.classroom_ids : undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      showToast('User updated successfully', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to update user' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      showToast('User deleted', 'success')
    },
    onError: () => showToast('Failed to delete user', 'error'),
  })

  const openAdd = () => {
    setEditing(null)
    setForm(empty)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (u: User) => {
    setEditing(u)
    setForm({
      name: u.name,
      email: u.email,
      username: u.username || '',
      password: '',
      role: u.role,
      classroom_id: u.classroom_id ?? '',
      classroom_ids: u.taught_classrooms ? u.taught_classrooms.map((c) => c.id) : [],
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(empty)
    setFormErrors({})
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    if (!editing && !form.password) e.password = 'Password is required for new users'
    if (form.role === 'pc1' && !form.classroom_id) e.classroom_id = 'Classroom is required for homeroom teachers'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: form })
      } else {
        await createMutation.mutateAsync({
          name: form.name,
          email: form.email,
          username: form.username.trim() || undefined,
          password: form.password,
          role: form.role,
          classroom_id: form.classroom_id ? Number(form.classroom_id) : undefined,
          classroom_ids: form.role === 'subject' ? form.classroom_ids : undefined,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (u: User) => {
    if (!confirm(`Delete user "${u.name}"?`)) return
    deleteMutation.mutate(u.id)
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return (usersQuery.data ?? []).filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.username && u.username.toLowerCase().includes(term))
    )
  }, [usersQuery.data, search])

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold shrink-0">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{u.name}</p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'username',
      header: 'Username',
      render: (u) => (
        <span className="inline-flex items-center font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100">
          @{u.username || '—'}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
          {roleLabels[u.role]}
        </span>
      ),
    },
    {
      key: 'classroom',
      header: 'Class / Taught Classes',
      render: (u) => {
        if (u.role === 'pc1') {
          return <span className="text-gray-800 text-sm font-medium">{u.classroom?.name ?? '—'}</span>
        }
        if (u.role === 'subject') {
          return u.taught_classrooms && u.taught_classrooms.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-w-xs">
              {u.taught_classrooms.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 text-xs italic">Semua kelas</span>
          )
        }
        return <span className="text-gray-400 text-sm">—</span>
      },
    },
    {
      key: 'actions',
      header: '',
      render: (u) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(u)}
            className="text-primary-600 hover:bg-primary-50 p-1.5 rounded-lg transition-colors"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(u)}
            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage system users and their roles</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-1.5"
            title="Export Users to CSV"
          >
            {exporting ? (
              <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-gray-600 border-t-transparent rounded-full" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="btn-secondary flex items-center gap-1.5"
            title="Bulk Import Users from Excel or CSV"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>Import Excel / CSV</span>
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            className="input pl-9"
            placeholder="Search name, username, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <select className="input w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="pc1">Homeroom</option>
          <option value="subject">Subject</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={usersQuery.isLoading}
        emptyMessage="No users found"
        emptyDescription="Add a user to get started"
      />

      {/* Modal */}
      {modalOpen && (
        <Modal
          title={editing ? 'Edit User' : 'Add User'}
          onClose={closeModal}
          footer={
            <>
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add User'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {formErrors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {formErrors.submit}
              </div>
            )}
            <div>
              <label className="label">Full Name *</label>
              <input
                className={`input ${formErrors.name ? 'border-red-400' : ''}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
              {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
            </div>
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">@</span>
                <input
                  className={`input pl-8 ${formErrors.username ? 'border-red-400' : ''}`}
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                  placeholder="username (e.g. jdoe, sari)"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Digunakan untuk login tanpa email (opsional, auto-generate jika kosong)</p>
              {formErrors.username && <p className="mt-1 text-xs text-red-500">{formErrors.username}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                className={`input ${formErrors.email ? 'border-red-400' : ''}`}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@school.edu"
              />
              {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
            </div>
            <div>
              <label className="label">
                Password {editing ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span> : '*'}
              </label>
              <input
                type="password"
                className={`input ${formErrors.password ? 'border-red-400' : ''}`}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editing ? 'Leave blank to keep current' : 'Min. 8 characters'}
              />
              {formErrors.password && <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>}
            </div>
            <div>
              <label className="label">Role *</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => {
                  const role = e.target.value as 'admin' | 'pc1' | 'subject'
                  setForm((f) => ({ ...f, role, classroom_id: role !== 'pc1' ? '' : f.classroom_id }))
                }}
              >
                <option value="admin">Admin</option>
                <option value="pc1">Homeroom Teacher (PC1)</option>
                <option value="subject">Subject Teacher</option>
              </select>
            </div>
            {form.role === 'pc1' && (
              <div>
                <label className="label">Classroom *</label>
                <select
                  className={`input ${formErrors.classroom_id ? 'border-red-400' : ''}`}
                  value={form.classroom_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      classroom_id: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">Select classroom…</option>
                  {(classroomsQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Grade {c.grade_level}
                    </option>
                  ))}
                </select>
                {formErrors.classroom_id && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.classroom_id}</p>
                )}
              </div>
            )}
            {form.role === 'subject' && (
              <div>
                <label className="label">Kelas yang Diajar (Taught Classrooms)</label>
                <p className="text-xs text-gray-400 mb-2">Pilih kelas yang akan dikelola oleh guru mapel ini</p>
                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {(classroomsQuery.data ?? []).map((c) => {
                    const checked = form.classroom_ids.includes(c.id)
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded text-primary-600 focus:ring-primary-500"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked
                            setForm((f) => ({
                              ...f,
                              classroom_ids: isChecked
                                ? [...f.classroom_ids, c.id]
                                : f.classroom_ids.filter((id) => id !== c.id),
                            }))
                          }}
                        />
                        <span>{c.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Users / Teachers (Bulk Create)"
        description="Upload file Excel (.xlsx, .xls) atau CSV (.csv) dengan kolom: username, name, password, role, classroom, taught_classrooms, email."
        onDownloadTemplate={handleDownloadTemplate}
        onImport={importUsers}
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}
