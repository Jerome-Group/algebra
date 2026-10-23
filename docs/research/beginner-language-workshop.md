# A finite map before abstract language

The existing guided reader and argument desk already teach and retain proof work. This workshop
gives a beginner a smaller first action: change one arrow, identify the object a symbol names,
translate a quantified sentence, and supply a counterexample. The same map stays visible through
all four moves. The optional first-functions-lesson link provides a way back when notation blocks
reading. Home keeps its separate resume action.

## Mathematical contract

The domain is $X=\{0,1,2\}$. The codomain is either $\{a,b\}$ or $\{a,b,c\}$; every input has
exactly one assigned member of that codomain. There are $2^3+3^3=35$ maps. For this exercise:

- Surjective means $\forall y\in Y\;\exists x\in X:f(x)=y$.
- Injective means $\forall x,x'\in X:x\ne x'\Rightarrow f(x)\ne f(x')$.
- A missing-output witness is a member of the current codomain with no incoming arrow.
- A collision witness contains two distinct inputs with equal assigned outputs.
- The fiber $f^{-1}(\{y\})=\{x\in X:f(x)=y\}$ is a set of inputs, whether or not an inverse function exists.

These definitions follow Richard Hammack’s [Book of Proof, §§2.7, 9.1, 12.1–12.2 and 12.6](https://richardhammack.github.io/BookOfProof/Main.pdf).
The author’s [contents page](https://richardhammack.github.io/BookOfProof/) identifies the sections.
The distinction between domain, codomain and assigned values also appears in [UCL’s MATH0007,
§1.3, Definitions 1.6–1.7](https://www.homepages.ucl.ac.uk/~ucahmto/0007/_book/1-3-functions.html).
The teaching text, map and diagnoses here are original.

Initially $f(0)=f(1)=a$, $f(2)=b$ and $Y=\{a,b,c\}$. Output $c$ witnesses failure of
surjectivity; the pair $0,1$ witnesses failure of injectivity. Removing unused $c$ changes the
function’s declared codomain while preserving its assignments. The resulting function is
surjective and remains noninjective. Removing an in-use $c$ refuses and names every input that
must first be reassigned. Restoring $c$ and assigning distinct outputs gives a bijection.

Exhausting the displayed finite sets settles these properties for this map. A few examples do
not prove a universal statement for an arbitrary function. Correct practice creates no
competency credit, account write or historical argument edition.

## Design reconciliation

Model the Domain puts validity, derived fibers, property checks and witness diagnosis in one
pure reducer. Its codomain union excludes invalid stored maps. Type System Discipline parses
untrusted control actions at that boundary and validates URL return lessons against the existing
catalogue. A map edit clears selections and checked feedback.

Experience First keeps a compact move strip, map and reading area within the existing Concepts
shell. There is no additional side rail. Narrow layouts stack the map and reading area. Native
selects, radios and buttons supply the same operations as the diagram, with a labelled exact
assignment table.

The shared math renderer adds only optional `focusable={false}`. Existing callers retain its
default focusability, rendering, TeX parsing and MathML output. New native buttons and the
decorative diagram use that option to avoid nested tab stops. Explicit accessible names prevent
duplicate KaTeX visual and MathML text in button names.

Prove It Works is split deliberately. `tests/beginner.test.mjs` checks all 35 maps against
independent quantified definitions, every output and ordered pair witness, transition refusals,
stale-feedback invalidation and navigation parsing. `tests/browser/beginner.spec.mjs` drives the
four moves, history and return links, temporary practice, native keyboard controls, mathematical
rendering and 320–1440 pixel layouts. The feature registry names these journeys; source-map
presence alone claims no execution. Independent mathematical and browser review belongs to the
release evidence, not to this implementation rationale.
