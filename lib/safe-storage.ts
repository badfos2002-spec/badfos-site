/** Safe localStorage/sessionStorage wrappers — never throw (Safari Private Mode, etc.) */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

export function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {}
}

export function safeSessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {}
}
