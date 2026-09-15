/**
 * A repository method whose mock is written in a later session (spec/19 §10).
 * Thrown loudly instead of returning empty data, so no screen can look done
 * while it is not.
 */
export class NotYetBuiltError extends Error {
  constructor(method: string, session: string) {
    super(`${method} is built in session ${session} (spec/19 §10).`)
    this.name = 'NotYetBuiltError'
  }
}
