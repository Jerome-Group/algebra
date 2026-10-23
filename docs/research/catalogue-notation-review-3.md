# Semantic review 3 — packets 031–044

Independent reviewer: GPT-6.1-Sol, xhigh (requested role). Date: 2026-10-23. Worktree: `work/catalogue-tex-presentation`. Read the supplied AGENTS instructions and `outputs/tex-design/implementation-contract.md` from the root checkout. No canonical, accepted-manifest, product, browser, commit or remote writes.

**Verdict:** the frozen proposal needs these corrections. This report supports notation preservation for this exclusive slice after applying `semantic-corrections-3.json`, subject to the canonical TeX defects below. It does not approve the complete proposal or establish every original theorem’s truth. The accepted 80-map pilot is separate from this unaccepted proposal.

## Read scope

Actually read all 3,388 exact source strings (indices 7500–10887), every proposed raw-to-TeX substitution/presentation, unchanged strings and existing delimited mathematics, and all 5,861 listed occurrence locations. Original slice: 959 annotated strings, 2,429 unannotated strings, 2,426 proposed spans. This included a/A/I ambiguities and plain teaching/unit/assessment fields, not just signature matches. Lossless compact projections preserved source text, every replacement and every file/pointer occurrence; truncated output ranges were reread. Corresponding owner context was consulted for ambiguities.

| Packet | Exact strings | Occurrences |
|---|---:|---:|
| packet-031.json | 250 | 521 |
| packet-032.json | 250 | 396 |
| packet-033.json | 250 | 525 |
| packet-034.json | 250 | 500 |
| packet-035.json | 250 | 415 |
| packet-036.json | 250 | 489 |
| packet-037.json | 250 | 432 |
| packet-038.json | 250 | 469 |
| packet-039.json | 250 | 397 |
| packet-040.json | 250 | 486 |
| packet-041.json | 250 | 292 |
| packet-042.json | 250 | 343 |
| packet-043.json | 250 | 425 |
| packet-044.json | 138 | 171 |

Packet bytes matched every assigned SHA256 in `review-packets/index.json`; source strings, proposed presentations and occurrence arrays matched current catalogue enumeration. Index-file SHA256:
`abacce9f53974c498780032982da93769c9839d635c2be19a868d16f3adc052f`

Full source-byte SHA256 bindings:

| Source | SHA256 |
|---|---|
| `lib/algebra/lessons.json` | `5f12e02001cdb65591ef5437ed0279cf2f750b4490a930e4af2ad01cc1274d74` |
| `lib/algebra/guided-lessons.json` | `6d727041580ad0be7891013926222ff8607e07e291ac6845ac1e82a6932911db` |
| `lib/algebra/units.json` | `622452df05bafd77af27ab9ad3f5ae4427d88bf1d391b88dc547a3981ee90bf4` |
| `lib/algebra/capstone-assessments.json` | `f9c562ddd4c9f6b22ac7ab2ed83b86e9980ca8f12cc73736581e0ab5135dbc84` |

## Corrections

354 full replacement span arrays: 290 nonempty, 64 `[]` deletion patches. Of these, 37 add previously absent mappings. Apply by source file/pointer; replace the complete prior span array. For `[]`, remove the entire annotation before invoking the accepted compiler. The slice then has 932 mappings. No source wording, assessment answer, distractor, hypothesis, modulus, action convention or map direction was changed in canonical data.

- Restore class-cardinality boundaries (`|class|χ(g)/χ(1)`), set braces, complete maps and representation-label products.
- Correct index/exponent scope: `d_i²` and `e_j²` were wrongly rendered with the square inside the subscript; `λ_v⁻¹` likewise needs an exponent on the indexed scalar. Restore regular-map subscripts `λ_g`, `λ_h`, `λ_{gh}`.
- Preserve adjoint stars, tensor/sum operators, prime coordinates, root grouping, finite-field and number-set notation. Transliterate mathematical alpha/beta/gamma/theta/lambda/chi/phi/zeta/sigma words rather than rendering them as Latin letter products.
- Remove prose from math spans: articles a/A, possessive s, Bézout fragments, order-21/order-24 hyphens, tensor-Hom hyphens, section/page references, status separators and prose acronyms (PID/UFD/ACC/CRT). Mathematical a/A/I uses remain typeset.
- Add missed coordinate products and named objects, including `gW`, `tH`, `th`, `bu`, `vy`, `Ax`, `T_1`, `T_2`, `T_d`, `V_4`, and `C_n`. Rechecked inserted identifiers against surrounding prose and existing delimiter boundaries.

Representative corrected indices: 7527, 7625, 7639, 7655, 7669, 7683, 7818, 8868, 8877, 9128, 9289, 10376, 10726, 10735, 10760, 10768, 10776, 10784, 10792. Distractors and deliberately invalid proposed rules remain invalid.

## Canonical TeX defects left unresolved

No new theorem-truth/arithmetic defect was established in this slice. These existing canonical presentation defects cannot be repaired by spans that are forbidden to cross existing math delimiters. They require a separate canonical-content change; they are not silently fixed by this patch:

| Canonical location | Evidence and needed repair | Current teaching-edition impact |
|---|---|---|
| `lessons.json/27/explanation` (`mh2220-direct-product`) | `$H\cap K={e}$` treats braces as TeX grouping, hiding the singleton-set braces. Use `\{e\}`. | No matching affected edition field; current digest `86dba9e93346d7b1bcffefd6a44a7ae7886b1cca1e96552c6a19e24b2f85059c`. |
| `lessons.json/48/explanation`, `/48/proof`; duplicate `guided-lessons.json/mh2220-simple-composition/objects` | Existing `$H$ölder` splits the proper name. Restore ordinary “Hölder”. New annotation-only H fragments elsewhere were removed by this patch. | Edition `objects`; current digest `21459c0123bfe0e183f2f657f803d6a9c78c5db78933ef80a763d9154cb94e79`. Guided proof is separately authored. |
| `lessons.json/50/explanation`; duplicate `guided-lessons.json/mh2220-finite-matrices/objects` | `U_\|G\|(F_p)` subscripts only the first token. Group the entire dimension: `U_{\|G\|}(\mathbb F_p)`. The theorem already groups it correctly. | Edition `objects`; current digest `a52c026e3bcf69522591430a258e2ec7b1dd351863e91934abcb828182bb35e6`. |
| `lessons.json/68/proof` (`m3220-fractions`) | `$s$'` leaves the prime outside the math object. Put the prime inside the same TeX span. | No affected edition field; current digest `2d64f4edc5ebf5640e7cd8a5a7722feb7136bf7a005de4d7048aa54ac4dd4a6c`. |
| `lessons.json/78/proof` (`m3220-polynomial-division`) | `(q-q')$d=r$'-$r$` fragments the uniqueness equation. Author the complete `(q-q')d=r'-r` in one TeX expression. | No affected edition field; current digest `93ff36380a320b25376acb9a5a4d74070d6c3b48a0d7d6d00433f1f1350ac915`. |

No boundary/application/transfer assessment revision contains these exact defective fragments. All presentation-only corrections leave `assessmentRevision = JSON.stringify(assessment)` and teaching-edition source fields/digests unchanged. A future canonical repair to the two affected `objects` fields will change their edition digests. Existing issue 148 (missing quotient rule) and the separately reported `2⁴≡4 mod 10` arithmetic bug are outside this slice and were not repaired here.

## Validation and binding

Passed current `compileManifest(readCatalogue(root), overlay)`: all four full source hashes, eligible pointers, exact UTF16 raw slices, scalar boundaries, sorted/nonoverlapping spans, existing delimiter boundaries, KaTeX parsing with `trust=false`, unchanged outside prose, delimiter-collision checks and identical-string consistency. Compilation covers the whole frozen proposal with only this slice’s patches applied: 4,517 mappings. This is compiler evidence; no browser or production proof.

| Artifact/digest kind | SHA256 |
|---|---|
| Frozen proposal, `sha256(JSON.stringify(manifest))` | `7f65da677c52139ac7931379fb1a69748e292b701b173f600b58301645d4498a` |
| Frozen proposal file bytes | `1dab347e5b62b819c01bd901750ab2a105f07735ddb9437336add08b11a4ba18` |
| Correction manifest, `sha256(JSON.stringify(manifest))` | `e48dd773b7a9ad0d14ce6f205dd8f034f4d2fe23d101fe58d73b882c2dbeee5a` |
| Correction file bytes | `c652d5be6cd73e4dabb98b9ea298c5fc384e2c2d717e24ce7fdda6ca6a24f4c8` |
| Frozen proposal plus review-3 overlay only, normalized | `c1b9c9b1e86e648a76b25c145b5ddb820940df4c1c2582f3c588e096d1fc1def` |

No unresolved new span plan remains in this slice after these patches. The five canonical defect groups above remain unresolved. This is independent mathematical presentation review, not full original-theorem validation, curriculum completion, learner mastery, hosted authentication or release authorization.
