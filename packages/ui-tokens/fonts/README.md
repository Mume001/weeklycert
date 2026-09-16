# Fonts

IBM Plex Sans and IBM Plex Mono, weights 400, 500 and 600 (spec/14 §4). Nothing
else is loaded, and never weight 300.

Twelve files: two families, three weights, two subsets each. The subsets and
their `unicode-range` blocks in `../src/fonts.css` are the `latin` and
`latin-ext` cuts, which is everything an English interface needs plus the
accented names that turn up in a crew list.

## Where they come from

All twelve are the static woff2 subsets published by Fontsource, which
redistributes the IBM Plex release under the SIL Open Font License 1.1
(`OFL.txt`):

```
https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans@5/files/ibm-plex-sans-<subset>-<weight>-normal.woff2
https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5/files/ibm-plex-mono-<subset>-<weight>-normal.woff2
```

The Mono files have been these since the first commit. The Sans files were not:
until 16.9.2026 the folder held one file per subset, downloaded from Google
Fonts, and that file is IBM Plex Sans **variable**. Google serves the same
variable file for 400, 500 and 600, so `fonts.css` pointed all three weights at
it and the browser rendered 400 and faked the rest by smearing the outlines.
That is why the two Sans files were replaced with six static cuts from the same
source as Mono, rather than adding two more Google files that would have changed
nothing.

`../test/fonts.test.ts` fails if a weight named in spec/14 §4 has no file of its
own, if two weights share bytes, or if `fonts.css` points at a file that is not
here.
