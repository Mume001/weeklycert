// The five states every screen can show from the URL, for tests and review
// (spec/19 §7): ?state=loading|empty|error|forbidden|locked.
export type ScreenState = 'loading' | 'empty' | 'error' | 'forbidden' | 'locked'

const STATES: readonly ScreenState[] = ['loading', 'empty', 'error', 'forbidden', 'locked']

export function screenState(value: string | undefined): ScreenState | undefined {
  return STATES.find((s) => s === value)
}

/** The request id the error state shows; fixed in the mock so screenshots match. */
export const MOCK_REQUEST_ID = 'req_2f9a1c'
