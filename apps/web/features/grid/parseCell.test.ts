import { describe, expect, it } from 'vitest'
import { cellText, parseCell } from './parseCell'

describe('parseCell accepts exactly the table in spec/19 §6', () => {
  it('reads an empty cell as no hours', () => {
    expect(parseCell('')).toEqual({ st: '0', ot: '0', manual: false })
    expect(parseCell('   ')).toEqual({ st: '0', ot: '0', manual: false })
  })

  it('reads a whole number as the total for the day', () => {
    expect(parseCell('9')).toEqual({ st: '9', ot: '0', manual: false })
    expect(parseCell('0')).toEqual({ st: '0', ot: '0', manual: false })
  })

  it('accepts a comma as well as a point', () => {
    expect(parseCell('9.5')).toEqual({ st: '9.5', ot: '0', manual: false })
    expect(parseCell('9,5')).toEqual({ st: '9.5', ot: '0', manual: false })
  })

  it('reads a split as straight time and overtime typed by hand', () => {
    expect(parseCell('8/1')).toEqual({ st: '8', ot: '1', manual: true })
    expect(parseCell('7.5/2')).toEqual({ st: '7.5', ot: '2', manual: true })
  })

  it('reads a clock as hours', () => {
    expect(parseCell('9:30')).toEqual({ st: '9.5', ot: '0', manual: false })
    expect(parseCell('8:00')).toEqual({ st: '8', ot: '0', manual: false })
    expect(parseCell('7:45')).toEqual({ st: '7.75', ot: '0', manual: false })
  })

  it('refuses everything else', () => {
    for (const raw of ['x', '8h', '-1', '1/2/3', '8:99', '.', '/', '8/', '/1', '1e3']) {
      expect(`${raw} -> ${JSON.stringify(parseCell(raw))}`).toBe(`${raw} -> null`)
    }
  })

  it('refuses more than 24 hours in one cell', () => {
    expect(parseCell('24')).toEqual({ st: '24', ot: '0', manual: false })
    expect(parseCell('25')).toBeNull()
    expect(parseCell('20/5')).toBeNull()
    expect(parseCell('24:30')).toBeNull()
  })
})

describe('cellText writes back what the user typed', () => {
  it('shows the total when the engine did the split', () => {
    expect(cellText({ st: '8', ot: '1', manual: false })).toBe('9')
    expect(cellText({ st: '7.5', ot: '0', manual: false })).toBe('7.5')
  })

  it('keeps the slash when the split was typed by hand', () => {
    expect(cellText({ st: '8', ot: '1', manual: true })).toBe('8/1')
  })

  it('leaves an empty day empty, never a zero', () => {
    expect(cellText({ st: '0', ot: '0', manual: false })).toBe('')
  })
})
