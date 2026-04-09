import { useParams } from 'react-router-dom'

export default function Gym() {
  const { date } = useParams<{ date: string }>()

  return (
    <div>
      <h1>Gym — {date}</h1>
      {/* TODO: session type selector (push | pull | legs | arms | cardio | rest) */}
      {/* TODO: notes textarea */}
      {/* Coming soon stub: weights & reps tracker */}
    </div>
  )
}
