import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard.tsx'
import type { Session } from '@supabase/supabase-js'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    // Detect if URL might contain a recovery/invite token
    // Supabase fires SIGNED_IN BEFORE PASSWORD_RECOVERY, so we must wait
    // before showing Dashboard to avoid the flash-of-dashboard problem
    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)
    const isRecoveryUrl = hash.includes('type=recovery') || hash.includes('type=invite')
    const hasAuthCode = params.has('code')
    const waitForRecovery = isRecoveryUrl || hasAuthCode

    let resolved = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const finishLoading = () => {
      if (!resolved) {
        resolved = true
        setLoading(false)
        if (fallbackTimer) {
          clearTimeout(fallbackTimer)
          fallbackTimer = null
        }
      }
    }

    // Use onAuthStateChange instead of getSession() to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Recovery confirmed — show password form, NOT dashboard
        setIsPasswordRecovery(true)
        setSession(session)
        finishLoading()
        window.history.replaceState(null, '', window.location.pathname)
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false)
        setSession(null)
        finishLoading()
      } else {
        setSession(session)
        // Only stop loading if this is NOT a potential recovery flow
        if (!waitForRecovery) {
          finishLoading()
        }
      }
    })

    // Fallback: if we're waiting for PASSWORD_RECOVERY but it never fires
    // (e.g. stale code, or it was a regular invite), stop loading after 2s
    if (waitForRecovery) {
      fallbackTimer = setTimeout(() => {
        finishLoading()
        window.history.replaceState(null, '', window.location.pathname)
      }, 2000)
    }

    return () => {
      subscription.unsubscribe()
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        Ładowanie...
      </div>
    )
  }

  if (!session || isPasswordRecovery) {
    return <Auth isRecovery={isPasswordRecovery} onPasswordUpdated={() => setIsPasswordRecovery(false)} />
  }

  return (
    <Dashboard
      onLogout={async () => {
        await supabase.auth.signOut()
      }}
    />
  )
}

export default App
