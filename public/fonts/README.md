# Local typography

The Cliente reference uses Rajdhani 600/700 for headings and numbers, Inter
400/500/600/700 for reading and controls, and Alexandria 400 for the brand slogan.
All files are served locally with `font-display: swap`; no font CDN request is
made by the application at runtime.

`font-manifest.json` records the exact package versions, source tarball URLs,
SHA512 integrities from Cliente's package lock, expected WOFF2 paths and license
file names. The versions are verified against commit
`03d2d6d184d273bdd1580b6982149cc21bbef1a7` of
`https://github.com/danilomarley/Resolvai_Cliente`.

The fonts are distributed under SIL Open Font License 1.1. Keep each extracted
license alongside the font files. The Latin subsets cover Brazilian Portuguese.
