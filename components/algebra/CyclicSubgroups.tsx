import { cyclicSubgroups } from "@/lib/algebra/cayley-words";

export function CyclicSubgroups({ size }: { size: number }) {
  return (
    <section className="cyclic-subgroups" aria-label={`Subgroups of C${size}`}>
      <table>
        <caption>All subgroups of C{size}, one for each divisor order</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Smallest positive generator</th>
            <th scope="col">Elements</th>
          </tr>
        </thead>
        <tbody>
          {cyclicSubgroups(size).map((subgroup) => (
            <tr key={subgroup.order}>
              <th scope="row">{subgroup.order}</th>
              <td>{subgroup.generator}</td>
              <td>{subgroup.elements.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {size === 12 ? (
        <p>
          H=⟨4⟩={"{0,4,8}"} and K=⟨6⟩={"{0,6}"}. Their union omits 4+6=10, so it
          is not a subgroup. Their join ⟨H∪K⟩=⟨2⟩={"{0,2,4,6,8,10}"} is.
        </p>
      ) : size === 6 ? (
        <p>
          H=⟨2⟩={"{0,2,4}"} and K=⟨3⟩={"{0,3}"}. Their union omits 2+3=5; their
          join is all of C₆.
        </p>
      ) : (
        <p>
          The subgroups of C₈ form a chain. Every pair is nested, so their union
          is the larger subgroup. Choose C₁₂ to see a nonclosed union.
        </p>
      )}
    </section>
  );
}
