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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked recovery link — show password form, NOT dashboard
        setIsPasswordRecovery(true)
        setSession(session)
      } else {
        setSession(session)
        if (event === 'SIGNED_IN' && isPasswordRecovery) {
          // Password was updated, now allow dashboard
          setIsPasswordRecovery(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [isPasswordRecovery])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        Ładowanie...
      </div>
    )
  }

  if (!session || isPasswordRecovery) {
    return <Auth onPasswordUpdated={() => setIsPasswordRecovery(false)} />
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
