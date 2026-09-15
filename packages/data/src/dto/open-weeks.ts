// Open weeks per active project: drives "This week" and its counter (spec/03 §3).
import { z } from 'zod'
import { IsoDateSchema, UuidSchema } from './common.ts'

export const OpenWeeksDTOSchema = z.object({
  /** MOCK_TODAY in the mock phase. */
  today: IsoDateSchema,
  /** The week that contains today (the one "in progress"). */
  currentWeekEnding: IsoDateSchema,
  activeProjects: z.array(
    z.object({
      id: UuidSchema,
      name: z.string(),
      /** Oldest first. A week is open with no period row, or open, in_review, generated. */
      openWeeks: z.array(IsoDateSchema),
    }),
  ),
})
export type OpenWeeksDTO = z.infer<typeof OpenWeeksDTOSchema>
