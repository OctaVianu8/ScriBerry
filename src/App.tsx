import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import { useAuth } from './hooks/useAuth'

// Derive initial sidebar state: closed on mobile, restored from localStorage on desktop
function getInitialExpanded(): boolean {
  if (typeof window === 'undefined') return true
  if (window.innerWidth < 769) return false
  const saved = localStorage.getItem('sidebar-expanded')
  return saved !== null ? saved === 'true' : true
}

export default function App() {
  const { user, loading } = useAuth()
  const [expanded, setExpanded] = useState(getInitialExpanded)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 769)

  // Track mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      // Collapse sidebar automatically when switching to mobile
      if (e.matches) setExpanded(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function toggleSidebar() {
    setExpanded(prev => {
      const next = !prev
      if (!isMobile) localStorage.setItem('sidebar-expanded', String(next))
      return next
    })
  }

  function closeSidebar() {
    setExpanded(false)
    if (!isMobile) localStorage.setItem('sidebar-expanded', 'false')
  }

  if (loading) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--c-bg)',
        color: 'var(--c-text-3)',
        fontFamily: 'var(--f-ui)',
        fontSize: 'var(--t-sm)',
      }}>
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      {/* Mobile overlay — closes sidebar on tap */}
      {isMobile && expanded && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Mobile hamburger — shown only when sidebar is closed on mobile */}
      {isMobile && !expanded && (
        <button
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Open menu"
        >
          <HamburgerIcon />
        </button>
      )}

      <Sidebar
        expanded={expanded}
        isMobile={isMobile}
        onToggle={toggleSidebar}
        onClose={closeSidebar}
        user={user}
      />

      <div className="main-content">
        <Outlet />
      </div>

      <BottomNav />
    </div>
  )
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
