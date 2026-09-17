import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { getDashboard } from '../api/dashboard'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import ScoreBadge from '../components/shared/ScoreBadge'
import StudentPunishmentsModal from '../components/shared/StudentPunishmentsModal'
import ProgressiveDisciplinePlan from '../components/dashboard/ProgressiveDisciplinePlan'
import type { Student, Punishment, TopViolationItem, StudentBelowThreshold } from '../types'

// Reusable KPI Card Component
interface KpiCardProps {
  label: string
  value: string | number
  icon: JSX.Element
  color: 'indigo' | 'blue' | 'amber' | 'emerald' | 'rose' | 'purple'
  helper?: string
  trendBadge?: {
    text: string
    isPositive?: boolean
  }
  loading?: boolean
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50/80 text-indigo-600 border-indigo-100',
    ring: 'ring-indigo-100',
  },
  blue: {
    bg: 'bg-blue-50/80 text-blue-600 border-blue-100',
    ring: 'ring-blue-100',
  },
  amber: {
    bg: 'bg-amber-50/80 text-amber-600 border-amber-100',
    ring: 'ring-amber-100',
  },
  emerald: {
    bg: 'bg-emerald-50/80 text-emerald-600 border-emerald-100',
    ring: 'ring-emerald-100',
  },
  rose: {
    bg: 'bg-rose-50/80 text-rose-600 border-rose-100',
    ring: 'ring-rose-100',
  },
  purple: {
    bg: 'bg-purple-50/80 text-purple-600 border-purple-100',
    ring: 'ring-purple-100',
  },
}

function KpiCard({ label, value, icon, color, helper, trendBadge, loading }: KpiCardProps) {
  const styles = colorMap[color]

  return (
    <div className="card group relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-200">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </span>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${styles.bg}`}>
            {icon}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 py-1">
            <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : (
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {value}
            </div>
            {helper && (
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
                {helper}
              </p>
            )}
          </div>
        )}
      </div>

      {trendBadge && !loading && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
              trendBadge.isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            }`}
          >
            {trendBadge.text}
          </span>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { language, t } = useLanguageStore()
  const dashT = t().dashboard
  const common = t().common

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  const [selectedAttentionStudent, setSelectedAttentionStudent] = useState<Student | null>(null)

  const isAdmin = user?.role === 'admin'
  const isPc1 = user?.role === 'pc1'
  const isSubject = user?.role === 'subject'

  // Extract counts with backward compatibility fallbacks
  const totalUsers = data?.total_users ?? 0
  const totalStudents = data?.total_students ?? 0
  const todayPunishments = data?.today_punishments ?? data?.punishments_today ?? 0
  const topViolations: TopViolationItem[] = (data?.top_violations as TopViolationItem[]) ?? []
  const recentPunishments: Punishment[] = (data?.recent_punishments as Punishment[]) ?? []

  // PC1 stats
  const classStudentCount = data?.class_student_count ?? data?.total_students ?? 0
  const totalClassPunishments = data?.total_class_punishments ?? 0
  const studentsBelowThreshold: StudentBelowThreshold[] =
    ((data?.students_below_120_pts ?? data?.students_below_100_pts) as StudentBelowThreshold[]) ?? []
  const studentsBelowCount = data?.students_below_count ?? studentsBelowThreshold.length ?? data?.below_safe ?? 0

  // Subject stats
  const myTotalPunishments = data?.my_total_punishments ?? data?.my_total ?? 0
  const myPunishmentsMonth = data?.my_punishments_this_month ?? data?.my_month ?? 0

  // Formatted current date
  const todayDateFormatted = format(new Date(), 'EEEE, dd MMMM yyyy')

  // Top violations max count for progress bar percentage
  const maxViolationCount = topViolations.length > 0 ? Math.max(...topViolations.map((v) => v.count), 1) : 1

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Welcome Greeting / Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shadow-sm border border-slate-800">
        {/* Subtle background decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-primary-200 text-xs font-medium backdrop-blur-sm border border-white/10">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{todayDateFormatted}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {dashT.welcome.replace('{name}', user?.name ?? '')}
            </h1>

            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {isAdmin && dashT.adminDesc}
              {isPc1 && dashT.pc1Desc.replace('{class}', user?.classroom?.name ?? '—')}
              {isSubject && dashT.subjectDesc}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Link
              to="/students"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-semibold shadow-sm transition-all duration-150"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <span>{isAdmin ? dashT.quickActions.manageStudents : dashT.quickActions.studentsAndPoints}</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-sm font-semibold backdrop-blur-sm transition-all duration-150"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <span>{dashT.quickActions.manageTeachers}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Metrics / KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {isAdmin && (
          <>
            <KpiCard
              label={dashT.kpi.totalStudents}
              value={totalStudents}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              }
              color="blue"
              helper={dashT.kpi.totalStudentsHelper}
              trendBadge={{ text: language === 'en' ? 'Active in system' : 'Aktif di sistem', isPositive: true }}
              loading={isLoading}
            />

            <KpiCard
              label={dashT.kpi.totalUsers}
              value={totalUsers}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              color="purple"
              helper={dashT.kpi.totalUsersHelper}
              loading={isLoading}
            />

            <KpiCard
              label={dashT.kpi.todayViolations}
              value={todayPunishments}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="amber"
              helper={dashT.kpi.todayViolationsHelper}
              trendBadge={{
                text: todayPunishments > 0 
                  ? (language === 'en' ? `${todayPunishments} recorded today` : `${todayPunishments} catatan hari ini`) 
                  : (language === 'en' ? 'Zero violations' : 'Nol pelanggaran'),
                isPositive: todayPunishments === 0,
              }}
              loading={isLoading}
            />

            <KpiCard
              label={dashT.kpi.topViolationsMonth}
              value={topViolations.length}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              color="rose"
              helper={dashT.kpi.topViolationsHelper}
              loading={isLoading}
            />
          </>
        )}

        {isPc1 && (
          <>
            <KpiCard
              label={dashT.kpi.classStudents}
              value={classStudentCount}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              }
              color="blue"
              helper={`${language === 'en' ? 'Class' : 'Kelas'} ${user?.classroom?.name ?? ''}`}
              trendBadge={{ text: language === 'en' ? 'Under monitoring' : 'Dalam pengawasan', isPositive: true }}
              loading={isLoading}
            />

            <KpiCard
              label={dashT.kpi.totalClassDemerits}
              value={totalClassPunishments}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              color="indigo"
              helper={dashT.kpi.totalClassDemeritsHelper}
              loading={isLoading}
            />

            <KpiCard
              label={dashT.kpi.attentionRequired}
              value={studentsBelowCount}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              color={studentsBelowCount > 0 ? 'rose' : 'emerald'}
              helper={dashT.kpi.attentionRequiredHelper}
              trendBadge={{
                text: studentsBelowCount === 0 ? dashT.kpi.safeCondition : dashT.kpi.counselingNeeded,
                isPositive: studentsBelowCount === 0,
              }}
              loading={isLoading}
            />

            <KpiCard
              label={dashT.kpi.initialPointsStandard}
              value="150"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="emerald"
              helper={dashT.kpi.initialPointsHelper}
              loading={isLoading}
            />
          </>
        )}

        {isSubject && (
          <>
            <KpiCard
              label={dashT.kpi.myTotalRecorded}
              value={myTotalPunishments}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              color="emerald"
              helper={dashT.kpi.myTotalRecordedHelper}
              loading={isLoading}
            />

            <KpiCard
              label={dashT.kpi.recordedThisMonth}
              value={myPunishmentsMonth}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              color="amber"
              helper={language === 'en' ? 'Violations recorded in current month' : 'Catatan pelanggaran pada bulan berjalan'}
              trendBadge={{ text: `${myPunishmentsMonth} ${language === 'en' ? 'this month' : 'bulan ini'}`, isPositive: true }}
              loading={isLoading}
            />

            <KpiCard
              label={dashT.kpi.taughtClasses}
              value={user?.taught_classrooms?.length ?? (language === 'en' ? 'All' : 'Semua')}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
                </svg>
              }
              color="blue"
              helper={dashT.kpi.taughtClassesHelper}
              loading={isLoading}
            />

            <KpiCard
              label={dashT.kpi.initialPointsStandard}
              value="150"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="indigo"
              helper={dashT.kpi.initialPointsHelper}
              loading={isLoading}
            />
          </>
        )}
      </div>

      {/* 3. Analytics & Contextual Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on desktop): Top Violations / Attention List */}
        <div className="lg:col-span-2 space-y-6">
          {/* ADMIN: Top Violations Bar Chart */}
          {isAdmin && (
            <div className="card">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {dashT.topViolationsTitle}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dashT.topViolationsSubtitle.replace('{month}', format(new Date(), 'MMMM yyyy'))}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {topViolations.length} {language === 'en' ? 'Violation Types' : 'Jenis Pelanggaran'}
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-4 py-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-1.5 animate-pulse">
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded-full w-full" />
                    </div>
                  ))}
                </div>
              ) : topViolations.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{dashT.noViolationsMonth}</p>
                  <p className="text-xs text-slate-400">{dashT.noViolationsDesc}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {topViolations.map((item, idx) => {
                    const percentage = Math.round((item.count / maxViolationCount) * 100)
                    return (
                      <div key={item.violation_rule_id} className="py-3.5 first:pt-4 last:pb-1">
                        <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-5 w-5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {item.rule_description}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0 hidden sm:inline">
                              {item.category_name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-700 shrink-0 tabular-nums">
                            {item.count} {language === 'en' ? 'demerits' : 'kejadian'}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* PC1: Attention Required Card (Students below threshold) */}
          {isPc1 && (
            <div className="card">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {dashT.attentionCardTitle}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dashT.attentionCardSubtitle}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${studentsBelowThreshold.length > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {dashT.studentCount.replace('{count}', String(studentsBelowThreshold.length))}
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-3 py-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : studentsBelowThreshold.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{dashT.allStudentsSafeTitle}</p>
                  <p className="text-xs text-slate-500">{dashT.allStudentsSafeDesc}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-2">
                  {studentsBelowThreshold.map((s) => (
                    <div key={s.student_id} className="flex items-center justify-between py-3 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {s.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                          {s.classroom?.name && (
                            <p className="text-xs text-slate-500 font-medium">{s.classroom.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* 30-Demerit Mandatory Parent Milestone Badge */}
                        {s.current_score <= 120 && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs whitespace-nowrap"
                            title={
                              language === 'en'
                                ? 'Accumulated 30+ demerits: Mandatory parent contact milestone'
                                : 'Akumulasi 30+ demerit: Wajib hubungi / temui orang tua'
                            }
                          >
                            <span className="animate-pulse">📞</span>
                            <span>{language === 'en' ? 'Must Call Parents' : 'Wajib Hubungi Ortu'}</span>
                          </span>
                        )}

                        <ScoreBadge score={s.current_score} size="sm" />
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAttentionStudent({
                              id: s.id ?? s.student_id,
                              name: s.name ?? 'Siswa',
                              nis: s.nis ?? '',
                              classroom_id: s.classroom?.id ?? user?.classroom_id ?? 0,
                              classroom: s.classroom ?? user?.classroom,
                              current_score: s.current_score,
                              is_active: true,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl border border-primary-200 transition-colors shadow-sm"
                          title={language === 'en' ? 'View student violation details' : 'Lihat riwayat rincian pelanggaran siswa'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          <span>{dashT.viewDetail}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUBJECT: Scope of Taught Classes */}
          {isSubject && (
            <div className="card">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {dashT.taughtClassesTitle}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dashT.taughtClassesSubtitle}
                  </p>
                </div>
              </div>

              <div className="pt-4">
                {user?.taught_classrooms && user.taught_classrooms.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {user.taught_classrooms.map((cls) => (
                      <Link
                        key={cls.id}
                        to="/students"
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/40 transition-all flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800 group-hover:text-primary-700">
                            {cls.name}
                          </p>
                          <p className="text-xs text-slate-400">{language === 'en' ? 'Grade' : 'Tingkat'} {cls.grade_level}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300 group-hover:text-primary-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 text-slate-600 text-xs leading-relaxed">
                    {dashT.flexiblePermissions}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1/3 width on desktop): Progressive Discipline Plan & Quick Links */}
        <div className="space-y-6">
          {/* Official Progressive Discipline Plan (Replaces old Photo 1 card) */}
          <ProgressiveDisciplinePlan />

          {/* Helpful Quick Links */}
          <div className="card bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 mb-2">{dashT.quickLinks}</h3>
            <div className="space-y-1.5 text-xs font-medium">
              <Link
                to="/students"
                className="flex items-center justify-between p-2 rounded-lg text-slate-700 hover:bg-white hover:text-primary-600 hover:shadow-sm transition-all"
              >
                <span>{dashT.quickLinksList.studentsList}</span>
                <span>→</span>
              </Link>
              {isAdmin && (
                <>
                  <Link
                    to="/punishments"
                    className="flex items-center justify-between p-2 rounded-lg text-slate-700 hover:bg-white hover:text-primary-600 hover:shadow-sm transition-all"
                  >
                    <span>{dashT.quickLinksList.violationsHistory}</span>
                    <span>→</span>
                  </Link>
                  <Link
                    to="/admin/violation-rules"
                    className="flex items-center justify-between p-2 rounded-lg text-slate-700 hover:bg-white hover:text-primary-600 hover:shadow-sm transition-all"
                  >
                    <span>{dashT.quickLinksList.violationRules}</span>
                    <span>→</span>
                  </Link>
                  <Link
                    to="/admin/users"
                    className="flex items-center justify-between p-2 rounded-lg text-slate-700 hover:bg-white hover:text-primary-600 hover:shadow-sm transition-all"
                  >
                    <span>{dashT.quickLinksList.assignClasses}</span>
                    <span>→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Demerit Records Activity Feed / Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {dashT.recentActivityTitle}
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
                {dashT.recentRecordsCount.replace('{count}', String(recentPunishments.length))}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {dashT.recentActivitySubtitle}
            </p>
          </div>

          <Link
            to={isAdmin ? '/punishments' : '/students'}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>{dashT.viewAllRecords}</span>
            <span>→</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="divide-y divide-slate-100 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-slate-100 rounded-full" />
                  <div className="space-y-1.5">
                    <div className="h-4 bg-slate-100 rounded w-32" />
                    <div className="h-3 bg-slate-100 rounded w-48" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : recentPunishments.length === 0 ? (
          <div className="py-14 text-center text-slate-400 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-50 text-slate-300 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">{dashT.noRecentRecordsTitle}</p>
            <p className="text-xs text-slate-400">{dashT.noRecentRecordsDesc}</p>
          </div>
        ) : (
          <div>
            {/* Desktop / Tablet Modern Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 pr-4">{dashT.tableHeaders.student}</th>
                    <th className="py-3.5 px-4">{dashT.tableHeaders.violation}</th>
                    <th className="py-3.5 px-4 text-center">{dashT.tableHeaders.points}</th>
                    <th className="py-3.5 px-4">{dashT.tableHeaders.recordedBy}</th>
                    <th className="py-3.5 pl-4 text-right">{dashT.tableHeaders.time}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentPunishments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Siswa */}
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {p.student?.name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {p.student?.name ?? '—'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500 font-mono">
                                {p.student?.nis}
                              </span>
                              {p.student?.classroom?.name && (
                                <span className="inline-block text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {p.student.classroom.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Pelanggaran */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-sm font-medium text-slate-800 line-clamp-1">
                          {p.violation_rule?.description ?? '—'}
                        </p>
                        {p.notes && (
                          <p className="text-xs text-slate-400 italic line-clamp-1 mt-0.5">
                            {language === 'en' ? 'Notes:' : 'Catatan:'} {p.notes}
                          </p>
                        )}
                      </td>

                      {/* Poin Pengurangan */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200/70 tabular-nums">
                          −{p.point_deducted} {common.pts}
                        </span>
                      </td>

                      {/* Pencatat */}
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-medium text-slate-700 truncate">
                          {p.teacher?.name ?? '—'}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {p.teacher_role === 'pc1'
                            ? (language === 'en' ? 'Homeroom' : 'Wali Kelas')
                            : p.teacher_role === 'subject'
                            ? (language === 'en' ? 'Subject Teacher' : 'Guru Mapel')
                            : 'Admin'}
                        </span>
                      </td>

                      {/* Tanggal */}
                      <td className="py-3.5 pl-4 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {p.punishment_date
                          ? format(new Date(p.punishment_date), 'dd MMM yyyy')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Card List */}
            <div className="sm:hidden divide-y divide-slate-100">
              {recentPunishments.map((p) => (
                <div key={p.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {p.student?.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{p.student?.name}</p>
                        <span className="text-[11px] text-slate-500 font-mono">{p.student?.classroom?.name ?? ''} • {p.student?.nis}</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/70 shrink-0 tabular-nums">
                      −{p.point_deducted} {common.pts}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {p.violation_rule?.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                    <span>{language === 'en' ? 'By:' : 'Oleh:'} {p.teacher?.name ?? '—'}</span>
                    <span>{p.punishment_date ? format(new Date(p.punishment_date), 'dd MMM yyyy') : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pop-up Modal: Detail Pelanggaran Siswa Perhatian Khusus */}
      {selectedAttentionStudent && (
        <StudentPunishmentsModal
          student={selectedAttentionStudent}
          onClose={() => setSelectedAttentionStudent(null)}
        />
      )}
    </div>
  )
}
