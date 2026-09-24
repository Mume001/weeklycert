// The only way to a worker's PII (CLAUDE.md, spec/04 §6, spec/02 §4 rule 4).
//
// In step 4 this decrypts address_encrypted and date_of_birth_encrypted with
// the company's DEK. In the mock phase the fixtures hold plain values, but the
// rule is the same already: one part at a time, only when a screen asks for it,
// and every read writes pii_access_log. The company is part of every lookup
// (spec/19 §3, Repository): another company's worker is not found.
import type {
  AddressInput,
  PiiPart,
  PiiValue,
  Uuid,
  WorkerInput,
  WorkerPiiState,
} from './dto/index.ts'
import { mockNow } from './mock/clock.ts'
import { db } from './mock/db.ts'

function rowOf(tenantId: Uuid, workerId: Uuid) {
  return db.workerPii.find((p) => p.workerId === workerId && p.tenantId === tenantId)
}

function ownWorker(tenantId: Uuid, workerId: Uuid): boolean {
  return db.workers.some((w) => w.id === workerId && w.tenantId === tenantId)
}

/** Which parts are on file. Reads no value, so it logs nothing. */
export function piiState(tenantId: Uuid, workerId: Uuid): WorkerPiiState {
  const row = rowOf(tenantId, workerId)
  const a = row?.address
  return {
    hasSsnLast4: Boolean(row?.ssnLast4),
    hasDateOfBirth: Boolean(row?.dateOfBirth),
    place: a ? { city: a.city, state: a.state, postalCode: a.postalCode } : null,
  }
}

/** The stored identifiers, for the one check that needs them: SSN4 or DOB, not both. */
export function identifiersOnFile(
  tenantId: Uuid,
  workerId: Uuid,
): { ssnLast4: string; dateOfBirth: string } {
  const row = rowOf(tenantId, workerId)
  return { ssnLast4: row?.ssnLast4 ?? '', dateOfBirth: row?.dateOfBirth ?? '' }
}

/**
 * One part, as the user asked for it with Show. Writes pii_access_log with
 * who, when, which worker and which fields; never the value. Null when the
 * worker is not this company's or the part is not on file.
 */
export function readPii(
  tenantId: Uuid,
  userId: Uuid,
  workerId: Uuid,
  part: PiiPart,
): PiiValue | null {
  if (!ownWorker(tenantId, workerId)) return null
  const row = rowOf(tenantId, workerId)
  let value: PiiValue | null = null
  if (part === 'ssnLast4' && row?.ssnLast4) value = { part, value: row.ssnLast4 }
  if (part === 'dateOfBirth' && row?.dateOfBirth) value = { part, value: row.dateOfBirth }
  if (part === 'address' && row?.address) {
    const a = row.address
    value = {
      part,
      value: {
        address1: a.address1,
        address2: a.address2 ?? '',
        city: a.city,
        state: a.state,
        postalCode: a.postalCode,
        postalCodeExt: a.postalCodeExt ?? '',
        phone: row.phone ?? '',
      },
    }
  }
  if (!value) return null
  db.piiAccessLog.push({
    tenantId,
    userId,
    workerId,
    fields: part === 'address' ? ['address', 'phone'] : [part],
    purpose: 'view',
    at: mockNow(),
  })
  return value
}

/** Writes the parts the form sent; a part left undefined stays as it is. */
export function writePii(
  tenantId: Uuid,
  workerId: Uuid,
  input: Pick<WorkerInput, 'ssnLast4' | 'dateOfBirth' | 'address'>,
): void {
  let row = rowOf(tenantId, workerId)
  if (!row) {
    row = {
      workerId,
      tenantId,
      ssnLast4: null,
      dateOfBirth: null,
      address: null,
      phone: null,
    }
    db.workerPii.push(row)
  }
  if (input.ssnLast4 !== undefined) row.ssnLast4 = input.ssnLast4 || null
  if (input.dateOfBirth !== undefined) row.dateOfBirth = input.dateOfBirth || null
  if (input.address !== undefined) {
    const a: AddressInput = input.address
    row.address = a.address1
      ? {
          address1: a.address1,
          address2: a.address2 || null,
          city: a.city,
          state: a.state,
          postalCode: a.postalCode,
          postalCodeExt: a.postalCodeExt || null,
        }
      : null
    row.phone = a.phone || null
  }
}
