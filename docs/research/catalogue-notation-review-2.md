# Semantic review 2 — complete slice; corrections required

Reviewer: independent GPT-6.1-Sol, xhigh, 23 October 2026. Exclusive packets 016–030, indices 3750–7499. Frozen proposal remains UNACCEPTED.

Read all **3,750 exact source/presentation pairs**, including all **4,748 listed occurrences**. Original presentations were read through a compact lossless projection: full source plus every raw→TeX substitution, each occurrence pointer, nearest question/example title and owner objects. Repeated contexts were deduplicated by reference, never omitted. Metadata-heavy shared entries were reread in bounded chunks after tool-output truncation. Included **1,337 proposed texts / 2,870 spans**, **2,413 unannotated texts**, **1,049 texts containing existing math**, and **1,262 texts containing standalone a/A/I**. These are actual read counts, not scanner approval.

Read all **321 full corrected presentations** after authoring. This second reading caught and removed two accidental article spans, restored cyclic C2 after an overbroad complex-field substitution, and joined adjacent conjugate spans to avoid accidental double-dollar delimiters. The before/after packet retains all 321 with source, exact spans, queue IDs and every occurrence.

## Immutable bindings

Proposal digest, SHA256(JSON.stringify(manifest)): `7f65da677c52139ac7931379fb1a69748e292b701b173f600b58301645d4498a`.

Frozen proposal file byte SHA256: `1dab347e5b62b819c01bd901750ab2a105f07735ddb9437336add08b11a4ba18`.

| Complete canonical source | Full-byte SHA256 |
| --- | --- |
| lib/algebra/lessons.json | 5f12e02001cdb65591ef5437ed0279cf2f750b4490a930e4af2ad01cc1274d74 |
| lib/algebra/guided-lessons.json | 6d727041580ad0be7891013926222ff8607e07e291ac6845ac1e82a6932911db |
| lib/algebra/units.json | 622452df05bafd77af27ab9ad3f5ae4427d88bf1d391b88dc547a3981ee90bf4 |
| lib/algebra/capstone-assessments.json | f9c562ddd4c9f6b22ac7ab2ed83b86e9980ca8f12cc73736581e0ab5135dbc84 |

All four current source hashes and every assigned packet hash independently matched the frozen index.

| Packet | Read texts | Read occurrences | Full packet SHA256 |
| --- | ---: | ---: | --- |
| packet-016.json | 250 | 259 | ea4d199791b34b13d2fc5e0fa71edde1a749ac48bd8572eeccd428df8529b46a |
| packet-017.json | 250 | 255 | bd14a61d7d383b665ba371315a0dd14bde3272b7b78234289c56f84af1a1898e |
| packet-018.json | 250 | 263 | d43e88b3d081b217e8b0085f420c6da7505538250a49d2f6fbf7349bbc8c3604 |
| packet-019.json | 250 | 252 | bb4731c90c214fb163c01e7257db621bf647d7cfa25c154a649a6b6ee02f824c |
| packet-020.json | 250 | 253 | 7c61fa6d2e5e2afd14d639ce45781457c365208574a090ef2e87da2d0b5a4a07 |
| packet-021.json | 250 | 253 | 471284f75fa3410895d9115f629530d49c4a866f3b9a9550d591e49274fbc88f |
| packet-022.json | 250 | 307 | 3799b6abd5f4a193c790680c21e6ea928dcfe451798fef3b0f47d98fa1d0dfbc |
| packet-023.json | 250 | 250 | 2bbfd93f4b98744629ae87d608f796e30538778d52a317ff4f23adb47869f010 |
| packet-024.json | 250 | 270 | 6fbd585a4ff81fe3307a0a540d5e77a32bf8361bc0b4cce96cf6cbc264564f32 |
| packet-025.json | 250 | 250 | c93b1e5f72fdf9af6edcaf4b2c18e556bbd91a6b73f48fddc1c6c5935bf340cd |
| packet-026.json | 250 | 255 | baa4a95d80192edccd30f15ee3ab4477db7b42a98279f29c3755b46bfd5e543b |
| packet-027.json | 250 | 808 | a81fa5b8e62bf7081c21644915c021c570c84cf2e7108cad4b30a57d658dd205 |
| packet-028.json | 250 | 435 | 02f8e4a58f103839002d76e115a65ffc69d9bea521d2bfdbeba83bb2fcd26714 |
| packet-029.json | 250 | 327 | dcd9be47a5f12586641927f7ee77811c7eb0ef3501190faa8ce2f71ae7eac620 |
| packet-030.json | 250 | 311 | b9d46ab05cd364124899eb15d9427630af38f63b0d6a51c360a9b454df613197 |

Ordered reviewed queue-ID digest, SHA256(JSON.stringify(ids)): `52d04c7f3cf147ca63ff0071b53abae5cc286e8750fdaf2eadabcbd745293f07`.

Ordered listed-occurrence digest, SHA256(JSON.stringify(flattenedOccurrences)): `1f50d46df303c1a8844d77da65cd22c7bd23acce580cd2e88c6bc895367ababa`.

## Disposition

**Reject the frozen proposal as submitted.** Supply **321 full replacement arrays**, affecting **342 occurrences**: **34 additions**, **268 nonempty replacements**, **19 explicit deletions**. Final arrays contain **898 spans**. Intentional deletion indices: 4209, 4210, 4356, 4902, 5975, 6762, 6772, 6773, 6883, 6999, 7162, 7248, 7272, 7340, 7372, 7415, 7450, 7488, 7495.

Empty arrays are output-only merge deletions: remove the old whole annotation before compilation. They are not accepted compiler records; its schema still requires nonempty spans.

Meaning judgments:

- Keep prose articles, possessives, slashes and hyphens outside math: a p-group, A 120-degree turn, order-21, tensor-Hom, Schur’s. Preserve genuine a/A/I identifiers in the same contexts.
- Distinguish contextual Z/Q/C/R and finite fields from other capital letters. C× and F₂× require superscript ×; cyclic C2 remains C₂.
- Preserve labelled short-exact arrows, tensor subscript FH, map directions and actions. In t_i⁻¹ and λ_v⁻¹ inversion belongs outside the index. Left/right module types remain those in the source.
- Restore complete overline scope in column orthogonality and class inner products. Degree squares are d_i² and e_j², not d_(i²) and e_(j²).
- Rotation labels R_θ and R_(−θ) are not multiplication/subtraction; L_± are labels. Hom, SO, PSL and CF remain operator names.
- Add omitted identifiers/products (gN, gM, gW, HrH, bw, gtH, T2, M2(F), T2(F)). Interpret verbal Greek and squared/inverse formulas from actual assessment/example contexts.
- Distractors stay distractors: no wrong normality, faithfulness, tensor-side, inverse-product, multiplicity or field choice was made true. Context supplies meaning, not permission to change answers.

Core validation: merge only this patch into the frozen full proposal, then compileManifest(await readCatalogue(worktree), merged). **Pass: 4,559 records / 4,559 mappings**, exact sources, UTF16/raw offsets, delimiter boundaries, unchanged outside prose and KaTeX parsing. Compact merged-manifest digest: `72e4ce838173697e78180e09896d351039aa7cb5053c3c92ae85984eabb10c22`. No new adjacent-dollar delimiters remain among corrected presentations.

Correction wire byte SHA256: `2ecd10558d752507fa5f3eee42533d2c7931da60f097137a3765c0ab42a8700e`.

Before/after packet byte SHA256: `0ecaf5671713b0b8ae907f593c248ed7762089f1846903fb253ac99f37818582`.

## Separate original-source issues

Five exact texts / six occurrences retain unresolved mathematical notation; one further title has missing whitespace. These are source defects or author decisions, not annotation repairs:

| Queue index | Source and exact problematic notation | Canonical decision |
| --- | --- | --- |
| 5456 | guided-lessons.json /ureca-foundations-conjugate-representation/examples/1/steps/1: “J with J squared -I” | Source wording omits equality. Patch typesets J² and −I without inventing “=”. |
| 6959 | lessons.json /111/explanation and guided-lessons.json /ureca-cyclic-eigenvalues/objects: existing math V\lambda | Eigenspace sentence intends λ-indexed space; existing math renders a product. Review canonical V_λ. |
| 7031 | lessons.json /115/proof: index [$G$:$G_{x}]$ | Malformed existing delimiters/braces. Complete index [G:G_x] needed; annotation cannot cross existing math. |
| 7124 | lessons.json /120/proof: existing $n$⊥ | Complement split across existing delimiter. Remove standalone relation-symbol annotation; canonical n^⊥ needed. |
| 7179 | lessons.json /124/explanation: existing math \chi V | Multiplicity sentence apparently intends χ_V; existing math renders product. Canonical author review needed. |
| 6124 | guided-lessons.json /ureca-theory-alternating-splitting/nonexample/title: “A3-cycle in A5 does not split” | Missing space after article A. Patch avoids erroneous group A₃; source whitespace untouched. |

Known missing quotient-map rule (issue 148) stays separately tracked; not repaired through annotations.

No canonical/product/accepted annotation edits, browser proof, release claim, commits or push. Establishes notation-preservation judgments for this bound slice and reports source issues. Does not certify all original theorem/assessment truth, browser rendering, complete-catalogue acceptance or publication readiness. Parent must independently read and merge corrections before acceptance.
