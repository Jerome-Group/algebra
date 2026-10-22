# Independent constructions and tables review

Review ID `ureca-constructions-tables-independent-2026-10-23-final-scope`.

PASS+NOTES. All eighteen assigned topics T39 through T56 and all eleven assigned E19/E20 methods are accepted against the current catalogue. The five original findings are corrected; the alias integration issue is resolved; final foreign additions are independently checked. No mathematical finding remains open. Bound at 2026-10-22T16:38:53.030Z.

The reviewer did not author the teaching. The reviewer uses `gpt-6.1-sol @max`, the same model family as the authors. This is independent work, not model diversity. No application, build, installation, browser, native-authentication, persistence, Git, or deployment verification forms part of this verdict.

## Primary inputs actually read

- [Teleman, Representation Theory](https://math.berkeley.edu/~teleman/math/RepThry.pdf), Definitions 6.1 and 6.4, Propositions 6.2 and 6.5, Sections 7 and 12, Theorem 15.7 and Corollary 15.9, and Theorem 24.5. These supply tensor, actual-character, class, reciprocity, and Frobenius-coefficient inputs. Authorship was checked through the [author's course-notes index](https://math.berkeley.edu/~teleman/oldnotes.html).
- [tom Dieck, Representation Theory](https://math.uchicago.edu/~margalit/repthy/tomDieck%20Representation%20Theory.pdf), Note 1.8.4, Sections 1.10 and 2.1-2.2, Proposition 2.1.6, Propositions 2.4.2-2.4.5, Section 2.5, and Section 4.2. His left-action convention agrees with this teaching. His dihedral subscript denotes the group order.
- [Bartel, notes by Bouyer, Further Representation Theory](https://warwick.ac.uk/fac/sci/maths/people/staff/fbouyer/representation_theory.pdf), Section 1.3, Theorem 1.4, and Section 6.2, Theorems 6.2 and 6.3. The cited Clifford statement and degree formulas were read in the primary PDF. The site uses the narrower complex, finite-dimensional setting.
- [Etingof and coauthors, Introduction to representation theory](https://math.mit.edu/~etingof/reprbook.pdf), Section 4.3, printed pages 64-65. Its cyclic-character enumeration supports the foreign E09 evidence. Independently, if `d=gcd(k,n)`, then `n` divides `kj` exactly when `n/d` divides `j`, giving a kernel of size `d`.
- [Steinberg, On the Burnside-Brauer-Steinberg theorem](https://arxiv.org/html/1409.7632v2), Section 2, Theorem 6 and Remark 2. The faithful tensor-power theorem is used only in its finite-group, characteristic-zero specialization.

Private study material defined scope only. It was not mathematical authority and is not reproduced here. The tables and subgroup calculations below were independently derived rather than copied from those materials or the author's calculation output.

## Proof inspection

| Topics | Checked argument                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T39    | Typed right/left balancing, quotient and universal property, product bases, dimensions, pure-tensor rank obstruction, cyclic integer-module tensors, and the finite-dimensional dual/Hom map.    |
| T40    | Bilinear well-definedness before spanning, diagonal group law, inverse operators, tensor trace, and correct linear extension to the group algebra.                                               |
| T41    | Zeroth power, all Vandermonde equations, determinant nonvanishing, the exact identity-value fiber, and the common-kernel obstruction.                                                            |
| T42    | Flip commutation, half-sum projectors, independent spanning bases, dimension formulas, eigenvalue derivation, and characteristic-two failure.                                                    |
| T43    | Actual S4 letter and pairing modules, sign twists, complete table, tensor decompositions, and the correct square-class map.                                                                      |
| T44    | Actual S5 standard and exterior modules, measured trivial/standard summands in the symmetric square, actual complement, sign twists, norms, and completeness.                                    |
| T45    | S6 point/pair and pair/triple incidence injections, actual complements, exterior square, actual tensor residual, all eleven rows, powers, norms, and completeness.                               |
| T46    | Actual external tensor action, factored inner products, distinctness, and degree-square exhaustion.                                                                                              |
| T47    | Reciprocal-scalar operator proof, nonzero factors, faithful scalar preimages, scalar Schur, roots-of-unity intersection, exact gcd kernel count, and both criterion directions.                  |
| T48    | Conjugate-first factor-moving identity and dual criterion, nonfaithful powers, every A5 square, quaternion construction/table/squares, and all D6 by D6 entries.                                 |
| T49    | Same-space restriction over arbitrary fields, the invariant-subspace implication, explicit D8 to V4 counterexample, and every embedded S4 to D8 restriction.                                     |
| T50    | Actual A4 quotient and tetrahedral rows, subgroup weights, fused three-cycle classes, all seven restriction rows, all four induction columns, and degree checks.                                 |
| T51    | Right cosets Ht for restricted left regular modules, positive regular multiplicities, and occurrence in at least one larger-group irreducible.                                                   |
| T52    | Nonnegative-sum restriction bound, exact outside-vanishing equality, left-coset translates of a constituent, abelian degree bound, and index-three norms one, two, and three.                    |
| T53    | Conjugated simple modules, canonical isotypic components, transitive type orbit, equal constituent degrees, and the separate equal-multiplicity argument.                                        |
| T54    | Index-two inner-product identity, sign invariance, outside-vanishing equivalence, odd-degree corollary, pair uniqueness, split-constituent uniqueness, full A6 construction, and A7 sign orbits. |
| T55    | Actual S5 restrictions and split constituents, all fixed points in the class criterion, class sizes, inverse-class reality, golden-ratio equations, and full A5 table.                           |
| T56    | Exact kernel-by-trace checks, nontrivial quotient irreducible existence from the regular representation, irreducible inflation, and the simplicity contradiction.                                |

All twenty-four directly assigned lesson and guide records were inspected, including their examples and ninety-six diagnosed assessments. The finalized foreign E09 method additionally links the abelian-weights record, whose full lesson, guide, four assessments, cyclic/product passage and containing capstone were checked. This makes twenty-five linked records, one hundred assessments, and seven containing unit capstones in total. The five new constructions unit capstones are included. Ordinary character claims consistently require finite-dimensional complex modules. The general restriction implication and balanced tensor construction retain their separately stated coefficient hypotheses. Class splitting and character-restriction splitting remain distinct.

## Independent calculations

The retained calculation script reads the candidate catalogue and compares displayed values against independently calculated values. It rejects a missing table. Seeded wrong table values, class weights, matrix entries, degree orbits, and square maps are also rejected.

- S4, S5, and S6. Every displayed row equals a Frobenius coefficient character of an actual irreducible. Weighted inner products and class powers agree independently. S6 incidence matrices have ranks six and fifteen. This numerical evidence supplements the inspected actual-module constructions.
- A5 and A6. Explicit permutation enumeration gives class-size lists `(1,12,12,15,20)` and `(1,40,40,45,72,72,90)`. Inversion preserves each five-cycle class and squaring exchanges the pair. Exact arithmetic in `Q(sqrt(5))` checks every table entry through restriction, split-row sums, and the two defining quadratic equations. All symmetric and exterior decompositions of both degree-three rows, the degree-four row, and the degree-five row agree.
- S7 and A7. Frobenius coefficients calculate all fifteen S7 rows and their identity degrees. Their transpose/sign relation was checked at every S7 cycle type. Independent hook products agree with every degree. The A7 degrees are `1,6,10,10,14,14,15,21,35`, with squared-degree sum `2520`.
- Quaternion group. All 576 products close. All 576 matrix products obey the representation law exactly, and each determinant is one. Quotient exponents add modulo three. The seven represented classes have sizes `(1,1,6,4,4,4,4)`, zero-based square map `(0,0,1,4,3,4,3)`, and degree-two traces `(2,-2,0,-1,-1,1,1)`. Exact arithmetic in `Q(sqrt(-3))` checks every row, twist, symmetric square, and determinant character.
- D6 by D6. Every one of the nine displayed rows equals the external product of the actual S3 rows. Product class weights are `(1,3,2,3,9,6,2,6,4)` and the squared-degree total is `36`.
- S5 to A4. All 28 multiplicities agree. In source row order, the rows are `(1,0,0,0)` twice, `(1,0,0,1)` twice, `(0,1,1,1)` twice, and `(0,0,0,2)`. Induced column degrees are `10,10,10,30`.
- S4 to D8. The actual generators give subgroup class types `1,2^2,4,2,2^2`. Every matrix entry agrees. Induced column degrees are `3,3,3,3,6`. Separate full conjugator sums reproduce every induced class value for both matrices, independently of reading the reciprocity columns.

Orthogonality alone was never used to establish that an arbitrary class function is a character. Actualness comes from explicit modules, measured summand removal, restriction, square constructions, quotient characters, or the stated Frobenius theorem.

## Findings and corrections

Two initially failing passages were corrected by the coordinator and then reread.

1. `tensor-products`, conventions. The former general polygon convention conflicted with the order-eight D8 used in the containing capstone. The current text explicitly gives D8 order eight, D6 order six, and the polygon-laboratory aliases D4 and D3.
2. `ureca-constructions-binary-tetrahedral`, proof and matching guided step. The former phrase "its six cyclic powers" was false for the specified order-three element. The current proof uses the six-element set `{±1,±q,±q²}` and identifies `q` or `-q` as generator according to its order. Explicit enumeration confirms the correction.

Three reading citations were corrected and independently reread. The A5 and A6 class-splitting input is tom Dieck Proposition 2.4.5. The A6 table remains an original computation. The S5/A4 reciprocity input is Teleman Theorem 15.7 and Corollary 15.9. The saved replacements match those verified primary locations.

## Method routing

The review slice points each distinct exercise method to its actual proof or worked calculation. The nonfaithful method points to the common-kernel argument, not the faithful Vandermonde introduction. The abelian degree method points to coset translates of an eigenline. The index-three method points to the norm bound and all three examples. The A7 method includes the actual determinant arithmetic.

The consolidated joins remove A5 square decompositions from the simplicity topic, remove the two index-bound methods from the occurrence-only topic, and add the D6 product calculation to the external-product topic. T47 links only the foundations-owned faithful-cyclic/product method. Its exact final passages were reread and independently checked. That foreign method remains foundations-owned and is included in the digest input.

## Final scope and integration checks

The previous accepted review, `ureca-constructions-tables-independent-2026-10-22`, was superseded after integration changed complete records. Its eighteen digests were reproduced exactly from the saved inspected records and the original foreign E09 record. This established the comparison baseline independently of the coordinator's claim that the mathematics was unchanged.

Across all thirty-three new constructions lessons, exactly forty-three provisional topic aliases were removed. All canonical lesson IDs and title aliases remain. Restoring those aliases gives fifteen duplicate alias occurrences; the current catalogue has zero. All twenty-four directly assigned full lesson, guide and metadata records differ from their inspected versions only by those aliases. Their six containing units and capstones are unchanged. The final canonical eighteen topic obligations and eleven owned method rows are identical to the previously inspected rows and were copied afresh for this binding.

The foreign `ureca-foundations-abelian-weights` record did change mathematically. The earlier unchanged-record premise was rejected, and final acceptance was held until the consolidated scope delta arrived. The final proof, reading, pitfall, guided proof, nonexample and added examples were reread. The proof and example status labels now accurately state that arguments and examples are present. No other field changed: metadata, all four diagnosed assessments, the original two examples and reading entries, and the containing unit and capstone agree with the prior inspected records. The complete lesson proof and guided proof steps match.

For C2 by C3, the character has sixth-root exponent `3u+2v` modulo six. Enumerating its six inputs gives six distinct exponents, with zero only at the identity. The cubing argument proves the same kernel claim directly. A tuple of generators in cyclic factors of pairwise coprime orders has order equal to the product, proving the coprime compression statement. For nontrivial invariant factors `1<n1|...|nr`, choosing a prime dividing n1 gives p-torsion of rank r; faithful weights must inject this subgroup into at least r scalar coordinates. Coordinate weights attain r. The trivial group has zero nontrivial invariant factors and a faithful zero-dimensional representation, as both final proofs now state.

For C4 by C4, independently enumerate all sixteen characters by `lambda(a)=i^j` and `lambda(b)=i^k`. Killing every square is equivalent to j and k both even, giving four sign characters, exactly three nontrivial. The displayed nontrivial choice has j=2 and k=0. The single equation on a squared times b squared requires only j+k even and admits eight characters, including j=k=1, so it is strictly weaker. The three nonidentity involutions are a squared, b squared and their product. Multiplicativity prevents all three from having value minus one. These are actual one-dimensional representations, and the lower-bound argument uses the separately stated complex-field hypotheses.

The foreign method linked to T47 remains precisely `E09-faithful-irreducibles-of-cn-and-products-with-d8`, with its cyclic kernel argument and both D8 product examples. The two expanded foreign degree/root-constraint methods remain foundations-owned and are not added to T47. Their record's additional teaching is nevertheless inspected because the digest binds that complete linked record. Other owners' independent review gates remain outside this acceptance.

## Acceptance bindings

Review ID `ureca-constructions-tables-independent-2026-10-23-final-scope`. Reviewed at `2026-10-22T16:38:53.030Z`.

The canonical `topicDigest` function received all five current catalogues and the full seventy-four-method ledger. The catalogue contains 227 lessons, 227 guides, 227 metadata records, 34 units and 35 capstone records. Each digest binds complete linked lesson, guide and metadata records, containing units and assessments, exact topic obligations and related methods. The foreign E09 row participates in T47. Unrelated methods do not affect these digests.

| Review ID                                                       | Accepted topic | Content digest                                                     |
| --------------------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T39            | `7a05a57ad415815dc62d5c1082b0cfdae135327040fa0560bedc09037052812d` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T40            | `2b44d9e7eff9310097a24f3302dff34c1152aed7bd2c49b3311d3f286e24f87d` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T41            | `d5c42e0f375bc860087d9806f1c4744a99cc25b6fcf5fb78017965a99c7e9a58` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T42            | `bd27ea63c263b5ddfb464d9682ff529dc13342032e11c3d116f9737bf447a5bb` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T43            | `b31be66a64700e80e36efd32459b2894ffd06948f46d06d63f1080b809b7d619` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T44            | `27e066c1bde0939a67d196f16e003df7cb8aec689862b319d2ea32fdafc038fa` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T45            | `06cf66080c90874ec8184def240c8206cb03cdc79a18cc61b4df4ecc1ba9db7a` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T46            | `6c26fdc86e352cd2dda51eaf1c6944bd625940570208603223efd596ca1f35f7` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T47            | `adc383631ec27aad0536bb33b630b1aeaaea7c1760d67e9aa95a62a1633fc3e6` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T48            | `524a22e3265b8cc79a423f86201d1ede3eec9a483a70116a17085f1215044fe0` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T49            | `f29b9332732491ee77a87ea67daf756caa4b39b8675c54508d8ac7a593fb309a` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T50            | `4fe51e40f019ffc73f30a8e1950e2b08b6f5e9bbbd78ab85aa61f141e3b96459` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T51            | `6678996367239f447313e89d9fcd5f203c621af5144ecf90ab2e7e2736b7a33c` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T52            | `1132ed9bfe1242d2ebfb25c23e6ec929a1fe56ea4134b9166d6d88af256f787a` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T53            | `c531c3d324f71e66d77c44439fc108ac31bbb489b805c923d4177cd51c2671e6` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T54            | `db8bed8228a40ba97c0c25a8230836d3931267e2849da40ffe6e82d6b080a1f9` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T55            | `d88ed501ad4d44f635e77e23ea58d80ec1492567d0c335d16bc373a161b0b9a9` |
| `ureca-constructions-tables-independent-2026-10-23-final-scope` | T56            | `0051b87e600ee363f7948312a93988ff148d1058df9c32072c66862e6420a640` |

The eleven assigned accepted methods are:

- `E19-product-conjugation-inner-product`.
- `E19-trivial-constituent-of-irreducible-product`.
- `E19-nonfaithful-tensor-power-obstruction`.
- `E19-a5-symmetric-exterior-decompositions`.
- `E19-seven-class-order24-table-from-squares`.
- `E19-d6-by-d6-full-table`.
- `E20-d8-embedding-and-all-s4-restrictions`.
- `E20-a6-table-from-s6-and-split-classes`.
- `E20-abelian-subgroup-index-degree-bound`.
- `E20-index-three-norms-one-two-three`.
- `E20-a7-degrees-from-s7-sign-orbits`.

The slice contains eighteen current canonical topic rows and eleven owned method rows. T47 additionally references the foundations-owned E09 row in the full ledger. Reciprocal joins and all exact passage excerpts were validated against that full ledger. No owned binding is stale. A digest binds inspected content; it is not mathematical certification by itself.

No private source path, source hash, personal study record or copied course exercise is included here. Retained evidence includes the original independent calculations, diagnosed-assessment audit, exact prior-binding reconstruction, final record comparison and finite-character enumeration. This accepts only the stated mathematical scope. It does not establish browser rendering, account behavior, persistence, release readiness or learner mastery.
