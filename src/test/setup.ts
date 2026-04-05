// Global test setup. Runs once before each test file.
//
// - jest-dom extends `expect` with DOM-friendly matchers like
//   .toBeInTheDocument(), .toHaveTextContent(), .toBeDisabled(), etc.
// - cleanup() unmounts React trees between tests so they don't leak state.

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
