import { useQueryClient } from '@tanstack/react-query'
import PunishmentForm from '../components/shared/PunishmentForm'
import { showToast } from '../utils/toast'

export default function AddPunishmentPage() {
  const qc = useQueryClient()

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['punishments'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['students'] })
    showToast('Punishment recorded successfully!', 'success')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Record Punishment</h1>
        <p className="text-gray-500 text-sm mt-1">
          Select a student and violation rule to record a punishment
        </p>
      </div>

      <div className="card">
        <PunishmentForm onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
