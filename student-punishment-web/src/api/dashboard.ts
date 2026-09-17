import apiClient from './client'
import type { ApiResponse, DashboardStats } from '../types'

export const getDashboard = async (): Promise<DashboardStats> => {
  const res = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard')
  return res.data.data
}
