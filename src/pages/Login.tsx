import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // If already authenticated, redirect to the app
  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Scriberry</h1>
        <p style={styles.subtitle}>Your personal journal & habit tracker</p>

        <div style={styles.buttons}>
          {/* Full-page navigation — not a React Router link — because the
              target is a server-side OAuth redirect */}
          <a href="/api/auth/google" style={{ ...styles.btn, ...styles.btnGoogle }}>
            <GoogleIcon />
            Sign in with Google
          </a>

          <a href="/api/auth/apple" style={{ ...styles.btn, ...styles.btnApple }}>
            <AppleIcon />
            Sign in with Apple
          </a>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: '48px 32px',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 32,
    fontWeight: 700,
    color: '#f5f5f5',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    margin: '0 0 40px',
    fontSize: 14,
    color: '#666',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnGoogle: {
    background: '#fff',
    color: '#1a1a1a',
  },
  btnApple: {
    background: '#1a1a1a',
    color: '#f5f5f5',
    border: '1px solid #2a2a2a',
  },
}

// ---------------------------------------------------------------------------
// Icon components
// ---------------------------------------------------------------------------

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.3-150.3-109.2c-43.1-63.3-78.2-161.9-78.2-255.6 0-158.5 103.7-242.6 205.6-242.6 54.1 0 99.4 35.6 133.6 35.6 32.8 0 84.1-37.8 145.8-37.8 23.2 0 108.2 2 165.9 93.1zm-107.3-160c25.2-29.4 43.4-70.2 43.4-111 0-5.8-.6-11.7-1.9-16.2-41.5 1.9-91.3 27.6-121.3 61.2-22.6 25.2-44.5 65.4-44.5 106.8 0 6.4 1.3 12.8 1.9 14.7 2.6.6 6.5 1.3 10.4 1.3 37.8 0 85.1-24.6 112-56.8z" />
    </svg>
  )
}
