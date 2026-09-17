import apiClient from './client'
import type { ApiResponse, ImportResult, Student } from '../types'

export interface StudentFilters {
  classroom_id?: number
}

export interface CreateStudentPayload {
  nis?: string
  name: string
  classroom_id: number
  initial_points?: number
}

export interface UpdateStudentPayload {
  nis?: string
  name?: string
  classroom_id?: number
  initial_points?: number
}

export const getStudents = async (filters?: StudentFilters): Promise<Student[]> => {
  const res = await apiClient.get<ApiResponse<Student[]>>('/students', { params: filters })
  return res.data.data
}

export const createStudent = async (payload: CreateStudentPayload): Promise<Student> => {
  const res = await apiClient.post<ApiResponse<Student>>('/students', payload)
  return res.data.data
}

export const updateStudent = async (
  id: number,
  payload: UpdateStudentPayload
): Promise<Student> => {
  const res = await apiClient.put<ApiResponse<Student>>(`/students/${id}`, payload)
  return res.data.data
}

export const deleteStudent = async (id: number): Promise<void> => {
  await apiClient.delete(`/students/${id}`)
}

export const exportStudents = async (filters?: StudentFilters): Promise<Blob> => {
  const res = await apiClient.get('/students/export', {
    params: filters,
    responseType: 'blob',
  })
  return res.data
}

export const getStudentsTemplate = async (): Promise<Blob> => {
  const res = await apiClient.get('/students/template', {
    responseType: 'blob',
  })
  return res.data
}

export const importStudents = async (file: File): Promise<ImportResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post<ImportResult>('/students/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}
