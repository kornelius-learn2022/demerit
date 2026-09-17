interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

function getScoreColor(score: number): string {
  if (score >= 120) return 'bg-green-100 text-green-700 ring-1 ring-green-200'
  if (score >= 90)  return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
  if (score >= 60)  return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
  if (score >= 30)  return 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
  return 'bg-red-100 text-red-700 ring-1 ring-red-200'
}

function getScoreLabel(score: number): string {
  if (score >= 120) return 'Excellent'
  if (score >= 90)  return 'Good'
  if (score >= 60)  return 'Warning'
  if (score >= 30)  return 'Danger'
  return 'Critical'
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${getScoreColor(score)} ${sizeClasses[size]}`}
      title={`Score: ${score} — ${getScoreLabel(score)}`}
    >
      <span className="font-bold tabular-nums">{score}</span>
      <span className="font-normal opacity-70 hidden sm:inline">/ 150</span>
    </span>
  )
}
