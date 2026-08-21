/// <reference types="vite/client" />

import type { GhostPadAPI } from '../../preload/index'

declare global {
  interface Window {
    ghostpad: GhostPadAPI
  }
}
