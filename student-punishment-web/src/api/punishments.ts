import apiClient from './client'
import type { ApiResponse, ImportResult, Punishment } from '../types'

export interface PunishmentFilters {
  student_id?: number
  classroom_id?: number
  teacher_id?: number
  date_from?: string
  date_to?: string
}

export interface CreatePunishmentPayload {
  student_id: number
  violation_rule_id: number
  notes?: string
  punishment_date: string
}

export const getPunishments = async (filters?: PunishmentFilters): Promise<Punishment[]> => {
  const res = await apiClient.get<ApiResponse<Punishment[]>>('/punishments', { params: filters })
  return res.data.data
}

export const getPunishment = async (id: number): Promise<Punishment> => {
  const res = await apiClient.get<ApiResponse<Punishment>>(`/punishments/${id}`)
  return res.data.data
}

export const createPunishment = async (payload: CreatePunishmentPayload): Promise<Punishment> => {
  const res = await apiClient.post<ApiResponse<Punishment>>('/punishments', payload)
  return res.data.data
}

export const deletePunishment = async (id: number): Promise<void> => {
  await apiClient.delete(`/punishments/${id}`)
}

export const exportPunishments = async (filters?: PunishmentFilters): Promise<Blob> => {
  const res = await apiClient.get('/punishments/export', {
    params: filters,
    responseType: 'blob',
  })
  return res.data
}

export const getPunishmentsTemplate = async (): Promise<Blob> => {
  const res = await apiClient.get('/punishments/template', {
    responseType: 'blob',
  })
  return res.data
}

export const importPunishments = async (file: File): Promise<ImportResult> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post<ImportResult>('/punishments/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}
