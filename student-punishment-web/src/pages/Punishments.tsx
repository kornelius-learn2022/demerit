import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  getPunishments,
  deletePunishment,
  exportPunishments,
  getPunishmentsTemplate,
  importPunishments,
} from '../api/punishments'
import { getCategories } from '../api/categories'
import { useAuthStore } from '../stores/authStore'
import DataTable, { type Column } from '../components/shared/DataTable'
import Modal from '../components/shared/Modal'
import ImportModal from '../components/shared/ImportModal'
import PunishmentForm from '../components/shared/PunishmentForm'
import ScoreBadge from '../components/shared/ScoreBadge'
import { showToast } from '../utils/toast'
import { downloadBlob } from '../utils/export'
import type { Punishment } from '../types'

export default function PunishmentsPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const [studentSearch, setStudentSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [modalOpen, setModalOpen] = useState(false)

  // Import / Export state
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportPunishments({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      downloadBlob(blob, `demerits_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('Demerits exported successfully', 'success')
    } catch {
      showToast('Failed to export demerits', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    const blob = await getPunishmentsTemplate()
    downloadBlob(blob, 'demerits_template.xlsx')
  }

  const handleImportSuccess = () => {
    qc.invalidateQueries({ queryKey: ['punishments'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['students'] })
  }

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const punishmentsQuery = useQuery({
    queryKey: ['punishments', dateFrom, dateTo],
    queryFn: () =>
      getPunishments({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePunishment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punishments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      showToast('Punishment record deleted', 'success')
    },
    onError: () => showToast('Failed to delete punishment', 'error'),
  })

  const handleDelete = (id: number) => {
    if (!confirm('Are you sure you want to delete this punishment record?')) return
    deleteMutation.mutate(id)
  }

  const canDelete = (p: Punishment) => {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role === 'pc1' && p.student?.classroom_id === user.classroom_id) return true
    return p.teacher_id === user.id
  }

  const isSubject = user?.role === 'subject'
  const canAdd = user?.role === 'pc1' || user?.role === 'subject'

  const filtered = useMemo(() => {
    const data = punishmentsQuery.data ?? []
    return data.filter((p) => {
      const search = studentSearch.toLowerCase()
      const matchesStudent =
        !search ||
        p.student?.name?.toLowerCase().includes(search) ||
        p.student?.nis?.includes(search)

      const matchesCategory = !categoryId || p.violation_rule?.category_id === Number(categoryId)
      return matchesStudent && matchesCategory
    })
  }, [punishmentsQuery.data, studentSearch, categoryId])

  const columns: Column<Punishment>[] = [
    {
      key: 'punishment_date',
      header: 'Date',
      render: (p) => (
        <span className="tabular-nums text-gray-600">
          {format(new Date(p.punishment_date), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
            {p.student?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <span className="font-medium text-gray-900">{p.student?.name ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      render: (p) => (
        <span className="text-gray-600">{p.student?.classroom?.name ?? '—'}</span>
      ),
    },
    {
      key: 'violation',
      header: 'Violation',
      render: (p) => (
        <div className="max-w-xs">
          <p className="font-medium text-gray-800 truncate">{p.violation_rule?.description ?? '—'}</p>
          <p className="text-xs text-gray-400">{p.violation_rule?.category?.name ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'point_deducted',
      header: 'Points',
      render: (p) => (
        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-sm">
          <span>−</span>
          <span className="tabular-nums">{p.point_deducted}</span>
        </span>
      ),
    },
    {
      key: 'total_score',
      header: 'Total Score',
      render: (p) => (
        p.student?.current_score !== undefined 
          ? <ScoreBadge score={p.student.current_score} />
          : <span className="text-gray-400">—</span>
      ),
    },
    ...(!isSubject
      ? [
          {
            key: 'teacher',
            header: 'Teacher',
            render: (p: Punishment) => (
              <div>
                <p className="text-sm text-gray-800">{p.teacher?.name ?? '—'}</p>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.teacher_role === 'pc1' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
                >
                  {p.teacher_role === 'pc1' ? 'Homeroom' : 'Subject'}
                </span>
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'notes',
      header: 'Notes',
      render: (p) => (
        <span className="text-gray-500 text-sm italic truncate max-w-[120px] block">
          {p.notes || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p) =>
        canDelete(p) ? (
          <button
            onClick={() => handleDelete(p.id)}
            disabled={deleteMutation.isPending}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-40"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        ) : null,
    },
  ]

  const handleAddSuccess = () => {
    qc.invalidateQueries({ queryKey: ['punishments'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['students'] })
    showToast('Punishment recorded successfully!', 'success')
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Punishments</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isSubject ? 'Punishments you have recorded' : 'All punishment records in your scope'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-1.5"
            title="Export Demerits to CSV"
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
            title="Bulk Import Demerits from Excel or CSV"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>Import Excel / CSV</span>
          </button>

          {canAdd && (
            <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Add Punishment</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Search Student</label>
            <div className="relative">
              <input
                type="text"
                className="input pl-9"
                placeholder="Name or NIS…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">All Categories</option>
              {(categoriesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">From Date</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="label">To Date</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {(studentSearch || categoryId || dateFrom || dateTo) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setStudentSearch('')
                setCategoryId('')
                setDateFrom('')
                setDateTo('')
              }}
              className="text-sm text-primary-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={punishmentsQuery.isLoading}
        emptyMessage="No punishment records found"
        emptyDescription="Try adjusting your filters or add a new punishment"
      />
      
      {/* Add Punishment Modal */}
      {modalOpen && (
        <Modal 
          title="Record Punishment" 
          onClose={() => setModalOpen(false)}
        >
          <PunishmentForm onSuccess={handleAddSuccess} />
        </Modal>
      )}

      {/* Import Demerits Modal */}
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Demerits (Bulk Create)"
        description="Upload file Excel (.xlsx, .xls) atau CSV (.csv) dengan kolom: nis, violation_rule, punishment_date, notes."
        onDownloadTemplate={handleDownloadTemplate}
        onImport={importPunishments}
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}

