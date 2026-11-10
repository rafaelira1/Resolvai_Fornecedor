# ResolvAI brand assets

These SVGs reuse the brand paths and geometry from `danilomarley/Resolvai_Cliente`,
commit `03d2d6d184d273bdd1580b6982149cc21bbef1a7`:

- `resolvai-lockup.svg`: `public/brand/resolvai-original.svg`.
- `resolvai-wordmark.svg`: `public/brand/resolvai-wordmark.svg`.
- `resolvai-symbol.svg`: `public/brand/resolvai-symbol.svg`.

Only the palette was adapted to the existing Fornecedor orange `#ff4f1f`,
navy `#102136` and text `#162034`. The React components render the same static
paths inline, with light/dark text variants for contrasting surfaces. The inline
lockup allows the original slogan to use the locally served Alexandria font.

These are project brand assets, not a new third-party icon set. Their source
repository has no standalone license declaration for the brand; no additional
redistribution rights are asserted here. Font licenses are recorded separately
in `public/fonts/font-manifest.json` and the accompanying license files.

The home banner illustration in `src/components/dashboard/HouseIllustration.jsx` is adapted from
`src/components/HouseIllustration.tsx` in the same Cliente commit, using the Fornecedor palette.
