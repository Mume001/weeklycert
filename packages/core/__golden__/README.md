# Golden slučajevi

Svaki folder je jedan slučaj: `input.json` je ulaz motora, `expected.json` je
cijeli izlaz `computeWeek()`. Poređenje je potpuno, pa se svaka promjena stope,
sata ili nalaza vidi kao diff.

Numeracija `01` do `15` prati listu iz `spec/01` §5. Slučajevi `a`, `b` i `c` su
tri primjera koja moraju proći doslovno:

| Folder | Odakle | Šta dokazuje |
|---|---|---|
| `a-ninth-hour-code-b` | 01 §2.1 | deveti sat je 26,50 (16,00 × 1,5 + 2,50) |
| `b-ninth-hour-code-w` | 01 §2.1 | isti radnik, kod W: 27,75 (i dodatak nosi premiju) |
| `c-fixture-week-2026-09-05` | 19 §4 | tačno 3 hard i 3 soft nalaza na demo podacima |

Slučaj **14 iz 01 §5** (`OVER_500_WORKERS`) nije ovdje nego u
`src/validate/validate.test.ts`. Ulaz s 501 radnikom i pripadajući izlaz bili bi
oko 20.000 linija JSON-a koje niko ne može pregledati, a pravilo je brojanje
radnika, ne obračun. Test ga generiše i provjerava i kod i granicu (500 prolazi,
501 pada).

## Regenerisanje

```
UPDATE_GOLDEN=1 npx vitest run --project core
```

Pokreće se **samo kad je promjena namjerna**, i diff se čita prije commita.
Nikad da bi crveni test postao zelen.
