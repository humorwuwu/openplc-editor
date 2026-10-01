# Print/export CJK evidence

Screenshots and PDFs backing the report that the print/export pipeline drops every
character outside the embedded Latin coverage (Chinese, Japanese, Korean, `℃`, emoji).

- `cjk-before-after.png` — the same ST POU exported by the shipped 4.3.2 engine (top)
  and by the same engine with a CJK fallback face (bottom).
- `cjk-before.pdf` / `cjk-after.pdf` — the two exports themselves.

Reproduced by driving `renderProjectToPdf` (the shipped `src/backend/shared/print`
sources) headlessly.
