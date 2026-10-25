import { Math as M, Prose } from "./Math";

const chains = [
  {
    id: "integers",
    title: "Integer ring",
    ring: String.raw`\mathbb Z`,
    chain: String.raw`(0)\subsetneq(2)\quad\text{in }\mathbb Z`,
    quotients: [
      String.raw`\mathbb Z/(0)\cong\mathbb Z`,
      String.raw`\mathbb Z/(2)\cong\mathbb F_2`,
    ],
    explanation:
      "Both quotients are domains, so both displayed ideals are prime. The second quotient is a field, so the second ideal is maximal.",
    bound: String.raw`\dim\mathbb Z\geq1`,
  },
  {
    id: "polynomials",
    title: "Polynomial ring over a field",
    ring: String.raw`F[X,Y]`,
    chain: String.raw`(0)\subsetneq(X)\subsetneq(X,Y)\quad\text{in }F[X,Y]`,
    quotients: [
      String.raw`F[X,Y]/(0)\cong F[X,Y]`,
      String.raw`F[X,Y]/(X)\cong F[Y]`,
      String.raw`F[X,Y]/(X,Y)\cong F`,
    ],
    explanation:
      "Each quotient is a domain, so each displayed ideal is prime. The variables distinguish successive ideals. The final quotient is a field.",
    bound: String.raw`\dim F[X,Y]\geq2`,
  },
] as const;

export function PrimeChainComparison() {
  return (
    <section
      className="prime-chain-comparison"
      aria-label="Prime chains in separate ambient rings"
    >
      <h3>Keep the ambient ring with every ideal</h3>
      <p>
        A prime ideal gives a quotient that is a domain. Read each chain within
        its own ring.
      </p>
      <div className="two-cols">
        {chains.map((chain) => (
          <figure
            key={chain.id}
            aria-label={chain.title}
            className="prime-chain-card"
          >
            <figcaption>
              {chain.title} <M>{chain.ring}</M>
            </figcaption>
            <M block>{chain.chain}</M>
            <details>
              <summary>Why these ideals are prime</summary>
              {chain.quotients.map((quotient) => (
                <M key={quotient} block>
                  {quotient}
                </M>
              ))}
              <p>{chain.explanation}</p>
            </details>
            <p>
              Strict inclusions give the lower bound <M>{chain.bound}</M>.
            </p>
          </figure>
        ))}
      </div>
      <p>
        <Prose>
          {
            "The zero ideals belong to different rings. A drawn chain gives a lower bound, not an upper bound. The reading proves $\\dim\\mathbb Z=1$ using maximality of every nonzero prime ideal."
          }
        </Prose>
      </p>
    </section>
  );
}
