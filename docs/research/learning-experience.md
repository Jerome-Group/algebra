# Learning experience: evidence and decisions

Issue: #75. Existing curriculum: 150 stable concepts; no additional syllabus.

## Research actually performed

- [Freeman et al., PNAS 2014](https://www.pnas.org/doi/10.1073/pnas.1319030111): read the primary article's results, discussion and methods. The 225 undergraduate STEM comparisons concern classroom interventions of varied intensity, not this application. The paper cannot identify the best interaction type or prescribe an app-specific effect size. Decision: ask learners to predict, investigate and explain; do not advertise measured learning gains.
- [Roediger and Karpicke, Psychological Science 2006](https://learninglab.psych.purdue.edu/downloads/2006/2006_Roediger_Karpicke_PsychSci.pdf): accessed the seven-page author-hosted paper and inspected both experiments, delayed versus immediate results, and discussion. Prose recall after a delay benefited from retrieval; immediate performance favored additional study. Decision: support voluntary proof reconstruction, then reveal justified steps. Extrapolation to abstract-algebra proof writing is a design hypothesis; recognition questions are not a certificate of proof mastery.
- [Chi et al., technical report 1987](https://files.eric.ed.gov/fulltext/ED296291.pdf), precursor to the [1989 paper](https://doi.org/10.1207/s15516709cog1302_1): accessed the 61-page primary report and inspected methods, explanation coding, monitoring and discussion. Eight participants, post-hoc grouping and mechanics tasks limit causal/general claims. Decision: prompt the hypothesis, object and justification at each proof step; identify the failed assumption in counterexamples. This application has not undergone a student study.
- [3Blue1Brown, Groups and Monsters](https://www.3blue1brown.com/lessons/groups-and-monsters/): inspected the creator's lesson, including symmetries, composition and different realizations of a group. Decision: begin with an existing square-symmetry concept, connecting a manipulable labelled square to a permutation and presentation. Artwork and prose were not copied; further topics in that precedent were not added.
- [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html): inspected the primary explanations. Decision: test prose at 320 CSS pixels, preserve contained two-dimensional mathematics, use generous controls and visible focus, and remove nonessential motion under reduced-motion preferences. Automated axe checks and manual inspection do not constitute full WCAG certification.

## Product decisions

The home activity makes the composition law observable immediately. Four vertices carry letters as well as colors. A rotation or vertical reflection updates the same permutation used in the displayed normal form; chronological moves and rightmost-first function composition are distinguished. The invariant square and relations remain visible. It links to the existing dihedral lesson.

Every lesson keeps its full reading available. A six-stage compass moves focus to definitions, examples, assumptions, proof, practice and connections. Proof steps are initially visible; reconstruction is optional. Prerequisite and dependent links expose why an idea belongs in the route. No click, visit or proof reveal awards a competency.

Complementary existing models are retained: spatial square/cube motions, permutation images, matrices, orbit/stabilizer data, invariant subspaces, characters, quotient representatives and arithmetic tables. The redesign does not replace exact models with decorative animation. The finite-model scope and mathematical hypotheses remain alongside each lab. Different views need not be duplicated for a concept where they add no mathematical information.

The reading surface uses restrained blue/teal cards, readable prose, generous spacing and a dark persistent navigation bar. Examples, assumption boundaries and proof moves have distinct headings as well as colors. At narrow widths the reading and experiment stack; controls remain keyboard reachable.

## Verified baseline and limits

The production site initially exposed 143 lessons. All 143 were opened in the in-app browser. The repository baseline `acb8486` contains 150; an immutable checkout and production Worker build supplied the complete fallback. All 150 were then opened in-app, with fresh DOM snapshots and checks for heading, KaTeX errors and page overflow at desktop width. No formula errors or page overflow were observed in that sweep. This is a rendering observation, not a semantic mathematics verdict.

The built baseline separately passed 157 browser cases, including all 150 lesson/laboratory routes, native choice/range boundaries, keyboard/touch/mobile observations, navigation, filters, aliases and cross-tab progress. Detailed artifacts are in `outputs/baseline-worker`; outputs are retained as local/CI evidence rather than public lesson content. Missing scaffolding, prerequisite drift and proof-scope defects are recorded in the mathematics audit; a passing baseline UI sweep did not contradict those content defects.

Development-only hydration failures were traced to shared optimized-dependency caches while builds and SSR checks ran concurrently. The development cache now lives separately under `.wrangler/`; release sweeps use a built Worker and its matching static assets. Failed attempts are not counted as inspections.

Private course PDFs were not copied, reopened or newly certified. Retained citations preserve their existing access permissions. Account services are not active in this public deployment; existing device progress, resume and saved square-element keys remain. Exact source identity and public access must be verified again at release.
