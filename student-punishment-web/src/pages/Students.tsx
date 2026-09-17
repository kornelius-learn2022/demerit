import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  exportStudents,
  getStudentsTemplate,
  importStudents,
} from '../api/students'
import { getClassrooms } from '../api/classrooms'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import DataTable, { type Column } from '../components/shared/DataTable'
import Modal from '../components/shared/Modal'
import ImportModal from '../components/shared/ImportModal'
import ScoreBadge from '../components/shared/ScoreBadge'
import PunishmentForm from '../components/shared/PunishmentForm'
import StudentPunishmentsModal from '../components/shared/StudentPunishmentsModal'
import { showToast } from '../utils/toast'
import { downloadBlob } from '../utils/export'
import type { Student } from '../types'

interface StudentFormData {
  name: string
  classroom_id: number | ''
  initial_points: number | ''
}

const empty: StudentFormData = { name: '', classroom_id: '', initial_points: 150 }

export default function StudentsPage() {
  const user = useAuthStore((s) => s.user)
  const { language, t } = useLanguageStore()
  const st = t().students
  const common = t().common
  const qc = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'pc1' || user?.role === 'subject'

  const [search, setSearch] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<string | 'all'>('all')
  const [selectedClassId, setSelectedClassId] = useState<number | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<StudentFormData>(empty)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // New Modals for Punishment
  const [addPunishmentStudent, setAddPunishmentStudent] = useState<Student | null>(null)
  const [viewPunishmentsStudent, setViewPunishmentsStudent] = useState<Student | null>(null)

  // Import / Export states
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = selectedClassId !== 'all' ? { classroom_id: selectedClassId } : studentsParams
      const blob = await exportStudents(params)
      downloadBlob(blob, `students_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('Students exported successfully', 'success')
    } catch {
      showToast('Failed to export students', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    const blob = await getStudentsTemplate()
    downloadBlob(blob, 'students_template.xlsx')
  }

  const handleImportSuccess = () => {
    qc.invalidateQueries({ queryKey: ['students'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const studentsParams =
    user?.role === 'pc1' && user.classroom_id ? { classroom_id: user.classroom_id } : undefined

  const studentsQuery = useQuery({
    queryKey: ['students', studentsParams],
    queryFn: () => getStudents(studentsParams),
  })

  const classroomsQuery = useQuery({
    queryKey: ['classrooms'],
    queryFn: getClassrooms,
    enabled: isAdmin || user?.role === 'subject',
  })

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      showToast('Student added successfully', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to add student' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StudentFormData> }) =>
      updateStudent(id, {
        ...data,
        classroom_id: data.classroom_id ? Number(data.classroom_id) : undefined,
        initial_points:
          data.initial_points === '' || data.initial_points === undefined
            ? undefined
            : Number(data.initial_points),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      showToast('Student updated successfully', 'success')
      closeModal()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErrors({ submit: msg ?? 'Failed to update student' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      showToast('Student deleted', 'success')
    },
    onError: () => showToast('Failed to delete student', 'error'),
  })

  const openAdd = () => {
    setEditing(null)
    setForm(empty)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (s: Student) => {
    setEditing(s)
    setForm({
      name: s.name,
      classroom_id: s.classroom_id,
      initial_points: s.initial_points ?? 150,
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
    if (!form.name.trim()) e.name = language === 'en' ? 'Name is required' : 'Nama wajib diisi'
    if (!form.classroom_id) e.classroom_id = language === 'en' ? 'Classroom is required' : 'Kelas wajib dipilih'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        classroom_id: Number(form.classroom_id),
        initial_points: form.initial_points === '' ? 150 : Number(form.initial_points),
      }
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (s: Student) => {
    if (!confirm(`Delete student "${s.name}"? This cannot be undone.`)) return
    deleteMutation.mutate(s.id)
  }

  // Grade levels available
  const gradeLevels = useMemo(() => {
    if (!classroomsQuery.data) return []
    const grades = Array.from(new Set(classroomsQuery.data.map((c) => String(c.grade_level)))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    )
    return grades
  }, [classroomsQuery.data])

  // Student counts per classroom
  const classStudentCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    ;(studentsQuery.data ?? []).forEach((s) => {
      counts[s.classroom_id] = (counts[s.classroom_id] ?? 0) + 1
    })
    return counts
  }, [studentsQuery.data])

  // Student counts per grade
  const gradeStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const classroomGradeMap = new Map((classroomsQuery.data ?? []).map((c) => [c.id, String(c.grade_level)]))
    ;(studentsQuery.data ?? []).forEach((s) => {
      const grade = s.classroom?.grade_level ? String(s.classroom.grade_level) : classroomGradeMap.get(s.classroom_id)
      if (grade) {
        counts[grade] = (counts[grade] ?? 0) + 1
      }
    })
    return counts
  }, [studentsQuery.data, classroomsQuery.data])

  // Classrooms filtered by selected grade
  const availableClassrooms = useMemo(() => {
    const list = classroomsQuery.data ?? []
    if (selectedGrade === 'all') return list
    return list.filter((c) => String(c.grade_level) === selectedGrade)
  }, [classroomsQuery.data, selectedGrade])

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    const classroomGradeMap = new Map((classroomsQuery.data ?? []).map((c) => [c.id, String(c.grade_level)]))
    return (studentsQuery.data ?? []).filter((s) => {
      const matchesSearch =
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.classroom?.name?.toLowerCase().includes(term)

      const studentGrade = s.classroom?.grade_level ? String(s.classroom.grade_level) : classroomGradeMap.get(s.classroom_id)
      const matchesGrade = selectedGrade === 'all' || studentGrade === selectedGrade
      const matchesClass = selectedClassId === 'all' || s.classroom_id === selectedClassId

      return matchesSearch && matchesGrade && matchesClass
    })
  }, [studentsQuery.data, search, selectedGrade, selectedClassId, classroomsQuery.data])

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: st.tableHeaders.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200/70 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-gray-900 block truncate">{s.name}</span>
            <span className="text-xs text-gray-500 font-medium sm:hidden">
              {s.classroom?.name ?? ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      header: st.tableHeaders.class,
      render: (s) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
          {s.classroom?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'current_score',
      header: st.tableHeaders.score,
      render: (s) => (
        <div className="flex flex-col gap-1 items-start">
          <ScoreBadge score={s.current_score} />
          {s.current_score <= 120 && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs whitespace-nowrap"
              title={
                language === 'en'
                  ? 'Has accumulated 30+ demerits: Mandatory parent contact milestone'
                  : 'Akumulasi 30+ demerit: Wajib hubungi / temui orang tua'
              }
            >
              <span className="animate-pulse">📞</span>
              <span>{st.mustCallParentsBadge}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'recent_demerit',
      header: st.tableHeaders.recentDemerit,
      render: (s: Student) => {
        if (!s.latest_punishment) {
          return <span className="text-xs text-gray-400 italic">{st.noDemerits}</span>
        }
        return (
          <button
            type="button"
            onClick={() => setViewPunishmentsStudent(s)}
            className="text-left group/demerit py-0.5 hover:opacity-80 transition-opacity"
            title={language === 'en' ? 'Click to view full violation history' : 'Klik untuk melihat seluruh riwayat pelanggaran'}
          >
            <div className="flex items-center gap-1.5 max-w-[200px]">
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200/60 tabular-nums shrink-0">
                −{s.latest_punishment.point_deducted}
              </span>
              <span className="text-xs font-semibold text-gray-800 line-clamp-1 group-hover/demerit:text-primary-600">
                {s.latest_punishment.violation_rule?.description ?? (language === 'en' ? 'Violation' : 'Pelanggaran')}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
              {format(new Date(s.latest_punishment.punishment_date), 'dd MMM yyyy')}
            </p>
          </button>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      render: (s: Student) => (
        <div className="flex items-center gap-1 justify-end">
          {/* Action: Add Punishment (PC1 & Subject) */}
          {isTeacher && (
            <button
              onClick={() => setAddPunishmentStudent(s)}
              className="text-primary-600 hover:bg-primary-50 p-1.5 rounded-lg transition-colors"
              title={st.addPunishmentTitle}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Action: View Punishment History (All Roles) */}
          <button
            onClick={() => setViewPunishmentsStudent(s)}
            className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
            title={st.viewHistoryTitle}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Action: Edit/Delete Student (Admin Only) */}
          {isAdmin && (
            <>
              <button
                onClick={() => openEdit(s)}
                className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                title={st.editStudent}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(s)}
                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                title={common.delete}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  const handleAddPunishmentSuccess = () => {
    qc.invalidateQueries({ queryKey: ['punishments'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['students'] })
    showToast('Punishment recorded successfully!', 'success')
    setAddPunishmentStudent(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{st.pageTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {user?.role === 'pc1'
              ? `${t().header.homeroomClass.replace('{class}', user.classroom?.name ?? '')}`
              : selectedClassId !== 'all'
              ? `${language === 'en' ? 'Classroom' : 'Kelas'}: ${classroomsQuery.data?.find((c) => c.id === selectedClassId)?.name ?? ''}`
              : selectedGrade !== 'all'
              ? `${st.gradePrefix ?? (language === 'en' ? 'Grade' : 'Kelas')} ${selectedGrade}`
              : (language === 'en' ? 'All classrooms (use filter below to view by grade or class)' : 'Semua kelas (Gunakan filter di bawah untuk melihat per tingkat atau kelas)')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-1.5"
            title="Export Students to CSV"
          >
            {exporting ? (
              <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-gray-600 border-t-transparent rounded-full" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            <span>{st.exportCsv}</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="btn-secondary flex items-center gap-1.5"
                title="Bulk Import Students from CSV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>{st.importCsv}</span>
              </button>
              <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>{st.addStudent}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Classroom & Grade Modern Filter Section for Admin & Subject Teacher */}
      {(user?.role === 'subject' || isAdmin) && classroomsQuery.data && classroomsQuery.data.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
          {/* Header row with Icon, Title, Active Filter indicator and Reset button */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center border border-primary-100 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {st.filterTitle ?? (language === 'en' ? 'Classroom & Grade Filter' : 'Filter Kelas & Tingkat')}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedClassId !== 'all' ? (
                    <span>
                      {language === 'en' ? 'Active Filter: ' : 'Filter Aktif: '}
                      <strong className="text-primary-700 font-semibold">
                        {classroomsQuery.data.find((c) => c.id === selectedClassId)?.name}
                      </strong>
                      {' '}({classStudentCounts[selectedClassId] ?? 0} {language === 'en' ? 'students' : 'siswa'})
                    </span>
                  ) : selectedGrade !== 'all' ? (
                    <span>
                      {language === 'en' ? 'Active Filter: ' : 'Filter Aktif: '}
                      <strong className="text-primary-700 font-semibold">
                        {st.gradePrefix ?? (language === 'en' ? 'Grade' : 'Kelas')} {selectedGrade}
                      </strong>
                      {' '}({gradeStudentCounts[selectedGrade] ?? 0} {language === 'en' ? 'students' : 'siswa'})
                    </span>
                  ) : (
                    <span>
                      {language === 'en'
                        ? `Showing all ${studentsQuery.data?.length ?? 0} students across all classes`
                        : `Menampilkan seluruh ${studentsQuery.data?.length ?? 0} siswa di semua kelas`}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {(selectedGrade !== 'all' || selectedClassId !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGrade('all')
                  setSelectedClassId('all')
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>{st.resetFilter ?? (language === 'en' ? 'Show All' : 'Tampilkan Semua')}</span>
              </button>
            )}
          </div>

          {/* Level 1: Grade Selector Segmented Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedGrade('all')
                setSelectedClassId('all')
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 ${
                selectedGrade === 'all' && selectedClassId === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{st.allGrades ?? (language === 'en' ? 'All Grades' : 'Semua Tingkat')}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedGrade === 'all' && selectedClassId === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {studentsQuery.data?.length ?? 0}
              </span>
            </button>

            {gradeLevels.map((grade) => {
              const isGradeActive = selectedGrade === grade
              const gradeCount = gradeStudentCounts[grade] ?? 0
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => {
                    setSelectedGrade(grade)
                    setSelectedClassId('all')
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 ${
                    isGradeActive
                      ? 'bg-white text-primary-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{st.gradePrefix ?? (language === 'en' ? 'Grade' : 'Kelas')} {grade}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      isGradeActive ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {gradeCount}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Level 2: Modern Classroom Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
            {/* Quick 'All in selected scope' button */}
            <button
              type="button"
              onClick={() => setSelectedClassId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 border ${
                selectedClassId === 'all'
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm ring-2 ring-primary-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <span>
                {selectedGrade === 'all'
                  ? (st.allClasses ?? (language === 'en' ? 'All Classes' : 'Semua Kelas'))
                  : `${language === 'en' ? 'All' : 'Semua'} Grade ${selectedGrade}`}
              </span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedClassId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {selectedGrade === 'all'
                  ? (studentsQuery.data?.length ?? 0)
                  : (gradeStudentCounts[selectedGrade] ?? 0)}
              </span>
            </button>

            {/* Individual Classroom Pills */}
            {availableClassrooms.map((c) => {
              const countInClass = classStudentCounts[c.id] ?? 0
              const isSelected = selectedClassId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedClassId(c.id)
                    if (selectedGrade === 'all') {
                      setSelectedGrade(c.grade_level)
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm ring-2 ring-primary-500/20'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <span>{c.name}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {countInClass}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Search & Results Count Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-sm w-full">
          <input
            type="text"
            className="input pl-9 pr-8"
            placeholder={st.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>
            {language === 'en'
              ? `Showing ${filtered.length} of ${studentsQuery.data?.length ?? 0} students`
              : `Menampilkan ${filtered.length} dari ${studentsQuery.data?.length ?? 0} siswa`}
          </span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={studentsQuery.isLoading}
        emptyMessage={language === 'en' ? 'No students found' : 'Tidak ada data siswa ditemukan'}
        emptyDescription={isAdmin ? (language === 'en' ? 'Add a student to get started' : 'Tambahkan siswa untuk memulai') : (language === 'en' ? 'No students in your class yet' : 'Belum ada siswa di kelas Anda')}
      />

      {/* Add Punishment Modal */}
      {addPunishmentStudent && (
        <Modal 
          title={`${st.addPunishmentTitle}: ${addPunishmentStudent.name}`} 
          onClose={() => setAddPunishmentStudent(null)}
        >
          <PunishmentForm 
            initialStudent={addPunishmentStudent} 
            onSuccess={handleAddPunishmentSuccess} 
          />
        </Modal>
      )}

      {/* View Punishments Details Modal */}
      {viewPunishmentsStudent && (
        <StudentPunishmentsModal 
          student={viewPunishmentsStudent} 
          onClose={() => setViewPunishmentsStudent(null)} 
        />
      )}

      {/* Edit/Add Student Modal */}
      {modalOpen && (
        <Modal
          title={editing ? st.editStudent : st.addStudent}
          onClose={closeModal}
          footer={
            <>
              <button onClick={closeModal} className="btn-secondary">{st.form.cancel}</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? st.form.saving : editing ? st.form.save : st.addStudent}
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
              <label className="label">{st.form.name}</label>
              <input
                className={`input ${formErrors.name ? 'border-red-400' : ''}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={st.form.namePlaceholder}
                autoFocus
              />
              {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
            </div>
            <div>
              <label className="label">{st.form.classroom}</label>
              <select
                className={`input ${formErrors.classroom_id ? 'border-red-400' : ''}`}
                value={form.classroom_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, classroom_id: e.target.value === '' ? '' : Number(e.target.value) }))
                }
              >
                <option value="">{st.form.selectClassroom}</option>
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
            <div>
              <label className="label">{st.form.initialPoints}</label>
              <input
                type="number"
                min="0"
                max="1000"
                className={`input ${formErrors.initial_points ? 'border-red-400' : ''}`}
                value={form.initial_points}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    initial_points: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                placeholder="150"
              />
              <p className="mt-1 text-xs text-gray-500">
                {st.form.initialPointsHelper}
              </p>
              {formErrors.initial_points && (
                <p className="mt-1 text-xs text-red-500">{formErrors.initial_points}</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Import Modal */}
      {isAdmin && (
        <ImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          title={st.importModal.title}
          description={st.importModal.description}
          onDownloadTemplate={handleDownloadTemplate}
          onImport={importStudents}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  )
}
