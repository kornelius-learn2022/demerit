export interface User {
  id: number
  name: string
  username?: string
  email: string
  role: 'admin' | 'pc1' | 'subject'
  classroom_id?: number
  classroom?: Classroom
  taught_classrooms?: Classroom[]
}

export interface Classroom {
  id: number
  name: string
  grade_level: string
  students_count?: number
}

export interface Student {
  id: number
  nis: string
  name: string
  classroom_id: number
  classroom?: Classroom
  initial_points?: number
  current_score: number
  latest_punishment?: Punishment | null
  is_active: boolean
}

export interface Category {
  id: number
  name: string
  description?: string
}

export interface ViolationRule {
  id: number
  category_id: number
  category?: Category
  description: string
  point_deduction: number
  is_active: boolean
}

export interface Punishment {
  id: number
  student_id: number
  student?: Student
  violation_rule_id: number
  violation_rule?: ViolationRule
  teacher_id: number
  teacher?: User
  teacher_role: 'pc1' | 'subject'
  notes?: string
  punishment_date: string
  point_deducted: number
  created_at: string
}

export interface TopViolationItem {
  violation_rule_id: number
  rule_description: string
  category_name: string
  count: number
}

export interface StudentBelowThreshold {
  id?: number
  student_id: number
  name?: string
  nis?: string
  current_score: number
  classroom?: Classroom
}

export interface DashboardStats {
  total_users?: number
  total_students?: number
  today_punishments?: number
  punishments_today?: number
  punishments_month?: number
  top_violations?: TopViolationItem[]
  recent_punishments?: Punishment[]
  classroom_id?: number
  class_student_count?: number
  total_class_punishments?: number
  students_below_120_pts?: StudentBelowThreshold[]
  students_below_100_pts?: StudentBelowThreshold[]
  students_below_count?: number
  below_safe?: number
  my_total_punishments?: number
  my_total?: number
  my_punishments_this_month?: number
  my_month?: number
  [key: string]: unknown
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message: string
}

export interface PaginatedResponse<T = unknown> {
  success: boolean
  data: {
    data: T[]
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
  message: string
}

export interface ImportResult {
  success: boolean
  message: string
  imported_count: number
  errors: string[]
}

export interface AppNotification {
  id: number
  user_id: number
  type: 'demerit_deleted' | 'demerit_created' | string
  title: string
  message: string
  data?: {
    action?: string
    actor_id?: number
    actor_name?: string
    actor_role?: string
    student_id?: number
    student_name?: string
    classroom_name?: string
    point_deducted?: number
    rule_description?: string
    [key: string]: unknown
  } | null
  is_read: boolean
  read_at?: string | null
  created_at: string
  updated_at: string
}


