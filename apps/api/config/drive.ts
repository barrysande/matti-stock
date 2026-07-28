import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

const driveConfig = defineConfig({
  default: env.get('DRIVE_DISK'),

  services: {
    /**
     * Local evidence remains private and is never exposed through an
     * automatically registered file-serving route.
     */
    fs: services.fs({
      location: app.makePath('storage/evidence'),
      serveFiles: false,
      visibility: 'private',
    }),

    r2: services.s3({
      credentials: {
        accessKeyId: env.get('R2_KEY'),
        secretAccessKey: env.get('R2_SECRET').release(),
      },
      region: 'auto',
      bucket: env.get('R2_BUCKET'),
      endpoint: env.get('R2_ENDPOINT'),
      visibility: 'private',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
