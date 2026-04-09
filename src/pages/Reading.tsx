import { useParams } from 'react-router-dom'

export default function Reading() {
  const { date } = useParams<{ date: string }>()

  return (
    <div>
      <h1>Reading — {date}</h1>
      {/* TODO: book title field */}
      {/* TODO: notes textarea */}
    </div>
  )
}
