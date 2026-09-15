// The signed-in person (spec/02 §1). Identity only; roles live on memberships.
import { z } from 'zod'
import { UuidSchema } from './common.ts'

export const UserDTOSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  email: z.email(),
  /** Platform flag (spec/02 §1), never a membership. */
  isSuperAdmin: z.boolean(),
})
export type UserDTO = z.infer<typeof UserDTOSchema>
