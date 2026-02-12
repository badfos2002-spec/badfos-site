'use client'

import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import {
  signInWithGoogle,
  signOut,
  onAuthChange,
  isAdmin as checkIsAdmin,
} from '@/lib/auth'

interface AuthState {
  user: User | null
  loading: boolean
  isAdmin: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false,
  })

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthChange((user) => {
      setAuthState({
        user,
        loading: false,
        isAdmin: checkIsAdmin(user),
      })
    })

    return () => unsubscribe()
  }, [])

  const signIn = async () => {
    try {
      const user = await signInWithGoogle()
      return user
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  return {
    user: authState.user,
    loading: authState.loading,
    isAdmin: authState.isAdmin,
    signIn,
    signOut: handleSignOut,
  }
}
