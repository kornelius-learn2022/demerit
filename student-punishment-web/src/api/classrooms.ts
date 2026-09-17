import apiClient from './client'
import type { ApiResponse, Classroom } from '../types'

export interface CreateClassroomPayload {
  name: string
  grade_level: string
}

export interface UpdateClassroomPayload {
  name?: string
  grade_level?: string
}

export const getClassrooms = async (): Promise<Classroom[]> => {
  const res = await apiClient.get<ApiResponse<Classroom[]>>('/classrooms')
  return res.data.data
}

export const createClassroom = async (payload: CreateClassroomPayload): Promise<Classroom> => {
  const res = await apiClient.post<ApiResponse<Classroom>>('/classrooms', payload)
  return res.data.data
}

export const updateClassroom = async (
  id: number,
  payload: UpdateClassroomPayload
): Promise<Classroom> => {
  const res = await apiClient.put<ApiResponse<Classroom>>(`/classrooms/${id}`, payload)
  return res.data.data
}

export const deleteClassroom = async (id: number): Promise<void> => {
  await apiClient.delete(`/classrooms/${id}`)
}
