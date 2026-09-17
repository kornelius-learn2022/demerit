import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId, enUS } from 'date-fns/locale'
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../../api/notifications'
import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'
import type { AppNotification } from '../../types'

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { language, t } = useLanguageStore()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const notifT = t().notifications

  const dateLocale = language === 'id' ? localeId : enUS

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 20000, // check for updates every 20s
  })

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unread_count ?? 0

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markSingleMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // When opening dropdown: mark all currently loaded items as read so badge number clears immediately
  const handleToggle = () => {
    setIsOpen((prev) => {
      const willOpen = !prev
      if (willOpen && unreadCount > 0) {
        markAllMutation.mutate()
      }
      return willOpen
    })
  }

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (unreadCount > 0) {
      markAllMutation.mutate()
    }
  }

  // Close when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const targetLink = user?.role === 'admin' ? '/punishments' : '/students'

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${
          isOpen ? 'bg-slate-100 text-slate-900' : ''
        }`}
        title={notifT.title}
        aria-label={notifT.title}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread Badge Counter (clears when opened) */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {notifT.title}
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {notifT.subtitle}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 hover:underline px-1.5 py-0.5 rounded cursor-pointer"
              >
                {notifT.markAllRead}
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-6 text-center space-y-2">
                <div className="h-4 w-28 bg-slate-100 rounded mx-auto animate-pulse" />
                <div className="h-3 w-40 bg-slate-100 rounded mx-auto animate-pulse" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-800">{notifT.emptyTitle}</p>
                <p className="text-[11px] text-slate-500">{notifT.emptyDesc}</p>
              </div>
            ) : (
              notifications.map((n: AppNotification) => {
                const isDeleted = n.type === 'demerit_deleted'
                const isUnread = !n.is_read
                const pointDeduction = n.data?.point_deducted ?? 0

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (isUnread) markSingleMutation.mutate(n.id)
                    }}
                    className={`p-3.5 hover:bg-slate-50/90 transition-colors flex items-start gap-3 cursor-pointer ${
                      isUnread ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    {/* Status Icon */}
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isDeleted
                          ? 'bg-rose-100 text-rose-600 border border-rose-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isDeleted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {n.title}
                        </span>
                        {pointDeduction > 0 && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                              isDeleted
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 line-through'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            −{pointDeduction} {language === 'en' ? 'pts' : 'poin'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-snug">
                        {n.message}
                      </p>

                      {/* Metadata: Student, Actor, Time */}
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                        {n.data?.student_name && (
                          <>
                            <span className="font-semibold text-slate-600">
                              {n.data.student_name}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>
                          {n.created_at
                            ? formatDistanceToNow(new Date(n.created_at), {
                                addSuffix: true,
                                locale: dateLocale,
                              })
                            : ''}
                        </span>
                        {isUnread && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center text-primary-600 font-bold">
                              ● Baru
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Action */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              to={targetLink}
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center gap-1"
            >
              <span>{notifT.viewAllDemerits}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
