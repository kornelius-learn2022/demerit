import apiClient from './client'
import type { ApiResponse, AppNotification } from '../types'

export interface NotificationsResponse {
  notifications: AppNotification[]
  unread_count: number
}

export const getNotifications = async (): Promise<NotificationsResponse> => {
  const res = await apiClient.get<ApiResponse<NotificationsResponse>>('/notifications')
  return res.data.data
}

export const markNotificationAsRead = async (id: number): Promise<void> => {
  await apiClient.post(`/notifications/${id}/read`)
}

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await apiClient.post('/notifications/read-all')
}

export const deleteNotification = async (id: number): Promise<void> => {
  await apiClient.delete(`/notifications/${id}`)
}

