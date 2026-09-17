import apiClient from './client'
import type { ApiResponse, User } from '../types'

export interface LoginPayload {
  username?: string
  email?: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload)
  return res.data.data
}

export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout')
}

export const getMe = async (): Promise<User> => {
  const res = await apiClient.get<ApiResponse<User>>('/auth/me')
  return res.data.data
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
  new_password_confirmation: string
}

export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  await apiClient.put('/auth/change-password', payload)
}

export interface UpdateProfilePayload {
  name: string
}

export const updateProfile = async (payload: UpdateProfilePayload): Promise<User> => {
  const res = await apiClient.put<ApiResponse<User>>('/auth/profile', payload)
  return res.data.data
}

