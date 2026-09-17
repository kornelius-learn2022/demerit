import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import AppLayout from '../components/layout/AppLayout'
import LoginPage from '../pages/Login'
import DashboardPage from '../pages/Dashboard'
import PunishmentsPage from '../pages/Punishments'
import StudentsPage from '../pages/Students'
import UsersPage from '../pages/admin/Users'
import ClassroomsPage from '../pages/admin/Classrooms'
import CategoriesPage from '../pages/admin/Categories'
import ViolationRulesPage from '../pages/admin/ViolationRules'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: Array<'admin' | 'pc1' | 'subject'>
}

function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user)
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

export default function AppRouter() {
  const token = useAuthStore((s) => s.token)

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* Authenticated */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="punishments"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <PunishmentsPage />
            </RoleGuard>
          }
        />
        
        <Route path="students" element={<StudentsPage />} />

        {/* Admin-only routes */}
        <Route
          path="admin/users"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <UsersPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/classrooms"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <ClassroomsPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/categories"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <CategoriesPage />
            </RoleGuard>
          }
        />
        <Route
          path="admin/violation-rules"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <ViolationRulesPage />
            </RoleGuard>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}


