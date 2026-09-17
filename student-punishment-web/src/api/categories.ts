import apiClient from './client'
import type { ApiResponse, Category } from '../types'

export interface CreateCategoryPayload {
  name: string
  description?: string
}

export interface UpdateCategoryPayload {
  name?: string
  description?: string
}

export const getCategories = async (): Promise<Category[]> => {
  const res = await apiClient.get<ApiResponse<Category[]>>('/categories')
  return res.data.data
}

export const createCategory = async (payload: CreateCategoryPayload): Promise<Category> => {
  const res = await apiClient.post<ApiResponse<Category>>('/categories', payload)
  return res.data.data
}

export const updateCategory = async (
  id: number,
  payload: UpdateCategoryPayload
): Promise<Category> => {
  const res = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, payload)
  return res.data.data
}

export const deleteCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/categories/${id}`)
}
