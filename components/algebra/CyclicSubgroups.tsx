import { Math as M, Prose } from "./Math";
import { cyclicSubgroups } from "@/lib/algebra/cayley-words";

export function CyclicSubgroups({ size }: { size: number }) {
  return (
    <section className="cyclic-subgroups" aria-label={`Subgroups of C${size}`}>
      <table>
        <caption>
          <Prose>{String.raw`All subgroups of $C_{${size}}$, one for each divisor order`}</Prose>
        </caption>
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
              <th scope="row">
                <M>{String(subgroup.order)}</M>
              </th>
              <td>
                <M>{String(subgroup.generator)}</M>
              </td>
              <td>
                <M>{String.raw`\{${subgroup.elements.join(", ")}\}`}</M>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {size === 12 ? (
        <p>
          <Prose>{String.raw`$H=\langle4\rangle=\{0,4,8\}$ and $K=\langle6\rangle=\{0,6\}$. Their union omits $4+6=10$, so it is not a subgroup. Their join $\langle H\cup K\rangle=\langle2\rangle=\{0,2,4,6,8,10\}$ is.`}</Prose>
        </p>
      ) : size === 6 ? (
        <p>
          <Prose>{String.raw`$H=\langle2\rangle=\{0,2,4\}$ and $K=\langle3\rangle=\{0,3\}$. Their union omits $2+3=5$; their join is all of $C_6$.`}</Prose>
        </p>
      ) : (
        <p>
          <Prose>{String.raw`The subgroups of $C_8$ form a chain. Every pair is nested, so their union is the larger subgroup. Choose $C_{12}$ to see a nonclosed union.`}</Prose>
        </p>
      )}
    </section>
  );
}
