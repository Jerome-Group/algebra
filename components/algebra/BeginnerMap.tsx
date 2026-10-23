import { inputs, mapFacts, type RunwayState } from "@/lib/algebra/beginner";
import { Math as M } from "./Math";

export function BeginnerMap({
  state,
  dispatch,
}: {
  state: RunwayState;
  dispatch: (action: unknown) => void;
}) {
  const facts = mapFacts(state.map);
  const inputY = { "0": 62, "1": 125, "2": 188 };
  const outputY =
    state.map.kind === "two-outputs"
      ? { a: 82, b: 168, c: 0 }
      : { a: 62, b: 125, c: 188 };
  const selectedInputs =
    state.selection.kind === "collision"
      ? [state.selection.first, state.selection.second]
      : [];
  const selectedOutput =
    state.selection.kind === "missing-output" ? state.selection.output : null;
  const highlightInput = (input: (typeof inputs)[number]) => {
    if (state.move === "name")
      return state.symbol === "domain" || state.symbol === "function";
    if (state.move === "read")
      return (
        state.phrase !== "every-output" &&
        facts.fibers[state.readOutput].includes(input)
      );
    if (state.move === "reason")
      return (
        selectedInputs.includes(input) ||
        state.map.values[input] === selectedOutput
      );
    return facts.collisions.some((pair) => pair.includes(input));
  };
  const highlightOutput = (output: (typeof facts.outputs)[number]) => {
    if (state.move === "name")
      return state.symbol === "codomain" || state.symbol === "function";
    if (state.move === "read")
      return state.phrase === "every-output" || output === state.readOutput;
    if (state.move === "reason")
      return (
        output === selectedOutput ||
        selectedInputs.some(
          (input) => input !== null && state.map.values[input] === output,
        )
      );
    return facts.missing.includes(output);
  };
  return (
    <section className="beginner-object" aria-label="Your finite function">
      <div className="beginner-object-heading">
        <span className="section-kicker">ONE MAP · ALL FOUR MOVES</span>
        <button
          className="beginner-reset"
          onClick={() => dispatch({ kind: "reset" })}
        >
          Reset map
        </button>
      </div>
      <p className="beginner-map-equation">
        <M>{"f:X\\to Y"}</M>
        <M>{"X=\\{0,1,2\\}"}</M>
        <M>{`Y=\\{${facts.outputs.join(",")}\\}`}</M>
      </p>
      <figure>
        <div
          className="beginner-map"
          role="img"
          aria-label={`Domain X has inputs 0, 1, 2. Codomain Y has outputs ${facts.outputs.join(", ")}. ${inputs.map((input) => `Input ${input} goes to ${state.map.values[input]}`).join(". ")}.`}
        >
          <svg viewBox="0 0 400 250" aria-hidden="true">
            <defs>
              <marker
                id="beginner-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            <ellipse cx="88" cy="125" rx="65" ry="118" />
            <ellipse cx="312" cy="125" rx="65" ry="118" />
            {inputs.map((input) => (
              <line
                key={input}
                x1="112"
                y1={inputY[input]}
                x2="286"
                y2={outputY[state.map.values[input]]}
                markerEnd="url(#beginner-arrow)"
                data-highlighted={
                  (state.move === "name" &&
                    (state.symbol === "arrow" ||
                      state.symbol === "function")) ||
                  (state.move !== "name" && highlightInput(input))
                }
              />
            ))}
          </svg>
          {inputs.map((input) => (
            <span
              key={input}
              className="beginner-node beginner-input"
              style={{ top: `${inputY[input] / 2.5}%` }}
              data-input={input}
              data-highlighted={highlightInput(input)}
            >
              <M focusable={false}>{input}</M>
            </span>
          ))}
          {facts.outputs.map((output) => (
            <span
              key={output}
              className="beginner-node beginner-output"
              style={{ top: `${outputY[output] / 2.5}%` }}
              data-output={output}
              data-highlighted={highlightOutput(output)}
            >
              <M focusable={false}>{output}</M>
            </span>
          ))}
        </div>
        <figcaption>
          <span>
            Inputs · domain <M focusable={false}>X</M>
          </span>
          <span>
            Allowed outputs · codomain <M focusable={false}>Y</M>
          </span>
        </figcaption>
      </figure>
      <table className="beginner-assignments">
        <caption>Change an arrow. Everything else follows.</caption>
        <thead>
          <tr>
            <th scope="col">Input</th>
            <th scope="col">Assigned output</th>
          </tr>
        </thead>
        <tbody>
          {inputs.map((input) => (
            <tr key={input}>
              <th scope="row">
                Input <M focusable={false}>{input}</M>
              </th>
              <td>
                <label className="sr-only" htmlFor={`beginner-value-${input}`}>
                  Output for input {input}
                </label>
                <select
                  id={`beginner-value-${input}`}
                  value={state.map.values[input]}
                  onChange={(event) =>
                    dispatch({
                      kind: "assign",
                      input,
                      output: event.target.value,
                    })
                  }
                >
                  {facts.outputs.map((output) => (
                    <option key={output} value={output}>
                      {output}
                    </option>
                  ))}
                </select>
                <M
                  focusable={false}
                >{`f(${input})=${state.map.values[input]}`}</M>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="beginner-boundary">
        Every input always has exactly one allowed output. Try changing one.
      </p>
    </section>
  );
}
