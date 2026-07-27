/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  root: {
    show: typeof routes['root.show']
  }
}
