import type { Lesson } from "@/lib/algebra/engine";
import catalogue from "@/lib/algebra/lessons.json";
import { presentCatalogueText } from "@/lib/algebra/math-presentation.generated";

type ContextLesson = Pick<
  Lesson,
  | "id"
  | "title"
  | "source"
  | "definition"
  | "explanation"
  | "theorem"
  | "proof"
  | "worked"
>;
type SourceField =
  | "definition"
  | "explanation"
  | "theorem"
  | "proof"
  | "worked.steps[0]"
  | "worked.steps[1]";
type SourceBinding = { lessonId: string; field: SourceField; expected: string };
type BoundContext = {
  body: string;
  sources: readonly [SourceBinding, ...SourceBinding[]];
} & (
  | { kind: "math" | "prose" | "convention" }
  | { kind: "specialization"; note: string }
);

const selected: Readonly<Record<string, readonly BoundContext[]>> = {
  "ureca-foundations-direct-sum-maps": [
    {
      kind: "convention",
      body: "Use $C_2=\\langle s\\mid s^2=e\\rangle$ on $\\mathbb C^2$, with $S(x,y)=(y,x)$ representing $s$. Let $I$ be the identity. Then $U_+=\\mathbb C(1,1)$ and $U_-=\\mathbb C(1,-1)$ are the two invariant lines.",
      sources: [
        {
          lessonId: "ureca-foundations-direct-sum-maps",
          field: "worked.steps[0]",
          expected:
            "Over $\\mathbb C$, $(x,y)=\\frac{x+y}{2}(1,1)+\\frac{x-y}{2}(1,-1)$. Thus $\\mathbb C^2=U_+\\oplus U_-$ for the two swap eigenlines.",
        },
        {
          lessonId: "ureca-foundations-direct-sum-maps",
          field: "worked.steps[1]",
          expected:
            "The projections are $(I+S)/2$ and $(I-S)/2$. They commute with $S$, square to themselves, have zero product and sum to $I$.",
        },
      ],
    },
  ],
  "ureca-foundations-order-eighteen": [
    {
      kind: "math",
      body: "A=\\operatorname{diag}(\\alpha,\\alpha^{-1}),\\ B=\\operatorname{diag}(\\beta,\\beta^{-1}),\\ S=\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix},\\quad\\alpha^3=\\beta^3=1",
      sources: [
        {
          lessonId: "ureca-foundations-order-eighteen",
          field: "theorem",
          expected:
            "A=\\operatorname{diag}(\\alpha,\\alpha^{-1}),\\ B=\\operatorname{diag}(\\beta,\\beta^{-1}),\\ S=\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix},\\quad\\alpha^3=\\beta^3=1",
        },
      ],
    },
  ],
  "ureca-foundations-commutants": [
    {
      kind: "prose",
      body: "For $D_8$, take $R=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}$ and $S=\\operatorname{diag}(1,-1)$. They satisfy the finite dihedral relations.",
      sources: [
        {
          lessonId: "ureca-foundations-complement-boundaries",
          field: "worked.steps[0]",
          expected:
            "For $D_8$, take $R=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}$ and $S=\\operatorname{diag}(1,-1)$. They satisfy the finite dihedral relations.",
        },
      ],
    },
  ],
  "ureca-foundations-icosahedral-groups": [
    {
      kind: "prose",
      body: "Put $\\phi=(1+\\sqrt5)/2$ and $a=\\phi^{-1}=\\phi-1$.",
      sources: [
        {
          lessonId: "ureca-foundations-dodecahedral-coordinates",
          field: "explanation",
          expected: "Put $\\phi=(1+\\sqrt5)/2$ and $a=\\phi^{-1}=\\phi-1$.",
        },
      ],
    },
    {
      kind: "prose",
      body: "With column coordinates, the basis images are $Re_1=(a,1,-\\phi)/2$, $Re_2=(-1,\\phi,a)/2$, $Re_3=(\\phi,a,1)/2$. These form the three columns of $R=\\frac12\\begin{pmatrix}a&-1&\\phi\\\\1&\\phi&a\\\\-\\phi&a&1\\end{pmatrix}$.",
      sources: [
        {
          lessonId: "ureca-foundations-icosahedral-groups",
          field: "proof",
          expected:
            "With column coordinates, the basis images are $Re_1=(a,1,-\\phi)/2$, $Re_2=(-1,\\phi,a)/2$, $Re_3=(\\phi,a,1)/2$. These form the three columns of $R=\\frac12\\begin{pmatrix}a&-1&\\phi\\\\1&\\phi&a\\\\-\\phi&a&1\\end{pmatrix}$.",
        },
      ],
    },
  ],
  "ureca-theory-tetrahedron-displacement-character": [
    {
      kind: "prose",
      body: "Four identical point masses $m>0$ have equilibrium positions $r_1=a(1,1,1)$, $r_2=a(1,-1,-1)$, $r_3=a(-1,1,-1)$ and $r_4=a(-1,-1,1)$, where $a>0$.",
      sources: [
        {
          lessonId: "ureca-theory-tetrahedron-spring-model",
          field: "explanation",
          expected:
            "Four identical point masses $m>0$ have equilibrium positions $r_1=a(1,1,1)$, $r_2=a(1,-1,-1)$, $r_3=a(-1,1,-1)$ and $r_4=a(-1,-1,1)$, where $a>0$.",
        },
      ],
    },
  ],
  "ureca-foundations-isotypic-projections": [
    {
      kind: "prose",
      body: "For $D_8$, write its four linear characters as $\\lambda_{a,b}(r)=a$, $\\lambda_{a,b}(s)=b$ with $a,b\\in\\{1,-1\\}$. Their idempotents are $e_{a,b}=\\frac18\\sum_{k=0}^3a^k([r^k]+b[r^ks])$. The remaining degree-two character has values $2$ at $1, -2$ at $r^2$ and zero elsewhere. Hence $e_\\sigma=\\frac12([1]-[r^2])$.",
      sources: [
        {
          lessonId: "ureca-foundations-isotypic-projections",
          field: "proof",
          expected:
            "For $D_8$, write its four linear characters as $\\lambda_{a,b}(r)=a$, $\\lambda_{a,b}(s)=b$ with $a,b\\in\\{1,-1\\}$. Their idempotents are $e_{a,b}=\\frac18\\sum_{k=0}^3a^k([r^k]+b[r^ks])$. The remaining degree-two character has values 2 at 1, -2 at $r^2$ and zero elsewhere. Hence $e_\\sigma=\\frac12([1]-[r^2])$.",
        },
      ],
    },
    {
      kind: "specialization",
      body: "e_{1,1}=\\frac18\\sum_{g\\in D_8}[g],\\qquad e_\\sigma=\\frac12([1]-[r^2])",
      sources: [
        {
          lessonId: "ureca-foundations-isotypic-projections",
          field: "proof",
          expected:
            "For $D_8$, write its four linear characters as $\\lambda_{a,b}(r)=a$, $\\lambda_{a,b}(s)=b$ with $a,b\\in\\{1,-1\\}$. Their idempotents are $e_{a,b}=\\frac18\\sum_{k=0}^3a^k([r^k]+b[r^ks])$. The remaining degree-two character has values 2 at 1, -2 at $r^2$ and zero elsewhere. Hence $e_\\sigma=\\frac12([1]-[r^2])$.",
        },
      ],
      note: "Set $a=b=1$ in the retained linear-projector formula; use left multiplication on the regular basis.",
    },
  ],
  "ureca-constructions-binary-tetrahedral": [
    {
      kind: "prose",
      body: "Map $a+bi+cj+dk$ to $\\begin{pmatrix}a+bi&c+di\\\\-c+di&a-bi\\end{pmatrix}$. Direct multiplication respects quaternion multiplication and determinant is $a^2+b^2+c^2+d^2=1$. This constructs an actual degree-two module of character $\\delta=2a$.",
      sources: [
        {
          lessonId: "ureca-constructions-binary-tetrahedral",
          field: "proof",
          expected:
            "Map $a+bi+cj+dk$ to $\\begin{pmatrix}a+bi&c+di\\\\-c+di&a-bi\\end{pmatrix}$. Direct multiplication respects quaternion multiplication and determinant is $a^2+b^2+c^2+d^2=1$. This constructs an actual degree-two module of character $\\delta=2a$.",
        },
      ],
    },
    {
      kind: "prose",
      body: "For $\\chi=\\delta\\lambda$, symmetric square is $\\eta\\lambda^2=\\eta$, because $\\eta$ vanishes off $Q_{8}$. Exterior square is the nontrivial linear row $\\lambda^2$. Thus both squares are irreducible in this twisted example.",
      sources: [
        {
          lessonId: "ureca-constructions-binary-tetrahedral",
          field: "proof",
          expected:
            "For $\\chi=\\delta\\lambda$, symmetric square is $\\eta\\lambda^2=\\eta$, because $\\eta$ vanishes off Q8. Exterior square is the nontrivial linear row $\\lambda^2$. Thus both squares are irreducible in this twisted example.",
        },
      ],
    },
  ],
  "ureca-constructions-s4-tensors": [
    {
      kind: "math",
      body: "V\\otimes V\\cong1\\oplus V\\oplus Q\\oplus(\\varepsilon\\otimes V),\\quad S^2V\\cong1\\oplus V\\oplus Q,\\quad\\Lambda^2V\\cong\\varepsilon\\otimes V.",
      sources: [
        {
          lessonId: "ureca-constructions-s4-tensors",
          field: "theorem",
          expected:
            "V\\otimes V\\cong1\\oplus V\\oplus Q\\oplus(\\varepsilon\\otimes V),\\quad S^2V\\cong1\\oplus V\\oplus Q,\\quad\\Lambda^2V\\cong\\varepsilon\\otimes V.",
        },
      ],
    },
  ],
  "ureca-constructions-adjunction-naturality": [
    {
      kind: "prose",
      body: "Let $A=R[H]\\subseteq B=R[G]$ for an associative unital ring $R$, finite $G$ and subgroup $H$. Let $V$ be a unital left $A$-module and $W$ a unital left $B$-module. Restriction gives $W$ the $A$ action through inclusion. Both $\\operatorname{Hom}$ sets below consist of module maps. For noncommutative $R$ the resulting isomorphism is always an isomorphism of abelian groups, without an unasserted $R$-module structure.",
      sources: [
        {
          lessonId: "ureca-constructions-induction-adjunction",
          field: "explanation",
          expected:
            "Let $A=R[H]\\subseteq B=R[G]$ for an associative unital ring R, finite G and subgroup H. Let V be a unital left A-module and W a unital left B-module. Restriction gives W the A action through inclusion. Both Hom sets below consist of module maps. For noncommutative R the resulting isomorphism is always an isomorphism of abelian groups, without an unasserted R-module structure.",
        },
      ],
    },
    {
      kind: "math",
      body: "\\Phi:\\operatorname{Hom}_B(B\\otimes_AV,W)\\longrightarrow\\operatorname{Hom}_A(V,\\operatorname{Res}W),\\quad\\Phi(F)(v)=F(1\\otimes v).",
      sources: [
        {
          lessonId: "ureca-constructions-induction-adjunction",
          field: "definition",
          expected:
            "\\Phi:\\operatorname{Hom}_B(B\\otimes_AV,W)\\longrightarrow\\operatorname{Hom}_A(V,\\operatorname{Res}W),\\quad\\Phi(F)(v)=F(1\\otimes v).",
        },
      ],
    },
  ],
  "ureca-constructions-class-fusion": [
    {
      kind: "prose",
      body: "In the $D_{8}$ subgroup of $S_{4}$ fixed in the preceding matrix lesson, class fusion yields $(\\operatorname{Ind}f)(1)=3f(1)$, $(\\operatorname{Ind}f)(2)=f(s)$, $(\\operatorname{Ind}f)(2^2)=f(r^2)+2f(rs)$, $(\\operatorname{Ind}f)(3)=0$, and $(\\operatorname{Ind}f)(4)=f(r)$.",
      sources: [
        {
          lessonId: "ureca-constructions-class-fusion",
          field: "proof",
          expected:
            "In the D8 subgroup of S4 fixed in the preceding matrix lesson, class fusion yields $(\\operatorname{Ind}f)(1)=3f(1)$, $(\\operatorname{Ind}f)(2)=f(s)$, $(\\operatorname{Ind}f)(2^2)=f(r^2)+2f(rs)$, $(\\operatorname{Ind}f)(3)=0$, and $(\\operatorname{Ind}f)(4)=f(r)$.",
        },
      ],
    },
  ],
  "ureca-constructions-order-twenty-one": [
    {
      kind: "prose",
      body: "Conjugation by $b$ partitions the six nonidentity $a$ powers into exponent orbits $R=\\{1,2,4\\}$ and $N=\\{3,5,6\\}$. These give two classes of size three.",
      sources: [
        {
          lessonId: "ureca-constructions-order-twenty-one",
          field: "proof",
          expected:
            "Conjugation by b partitions the six nonidentity a powers into exponent orbits $R=\\{1,2,4\\}$ and $N=\\{3,5,6\\}$. These give two classes of size three.",
        },
      ],
    },
    {
      kind: "prose",
      body: "The quotient $G/H$ of order three gives $\\mu(a)=1$, $\\mu(b)=\\omega$ and its square. For the $H$ character $\\lambda(a)=\\zeta$, induction has degree three. Normality and the coset trace formula give $\\chi(a^k)=\\zeta^k+\\zeta^{2k}+\\zeta^{4k}$ and zero off $H$.",
      sources: [
        {
          lessonId: "ureca-constructions-order-twenty-one",
          field: "proof",
          expected:
            "The quotient G/H of order three gives $\\mu(a)=1$, $\\mu(b)=\\omega$ and its square. For the H character $\\lambda(a)=\\zeta$, induction has degree three. Normality and the coset trace formula give $\\chi(a^k)=\\zeta^k+\\zeta^{2k}+\\zeta^{4k}$ and zero off H.",
        },
      ],
    },
  ],
  "ureca-foundations-five-cubes": [
    {
      kind: "prose",
      body: "Put $\\phi=(1+\\sqrt5)/2$ and $a=\\phi^{-1}=\\phi-1$.",
      sources: [
        {
          lessonId: "ureca-foundations-dodecahedral-coordinates",
          field: "explanation",
          expected: "Put $\\phi=(1+\\sqrt5)/2$ and $a=\\phi^{-1}=\\phi-1$.",
        },
      ],
    },
  ],
  "ureca-foundations-central-algebra": [
    {
      kind: "convention",
      body: "Use $\\omega=e^{2\\pi i/3}$, so $\\omega\\ne1$ and $1+\\omega+\\omega^2=0$.",
      sources: [
        {
          lessonId: "ureca-foundations-order-eighteen",
          field: "worked.steps[0]",
          expected:
            "Choose $\\alpha=\\omega=e^{2\\pi i/3}$ and $\\beta=1$. The matrices of $a$ and $s$ have no common invariant line.",
        },
      ],
    },
  ],
  "ureca-foundations-character-values": [
    {
      kind: "convention",
      body: "Use $\\omega=e^{2\\pi i/3}$, so $\\omega\\ne1$ and $1+\\omega+\\omega^2=0$.",
      sources: [
        {
          lessonId: "ureca-foundations-order-eighteen",
          field: "worked.steps[0]",
          expected:
            "Choose $\\alpha=\\omega=e^{2\\pi i/3}$ and $\\beta=1$. The matrices of $a$ and $s$ have no common invariant line.",
        },
      ],
    },
  ],
  "ureca-foundations-conjugate-representation": [
    {
      kind: "convention",
      body: "Use $\\omega=e^{2\\pi i/3}$, so $\\omega\\ne1$ and $1+\\omega+\\omega^2=0$.",
      sources: [
        {
          lessonId: "ureca-foundations-order-eighteen",
          field: "worked.steps[0]",
          expected:
            "Choose $\\alpha=\\omega=e^{2\\pi i/3}$ and $\\beta=1$. The matrices of $a$ and $s$ have no common invariant line.",
        },
      ],
    },
  ],
  "ureca-constructions-clifford": [
    {
      kind: "convention",
      body: "Use $\\omega=e^{2\\pi i/3}$, so $\\omega\\ne1$ and $1+\\omega+\\omega^2=0$.",
      sources: [
        {
          lessonId: "ureca-foundations-order-eighteen",
          field: "worked.steps[0]",
          expected:
            "Choose $\\alpha=\\omega=e^{2\\pi i/3}$ and $\\beta=1$. The matrices of $a$ and $s$ have no common invariant line.",
        },
      ],
    },
    {
      kind: "convention",
      body: "For the chosen $C_3$ generator $r$, use $\\lambda(r)=\\omega$ and $\\overline\\lambda(r)=\\omega^2$. The cited example names its generator $c=(123)$; this choice identifies $r$ with $c$.",
      sources: [
        {
          lessonId: "ureca-constructions-s4-c3-matrix",
          field: "explanation",
          expected:
            "Let $H=\\langle c=(123)\\rangle\\le S_4$. Its three irreducibles are $1,\\lambda,\\overline\\lambda$, where $\\lambda(c)=\\omega=e^{2\\pi i/3}$. The H classes are its three individual elements, while c and c squared fuse in S4. Use S4 row order $1,\\varepsilon,v,\\varepsilon v,q$ from the S4 table.",
        },
      ],
    },
  ],
  "ureca-constructions-induced-character": [
    {
      kind: "convention",
      body: "Choose $r=(123)$ and $H=\\langle(12)\\rangle\\le S_3$. The left-coset representatives are $1,r,r^2$. Here $H$ is the transposition subgroup, and the cited example supplies the named cycle $r$.",
      sources: [
        {
          lessonId: "ureca-theory-normal-induced-irreducibility",
          field: "worked.steps[0]",
          expected:
            "Let $H=A_3=\\langle r=(123)\\rangle$, $G=S_3$ and $V=\\mathbb C_\\zeta$ with $r\\mapsto\\zeta$, where $\\zeta$ is a nontrivial cube root. The two cosets have representatives $1,s=(12)$.",
        },
        {
          lessonId: "ureca-constructions-induced-character",
          field: "worked.steps[0]",
          expected:
            "For H generated by a transposition in S3, let its sign character be chi. Choose the three coset representatives $1,r,r^2$.",
        },
      ],
    },
  ],
  "ureca-foundations-regular-character": [
    {
      kind: "convention",
      body: "Choose the exponent representatives $0\\le j<4$ for $r^j\\in C_4$. Thus the following “zero otherwise” refers to $j=1,2,3$; for arbitrary integer $j$, the sum is four exactly when $j\\equiv0\\pmod4$.",
      sources: [
        {
          lessonId: "ureca-foundations-regular-character",
          field: "worked.steps[0]",
          expected:
            "For $C_4=\\langle r\\rangle$, the four irreducibles have values $i^{kj}$ at $r^j$, with $0\\le k<4$. Their sum at $r^j$ is the geometric sum $1+i^j+i^{2j}+i^{3j}$.",
        },
        {
          lessonId: "ureca-foundations-regular-character",
          field: "worked.steps[1]",
          expected:
            "It equals 4 for j=0 and zero otherwise, exactly the regular row. Each irreducible degree is one, so each occurs once.",
        },
      ],
    },
  ],
};

function sourceField(lesson: ContextLesson, field: SourceField) {
  switch (field) {
    case "worked.steps[0]":
      return lesson.worked?.steps[0];
    case "worked.steps[1]":
      return lesson.worked?.steps[1];
    default:
      return lesson[field];
  }
}

export function workedExampleContext(
  lesson: ContextLesson,
  sources: readonly ContextLesson[] = catalogue,
) {
  return (selected[lesson.id] ?? []).map((entry) => {
    const citations = entry.sources.map((binding) => {
      const sourceLesson =
        binding.lessonId === lesson.id
          ? lesson
          : sources.find(({ id }) => id === binding.lessonId);
      if (!sourceLesson)
        throw Error(`Missing worked context source ${binding.lessonId}`);
      const field = sourceField(sourceLesson, binding.field);
      if (
        !field ||
        !binding.expected ||
        field.split(binding.expected).length !== 2
      )
        throw Error(
          `Worked context source drift at ${binding.lessonId}.${binding.field}`,
        );
      if (
        entry.kind === "prose" &&
        !presentCatalogueText(field).includes(entry.body)
      )
        throw Error(
          `Worked context presentation drift at ${binding.lessonId}.${binding.field}`,
        );
      if (entry.kind === "math" && entry.body !== field)
        throw Error(
          `Worked context equation drift at ${binding.lessonId}.${binding.field}`,
        );
      return {
        lessonId: sourceLesson.id,
        title: sourceLesson.title,
        field: binding.field,
        source: sourceLesson.source,
      };
    });
    return { ...entry, citations };
  });
}
