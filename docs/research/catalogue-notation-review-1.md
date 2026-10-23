# Catalogue semantic review 1

Original proposal rejected. Corrected slice approved for notation preservation except queue row **3369**, whose canonical cyclic-group ambiguity remains unresolved. Full-corpus approval withheld; all 44 packets and the final combined correction plan require independent review.

## Actual reading and scope

Reviewed **3,750/3,750 exact strings**, queue indices **0–3749**, packets **001–015**, and **4,089/4,089 listed occurrences**. This includes all **2,248 annotated** and **1,502 unannotated** strings, all **1,667 flagged** strings, plain English, distractors, and ambiguous `a`/`A`/`I`.

The compact projection contained each complete source string, every exact raw-to-TeX substitution, and every listed file, pointer, owner and role. Truncated segments were reread. Every occurrence was resolved against its canonical source, and every text SHA-256 was verified. Additional reading covered **178 supplemental complete assessment contexts** (questions, all choices, explanations): 139 whose questions were outside this slice and 39 with omitted choice strings. Shared numeric/prose choices were checked in each assessment context. These supporting contexts do not extend approval to their other strings. The complete `mh2220-p-groups` guided and canonical lesson objects and its actual laboratory were also read.

All final replacement arrays were independently reread after generation. The bounded offline generator applied explicit contextual decisions; its success was not treated as semantic approval. A supporting residual-letter inventory caught and corrected a missed mathematical `a`; it did not establish coverage. No original theorem-wide truth claim follows from this presentation review.

## Immutable bindings

All four complete source-byte hashes matched immediately before handoff. Digests of manifests use UTF-8 `JSON.stringify(manifest)` unless marked file bytes.

| Artifact | SHA-256 |
|---|---|
| Unaccepted full proposal | `7f65da677c52139ac7931379fb1a69748e292b701b173f600b58301645d4498a` |
| Full proposal file bytes | `1dab347e5b62b819c01bd901750ab2a105f07735ddb9437336add08b11a4ba18` |
| Packet index file bytes | `abacce9f53974c498780032982da93769c9839d635c2be19a868d16f3adc052f` |
| Correction manifest | `c75881328f13673597540ae50dcb1ba3600238d15fa418267c990e7c213f0cd5` |
| Correction file bytes | `a3452b2e1cba6b1b36e3957c60361791c97a6d7de353c1a2086e749bf3f51a92` |
| Full proposal plus only this slice's corrections, in-memory merge | `218abc7f1ac9931cd43a176a2d3b852e35b5902283f0fc76932536fb5da49055` |

| Canonical source | Full byte SHA-256 |
|---|---|
| `lib/algebra/lessons.json` | `5f12e02001cdb65591ef5437ed0279cf2f750b4490a930e4af2ad01cc1274d74` |
| `lib/algebra/guided-lessons.json` | `6d727041580ad0be7891013926222ff8607e07e291ac6845ac1e82a6932911db` |
| `lib/algebra/units.json` | `622452df05bafd77af27ab9ad3f5ae4427d88bf1d391b88dc547a3981ee90bf4` |
| `lib/algebra/capstone-assessments.json` | `f9c562ddd4c9f6b22ac7ab2ed83b86e9980ca8f12cc73736581e0ab5135dbc84` |

| Packet | Full file byte SHA-256 |
|---|---|
| `packet-001.json` | `33f6004b9ac6b8cfb68a4099aabdabbbec01ccc2e0ce2b9d8780620241cfe107` |
| `packet-002.json` | `5f167a11b8ea013f24cdfb8dc2af267584ff547548cd0428f1a67f04487886b0` |
| `packet-003.json` | `89c68105e42b76076cbb9c42ac0e578d8c4c822bda3e134ca7870a2c0d50d39d` |
| `packet-004.json` | `5d253ba906c7ad689d4f258a3b1a616b0ac0b57893b02d485ae33fac0b90827a` |
| `packet-005.json` | `ab7fdd5d4a271bfd6ed5e805c685740d07888046af631f58e5bba0492d765ea6` |
| `packet-006.json` | `ad0a28955ed06b5d01a1e130d5068453899135e57e55cd0ea258a1925f328446` |
| `packet-007.json` | `05db8e6d5a63e4988868397234ea4427aff3d13fcc0510a33d6aea9eaeea8a78` |
| `packet-008.json` | `75d289114df809f77251589a12198a23c61ba63679511dbc8c50ac7554d68365` |
| `packet-009.json` | `cfc092a50dcdb2418df594d8c39692bf38f58d212d75b5e7e918323fe8ef3635` |
| `packet-010.json` | `93619598ff01e091dba9927e66a346d6a5560b39bfedf6fed8fd5ca04cc096b1` |
| `packet-011.json` | `68ea70a5a110a1d5cac4b560269e613413f5a23a08c3495aa4a95713ff545f8d` |
| `packet-012.json` | `868813227c3dc70a90f131ccab5253e3c9814bb199ebbaceae78c9ce2839199e` |
| `packet-013.json` | `fadaf9d9ad5c79a6ec33e6ae5793f6928e2da6199bf653c04ddeac9a35434c4a` |
| `packet-014.json` | `9378000d781ce11252c42b39fc267652d2a2d51198fd1fa76ac2a4146c4b88a7` |
| `packet-015.json` | `ebcef84483d641a1c0c5046141afa4841d9f0d2de20f2496261121d783bc404c` |

## Replacement contract and validation

`semantic-corrections-1.json` contains **502 complete replacement span arrays**, **1,336 spans**, affecting **505 listed occurrences**. Match by representative source and exact full text, propagate identical strings consistently, and replace the entire old array. This is an output-only proposal, never an accepted manifest.

**35 arrays are deliberately empty tombstones**: delete the original annotation record for that full source string. The current compiler requires nonempty annotation records, so tombstones are merger instructions and are omitted from its input. The reported merged digest retains untouched original-record order, then appends nonempty corrections in queue order. Tombstone queue rows:

`158, 227, 238, 569, 574, 1007, 1025, 1026, 1028, 1065, 1084, 1386, 1540, 1753, 1758, 1781, 1835, 1836, 1837, 1839, 1883, 1892, 1966, 2164, 2290, 2294, 2295, 2297, 2299, 2307, 2314, 2951, 2980, 3599, 3602`

All seven prior pilot-correction strings present in this slice retain their exact independently approved arrays: `23, 592, 627, 631, 636, 651, 652`. The seven other correction strings from `functions-independent-corrections.json` lie outside this slice and must also survive the eventual full merge. In particular, the capstone's complete `[n] modulo 3 ↦ [n²] modulo 6` span survives unchanged.

The in-memory whole proposal after these replacements and tombstone deletions passes `compileManifest`: **4,533 mapped strings**, fixed full-source hashes, exact UTF-16 raw slices/scalar boundaries, sorted nonoverlapping spans, protected existing delimiters, equal-string consistency, untouched prose, and trust-disabled strict TeX parsing. This does not approve unreviewed records elsewhere in that proposal. All **37 existing delimited expressions** in the assigned slice independently passed strict KaTeX parsing.

## Decisions preserved in the correction arrays

- Number sets are contextual: integers/rationals/reals/complexes and finite fields become blackboard bold. Centers `Z(G)`, central-series `Z_i`, cycle-index `Z`, arbitrary rings `R`, matrices `Q`/`R`, cyclic `C_n`, and quaternion `Q_8` retain their meanings.
- Remove swallowed English articles, possessive `s`, accented-name fragments in Bézout/Jordan–Hölder, prose slash phrases and acronym-only TeX (`PID`, `UFD`, `ACC`, `DCC`, `CRT`). Mathematical `a`, `A`, `I`, cosets, products and regular-map variables receive explicit spans. `p`th and `k`th keep the English suffix.
- Preserve factorial equality `4!=24` as `4!=24`; the original `4\ne24` was wrong. Preserve scalar `n1`, `a1`, `b1`, `a0` as multiplication, not indexed variables.
- Restore complete cardinalities, sets and maps: `|G|=|Gx||H|`, `|Cl(x)|`, `|aH|=|bH|`, `|HgK|`, color-set codomains, localization set builders, literal set differences, quotient rules and coset-product boundaries.
- Correct actual indexing/grouping: core intersections have `g∈G` as a lower limit; regular maps use `λ_g`; permutation matrices use `P_σ`; vector coordinates use `v_{σ(i)}` and `e_{σ(j)}`. `q^{c(σ)}` and `a^{φ(n)}` keep the complete function in the exponent. The dihedral normal-form exponent is `a+(-1)^b c`, not `a+(-1)bc`.
- The quadratic-integer multiplication context requires `(√D)^2=D`; `√(D²)=D` changes the assertion when `D<0`. Its corrected radical scope adds no field hypothesis.
- Named operators remain upright; the infinite-shift product `SL` remains the product of operators `S` and `L`, not the special linear group. Finite-field `F_q×` in the multiplicative-group context is `F_q^{×}`. Transliterated Greek variables and complete exponentials are mathematical notation. Binomial notation uses `\binom`.
- Seven explicitly declared 2×2 matrix passages (rows `336,346,351,663,844,847,1439`) use actual matrix arrays. Entries, row/column order and all surrounding relations are preserved.

Distractors remain false where intended; no answer index, canonical text or hypothesis was changed. Set braces remain sets, square brackets remain classes or the specified intervals, and inverse/product order is retained.

## Withheld canonical ambiguity: cyclic prime-square group

Queue **3369**, `lib/algebra/guided-lessons.json#/mh2220-p-groups/transfer/question`, says `Why is Cₚ² not simple?`. Its sole occurrence among the four bound sources is this question. The frozen presentation is `C_{p}^{2}`. It remains unchanged by this correction manifest and is **not approved**.

The complete transfer explanation says `The actual subgroup ⟨gᵖ⟩ supplies the normal-subgroup witness.` This requires the intended cyclic group `C_{p²}=⟨g⟩`, where `⟨g^p⟩` has order `p` and is proper and normal. In `(C_p)^2`, every `g^p=e`, so that proposed witness is trivial. At `p=2`, `C_4` has the nontrivial witness `⟨g²⟩`, while every square in `C_2×C_2` is identity. Both groups are nonsimple, so the current first choice alone does not disambiguate the intended object.

The actual laboratory is `ConjugationLab`, initially `Q8`; it offers finite dihedral, symmetric, quaternion and cyclic examples. It neither defines a symbolic `C_{p²}` nor resolves this question's notation. Canonical repair should explicitly name the cyclic group of order `p²` and its generator. An annotation must not silently make that decision.

Related derived statements requiring refresh after repair:

- `lib/algebra/learning-metadata.json#/mh2220-p-groups/competencies/2/statement`
- `lib/algebra/feature-map.json#/lessons/49/metadata/competencies/2/statement`

The actual bundled `assessmentRegistry`/`assessmentRevision` helpers confirm credited assessment **`mh2220-p-groups:transfer`**. Its current revision is `JSON.stringify(assessment)`, **301 UTF-8 bytes**, SHA-256 `4beb7c5e1af38244a4b98517b36b90d7ac625f17357b04432d709e4b8b1e7573`. Changing its question or explanation changes this revision.

The actual `teachingEdition('mh2220-p-groups')` digest is `7f05862be2e3f6ec638dcb2b16a6489f460a4d57b759e2ec1d759651c74721bb`. It binds guided objects/proof, canonical theorem and conventions; it excludes transfer assessments and metadata statements. A repair confined to the question/explanation and these derived statements leaves that edition unchanged. Broader edits to its bound fields require recomputation. Presentation-only annotations change neither identity.

## Other canonical findings, separate from annotations

| Queue row / source pointer | Finding |
|---|---|
| 23; prior pilot's four source locations | The type `f: Z→Z/3Z` does not specify the quotient projection before asserting its fibers. Retain the prior independent report's missing-rule finding; a constant function is a counterexample. |
| 1042; guided `m3220-characteristic/examples/1/steps/1` | `Its additive identity satisfies 1+1=0` calls `1` the additive identity. `0` is the additive identity; the intended statement concerns the multiplicative identity in characteristic two. |
| 1280; guided `m3220-fractions/boundaryCheck/explanation` | `Atu=cts` uses undefined capital `A`; the preceding representative calculation uses `atu=cts`. This letter/case defect needs canonical repair. |
| 1327; guided `m3220-gauss/nonexample/title` | Title says `Content 6`; the actual polynomial `6X²+9X+3` has content `3`. The title/example mismatch should be reconciled. |
| 1918; guided `m3220-polynomial/examples/1/title` | `A nonzero polynomial function can vanish everywhere` conflates a nonzero formal polynomial with the zero function it induces. The example correctly makes that distinction elsewhere. |
| 2946; guided `mh2220-euler-fermat/nonexample/explanation` | Source says `2⁴≡4` modulo ten. `16 mod 10=6`; retain this as canonical arithmetic repair, not an annotation change. |

These source findings prevent unqualified mathematical-content approval. The parent is tracking canonical repairs separately (issue 150); this reviewer changed none of their source bytes. Any canonical repair invalidates the present full-source binding and requires fresh queue/span offsets, current source hashes and final review.

## Limits

This is the complete assigned presentation review, with one explicit withheld text. It is not approval of the other **7,138 eligible exact strings**, all original theorem/proof truth, external course-source fidelity, private/student writing, retained historical editions, runtime wiring, browser behavior, accessibility, deployment or learner outcomes. No browser, child agent, commit, push, canonical edit or accepted-manifest/runtime write occurred.
