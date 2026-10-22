# Independent induction review

Review ID `ureca-constructions-induction-independent-2026-10-22`. Verdict PASS+NOTES after the recorded corrections were applied and reread. Review completed at `2026-10-22T16:35:55.313Z`.

The reviewer used gpt-6.1-sol @max and did not author the teaching. This is independent authorship with the same model, not model diversity. The retained scope inventory and author notes defined obligations only. Primary references and independent calculations supplied the mathematical checks.

## Checked scope

The review covered T57 through T69, all seven E21 methods, sixteen complete lesson records, their full guides and metadata, all thirty-two guide examples, all sixteen nonexamples, all sixty-four diagnostics, and four containing units and capstones. The lesson worked examples and practice answers were also read. No topic was accepted on the strength of a source link, a partial passage, or orthogonality alone.

| Topics | Checked argument                                                                                                                                                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T57    | Nonmodular invariant complements extend a left regular-module map. Evaluation at one gives right multiplication. A projection supplies the separating idempotent. Noncentral and modular examples were checked.                                                                      |
| T58    | Disjoint group supports give unique right subgroup-ring coordinates. These prove map and isomorphism preservation, intersections, sums and directness. Both transitivity maps respect the inner and outer balancing relations.                                                       |
| T59    | A regular module has bounded multiplicities. Enough external copies contain every finite-dimensional complex source. Coset-coordinate extensions prove model independence. The ambient-product map agrees with the explicit balanced tensor comparison.                              |
| T60    | The coset action is constructed before tensor identification. The group law uses the ordered correction product h1 h2. Group symbols commute with coefficients in the ordinary group ring. The left B and right A actions commute by associativity.                                  |
| T61    | Right A-linear q maps descend to the balanced inverse. Both composites prove directness for nonfree V. Representative replacement changes v to h inverse v. The corrected particular inclusion is split by q, while the separate unsplit integer inclusion can lose injectivity.     |
| T62    | Evaluation and extension preserve additivity and module linearity. Balancing makes the reverse map well-defined. Both inverse identities hold on generators. For noncommutative coefficients the stated Hom structure is an abelian group.                                           |
| T63    | Induction and restriction preserve identities and composition. Evaluating u F (1 tensor f) checks source precomposition and target postcomposition separately. The Hom action, evaluation inverse, unit, counit and both triangle identities have the stated types.                  |
| T64    | Finite-free V over a commutative ring permits ordinary trace. Projection to a moved starting copy gives a zero diagonal block. Representative conjugation preserves trace. Reindexing a=th gives the H factor, and division requires its order to be a unit.                         |
| T65    | Conjugators to a fixed subgroup element form a centralizer fiber. Grouping the fibers by H classes gives the ratio formula and the class-indicator result. The distinction between an arbitrary class function and an actual character is correct.                                   |
| T66    | Every entry of all three multiplicity matrices was independently derived. Every induction column was checked against the full conjugator sum on every group element. The actual S4/D8 embedding and class map were enumerated.                                                       |
| T67    | The affine group law, all five classes, quotient linear rows and both induced degree-three representations were checked. Exact period arithmetic, irreducibility and degree-square completeness produce the full table of actual representations.                                    |
| T68    | The character product argument and both balanced equivariant module maps agree. Identity trace proves degree. Cauchy-Schwarz gives the full source squared-norm factor, which specializes to the index for an irreducible source.                                                    |
| T69    | The two H-stable coset copies give the restriction identity. Complex reciprocity and complete reducibility give the norm dichotomy. Degree counting proves the two extensions, and the direct intertwiner rescaling verifies existence independently. The real C4 boundary is valid. |

The general proofs were checked symbolically. Finite examples supplement those proofs. They are not offered as proofs over arbitrary rings.

## Exact calculation evidence

The three matrices below match the current catalogue exactly. Rows are larger-group irreducibles and columns are subgroup irreducibles in the order stated in their lessons.

For S5/A4, the matrix is

```text
1 0 0 0
1 0 0 0
1 0 0 1
1 0 0 1
0 1 1 1
0 1 1 1
0 0 0 2
```

For S4/D8, the matrix is

```text
1 0 0 0 0
0 0 0 1 0
0 0 1 0 1
0 1 0 0 1
1 0 0 1 0
```

For S4/C3, the matrix is

```text
1 0 0
1 0 0
1 1 1
1 1 1
0 1 1
```

The S4 rows used actual point and matching permutation representations. The S5 rows used the point representation, exterior square, sign twists and the invariant complement to the injective point-to-pair incidence map. Its Gram matrix is 3I+J with determinant 648. Thus the five-dimensional residual row is actual before its norm is checked. The A4 rows are quotient representations and its four-point sum-zero representation. The D8 rows are linear representations and the explicitly constructed planar representation.

For D8 induction from C4, the generator matrices are diag(i,-i) and the swapping matrix. Induction from V4 gives the rotation matrix with columns (0,1) and (-1,0), and reflection diag(1,-1). All sixty-four multiplication pairs were checked for each construction. Their common class trace is (2,-2,0,0,0). The first construction has two distinct rotation eigenlines and the reflection exchanges them, proving irreducibility directly.

The affine group of order twenty-one was enumerated as pairs (i,j), with product (i+2^j k,j+l). Its classes have sizes (1,3,3,7,7). In the basis indexed by 1,b,b squared, a acts diagonally by zeta,zeta to the fourth,zeta squared, while b cyclically permutes the basis. Each of the two induced monomial representations passed all 441 multiplication pairs. The three quotient rows and two induced rows are actual representations. Exact cyclotomic arithmetic gives u+v=-1, uv=2, conjugate u=v and u squared plus v squared=-3. The five rows are orthonormal and their squared degrees total twenty-one. The imaginary sign of u agrees with the positive sine sum stated in the lesson.

The S3/C2 signed coset representation passed all thirty-six multiplication pairs. Its trace is the sign row plus the standard row. The S3 product identity, strict induced squared-norm bound, attained cyclic bound and both index-two alternatives also agree with the independently constructed representations.

## Diagnostics and capstones

All sixty-four diagnostic answers select a mathematically correct choice under their stated hypotheses. All four capstone answers agree with their unit answers. Their distractors fail for the mathematical reason stated in the explanation. The capstones check the nonfree tensor coordinates, both-variable naturality, S4/D8 class fusion and the order-21/index-two comparison. Reading alone does not claim completion.

## Corrections and routing notes

The initial tensor-coordinate boundary falsely allowed the particular inclusion tA into B to fail under tensoring. It is split by q_t. The coordinator corrected the text and added the genuine unsplit example 2Z into Z tensor Z/2. Both corrected passages were reread and accepted. The original finding remains in the retained review evidence.

The regular-multiplier citation now identifies the semisimple and right-multiplier arguments directly. The classical/tensor comparison and order-21 reading citations now distinguish their primary induction theorem from the original calculations. The S5/A4 column citation was also checked after its correction. The diagnostic phrase norm four now says squared norm four consistently in its lesson, guide and metadata.

The concrete D8 method joins T60 and T64. It does not discharge a multiplicity-matrix obligation in T66. T66 retains the S5/A4 and S4/D8 teaching and joins the exact S4/C3 exercise method. The E20 D8 restriction method joins T49 in the consolidated ledger. The induced-degree and induced-norm methods point to the actual identity-trace and Cauchy-Schwarz passages, rather than the unrelated start of a product proof. T59 explicitly includes the classical/tensor comparison. Transitivity is recorded under T58.

## Primary references and scope

The semisimple complement and right-multiplier argument is supported by tom Dieck's Theorem 1.9.2 and the proof of Proposition 3.1.1. His Section 4.1 gives the coset construction, Frobenius universal property, transitivity, tensor identity and induced trace. Section 4.2 gives the normal-subgroup norm criterion. These field-based statements were checked against the displayed left-module formulas. The ring-general claims were also verified directly from balancing and inverse maps. [Tammo tom Dieck, Representation Theory](https://math.uchicago.edu/~margalit/repthy/tomDieck%20Representation%20Theory.pdf).

CT Sections 14 and 15 support the finite-dimensional complex function model, induced trace and multiplicity reciprocity, specifically Theorem 15.4, Theorem 15.7 and Corollary 15.9. The numerical subgroup matrices and order-21 table were independently calculated. [CT, Representation Theory, Lent 2005](https://math.berkeley.edu/~teleman/math/RepThry.pdf).

Naturality was checked in both variables against the Hom-bijection definition. The ungraded tensor-Hom statement uses right modules, so its citation does not replace the explicit left-module checks. [Stacks Definition 4.24.1](https://stacks.math.columbia.edu/tag/0037), [Stacks Lemma 22.30.3](https://stacks.math.columbia.edu/tag/09LN).

Etingof and coauthors Section 4.9 calls the induced-character trace formula the Mackey formula. Its function convention changes the direction of the conjugator, with the full-group sums agreeing after inversion of the summation variable. That section was not used as authority for restriction-of-induction decomposition. [Introduction to representation theory, July 2010](https://math.uchicago.edu/~margalit/repthy/Etingof%20et%20al.pdf).

## Final integration check

The final gate removed exactly twenty-three provisional topic-number aliases from the sixteen assigned constructions lessons. Canonical lesson IDs, titles and remaining title aliases are preserved. Current canonical topic obligations and all seven E21 method rows match the previously accepted rows.

The reviewer restored only each old alias array from the reviewer-owned teaching snapshots and recomputed every topic digest against the current five catalogues and full seventy-four-method ledger. All thirteen results exactly reproduced the previously signed bindings. This independently proves that all other bound lesson fields, guides, metadata, containing units, capstones, obligations and related methods are unchanged. The alias cleanup is accepted and the full-record bindings below are refreshed. No mathematics was inferred from the coordinator's delta description.

## Bound review rows

The digest call loaded all five current catalogues, lessons, guides, metadata, units and capstones. It received the final full ledger of seventy-four exercise methods. Each digest binds its full linked records and containing units, not just the displayed excerpts. Every consolidated topic and method row matched this reviewer's proposed slice before binding. There are no open mathematical findings in this partition.

| Accepted topic | Content digest                                                     |
| -------------- | ------------------------------------------------------------------ |
| T57            | `2229991b0a9321c374d1e5f1bfd9f2a6242a179e1d6ea6e818e4c99519d20864` |
| T58            | `ba34aaade1ceb1d1680f14b8a584a639952df90915f368711dd19599e95b96e2` |
| T59            | `d661fc4fddb4087b573f4deb8844055c5b816a16c663b243a681b9c18f378de3` |
| T60            | `7379c347e3b77bd9f20d9c80829a6abeac252ce1a77f55d97e9b07d8481aea1d` |
| T61            | `7169790a172516ffda344a5077827c070472d0e4ef34bc8704872dba61c1ae74` |
| T62            | `47008ac457d3ce7b80569b547d1eacdcef17befe86367d192bb4ce0420f7a8ab` |
| T63            | `5f9fdc97b6303f18405b427325ff76db783b59308b8807ffbbf8030d3afb6347` |
| T64            | `f7fa75fccec4bc00cfe15ceb424bfab14ab361b74f3300c66579ca7e477a37b8` |
| T65            | `b97bc2901105714ad73d50355416aa9931c7c01ebbeffb2863cfd8b9dcb3ecd8` |
| T66            | `6cf86e0fcde57c228c14590cfed590ae0d191eac88c1091506a2de873242246d` |
| T67            | `690c215d6c07012a793547da4001ffc3d82a2698e17024f31533e7bf71121508` |
| T68            | `93bea02e239f42ad138abf346ae1b8c6d7093dfb36f1969460cf57ba8c7d1b0f` |
| T69            | `ab84f1868269acc8dd2be2ff25aff2b2f655e4629bde91d16b0b0bf23147d060` |

| Reviewed method                                      | Exact topic joins |
| ---------------------------------------------------- | ----------------- |
| `E21-concrete-d8-induced-basis-trace-irreducibility` | T60, T64          |
| `E21-s4-c3-restriction-and-induction-matrices`       | T66               |
| `E21-induced-degree-formula`                         | T64, T68          |
| `E21-tensor-induction-product-identity`              | T68               |
| `E21-order21-induced-rows`                           | T67               |
| `E21-induced-squared-multiplicity-bound`             | T68               |
| `E21-normal-index-two-induction-alternatives`        | T69               |

Application execution, browser layout, native authentication, account isolation, progress persistence, release behavior and deployment were outside this mathematical review and remain unverified. The review makes no claim of unaided learner mastery or external completion.
