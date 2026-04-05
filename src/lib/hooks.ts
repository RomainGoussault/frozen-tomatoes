// Reusable custom hooks. A "custom hook" is just a function whose name
// starts with `use` and which internally calls other hooks. It lets you
// package stateful logic for reuse across components.

import { useEffect, useState } from 'react'

/**
 * Returns a debounced version of `value`. The debounced value only updates
 * after `value` has been stable for `delayMs` milliseconds.
 *
 * Typical use: debounce a search input before firing an API call, so you
 * don't send one request per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    // Cleanup: if `value` changes again before the timer fires, cancel it.
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
