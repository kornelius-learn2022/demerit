import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getPunishments, deletePunishment } from '../../api/punishments'
import { useAuthStore } from '../../stores/authStore'
import Modal from './Modal'
import DataTable, { type Column } from './DataTable'
import { showToast } from '../../utils/toast'
import type { Student, Punishment } from '../../types'

interface Props {
  student: Student
  onClose: () => void
}

export default function StudentPunishmentsModal({ student, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['punishments', 'student', student.id],
    queryFn: () => getPunishments({ student_id: student.id }),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePunishment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punishments'] })
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      showToast('Punishment deleted', 'success')
    },
    onError: () => showToast('Failed to delete punishment', 'error'),
  })

  const canDelete = (p: Punishment) => {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role === 'pc1' && student.classroom_id === user.classroom_id) return true
    return p.teacher_id === user.id
  }

  const columns: Column<Punishment>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (p) => format(new Date(p.punishment_date), 'dd MMM yyyy'),
    },
    {
      key: 'violation',
      header: 'Violation',
      render: (p) => (
        <div>
          <p className="font-medium text-gray-800">{p.violation_rule?.description ?? '—'}</p>
          <p className="text-xs text-gray-500">{p.violation_rule?.category?.name ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      render: (p) => <span className="text-red-600 font-semibold">−{p.point_deducted}</span>,
    },
    {
      key: 'teacher',
      header: 'Teacher',
      render: (p) => (
        <div>
          <p className="text-sm text-gray-800">{p.teacher?.name ?? '—'}</p>
          <span className="text-xs text-gray-500">{p.teacher_role === 'pc1' ? 'Homeroom' : 'Subject'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p) =>
        canDelete(p) ? (
          <button
            onClick={() => {
              if (confirm('Delete this punishment record?')) deleteMutation.mutate(p.id)
            }}
            disabled={deleteMutation.isPending}
            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        ) : null,
    },
  ]

  return (
    <Modal title={`Punishment History: ${student.name}`} onClose={onClose}>
      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          emptyMessage="No punishment records found for this student"
        />
        <div className="flex justify-end pt-4">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </Modal>
  )
}
