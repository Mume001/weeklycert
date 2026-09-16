import { describe, expect, it } from 'vitest'
import {
  clampAtZero,
  dec,
  equalWithinCent,
  hours,
  maxDec,
  minDec,
  money,
  rate,
  sum,
  ZERO,
} from './money.ts'

describe('money', () => {
  it('rounds half up and never like a banker (spec/05 §3.6)', () => {
    expect(money('2.345')).toBe('2.35')
    expect(money('2.355')).toBe('2.36')
    expect(money('1.005')).toBe('1.01')
    expect(money('-2.345')).toBe('-2.35')
  })

  it('pads to the places the database column has', () => {
    expect(money('8')).toBe('8.00')
    expect(hours('8')).toBe('8.00')
    expect(rate('3.46153846')).toBe('3.4615')
    expect(rate('28')).toBe('28.0000')
  })

  it('adds decimals exactly, which is the whole point', () => {
    expect(money(dec('0.1').plus(dec('0.2')))).toBe('0.30')
    expect(money(sum([dec('0.1'), dec('0.2'), dec('0.3')]))).toBe('0.60')
    expect(money(sum([]))).toBe('0.00')
  })

  it('writes a zero without a sign', () => {
    expect(money(ZERO.minus(ZERO))).toBe('0.00')
    expect(money(dec('-0.001'))).toBe('0.00')
  })

  it('refuses anything that is not a decimal string', () => {
    expect(() => dec('eight')).toThrow(/Not a decimal string/)
    expect(() => dec('')).toThrow(/Not a decimal string/)
    expect(() => dec('1,5')).toThrow(/Not a decimal string/)
  })

  it('compares', () => {
    expect(money(maxDec(dec('3'), dec('4')))).toBe('4.00')
    expect(money(minDec(dec('3'), dec('4')))).toBe('3.00')
    expect(money(clampAtZero(dec('-4')))).toBe('0.00')
    expect(money(clampAtZero(dec('4')))).toBe('4.00')
  })

  it('knows a cent of tolerance, which is what spec/07 §3.4 allows', () => {
    expect(equalWithinCent(dec('1400.00'), dec('1400.01'))).toBe(true)
    expect(equalWithinCent(dec('1400.00'), dec('1400.02'))).toBe(false)
    expect(equalWithinCent(dec('1437.70'), dec('1400.00'))).toBe(false)
  })
})
