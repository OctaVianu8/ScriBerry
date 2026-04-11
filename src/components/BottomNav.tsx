import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const items = [
  {
    to: '/journal/today',
    label: 'Journal',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    to: '/gym/today',
    label: 'Gym',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h1a4 4 0 0 0 0 8H2" />
        <line x1="6" y1="12" x2="18" y2="12" />
        <line x1="6" y1="8" x2="6" y2="16" />
        <line x1="18" y1="8" x2="18" y2="16" />
      </svg>
    ),
  },
  {
    to: '/reading/today',
    label: 'Reading',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    to: '/calendar',
    label: 'Calendar',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Primary navigation">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={styles.link}
          style={{ all: 'unset', display: 'contents' }}
        >
          {({ isActive }) => (
            <div className={styles.item} data-active={String(isActive)}>
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
