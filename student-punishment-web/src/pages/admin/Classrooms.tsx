import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
} from '../../api/classrooms'
import DataTable, { type Column } from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'
import { showToast } from '../../utils/toast'
import type { Classroom } from '../../types'

interface ClassroomFormData {
  name: string
  grade_level: string
}

const empty: ClassroomFormData = { name: '', grade_level: '' }

export default function ClassroomsPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Classroom | null>(null)
  const [form, setForm] = useState<ClassroomFormData>(empty)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const classroomsQuery = useQuery({ queryKey: ['classrooms'], queryFn: getClassrooms })

  const createMutation = useMutation({
    mutationFn: createClassroom,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classrooms'] })
      showToast('Classroom added successfully', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to add classroom' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClassroomFormData }) =>
      updateClassroom(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classrooms'] })
      showToast('Classroom updated', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to update classroom' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classrooms'] })
      showToast('Classroom deleted', 'success')
    },
    onError: () => showToast('Failed to delete classroom', 'error'),
  })

  const openAdd = () => {
    setEditing(null)
    setForm(empty)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (c: Classroom) => {
    setEditing(c)
    setForm({ name: c.name, grade_level: c.grade_level })
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
    if (!form.name.trim()) e.name = 'Classroom name is required'
    if (!form.grade_level.trim()) e.grade_level = 'Grade level is required'
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
        await createMutation.mutateAsync(form)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (c: Classroom) => {
    if (!confirm(`Delete classroom "${c.name}"? Students in this class may be affected.`)) return
    deleteMutation.mutate(c.id)
  }

  const columns: Column<Classroom>[] = [
    {
      key: 'name',
      header: 'Classroom Name',
      render: (c) => <span className="font-semibold text-gray-900">{c.name}</span>,
    },
    {
      key: 'grade_level',
      header: 'Grade Level',
      render: (c) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
          Grade {c.grade_level}
        </span>
      ),
    },
    {
      key: 'students_count',
      header: 'Students',
      render: (c) => (
        <span className="tabular-nums text-gray-600">{c.students_count ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(c)}
            className="text-primary-600 hover:bg-primary-50 p-1.5 rounded-lg transition-colors"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(c)}
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classrooms</h1>
          <p className="text-gray-500 text-sm mt-1">Manage school classrooms and grades</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Classroom
        </button>
      </div>

      <DataTable
        columns={columns}
        data={classroomsQuery.data ?? []}
        loading={classroomsQuery.isLoading}
        emptyMessage="No classrooms yet"
        emptyDescription="Add your first classroom to get started"
      />

      {modalOpen && (
        <Modal
          title={editing ? 'Edit Classroom' : 'Add Classroom'}
          onClose={closeModal}
          size="sm"
          footer={
            <>
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Classroom'}
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
              <label className="label">Classroom Name *</label>
              <input
                className={`input ${formErrors.name ? 'border-red-400' : ''}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. X-A, XI IPA 1"
              />
              {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
            </div>
            <div>
              <label className="label">Grade Level *</label>
              <input
                className={`input ${formErrors.grade_level ? 'border-red-400' : ''}`}
                value={form.grade_level}
                onChange={(e) => setForm((f) => ({ ...f, grade_level: e.target.value }))}
                placeholder="e.g. 10, 11, 12"
              />
              {formErrors.grade_level && (
                <p className="mt-1 text-xs text-red-500">{formErrors.grade_level}</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
