import { randomBytes } from 'node:crypto'

export default class GeneratedPasswordService {
  generate() {
    /**
     * Twenty base64url characters provide 120 bits of entropy while staying
     * inside the accepted 8–25 character password boundary.
     */
    return randomBytes(15).toString('base64url')
  }
}
