import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import { logout } from '../../api/auth'
import { getSettings } from '../../api/settings'
import { showToast } from '../../utils/toast'
import ChangePasswordModal from '../shared/ChangePasswordModal'
import ChangeNameModal from '../shared/ChangeNameModal'
import LanguageSwitcher from '../shared/LanguageSwitcher'
import NotificationDropdown from './NotificationDropdown'
import AcademicYearModal from './AcademicYearModal'

interface NavItem {
  to: string
  label: string
  icon: JSX.Element
  roles?: Array<'admin' | 'pc1' | 'subject'>
  badge?: string | number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const roleBadgeColor = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200/70',
  pc1: 'bg-blue-50 text-blue-700 border-blue-200/70',
  subject: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
}

// Consistent modern SVG Icons (20x20)
function IconDashboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

function IconStudents() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  )
}

function IconPunishments() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function IconClassroom() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  )
}

function IconCategories() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.386a11.905 11.905 0 004.838-4.838c.486-.827.313-1.908-.386-2.607L10.72 3.659A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  )
}

function IconRules() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

export default function AppLayout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const [loggingOut, setLoggingOut] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [academicYearModalOpen, setAcademicYearModalOpen] = useState(false)

  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { language, t } = useLanguageStore()
  const lang = t()
  const navigate = useNavigate()
  const location = useLocation()

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })
  const activeAcademicYear = settingsQuery.data?.active_academic_year || '2024/2025'

  // Save collapse preference
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  // Close drawer on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // ignore
    } finally {
      clearAuth()
      navigate('/login')
      showToast('Logged out successfully', 'info')
    }
  }

  // Navigation Groups
  const navGroups: NavGroup[] = [
    {
      title: lang.nav.overview,
      items: [
        { to: '/dashboard', label: lang.nav.dashboard, icon: <IconDashboard /> },
      ],
    },
    {
      title: lang.nav.management,
      items: [
        {
          to: '/students',
          label: user?.role === 'admin' ? lang.nav.students : lang.nav.studentsAndDemerits,
          icon: <IconStudents />,
        },
        {
          to: '/punishments',
          label: lang.nav.demeritsHistory,
          icon: <IconPunishments />,
          roles: ['admin'],
        },
      ],
    },
    {
      title: lang.nav.administration,
      items: [
        { to: '/admin/users', label: lang.nav.usersAndTeachers, icon: <IconUsers />, roles: ['admin'] },
        { to: '/admin/classrooms', label: lang.nav.classrooms, icon: <IconClassroom />, roles: ['admin'] },
        { to: '/admin/categories', label: lang.nav.categories, icon: <IconCategories />, roles: ['admin'] },
        { to: '/admin/violation-rules', label: lang.nav.violationRules, icon: <IconRules />, roles: ['admin'] },
      ],
    },
  ]

  // Filter items by role
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (user && item.roles.includes(user.role))
      ),
    }))
    .filter((group) => group.items.length > 0)

  // Current page title derived from route
  const getPageInfo = () => {
    const p = location.pathname
    if (p === '/dashboard') return lang.header.pages.dashboard
    if (p === '/students') return user?.role === 'admin' ? lang.header.pages.studentsAdmin : lang.header.pages.students
    if (p === '/punishments') return lang.header.pages.punishments
    if (p === '/admin/users') return lang.header.pages.users
    if (p === '/admin/classrooms') return lang.header.pages.classrooms
    if (p === '/admin/categories') return lang.header.pages.categories
    if (p === '/admin/violation-rules') return lang.header.pages.violationRules
    return lang.header.pages.portal
  }

  const pageInfo = getPageInfo()

  // Sidebar Component for Desktop & Mobile
  const renderSidebar = (collapsed: boolean, isMobile: boolean = false) => (
    <div className={`flex flex-col h-full bg-slate-900 text-slate-300 select-none transition-all duration-300 ${collapsed && !isMobile ? 'w-20' : 'w-64'}`}>
      {/* Sidebar Header / Brand */}
      <div className="flex items-center justify-between px-4 sm:px-5 h-16 border-b border-slate-800/80 shrink-0">
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed && !isMobile ? 'justify-center w-full' : ''}`}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-primary-500/20 shrink-0 ring-1 ring-white/15">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <span className="font-bold text-sm tracking-tight text-white block truncate">Demerit System</span>
              <span className="text-[11px] font-medium text-slate-400 block tracking-wider uppercase">School Portal</span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle Button */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleCollapse}
            className={`text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${collapsed ? 'hidden' : 'block'}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar width"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Links grouped */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden">
        {filteredGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {(!collapsed || isMobile) ? (
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {group.title}
              </h3>
            ) : (
              <div className="w-6 h-[1px] bg-slate-800 mx-auto my-2" />
            )}

            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                title={collapsed && !isMobile ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    collapsed && !isMobile ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'bg-primary-600/15 text-primary-300 font-semibold shadow-sm ring-1 ring-primary-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active vertical pill indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary-500 rounded-r-full shadow-sm" />
                    )}

                    <span className={`transition-colors ${isActive ? 'text-primary-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {item.icon}
                    </span>

                    {(!collapsed || isMobile) && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}

                    {/* Badge if available */}
                    {(!collapsed || isMobile) && item.badge !== undefined && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Expand trigger when collapsed */}
      {collapsed && !isMobile && (
        <div className="px-3 py-2 border-t border-slate-800/80 flex justify-center">
          <button
            type="button"
            onClick={toggleCollapse}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar Footer User Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/90 shrink-0">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-800/60 border border-slate-700/40 mb-2 ${collapsed && !isMobile ? 'justify-center p-1.5' : ''}`}>
          <div className="h-9 w-9 rounded-xl bg-primary-600/90 border border-primary-400/30 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate leading-tight">{user?.name}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-medium border ${roleBadgeColor[user?.role ?? 'subject']}`}>
                  {user?.role === 'admin'
                    ? lang.nav.roleAdmin
                    : user?.role === 'pc1'
                    ? lang.nav.rolePc1
                    : lang.nav.roleSubject}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick User Action Buttons */}
        <div className={`flex items-center gap-1.5 ${collapsed && !isMobile ? 'flex-col' : ''}`}>
          <button
            type="button"
            onClick={() => setNameModalOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700/60"
            title={language === 'en' ? 'Change Display Name' : 'Ubah Nama'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {(!collapsed || isMobile) && <span>{language === 'en' ? 'Name' : 'Nama'}</span>}
          </button>

          <button
            type="button"
            onClick={() => setPasswordModalOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700/60"
            title={lang.header.changePassword}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
            </svg>
            {(!collapsed || isMobile) && <span>Password</span>}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-900/50 disabled:opacity-50"
            title={lang.header.logout}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            {(!collapsed || isMobile) && <span>{lang.header.logout}</span>}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:shrink-0 shadow-sm border-r border-slate-800/80 z-30">
        {renderSidebar(isCollapsed, false)}
      </aside>

      {/* Mobile Off-canvas Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ease-in-out shadow-2xl ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebar(false, true)}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 transition-colors">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Mobile trigger & Page Info */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                aria-label="Open menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
                    {pageInfo.title}
                  </h1>
                  {user?.role === 'pc1' && user?.classroom && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 shrink-0">
                      Kelas {user.classroom.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate hidden sm:block">
                  {pageInfo.subtitle}
                </p>
              </div>
            </div>

            {/* Right: Notification, Language switcher, Quick actions & user badge */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Recent Demerit Violations Notification Dropdown */}
              <NotificationDropdown />

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Dynamic Academic Year Status Chip (Clickable for Admin) */}
              {user?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => setAcademicYearModalOpen(true)}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-xs font-medium text-slate-700 transition-all cursor-pointer group"
                  title="Click to edit active academic year"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <span>{activeAcademicYear} • Active</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              ) : (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <span>{activeAcademicYear} • Active</span>
                </div>
              )}

              {/* Change Name Shortcut */}
              <button
                type="button"
                onClick={() => setNameModalOpen(true)}
                className="text-slate-500 hover:text-primary-600 p-2 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
                title={language === 'en' ? 'Change Display Name' : 'Ubah Nama'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              {/* Password Shortcut */}
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="text-slate-500 hover:text-primary-600 p-2 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
                title={lang.header.changePassword}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                </svg>
              </button>

              {/* User Avatar with Clickable Edit Name Trigger */}
              <button
                type="button"
                onClick={() => setNameModalOpen(true)}
                className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-85 transition-opacity text-left group"
                title={language === 'en' ? 'Click to change display name' : 'Klik untuk ubah nama tampilan'}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-slate-200 group-hover:ring-primary-400 transition-all">
                  {user?.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="hidden xl:flex flex-col items-start leading-none">
                  <span className="text-xs font-semibold text-slate-700 max-w-[140px] truncate group-hover:text-primary-600 transition-colors">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {language === 'en' ? 'Edit name' : 'Ubah nama'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Change Name Modal */}
      <ChangeNameModal
        open={nameModalOpen}
        onClose={() => setNameModalOpen(false)}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

      {/* Academic Year Settings Modal for Admin */}
      {user?.role === 'admin' && (
        <AcademicYearModal
          isOpen={academicYearModalOpen}
          onClose={() => setAcademicYearModalOpen(false)}
          currentYear={activeAcademicYear}
        />
      )}
    </div>
  )
}
