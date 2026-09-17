import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getStudents } from '../../api/students'
import { getViolationRules } from '../../api/violationRules'
import { createPunishment } from '../../api/punishments'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import type { Student, ViolationRule } from '../../types'

interface PunishmentFormProps {
  onSuccess?: () => void
  initialStudent?: Student
}

export default function PunishmentForm({ onSuccess, initialStudent }: PunishmentFormProps) {
  const user = useAuthStore((s) => s.user)
  const { language } = useLanguageStore()

  // Student search
  const [studentSearch, setStudentSearch] = useState('')
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(initialStudent ?? null)
  const studentInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Form state
  const [selectedRuleId, setSelectedRuleId] = useState<number | ''>('')
  const [punishmentDate, setPunishmentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Queries
  const studentsQuery = useQuery({
    queryKey: ['students', user?.role === 'pc1' ? user.classroom_id : undefined],
    queryFn: () =>
      getStudents(user?.role === 'pc1' && user.classroom_id ? { classroom_id: user.classroom_id } : undefined),
  })

  const rulesQuery = useQuery({
    queryKey: ['violation-rules'],
    queryFn: () => getViolationRules({ is_active: true }),
  })

  // Group active rules into Minor Offences and Major Offences
  const activeRules: ViolationRule[] = (rulesQuery.data ?? []).filter((r: ViolationRule) => r.is_active)
  const minorRules = activeRules.filter(
    (r) => r.category?.name === 'Minor Offences' || (r.point_deduction < 30 && r.category?.name !== 'Major Offences')
  )
  const majorRules = activeRules.filter(
    (r) => r.category?.name === 'Major Offences' || r.point_deduction >= 30
  )

  const selectedRule = activeRules.find((r) => r.id === Number(selectedRuleId)) ?? null

  // Filter students by search
  const filteredStudents = (studentsQuery.data ?? []).filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nis.includes(studentSearch)
  )

  // Close dropdown on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node) &&
      !studentInputRef.current?.contains(e.target as Node)
    ) {
      setStudentDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [handleOutsideClick])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!selectedStudent) e.student = language === 'en' ? 'Please select a student' : 'Pilih siswa terlebih dahulu'
    if (!selectedRuleId) e.rule = language === 'en' ? 'Please select a violation rule' : 'Pilih aturan pelanggaran'
    if (!punishmentDate) e.date = language === 'en' ? 'Please select a date' : 'Pilih tanggal sanksi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      await createPunishment({
        student_id: selectedStudent!.id,
        violation_rule_id: Number(selectedRuleId),
        notes: notes.trim() || undefined,
        punishment_date: punishmentDate,
      })

      // Reset
      setSelectedStudent(null)
      setStudentSearch('')
      setSelectedRuleId('')
      setNotes('')
      setPunishmentDate(format(new Date(), 'yyyy-MM-dd'))
      setErrors({})
      onSuccess?.()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErrors({ submit: msg ?? (language === 'en' ? 'Failed to submit punishment. Please try again.' : 'Gagal mencatat sanksi. Silakan coba lagi.') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Student Search */}
      <div>
        <label className="label">{language === 'en' ? 'Student *' : 'Siswa *'}</label>
        <div className="relative">
          <input
            ref={studentInputRef}
            type="text"
            className={`input pr-10 ${errors.student ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder={language === 'en' ? 'Search by name or NIS…' : 'Cari berdasarkan nama atau NIS…'}
            value={selectedStudent ? `${selectedStudent.name} (${selectedStudent.nis})` : studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value)
              setSelectedStudent(null)
              setStudentDropdownOpen(true)
            }}
            onFocus={() => setStudentDropdownOpen(true)}
            autoComplete="off"
          />
          {selectedStudent && (
            <button
              type="button"
              onClick={() => { setSelectedStudent(null); setStudentSearch('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {studentDropdownOpen && !selectedStudent && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
            >
              {studentsQuery.isLoading ? (
                <div className="px-4 py-3 text-sm text-gray-400">{language === 'en' ? 'Loading students…' : 'Memuat data siswa…'}</div>
              ) : filteredStudents.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">{language === 'en' ? 'No students found' : 'Siswa tidak ditemukan'}</div>
              ) : (
                filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(s)
                      setStudentSearch('')
                      setStudentDropdownOpen(false)
                      setErrors((prev) => ({ ...prev, student: '' }))
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-primary-50 text-sm flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-slate-800">{s.name}</span>
                    {s.classroom?.name && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        {s.classroom.name}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {errors.student && <p className="mt-1 text-xs text-red-500">{errors.student}</p>}
        {selectedStudent && (
          <p className="mt-1 text-xs text-gray-500">
            {language === 'en' ? 'Class' : 'Kelas'}: {selectedStudent.classroom?.name ?? '—'} &nbsp;·&nbsp; {language === 'en' ? 'Current Score' : 'Skor Saat Ini'}:{' '}
            <span className="font-medium text-gray-800">{selectedStudent.current_score}</span>
          </p>
        )}
      </div>

      {/* Violation Rule (Directly Grouped: Major / Minor -> Offence -> Poin) */}
      <div>
        <label className="label">{language === 'en' ? 'Violation Rule (Major / Minor) *' : 'Aturan Pelanggaran (Major / Minor) *'}</label>
        <select
          className={`input ${errors.rule ? 'border-red-400 focus:ring-red-400' : ''}`}
          value={selectedRuleId}
          onChange={(e) => {
            setSelectedRuleId(e.target.value === '' ? '' : Number(e.target.value))
            setErrors((prev) => ({ ...prev, rule: '' }))
          }}
        >
          <option value="">{language === 'en' ? 'Select a violation rule…' : 'Pilih aturan pelanggaran…'}</option>

          {/* Minor Offences Group */}
          {minorRules.length > 0 && (
            <optgroup label={language === 'en' ? '── Minor Offences ──' : '── Minor Offences (Pelanggaran Ringan) ──'}>
              {minorRules.map((r: ViolationRule) => (
                <option key={r.id} value={r.id}>
                  {r.description} (−{r.point_deduction} {language === 'en' ? 'pts' : 'poin'})
                </option>
              ))}
            </optgroup>
          )}

          {/* Major Offences Group */}
          {majorRules.length > 0 && (
            <optgroup label={language === 'en' ? '── Major Offences ──' : '── Major Offences (Pelanggaran Berat) ──'}>
              {majorRules.map((r: ViolationRule) => (
                <option key={r.id} value={r.id}>
                  {r.description} (−{r.point_deduction} {language === 'en' ? 'pts' : 'poin'})
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {errors.rule && <p className="mt-1 text-xs text-red-500">{errors.rule}</p>}

        {/* Selected Rule Feedback & Parent Contact Alert */}
        {selectedRule && (
          <div className="mt-2.5 space-y-2">
            {/* Point deduction preview */}
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">
                {language === 'en' ? 'This violation will deduct ' : 'Pelanggaran ini akan mengurangi '}
                <span className="font-bold">{selectedRule.point_deduction} {language === 'en' ? 'points' : 'poin'}</span>
                {selectedStudent && (
                  <>
                    {' '}· {language === 'en' ? 'New score: ' : 'Skor baru: '}
                    <span className="font-bold">
                      {Math.max(0, selectedStudent.current_score - selectedRule.point_deduction)}
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Parent Call Notice: For Subject teacher view ONLY shown if giving demerit 30 */}
            {selectedRule.point_deduction === 30 && (
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-50/90 border border-rose-200 rounded-xl text-rose-900 text-xs sm:text-sm">
                <span className="text-base shrink-0 mt-0.5">📞</span>
                <div>
                  <p className="font-bold text-rose-950">
                    {language === 'en'
                      ? 'Panggil Orang Tua / Call Parents (Required for 30 Demerits)'
                      : 'Wajib Panggil Orang Tua (Demerit 30)'}
                  </p>
                  <p className="mt-0.5 text-xs text-rose-800 leading-relaxed">
                    {language === 'en'
                      ? 'Teacher must arrange an official meeting with parents and behavioral counseling for Major Offences.'
                      : 'Guru wajib menjadwalkan pertemuan resmi dengan orang tua siswa serta konseling perilaku untuk pelanggaran tingkat Major.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date */}
      <div>
        <label className="label">{language === 'en' ? 'Punishment Date *' : 'Tanggal Pelanggaran *'}</label>
        <input
          type="date"
          className={`input ${errors.date ? 'border-red-400 focus:ring-red-400' : ''}`}
          value={punishmentDate}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => {
            setPunishmentDate(e.target.value)
            setErrors((prev) => ({ ...prev, date: '' }))
          }}
        />
        {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
      </div>

      {/* Notes */}
      <div>
        <label className="label">{language === 'en' ? 'Notes (optional)' : 'Catatan Tambahan (opsional)'}</label>
        <textarea
          className="input min-h-[80px] resize-y"
          placeholder={language === 'en' ? 'Additional context or description…' : 'Keterangan atau konteks kejadian…'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
        />
        <p className="mt-1 text-xs text-gray-400 text-right">{notes.length}/500</p>
      </div>

      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errors.submit}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-2.5">
        {submitting ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {language === 'en' ? 'Submitting…' : 'Menyimpan…'}
          </>
        ) : (
          language === 'en' ? 'Record Punishment' : 'Catat Pelanggaran'
        )}
      </button>
    </form>
  )
}
