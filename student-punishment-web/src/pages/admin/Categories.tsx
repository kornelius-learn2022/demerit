import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../api/categories'
import DataTable, { type Column } from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'
import { showToast } from '../../utils/toast'
import type { Category } from '../../types'

interface CategoryFormData {
  name: string
  description: string
}

const empty: CategoryFormData = { name: '', description: '' }

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryFormData>(empty)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      showToast('Category created', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to create category' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryFormData }) =>
      updateCategory(id, { name: data.name, description: data.description || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      showToast('Category updated', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to update category' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      showToast('Category deleted', 'success')
    },
    onError: () => showToast('Failed to delete category', 'error'),
  })

  const openAdd = () => {
    setEditing(null)
    setForm(empty)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, description: c.description ?? '' })
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
    if (!form.name.trim()) e.name = 'Category name is required'
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
          description: form.description || undefined,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (c: Category) => {
    if (
      !confirm(
        `Delete category "${c.name}"? Associated violation rules will also be affected.`
      )
    )
      return
    deleteMutation.mutate(c.id)
  }

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary-400 shrink-0" />
          <span className="font-semibold text-gray-900">{c.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (c) => (
        <span className="text-gray-500 text-sm">{c.description || <em className="text-gray-300">No description</em>}</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Violation Categories</h1>
          <p className="text-gray-500 text-sm mt-1">Organize violations into meaningful groups</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Category
        </button>
      </div>

      <DataTable
        columns={columns}
        data={categoriesQuery.data ?? []}
        loading={categoriesQuery.isLoading}
        emptyMessage="No categories yet"
        emptyDescription="Create categories to organize your violation rules"
      />

      {modalOpen && (
        <Modal
          title={editing ? 'Edit Category' : 'Add Category'}
          onClose={closeModal}
          size="sm"
          footer={
            <>
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Category'}
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
              <label className="label">Category Name *</label>
              <input
                className={`input ${formErrors.name ? 'border-red-400' : ''}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Academic, Behavior, Attendance"
              />
              {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-[80px] resize-y"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description of this category…"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
