// The compliance statement of WH-347 page 2, revision January 2025 (spec/05
// §4.4), word for word. It is not our text, so it is not in packages/copy: it
// is the federal form's, quoted, and attestation.test.ts checks every sentence
// against spec/05. What the signer is shown is what is stored with the
// signature (`reports.attestation_text` in spec/04 §3.7).

/** Which revision of the form the text comes from; stored with the signature. */
export const ATTESTATION_VERSION = 'WH-347 rev. January 2025'

export const ATTESTATION_INTRO =
  'I paid or supervised the payment of the laborers or mechanics working on the above project during the stated time period. I certify the following:'

/** Why a box is ticked. The engine decides from the data, never the screen. */
export type AttestationReason = 'always' | 'apprentices' | 'fringe'

export interface AttestationPoint {
  number: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  reason: AttestationReason
  checked: boolean
}

const POINTS: readonly {
  number: AttestationPoint['number']
  text: string
  reason: AttestationReason
}[] = [
  {
    number: 1,
    reason: 'always',
    text: 'The payroll information submitted with this statement is correct and complete for the above project during the above period, and the wage and fringe benefit rates paid to the workers, including credit taken for the reasonably anticipated costs of a bona fide fringe benefit plan, fund or program, are not less than the applicable wage and fringe benefits rates for the classification(s) of work actually performed, as specified in the wage determination(s) incorporated into the contract.',
  },
  {
    number: 2,
    reason: 'always',
    text: 'All regular payrolls and all other basic records that the contractor is required to maintain for this payroll period are complete and accurate and will be made available upon request from the agency or the Department of Labor.',
  },
  {
    number: 3,
    reason: 'always',
    text: 'The classifications reported for each laborer or mechanic are the classification(s) of work that each worker actually performed.',
  },
  {
    number: 4,
    reason: 'apprentices',
    text: 'Any workers paid as apprentices during the above period are duly registered in a bona fide apprenticeship program registered with the Office of Apprenticeship, Employment and Training Administration, United States Department of Labor ("OA"), or a State Apprenticeship Agency ("SAA") recognized by Department of Labor. I have verified the registered apprenticeship program information provided below as accurate and applicable to any apprentices identified on page 1 of this form.',
  },
  {
    number: 5,
    reason: 'fringe',
    text: 'Fringe benefits have been paid in cash and/or to bona fide fringe benefit plans, funds, or programs. Where the contractor is claiming an hourly credit for their contributions to or reasonably anticipated costs of a bona fide fringe benefit plan, fund, or program, provide plan information and the hourly credit claimed for each worker listed on the previous page of this form.',
  },
  {
    number: 6,
    reason: 'always',
    text: 'All workers on the project have been paid the full weekly wages earned, and no rebates or deductions have been or will be made either directly or indirectly, other than permissible deductions as defined in 29 CFR part 3.',
  },
]

/**
 * The six points with the boxes ticked from the data (spec/05 §4.4): 1, 2, 3
 * and 6 always, 4 only when apprentices are on the report, 5 only where there
 * are fringe benefits.
 */
export function attestationPoints(week: {
  hasApprentices: boolean
  hasFringe: boolean
}): AttestationPoint[] {
  return POINTS.map((point) => ({
    ...point,
    checked:
      point.reason === 'always' ||
      (point.reason === 'apprentices' && week.hasApprentices) ||
      (point.reason === 'fringe' && week.hasFringe),
  }))
}

/** What is stored with the signature: the exact words the signer saw. */
export function attestationText(points: readonly AttestationPoint[]): string {
  return [
    ATTESTATION_VERSION,
    ATTESTATION_INTRO,
    ...points.filter((p) => p.checked).map((p) => `${p.number}. ${p.text}`),
  ].join('\n\n')
}
