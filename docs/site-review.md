# Site review disposition — September 2026

Review input: Algebra Site Review Package, assessed against source commit `7018f837f104a2a401d18e16e7709bc00cddb333`. Tracking: [issue #24](https://github.com/Jerome-Group/algebra/issues/24).

## Scope and limits

All 139 supplied entries were assessed. The catalogue now has 143 lessons, including bridges for functions/equivalence, linear algebra, module generators and Cauchy. The site remains a learning companion: advanced entries explicitly distinguish proof sketches, imported theorems and dependencies. It does not claim a complete textbook or complete proofs for every reference entry. Course PDFs and private learning records remain outside Git.

All P0/P1 entries now have a worked illustration and a self-check with a hint and justified answer. This is a bounded first teaching pass, not every exercise or complete chapter expansion proposed in the package. Three ordered routes expose prerequisites; source links support deeper study. The entry table records the actual teaching status rather than treating every suggested expansion as finished.

## Corrections and independent findings

- Corrected module unit implications, tensor handedness, primitive degree boundary and irreducible inflation qualifiers.
- Separated Burnside orbit counting from the solvability theorem. Replaced the real/complex example with a fixed two-dimensional C3 action; added continuous body-diagonal rotation and corrected the plane reflection convention.
- Unified isomorphism theorem notation, made the nilradical lesson explicitly commutative unital, and removed the circular Artinian/Nakayama proof dependency.
- Fixed valid-but-wrong notation as well as malformed formulas. Every authored formula and dynamic laboratory entry is rendered in regression tests.
- Replaced repeated example fallback with an explicit unfinished-example label. Default reading is continuous; examples, proofs, feedback and local conventions stay visible.
- Search includes titles, aliases, explanations and deeper notes, with context snippets. Concept links use anchors; history restores the lesson and heading focus.
- Split diagram, conjugation and coloring laboratories into cohesive modules. Reading views share one typed UI/WebMCP contract.

## Visual and interaction record

- Mobile 320px and 390px: reading precedes the experiment, tabs wrap, and no document horizontal overflow on sampled lessons. Wide display mathematics scrolls within its own region.
- Corrected a field selector squeezed by its adjacent tag; controls now wrap.
- At doubled text size, corrected heading overflow, preserved the chapter number, and contained long inline formulas and hidden MathML. Retested page width at the narrow viewport; restored normal text afterward.
- Tablet 768px: found low-contrast dark conjugacy cards inherited from an earlier theme; changed cards and controls to light surfaces with readable labels.
- Desktop 1440px: retained two-column reading/laboratory layout.
- Keyboard: Concepts focuses search; Escape restores its toggle. Necklace beads respond to Space and update their accessible color labels. Prerequisite navigation and Back restore lesson heading focus.
- Reflow at 720 × 500 (the CSS viewport equivalent of 200% zoom on 1440 × 1000) stays within the document width. This is a reflow check, not a claim of exhaustive assistive-technology testing.
- Route start/next/Back, direct deep-link reload, continuous 45° body-diagonal rotation, complex-field switching and reflection conjugation were exercised in the browser. No browser console errors were recorded.
- Two independent reviews found and resolved remaining isomorphism notation, nilradical hypotheses, projection-fiber feedback and direct-product notation issues. Standards review fixes include strict lab configuration and the shared reading-view contract.

## Automated verification

The package’s exact finite-action verification passes, including cube face coloring counts 10/57 for rotations and 10/56 for full symmetry at two/three colors, and the vertex character decomposition. Repository regression tests cover finite engines, formulas, all laboratories, reflection composition, body-diagonal rotations, C3 dimension/field assumptions, routes and search.

Standalone TypeScript checking retains existing missing Cloudflare runtime type declarations (`cloudflare:workers`, `Fetcher`, `D1Database`); application changes introduce no additional TypeScript errors. Required production build, test, format and lint results are recorded on the PR.

## Entry dispositions

“Worked + feedback” means an actual worked example and hint/answer self-check are present. A proof sketch/imported theorem label is a deliberate boundary; longer source treatments and additional proposed exercises remain further study.

| Review entry                     | Priority | Lesson                           | Delivered teaching status                                                              |
| -------------------------------- | -------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| Group axioms                     | P1       | `mh2220-axioms`                  | Worked + feedback; Complete proof here                                                 |
| Inverses & order                 | P1       | `mh2220-inverse-order`           | Worked + feedback; Proof sketch here                                                   |
| Subgroups                        | P1       | `mh2220-subgroups`               | Worked + feedback; Proof sketch here                                                   |
| Generators                       | P1       | `mh2220-generators`              | Worked + feedback; Proof sketch here                                                   |
| Congruence                       | P1       | `mh2220-congruence`              | Worked + feedback; Proof sketch here                                                   |
| Units & totients                 | P1       | `mh2220-units`                   | Worked + feedback; Proof sketch here                                                   |
| Cycles & composition             | P1       | `mh2220-permutations`            | Worked + feedback; Proof sketch here                                                   |
| Cyclic groups                    | P1       | `mh2220-cyclic`                  | Worked + feedback; Proof sketch here                                                   |
| Permutation matrices             | P0       | `mh2220-permutation-matrices`    | Worked + feedback; Proof sketch here                                                   |
| Parity                           | P1       | `mh2220-alternating`             | Worked + feedback; Proof sketch here                                                   |
| Lagrange                         | P1       | `mh2220-lagrange`                | Worked + feedback; Proof sketch here                                                   |
| Euler & Fermat                   | P1       | `mh2220-euler-fermat`            | Worked + feedback; Proof sketch here                                                   |
| Cayley’s theorem                 | P1       | `mh2220-cayley-embedding`        | Worked + feedback; Proof sketch here                                                   |
| Circle quotient                  | P2       | `mh2220-real-circle`             | Explicit reference entry; example not developed; Proof sketch here                     |
| Polygon symmetries               | P1       | `mh2220-dihedral`                | Worked + feedback; Proof sketch here                                                   |
| Signed permutations              | P2       | `cube-signed-permutations`       | Explicit reference entry; example not developed; Proof sketch here                     |
| Words of motions                 | P2       | `cube-generator-words`           | Explicit reference entry; example not developed; Proof sketch here                     |
| Rotations & diagonals            | P2       | `cube-diagonals-s4`              | Explicit reference entry; example not developed; Proof sketch here                     |
| Orthogonality                    | P1       | `orthogonal-metric-orientation`  | Worked + feedback; Proof sketch here                                                   |
| Plane rotations                  | P0       | `orthogonal-plane`               | Worked + feedback; Proof sketch here                                                   |
| Axis & angle                     | P0       | `orthogonal-axis-angle`          | Worked + feedback; Proof sketch here                                                   |
| Small group orders               | P1       | `mh2220-small-groups`            | Worked + feedback; Proof sketch here                                                   |
| Commutators                      | P1       | `mh2220-commutator`              | Worked + feedback; Proof sketch here                                                   |
| Abelian decomposition            | P1       | `mh2220-finite-abelian`          | Worked + feedback; Theorem imported · proof outline here                               |
| Order eight                      | P2       | `mh2220-quaternion`              | Explicit reference entry; example not developed; Proof sketch here                     |
| Centralizers & normalizers       | P1       | `mh2220-centralizer-normalizer`  | Worked + feedback; Proof sketch here                                                   |
| Actions                          | P1       | `mh2220-actions`                 | Worked + feedback; Proof sketch here                                                   |
| Orbit–stabilizer                 | P1       | `mh2220-orbit-stabilizer`        | Worked + feedback; Complete proof here                                                 |
| Conjugacy                        | P1       | `mh2220-conjugacy`               | Worked + feedback; Proof sketch here                                                   |
| Burnside’s lemma                 | P1       | `mh2220-burnside`                | Worked + feedback; Proof sketch here                                                   |
| Necklaces                        | P1       | `mh2220-necklaces`               | Worked + feedback; Proof sketch here                                                   |
| Cycle index                      | P1       | `mh2220-cycle-index`             | Worked + feedback; Proof sketch here                                                   |
| Solid colorings                  | P1       | `mh2220-solid-colorings`         | Worked + feedback; Proof sketch here                                                   |
| Four cube actions                | P1       | `cube-four-actions`              | Worked + feedback; Proof sketch here                                                   |
| Fix one object                   | P2       | `cube-orbit-stabilizer`          | Explicit reference entry; example not developed; Proof sketch here                     |
| Faithful & transitive            | P1       | `actions-faithful-transitive`    | Worked + feedback; Proof sketch here                                                   |
| Stabilizers & kernels            | P1       | `actions-stabilizer-kernel-core` | Worked + feedback; Proof sketch here                                                   |
| Act on the group                 | P0       | `actions-regular-conjugation`    | Worked + feedback; Proof sketch here                                                   |
| Cube colorings                   | P2       | `actions-cube-burnside`          | Explicit reference entry; example not developed; Proof sketch here                     |
| Cycle structures                 | P2       | `actions-cycle-lenses`           | Explicit reference entry; example not developed; Proof sketch here                     |
| Primitive actions                | P0       | `actions-primitive`              | Worked + feedback; Complete proof here                                                 |
| Frobenius groups                 | P2       | `actions-frobenius`              | Worked illustration; Theorem imported · proof roadmap here                             |
| Sylow existence                  | P1       | `mh2220-sylow-existence`         | Worked + feedback; Complete proof here                                                 |
| Sylow conjugacy                  | P1       | `mh2220-sylow-conjugacy`         | Worked + feedback; Complete proof here                                                 |
| Sylow counts                     | P1       | `mh2220-sylow-counts`            | Worked + feedback; Proof sketch here                                                   |
| Composition factors              | P2       | `mh2220-simple-composition`      | Explicit reference entry; example not developed; Theorem imported · proof roadmap here |
| Prime-power groups               | P1       | `mh2220-p-groups`                | Worked + feedback; Proof sketch here                                                   |
| Hall subgroups & complements     | P2       | `group-complements`              | Worked illustration; Theorem imported · proof roadmap here                             |
| Solvable groups                  | P2       | `group-solvable`                 | Worked illustration; Proof sketch here                                                 |
| Nilpotence & Frattini            | P2       | `group-nilpotent`                | Worked illustration; Proof sketch here                                                 |
| Burnside’s solvability theorem   | P0       | `characters-burnside`            | Worked + feedback; Theorem imported · proof roadmap here                               |
| Finite matrices                  | P1       | `mh2220-finite-matrices`         | Worked + feedback; Proof sketch here                                                   |
| General linear groups            | P1       | `odyssey-linear-groups`          | Worked + feedback; Proof sketch here                                                   |
| Flags                            | P2       | `odyssey-flags`                  | Explicit reference entry; example not developed; Proof sketch here                     |
| Bruhat decomposition             | P2       | `linear-bruhat`                  | Worked illustration; Proof sketch here                                                 |
| Projective special linear groups | P2       | `linear-projective`              | Worked illustration; Theorem imported · proof roadmap here                             |
| Homomorphisms                    | P1       | `mh2220-homomorphism`            | Worked + feedback; Proof sketch here                                                   |
| Isomorphisms                     | P1       | `mh2220-isomorphism`             | Worked + feedback; Proof sketch here                                                   |
| First isomorphism theorem        | P1       | `mh2220-first-isomorphism`       | Worked + feedback; Proof sketch here                                                   |
| Second isomorphism theorem       | P1       | `mh2220-second-isomorphism`      | Worked + feedback; Proof sketch here                                                   |
| Third isomorphism theorem        | P1       | `mh2220-third-isomorphism`       | Worked + feedback; Proof sketch here                                                   |
| Correspondence                   | P1       | `mh2220-correspondence`          | Worked + feedback; Proof sketch here                                                   |
| Ring maps                        | P1       | `m3220-ring-hom`                 | Worked + feedback; Proof sketch here                                                   |
| Ring isomorphisms                | P1       | `m3220-first-ring-isomorphism`   | Worked + feedback; Proof sketch here                                                   |
| Ring correspondence              | P1       | `m3220-ring-correspondence`      | Worked + feedback; Proof sketch here                                                   |
| Linear isomorphism theorem       | P1       | `linear-quotient`                | Worked + feedback; Proof sketch here                                                   |
| Cosets                           | P1       | `mh2220-cosets`                  | Worked + feedback; Proof sketch here                                                   |
| Normality                        | P1       | `mh2220-normal`                  | Worked + feedback; Proof sketch here                                                   |
| Quotient groups                  | P1       | `mh2220-quotient`                | Worked + feedback; Proof sketch here                                                   |
| Automorphisms                    | P2       | `mh2220-automorphism`            | Explicit reference entry; example not developed; Proof sketch here                     |
| Semidirect products              | P1       | `mh2220-semidirect`              | Worked + feedback; Proof sketch here                                                   |
| Coset actions                    | P1       | `mh2220-coset-action`            | Worked + feedback; Proof sketch here                                                   |
| Double cosets                    | P2       | `mh2220-double-cosets`           | Explicit reference entry; example not developed; Proof sketch here                     |
| Quotient rings                   | P1       | `m3220-quotient-ring`            | Worked + feedback; Proof sketch here                                                   |
| Direct products                  | P1       | `mh2220-direct-product`          | Worked + feedback; Proof sketch here                                                   |
| Chinese remainders               | P1       | `m3220-crt`                      | Worked + feedback; Proof sketch here                                                   |
| Rotation & inversion             | P2       | `cube-direct-product`            | Explicit reference entry; example not developed; Proof sketch here                     |
| Extensions & cocycles            | P2       | `group-extensions`               | Worked illustration; Proof sketch here                                                 |
| Ring axioms                      | P1       | `m3220-rings`                    | Worked + feedback; Proof sketch here                                                   |
| Subrings                         | P1       | `m3220-subrings`                 | Worked + feedback; Proof sketch here                                                   |
| Units & zero divisors            | P1       | `m3220-units`                    | Worked + feedback; Proof sketch here                                                   |
| Domains & fields                 | P1       | `m3220-domains`                  | Worked + feedback; Proof sketch here                                                   |
| Ideals                           | P1       | `m3220-ideals`                   | Worked + feedback; Proof sketch here                                                   |
| Ideal arithmetic                 | P1       | `m3220-ideal-arithmetic`         | Worked + feedback; Proof sketch here                                                   |
| Maximal ideals                   | P1       | `m3220-maximal`                  | Worked + feedback; Proof sketch here                                                   |
| Prime ideals                     | P1       | `m3220-prime`                    | Worked + feedback; Proof sketch here                                                   |
| Jacobson radical                 | P1       | `m3220-jacobson`                 | Worked + feedback; Proof sketch here                                                   |
| Quadratic integers               | P2       | `m3220-quadratic-integers`       | Explicit reference entry; example not developed; Proof sketch here                     |
| Norm & trace                     | P2       | `m3220-norm-trace`               | Explicit reference entry; example not developed; Proof sketch here                     |
| Fractions                        | P1       | `m3220-fractions`                | Worked + feedback; Proof sketch here                                                   |
| Euclidean domains                | P1       | `m3220-euclidean`                | Worked + feedback; Proof sketch here                                                   |
| Gaussian division                | P1       | `m3220-gaussian-division`        | Worked + feedback; Proof sketch here                                                   |
| Principal ideals                 | P1       | `m3220-pid`                      | Worked + feedback; Proof sketch here                                                   |
| Prime & irreducible              | P1       | `m3220-prime-irreducible`        | Worked + feedback; Proof sketch here                                                   |
| Unique factorisation             | P1       | `m3220-ufd`                      | Worked + feedback; Proof sketch here                                                   |
| Localisation                     | P1       | `m3220-localization`             | Worked + feedback; Proof sketch here                                                   |
| Localise at a prime              | P1       | `m3220-prime-localization`       | Worked + feedback; Proof sketch here                                                   |
| Other localisations              | P2       | `m3220-localization-variants`    | Explicit reference entry; example not developed; Proof sketch here                     |
| Noetherian rings                 | P1       | `m3220-noetherian`               | Worked + feedback; Proof sketch here                                                   |
| Hilbert’s basis theorem          | P2       | `m3220-hilbert`                  | Explicit reference entry; example not developed; Theorem imported · proof roadmap here |
| Krull dimension                  | P2       | `m3220-krull`                    | Explicit reference entry; example not developed; Theorem imported · proof roadmap here |
| Nilradical                       | P1       | `m3220-nilradical`               | Worked + feedback; Theorem imported · proof dependencies                               |
| Artinian rings                   | P2       | `m3220-artinian`                 | Explicit reference entry; example not developed; Proof sketch here                     |
| Local decomposition              | P2       | `m3220-artinian-decomposition`   | Explicit reference entry; example not developed; Theorem imported · proof roadmap here |
| Discrete valuations              | P2       | `m3220-dvr`                      | Explicit reference entry; example not developed; Proof sketch here                     |
| Characteristic                   | P1       | `m3220-characteristic`           | Worked + feedback; Proof sketch here                                                   |
| Algebraic extensions             | P1       | `m3220-algebraic`                | Worked + feedback; Proof sketch here                                                   |
| Four-element field               | P1       | `m3220-finite-field-four`        | Worked + feedback; Proof sketch here                                                   |
| Quadratic quotient rings         | P1       | `quadratic-quotient`             | Worked + feedback; Proof sketch here                                                   |
| Coefficient data                 | P1       | `m3220-polynomial`               | Worked + feedback; Proof sketch here                                                   |
| Division                         | P1       | `m3220-polynomial-division`      | Worked + feedback; Proof sketch here                                                   |
| Roots & multiplicity             | P1       | `m3220-roots`                    | Worked + feedback; Proof sketch here                                                   |
| Irreducibility                   | P1       | `m3220-irreducibility-tests`     | Worked + feedback; Proof sketch here                                                   |
| Gauss’s lemma                    | P1       | `m3220-gauss`                    | Worked + feedback; Proof sketch here                                                   |
| Eisenstein                       | P1       | `m3220-eisenstein`               | Worked + feedback; Proof sketch here                                                   |
| Polynomial factorisation         | P1       | `m3220-polynomial-ufd`           | Worked + feedback; Proof sketch here                                                   |
| Nakayama                         | P1       | `m3220-nakayama`                 | Worked + feedback; Proof sketch here                                                   |
| Module axioms                    | P0       | `m3220-modules`                  | Worked + feedback; Proof sketch here                                                   |
| Submodules & quotients           | P1       | `m3220-submodules`               | Worked + feedback; Proof sketch here                                                   |
| Maps & annihilators              | P1       | `m3220-annihilator`              | Worked + feedback; Proof sketch here                                                   |
| Module chains                    | P2       | `m3220-module-chains`            | Explicit reference entry; example not developed; Proof sketch here                     |
| Linear actions                   | P1       | `ureca-linear-action`            | Worked + feedback; Proof sketch here                                                   |
| Permutation modules              | P1       | `ureca-permutation-module`       | Worked + feedback; Proof sketch here                                                   |
| Invariant subspaces              | P1       | `ureca-invariant-subspaces`      | Worked + feedback; Proof sketch here                                                   |
| Intertwiners                     | P1       | `ureca-intertwiners`             | Worked + feedback; Proof sketch here                                                   |
| Cyclic eigenvalues               | P1       | `ureca-cyclic-eigenvalues`       | Worked + feedback; Proof sketch here                                                   |
| Schur’s lemma                    | P1       | `odyssey-schur`                  | Worked + feedback; Proof sketch here                                                   |
| Character tables                 | P0       | `odyssey-character-table`        | Worked + feedback; Proof sketch here                                                   |
| Induction                        | P2       | `odyssey-induction`              | Explicit reference entry; example not developed; Proof sketch here                     |
| Frobenius reciprocity            | P2       | `odyssey-frobenius`              | Explicit reference entry; example not developed; Proof sketch here                     |
| Square modes                     | P1       | `representations-square-modes`   | Worked + feedback; Proof sketch here                                                   |
| Real & complex                   | P0       | `representations-real-complex`   | Worked + feedback; Complete proof here                                                 |
| Maschke                          | P1       | `representations-maschke`        | Worked + feedback; Proof sketch here                                                   |
| Traces & characters              | P1       | `representations-characters`     | Worked + feedback; Proof sketch here                                                   |
| Integrality & character degrees  | P2       | `characters-integrality`         | Worked illustration; Theorem imported · proof roadmap here                             |
| Group algebras                   | P1       | `ureca-group-algebra`            | Worked + feedback; Proof sketch here                                                   |
| Tensor products & duals          | P0       | `tensor-products`                | Worked + feedback; Proof sketch here                                                   |
| Wedderburn decomposition         | P2       | `algebra-wedderburn`             | Worked illustration; Theorem imported · proof roadmap here                             |
| Radicals & module layers         | P2       | `algebra-radical`                | Worked illustration; Proof sketch here                                                 |
