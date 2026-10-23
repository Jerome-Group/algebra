# Functions pilot: independent semantic review

Review complete: **160/160 exact strings, 740/740 listed occurrences**. Original proposal requires corrections. The corrected in-memory plan below is approved for notation preservation; an existing missing-hypothesis defect remains separate. No canonical, accepted-manifest or runtime writes; no browser, deployment or learner-outcome claim.

## Bound artifacts

Reviewed `functions-review-queue.json`, `functions-proposed-annotations.json`, `functions-review.md`, the implementation contract, and their exact canonical sources. Digests use SHA-256; proposal digests use UTF-8 `JSON.stringify(manifest)`.

| Artifact | Digest |
| --- | --- |
| Original proposal | `9d7098f348d5107e963ee4feb24d192c4d7141308682987bcc6cf22d39184dba` |
| Original proposal file bytes | `3ea9b48f257a84e62c334ef729e1f046e74325cb3af6108baf556635bc180e6b` |
| Review queue file bytes | `145ecfa4f1c91b098fee0dbbb31e4ddd8033fec1165e801ff97ba43e3dd41c79` |
| Correction manifest | `846dd096855a1d66d4f5f1a85735ae66346caa689fd4b420a187ca98e5d63c28` |
| Original proposal with the 14 correction records substituted | `740b81dab8a97ff8f22296a11ccec878c433d7676eccee1b05d81272869e7e32` |

| Canonical source | Full byte digest |
| --- | --- |
| `lib/algebra/lessons.json` | `5f12e02001cdb65591ef5437ed0279cf2f750b4490a930e4af2ad01cc1274d74` |
| `lib/algebra/guided-lessons.json` | `6d727041580ad0be7891013926222ff8607e07e291ac6845ac1e82a6932911db` |
| `lib/algebra/units.json` | `622452df05bafd77af27ab9ad3f5ae4427d88bf1d391b88dc547a3981ee90bf4` |
| `lib/algebra/capstone-assessments.json` | `f9c562ddd4c9f6b22ac7ab2ed83b86e9980ca8f12cc73736581e0ab5135dbc84` |

All four current byte hashes match both input manifests. Every occurrence pointer resolves to the exact queued string; all 740 locations are distinct and their owner IDs agree with the source objects. Each queued text ID matches its string SHA-256.

## Exact corrections

`functions-independent-corrections.json` is an output-only manifest using the contract's wire format. Its 14 records **replace complete span arrays** at the matching representative source pointers; they cover 20 occurrences through exact-string equivalence. Other proposal records remain unchanged. It contains 39 spans, including unchanged spans needed in each replacement array.

| Queue index | Representative source | Correction |
| --- | --- | --- |
| 4 | `capstone-assessments.json#/functions/question` | Blackboard-bold integers; one complete quotient-rule span. |
| 9 | `guided-lessons.json#/foundations-fibers/application/question` | `Z` is the integers. |
| 44 | `guided-lessons.json#/foundations-functions/examples/0/steps/0` | Both `Z` occurrences are the integers. |
| 48 | `guided-lessons.json#/foundations-functions/examples/1/steps/0` | `Z` is the integers. |
| 53 | `guided-lessons.json#/foundations-functions/nonexample/explanation` | `R` is the reals. |
| 68 | `guided-lessons.json#/foundations-functions/transfer/explanation` | `Z` and `2Z` denote the integers and even integers. |
| 69 | `guided-lessons.json#/foundations-functions/transfer/question` | Same number-set meanings. |
| 127 | `lessons.json#/1/pitfall` | `Z` is the integers; applies also to its guided nonexample copy. |
| 128 | `lessons.json#/1/practice/0/answer` | `R` is the reals; applies also to guided transfer explanation. |
| 130 | `lessons.json#/1/practice/0/question` | Both `R` occurrences are the reals; applies also to guided transfer question. |
| 134 | `lessons.json#/1/worked/steps/0` | Integer quotient and its three cosets; applies also to guided example copy. |
| 136 | `lessons.json#/1/worked/steps/2` | `1+3Z` is an integer coset; applies also to guided example copy. |
| 143 | `lessons.json#/2/pitfall` | Integer quotient and integer codomain; applies also to guided nonexample copy. |
| 153 | `units.json#/0/capstone/question` | Blackboard-bold integers; one complete quotient-rule span. |

The original capstone split made `3 ↦ [n²]` the isolated mathematical expression. Both capstone records must instead replace UTF-16 range `[44,72)` with this exact span:

```json
{"start":44,"end":72,"raw":"[n] modulo 3 ↦ [n²] modulo 6","tex":"[n]\\text{ modulo }3\\mapsto[n^{2}]\\text{ modulo }6"}
```

This keeps each modulus with its respective class and retains both literal words “modulo”. It supplies no new hypothesis and does not change the equivalence classes into representatives. `\mathbb{Z}` and `\mathbb{R}` apply only to the identified number sets; no blanket conversion of arbitrary `Z` or `R` is approved.

## Complete semantic disposition

All 160 source strings and proposed presentations were read, including all 80 strings with no proposed annotations. Full three-lesson objects, guided lessons, the functions unit and its canonical assessment were read together to check surrounding definitions, hypotheses, choices, answer indices and explanations. Repeated shared fields were reviewed in every listed owner/role context; these are self-contained text, not approval of the other owners' entire lessons.

The larger shared groups are conventions (91), example status (145), family (17), level (111), proof status (57), subject (60), MH2220 track (49), Algebra track (17), and completion criteria (16). Section references occur four times. Their words/references remain prose. The conventions' `AB` is matrix multiplication, `B` the matrix applied first, `Dₙ` the declared dihedral convention and `2n` its order. These are correctly mathematical in all 91 copies.

All residual `a`/`A` candidates in the 46 flagged exact strings are English indefinite articles. No unannotated mathematical `a`, `A` or `I` remains in this pilot queue. Mathematical `a` in mapping rules, finite sets, equivalence classes and equalities is already within reviewed spans or existing delimiters. An independent outside-span single-letter inventory agrees; that inventory supports the reading and is not the basis for completeness approval.

Set braces are escaped and retain actual sets, including singleton fibers and inverse images. Square brackets retain equivalence classes, while `[0,∞)` remains an interval. Primes and Unicode super/subscripts preserve the intended variables and exponents. Positive `m,n`, universal English quantifiers, map direction and composition order remain intact. The `n divides m` criterion remains the correct answer; distractors remain distractors. `\operatorname{id}` and `\operatorname{im}` are correctly named operators. Existing `\operatorname{mod}` spans express remainders and retain their complete expression scope. The source's `≈` denotes its specified target equivalence relation and is preserved. No missing symbolic quantifier or named number set beyond the listed corrections was found.

All 24 existing delimited expressions were independently parsed with strict KaTeX validation. The in-memory proposal after correction passes `compileManifest`: 80 mapped strings, 196 proposed spans, exact raw slices, UTF-16 scalar boundaries, sorted/nonoverlapping spans, existing-delimiter boundaries and trust-disabled strict parsing. Canonical source bytes remain unchanged. This validates the corrected plan's structure and notation, not browser execution.

## Existing canonical content defect: quotient map unspecified

Three logical passages, four physical locations, specify only the type `f: Z → Z/3Z` before asserting or asking for residue-class fibers:

- `lib/algebra/lessons.json#/1/worked/steps/0`
- Identical guided worked-step copy: `lib/algebra/guided-lessons.json#/foundations-fibers/examples/0/steps/0`
- `lib/algebra/units.json#/0/capstone/question`
- `lib/algebra/capstone-assessments.json#/functions/question`

The preceding definitions give an arbitrary function and the relation “equal outputs”; none states `f(n)=[n]₃`. The title “Remainder fibers” suggests the intended quotient map but does not specify its rule. The domain/codomain type alone is insufficient: the constant function `f(n)=[0]₃` has one fiber `Z` and two empty fibers, whereas the intended projection has fibers `3Z`, `1+3Z`, `2+3Z`. Thus the worked example and the first part of both capstones need an explicit canonical-map hypothesis in separate content work. The square-rule counterexample `0` versus `3` is independently correct.

No presentation annotation may silently insert `f(n)=[n]₃`. The correction manifest deliberately preserves this source ambiguity. Unqualified mathematical-content approval is withheld until that separate defect is handled.

The credited assessment affected by a canonical assessment-question correction is **`unit:functions`**, backed by `capstone-assessments.json#/functions`. Its actual revision is `JSON.stringify(assessment)` (605 UTF-8 bytes), whose SHA-256 is `4457fca0956ed81300e88b5013c0e88c690d83962171506a0b5eb284b4e0752e`. A canonical question change changes that revision; annotation-only changes do not. None of the three lessons' credited competency assessments contains the missing quotient-map rule.

Current actual `teachingEdition()` digests:

| Lesson ID | Digest |
| --- | --- |
| `foundations-functions` | `9a3a2683c78c05a2e804dc97fccb4fa852523646d022b282455bec4e1c2890d8` |
| `foundations-fibers` | `bed43315cb82e778feecacfe6980179ad0be7cc251e0497ed623ffff0948c9ad` |
| `foundations-quotient-rules` | `15a906d6c6d006445626bce802635d124c178845569441f9bc808eb2df8e4d70` |

The actual edition helper binds guided objects, theorem, conventions and guided proof steps; it excludes worked examples and capstones. Repairing exactly the four strings above therefore leaves these edition digests unchanged. Expanding that repair into edition-bound fields would require recomputing them. Annotation-only corrections likewise leave all three unchanged.

## Coverage limits

This is complete review of the **functions pilot queue**, including its shared-string occurrences outside the functions unit. It is not review of the other 10,728 eligible exact strings, complete mathematics in the 211 touched owner objects, external course sources, private/student text, retained historical editions, direct-TeX fields outside the contextual pilot reads, or runtime/native-control wiring. No signature scan establishes those broader claims. The pilot remains partial and unpublished; apply the separate owned-browser and release gates before any broader claim.
