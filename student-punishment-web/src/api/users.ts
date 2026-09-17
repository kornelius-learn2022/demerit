import apiClient from './client'
import type { ApiResponse, ImportResult, User } from '../types'

export interface UserFilters {
  role?: string
  classroom_id?: number
}

export interface CreateUserPayload {
  name: string
  email: string
  username?: string
  password: string
  role: 'admin' | 'pc1' | 'subject'
  classroom_id?: number
  classroom_ids?: number[]
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  username?: string
  password?: string
  role?: 'admin' | 'pc1' | 'subject'
  classroom_id?: number
  classroom_ids?: number[]
}

export const getUsers = async (filters?: UserFilters): Promise<User[]> => {
  const res = await apiClient.get<ApiResponse<User[]>>('/users', { params: filters })
  return res.data.data
}

export const getUser = async (id: number): Promise<User> => {
  const res = await apiClient.get<ApiResponse<User>>(`/users/${id}`)
  return res.data.data
}

export const createUser = async (payload: CreateUserPayload): Promise<User> => {
  const res = await apiClient.post<ApiResponse<User>>('/users', payload)
  return res.data.data
}

export const updateUser = async (id: number, payload: UpdateUserPayload): Promise<User> => {
  const res = await apiClient.put<ApiResponse<User>>(`/users/${id}`, payload)
  return res.data.data
}

export const deleteUser = async (id: number): Promise<void> => {
  await apiClient.delete(`/users/${id}`)
}

export const exportUsers = async (filters?: UserFilters): Promise<Blob> => {
  const res = await apiClient.get('/users/export', {
    params: filters,
    responseType: 'blob',
  })
  return res.data
}

export const getUsersTemplate = async (): Promise<Blob> => {
  const res = await apiClient.get('/users/template', {
    responseType: 'blob',
  })
  return res.data
}

export const importUsers = async (file: File): Promise<ImportResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post<ImportResult>('/users/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}
