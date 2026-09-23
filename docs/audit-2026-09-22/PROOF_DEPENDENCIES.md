# Artinian and Nakayama proof order

The companion `proof_dependencies.json` is the checked dependency graph. An
edge points from a result to a result it needs. The graph deliberately labels
radical nilpotence and local decomposition as **imported theorems**; the
compact reference lessons do not claim to prove them.

For a commutative unital Artinian ring, DCC is the starting condition.
Using the imported radical-nilpotence and local-decomposition theorems, the
finite radical filtration has Artinian residue-field layers. An Artinian
vector space is finite-dimensional, hence Noetherian. The submodule–quotient
lemma and finitely many local factors then give Artinian ⇒ Noetherian.

Nakayama has a separate proof: for a **finitely generated** module, a minimal
generating set and the fact that `1-r` is a unit for `r∈J(R)` give the
contradiction. Its proof does not use Artinian ⇒ Noetherian. In particular,
the radical-nilpotence step must never cite this finite-generation argument
without an independent finite-generation premise. The example
`ℚ=3ℚ` over `ℤ_(3)` shows why finite generation cannot be dropped.
