import { defineConfig, drivers } from '@adonisjs/core/hash'

/**
 * Password hashing uses Argon2id. The parameters must be benchmarked on the
 * production host before release rather than increased without measurements.
 */
const hashConfig = defineConfig({
  default: 'argon',

  list: {
    argon: drivers.argon2({
      variant: 'id',
      version: 0x13,
      iterations: 3,
      memory: 65536,
      parallelism: 4,
      saltSize: 16,
      hashLength: 32,
    }),
  },
})

export default hashConfig

/**
 * Inferring types for the list of hashers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface HashersList extends InferHashers<typeof hashConfig> {}
}
