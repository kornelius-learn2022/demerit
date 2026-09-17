import apiClient from './client'
import type { ApiResponse, ViolationRule } from '../types'

export interface ViolationRuleFilters {
  category_id?: number
  is_active?: boolean
}

export interface CreateViolationRulePayload {
  category_id: number
  description: string
  point_deduction: number
}

export interface UpdateViolationRulePayload {
  category_id?: number
  description?: string
  point_deduction?: number
  is_active?: boolean
}

export const getViolationRules = async (filters?: ViolationRuleFilters): Promise<ViolationRule[]> => {
  const res = await apiClient.get<ApiResponse<ViolationRule[]>>('/violation-rules', {
    params: filters,
  })
  return res.data.data
}

export const createViolationRule = async (
  payload: CreateViolationRulePayload
): Promise<ViolationRule> => {
  const res = await apiClient.post<ApiResponse<ViolationRule>>('/violation-rules', payload)
  return res.data.data
}

export const updateViolationRule = async (
  id: number,
  payload: UpdateViolationRulePayload
): Promise<ViolationRule> => {
  const res = await apiClient.put<ApiResponse<ViolationRule>>(`/violation-rules/${id}`, payload)
  return res.data.data
}

export const deleteViolationRule = async (id: number): Promise<void> => {
  await apiClient.delete(`/violation-rules/${id}`)
}
