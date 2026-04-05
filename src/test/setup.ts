// Global test setup. Runs once before each test file.
//
// - jest-dom extends `expect` with DOM-friendly matchers like
//   .toBeInTheDocument(), .toHaveTextContent(), .toBeDisabled(), etc.
// - cleanup() unmounts React trees between tests so they don't leak state.

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom doesn't implement ResizeObserver or pointer capture, which
// Radix UI primitives (used by the shadcn Slider) expect. Stub them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

afterEach(() => {
  cleanup()
})
