import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <nav>
      <div>
        <span>Scriberry</span>
      </div>

      <div>
        <NavLink to="/journal/today">Journal</NavLink>
        <NavLink to="/gym/today">Gym</NavLink>
        <NavLink to="/reading/today">Reading</NavLink>
      </div>

      <hr />

      <div>
        {/* TODO: history list — last 30 days with content indicators */}
      </div>

      <div>
        <NavLink to="/calendar">Calendar</NavLink>
        <NavLink to="/highlights">Highlights</NavLink>
        <NavLink to="/group">Group Journal (coming soon)</NavLink>
      </div>

      <div>
        <NavLink to="/settings">Settings</NavLink>
        {/* TODO: user avatar + name */}
        {/* TODO: streak counters */}
      </div>
    </nav>
  )
}
