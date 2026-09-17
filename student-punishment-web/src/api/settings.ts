import apiClient from './client'
import type { ApiResponse } from '../types'

export interface SystemSettings {
  active_academic_year: string
  [key: string]: string
}

export const getSettings = async (): Promise<SystemSettings> => {
  const res = await apiClient.get<ApiResponse<SystemSettings>>('/settings')
  return res.data.data
}

export const updateAcademicYear = async (activeAcademicYear: string): Promise<SystemSettings> => {
  const res = await apiClient.put<ApiResponse<SystemSettings>>('/settings', {
    active_academic_year: activeAcademicYear,
  })
  return res.data.data
}

