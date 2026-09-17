import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getViolationRules,
  createViolationRule,
  updateViolationRule,
  deleteViolationRule,
} from '../../api/violationRules'
import { getCategories } from '../../api/categories'
import DataTable, { type Column } from '../../components/shared/DataTable'
import Modal from '../../components/shared/Modal'
import { showToast } from '../../utils/toast'
import type { ViolationRule } from '../../types'

interface RuleFormData {
  category_id: number | ''
  description: string
  point_deduction: number | ''
}

const empty: RuleFormData = { category_id: '', description: '', point_deduction: '' }

export default function ViolationRulesPage() {
  const qc = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [activeFilter, setActiveFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ViolationRule | null>(null)
  const [form, setForm] = useState<RuleFormData>(empty)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const rulesQuery = useQuery({
    queryKey: ['violation-rules-admin', categoryFilter, activeFilter],
    queryFn: () =>
      getViolationRules({
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        is_active: activeFilter === '' ? undefined : activeFilter === 'true',
      }),
  })

  const createMutation = useMutation({
    mutationFn: createViolationRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['violation-rules'] })
      qc.invalidateQueries({ queryKey: ['violation-rules-admin'] })
      showToast('Violation rule created', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to create rule' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RuleFormData & { is_active?: boolean }> }) =>
      updateViolationRule(id, {
        ...data,
        category_id: data.category_id ? Number(data.category_id) : undefined,
        point_deduction: data.point_deduction ? Number(data.point_deduction) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['violation-rules'] })
      qc.invalidateQueries({ queryKey: ['violation-rules-admin'] })
      showToast('Violation rule updated', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to update rule' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteViolationRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['violation-rules'] })
      qc.invalidateQueries({ queryKey: ['violation-rules-admin'] })
      showToast('Rule deleted', 'success')
    },
    onError: () => showToast('Failed to delete rule', 'error'),
  })

  const toggleActive = (rule: ViolationRule) => {
    updateMutation.mutate({ id: rule.id, data: { is_active: !rule.is_active } })
  }

  const openAdd = () => {
    setEditing(null)
    setForm(empty)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (r: ViolationRule) => {
    setEditing(r)
    setForm({ category_id: r.category_id, description: r.description, point_deduction: r.point_deduction })
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
    if (!form.category_id) e.category_id = 'Category is required'
    if (!form.description.trim()) e.description = 'Description is required'
    if (!form.point_deduction || Number(form.point_deduction) <= 0)
      e.point_deduction = 'Must be a positive number'
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
          category_id: Number(form.category_id),
          description: form.description,
          point_deduction: Number(form.point_deduction),
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (r: ViolationRule) => {
    if (!confirm(`Delete rule "${r.description}"?`)) return
    deleteMutation.mutate(r.id)
  }

  const filteredRules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data])

  const columns: Column<ViolationRule>[] = [
    {
      key: 'category',
      header: 'Category',
      render: (r) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
          {r.category?.name ?? `ID: ${r.category_id}`}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => <span className="font-medium text-gray-900 text-sm">{r.description}</span>,
    },
    {
      key: 'point_deduction',
      header: 'Points',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-red-600 font-bold tabular-nums text-sm">
          <span>−</span>{r.point_deduction}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Active',
      render: (r) => (
        <button
          onClick={() => toggleActive(r)}
          disabled={updateMutation.isPending}
          title={r.is_active ? 'Deactivate' : 'Activate'}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            r.is_active ? 'bg-green-500' : 'bg-gray-300'
          } disabled:opacity-50`}
          role="switch"
          aria-checked={r.is_active}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
              r.is_active ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(r)}
            className="text-primary-600 hover:bg-primary-50 p-1.5 rounded-lg transition-colors"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(r)}
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
          <h1 className="text-2xl font-bold text-gray-900">Violation Rules</h1>
          <p className="text-gray-500 text-sm mt-1">Define specific violations and their point deductions</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Rule
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="input w-auto"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">All Categories</option>
          {(categoriesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredRules}
        loading={rulesQuery.isLoading}
        emptyMessage="No violation rules found"
        emptyDescription="Add rules to start recording punishments"
      />

      {modalOpen && (
        <Modal
          title={editing ? 'Edit Violation Rule' : 'Add Violation Rule'}
          onClose={closeModal}
          footer={
            <>
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Rule'}
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
              <label className="label">Category *</label>
              <select
                className={`input ${formErrors.category_id ? 'border-red-400' : ''}`}
                value={form.category_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category_id: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
              >
                <option value="">Select a category…</option>
                {(categoriesQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {formErrors.category_id && (
                <p className="mt-1 text-xs text-red-500">{formErrors.category_id}</p>
              )}
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea
                className={`input min-h-[80px] resize-y ${formErrors.description ? 'border-red-400' : ''}`}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the violation clearly…"
              />
              {formErrors.description && (
                <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>
              )}
            </div>
            <div>
              <label className="label">Point Deduction *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 font-bold">−</span>
                <input
                  type="number"
                  min={1}
                  max={150}
                  className={`input pl-7 ${formErrors.point_deduction ? 'border-red-400' : ''}`}
                  value={form.point_deduction}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      point_deduction: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g. 10"
                />
              </div>
              {formErrors.point_deduction && (
                <p className="mt-1 text-xs text-red-500">{formErrors.point_deduction}</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
