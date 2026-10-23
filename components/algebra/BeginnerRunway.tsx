import { useReducer, type ReactNode } from "react";
import {
  initialRunway,
  inputs,
  mapFacts,
  moves,
  runwayTransition,
  symbolMeanings,
  type BeginnerMove,
  type RunwayState,
} from "@/lib/algebra/beginner";
import {
  beginnerTargetId,
  type ArgumentSupport,
} from "@/lib/algebra/navigation";
import { BeginnerMap } from "./BeginnerMap";
import { ConceptLink } from "./ConceptLink";
import { Math as M, Prose } from "./Math";

export function BeginnerStartLink({
  children = "Start from zero",
  move = "name",
  returnTo = null,
  open,
  className,
}: {
  children?: ReactNode;
  move?: BeginnerMove;
  returnTo?: ArgumentSupport | null;
  open: (move: BeginnerMove, returnTo: ArgumentSupport | null) => void;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={`#${beginnerTargetId(move, returnTo)}`}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        open(move, returnTo);
      }}
    >
      {children}
    </a>
  );
}

type MoveProps = { state: RunwayState; dispatch: (action: unknown) => void };

function NameObjects({ state, dispatch }: MoveProps) {
  const meaning = symbolMeanings.find((item) => item.id === state.symbol);
  return (
    <>
      <h2 id="beginner-move-heading" tabIndex={-1}>
        Each input has one output.
      </h2>
      <p>
        A rule you can see comes before the notation. The three arrows make a
        function. We give it the name <M>f</M>.
      </p>
      <p className="beginner-instruction">
        Select a symbol. Its objects light up in your map.
      </p>
      <div
        className="beginner-symbols"
        role="group"
        aria-label="Symbols in f from X to Y"
      >
        {symbolMeanings.map((item) => (
          <span key={item.id} className="beginner-symbol-part">
            <button
              aria-label={item.label}
              aria-pressed={state.symbol === item.id}
              onClick={() => dispatch({ kind: "symbol", symbol: item.id })}
            >
              <M focusable={false}>{item.tex}</M>
            </button>
            {item.id === "function" && <M focusable={false}>{":"}</M>}
          </span>
        ))}
      </div>
      <div className="beginner-meaning" role="status">
        <Prose>{meaning?.meaning ?? ""}</Prose>
      </div>
      <p>
        Two inputs may reach the same output. An allowed output may be unused.
        Neither breaks the rule “one output for each input”.
      </p>
    </>
  );
}

function ReadSentence({ state, dispatch }: MoveProps) {
  const facts = mapFacts(state.map);
  const incoming = facts.fibers[state.readOutput];
  return (
    <>
      <h2 id="beginner-move-heading" tabIndex={-1}>
        A sentence becomes a search.
      </h2>
      <p>
        Read from left to right. Select a phrase to see exactly what it asks you
        to inspect.
      </p>
      <div
        className="beginner-sentence"
        role="group"
        aria-label="Read the sentence in parts"
      >
        <button
          aria-label="Every allowed output"
          aria-pressed={state.phrase === "every-output"}
          onClick={() => dispatch({ kind: "phrase", phrase: "every-output" })}
        >
          <span>Every allowed output</span>
          <M focusable={false}>{"\\forall y\\in Y"}</M>
        </button>
        <button
          aria-label="has at least one input"
          aria-pressed={state.phrase === "some-input"}
          onClick={() => dispatch({ kind: "phrase", phrase: "some-input" })}
        >
          <span>has at least one input</span>
          <M focusable={false}>{"\\exists x\\in X"}</M>
        </button>
        <button
          aria-label="that reaches it"
          aria-pressed={state.phrase === "hits-output"}
          onClick={() => dispatch({ kind: "phrase", phrase: "hits-output" })}
        >
          <span>that reaches it.</span>
          <M focusable={false}>{"f(x)=y"}</M>
        </button>
      </div>
      <div className="beginner-meaning" role="status">
        <Prose>
          {state.phrase === "every-output"
            ? "The symbol $\\forall$ means “for every”. Visit each member of the whole codomain $Y$, including any output with no arrow."
            : state.phrase === "some-input"
              ? "The symbol $\\exists$ means “there exists at least one”. After choosing an output, search the domain $X$ for an input that reaches it. Two or three are allowed; one is enough."
              : "The condition $f(x)=y$ asks whether that input’s arrow ends at the chosen output. The input you find may depend on which output you chose."}
        </Prose>
      </div>
      <label className="beginner-inline-control">
        Inspect incoming arrows for{" "}
        <select
          aria-label="Output to inspect"
          value={state.readOutput}
          onChange={(event) =>
            dispatch({ kind: "read-output", output: event.target.value })
          }
        >
          {facts.outputs.map((output) => (
            <option value={output} key={output}>
              {output}
            </option>
          ))}
        </select>
      </label>
      <p className="beginner-fiber">
        <M>{`f^{-1}(\\{${state.readOutput}\\})=${incoming.length ? `\\{${incoming.join(",")}\\}` : "\\varnothing"}`}</M>
      </p>
      <p>
        <Prose>{`This inverse image is the set of inputs reaching $${state.readOutput}$. ${incoming.length ? `It contains $${incoming.join(",")}$, so this output passes the “at least one” test.` : "It is empty, so this output fails the test."} An inverse image is a set of inputs; it does not require an inverse function.`}</Prose>
      </p>
    </>
  );
}

function FindWitness({ state, dispatch }: MoveProps) {
  const selection = state.selection;
  return (
    <>
      <h2 id="beginner-move-heading" tabIndex={-1}>
        One witness can settle “not every”.
      </h2>
      <p>
        A counterexample is a specific object that makes a claim fail. Choose a
        sentence, then find evidence in your current map.
      </p>
      <fieldset className="beginner-claims">
        <legend>Sentence to test</legend>
        <label>
          <input
            type="radio"
            name="beginner-claim"
            checked={selection.kind === "missing-output"}
            onChange={() =>
              dispatch({ kind: "choose-claim", claim: "surjective" })
            }
          />
          <span>
            Every allowed output is reached.
            <small>The surjective condition.</small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="beginner-claim"
            checked={selection.kind === "collision"}
            onChange={() =>
              dispatch({ kind: "choose-claim", claim: "injective" })
            }
          />
          <span>
            Different inputs have different outputs.
            <small>The injective condition.</small>
          </span>
        </label>
      </fieldset>
      {selection.kind === "missing-output" ? (
        <label className="beginner-witness-label">
          Choose an output with no incoming arrow
          <select
            aria-label="Missing output witness"
            value={selection.output ?? ""}
            onChange={(event) =>
              dispatch({ kind: "choose-output", output: event.target.value })
            }
          >
            <option value="" disabled>
              Choose an output
            </option>
            {mapFacts(state.map).outputs.map((output) => (
              <option key={output} value={output}>
                {output}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="beginner-pair">
          {(["first", "second"] as const).map((place) => (
            <label key={place}>
              {place === "first" ? "First input" : "Second input"}
              <select
                aria-label={
                  place === "first"
                    ? "First collision input"
                    : "Second collision input"
                }
                value={selection[place] ?? ""}
                onChange={(event) =>
                  dispatch({
                    kind: "choose-input",
                    place,
                    input: event.target.value,
                  })
                }
              >
                <option value="" disabled>
                  Choose an input
                </option>
                {inputs.map((input) => (
                  <option key={input} value={input}>
                    {input}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <button
        className="beginner-primary"
        onClick={() => dispatch({ kind: "check" })}
      >
        Check this witness
      </button>
      <p className="beginner-boundary">
        A correct witness explains this map. It earns no competency credit.
      </p>
    </>
  );
}

function ChangeAssumption({ state, dispatch }: MoveProps) {
  const facts = mapFacts(state.map);
  return (
    <>
      <h2 id="beginner-move-heading" tabIndex={-1}>
        Keep the arrows. Change what is allowed.
      </h2>
      <p>
        <Prose>
          {
            "Can you remove the unused output $c$? A function’s codomain is part of its definition. Changing it gives a different function, even when the arrow assignments stay the same."
          }
        </Prose>
      </p>
      <div
        className="beginner-codomain"
        role="group"
        aria-label="Change the codomain"
      >
        <button
          aria-label="Use codomain a, b"
          aria-pressed={state.map.kind === "two-outputs"}
          onClick={() =>
            dispatch({ kind: "set-codomain", codomain: "two-outputs" })
          }
        >
          Use <M focusable={false}>{"Y=\\{a,b\\}"}</M>
        </button>
        <button
          aria-label="Use codomain a, b, c"
          aria-pressed={state.map.kind === "three-outputs"}
          onClick={() =>
            dispatch({ kind: "set-codomain", codomain: "three-outputs" })
          }
        >
          Use <M focusable={false}>{"Y=\\{a,b,c\\}"}</M>
        </button>
      </div>
      <div className="beginner-facts" aria-live="polite">
        <p data-property="surjective">
          <strong>{facts.surjective ? "Surjective" : "Not surjective"}</strong>
          <Prose>
            {facts.surjective
              ? "Every allowed output has an incoming arrow. We checked the entire codomain."
              : `Missing output${facts.missing.length === 1 ? "" : "s"}: $${facts.missing.join(",")}$.`}
          </Prose>
        </p>
        <p data-property="injective">
          <strong>{facts.injective ? "Injective" : "Not injective"}</strong>
          <Prose>
            {facts.injective
              ? "Every pair of distinct inputs has different outputs. We checked all pairs."
              : `Collision${facts.collisions.length === 1 ? "" : "s"}: ${facts.collisions.map(([first, second]) => `$f(${first})=f(${second})=${state.map.values[first]}$ with $${first}\\ne ${second}$`).join("; ")}.`}
          </Prose>
        </p>
      </div>
      <div className="beginner-next-question">
        <strong>Try the other direction.</strong>
        <p>
          <Prose>
            {
              "Restore $c$, then change arrows until every output is reached and no two inputs collide. Such a function is bijective: both injective and surjective."
            }
          </Prose>
        </p>
      </div>
      <p className="beginner-boundary">
        We can check every input and allowed output because this map is finite.
        Checking a few examples of an arbitrary function would not prove a
        universal claim.
      </p>
    </>
  );
}

export function BeginnerRunway({
  move,
  returnTo,
  open,
  openLab,
  requestFocus,
}: {
  move: BeginnerMove;
  returnTo: ArgumentSupport | null;
  open: (id: string) => void;
  openLab: (id: string) => void;
  requestFocus: (id: string) => void;
}) {
  const [state, dispatch] = useReducer(runwayTransition, move, initialRunway);
  const index = moves.findIndex((item) => item.id === state.move);
  const current = moves[index];
  const next = moves[index + 1];
  const chooseMove = (move: BeginnerMove) => {
    dispatch({ kind: "move", move });
    requestFocus("beginner-move-heading");
  };
  return (
    <section
      className="beginner-workshop"
      aria-label="Start from zero workshop"
    >
      <header className="beginner-intro">
        <p className="section-kicker">START FROM ZERO · A LANGUAGE WORKSHOP</p>
        <h1 id="mode-heading" tabIndex={-1}>
          A sentence you can test.
        </h1>
        <p>
          Three inputs. One map. Learn to name the objects, read the symbols,
          and give a reason.
        </p>
        <span className="beginner-session">
          No prerequisites · temporary practice · no score
        </span>
      </header>
      <nav className="beginner-moves" aria-label="Four workshop moves">
        {moves.map((item, step) => (
          <button
            key={item.id}
            aria-current={state.move === item.id ? "step" : undefined}
            onClick={() => chooseMove(item.id)}
          >
            <span>{String(step + 1).padStart(2, "0")}</span>
            <strong>{item.title}</strong>
          </button>
        ))}
      </nav>
      <div className="beginner-workspace">
        <BeginnerMap state={state} dispatch={dispatch} />
        <article className="beginner-reading">
          <p className="section-kicker">
            MOVE {index + 1} OF 4 · {current.cue}
          </p>
          {state.move === "name" ? (
            <NameObjects state={state} dispatch={dispatch} />
          ) : state.move === "read" ? (
            <ReadSentence state={state} dispatch={dispatch} />
          ) : state.move === "reason" ? (
            <FindWitness state={state} dispatch={dispatch} />
          ) : (
            <ChangeAssumption state={state} dispatch={dispatch} />
          )}
          <div
            className={`beginner-feedback ${state.feedback?.kind ?? ""}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {state.feedback && <Prose>{state.feedback.message}</Prose>}
          </div>
          <div className="beginner-move-end">
            {index > 0 && (
              <button onClick={() => chooseMove(moves[index - 1].id)}>
                Previous move
              </button>
            )}
            {next && (
              <button
                className="beginner-primary"
                onClick={() => chooseMove(next.id)}
              >
                Next · {next.title}
              </button>
            )}
          </div>
        </article>
      </div>
      <footer className="beginner-handoff">
        <div>
          <p className="section-kicker">TAKE THE LANGUAGE WITH YOU</p>
          <h2>From this map to a general function.</h2>
          <p>
            Next, ask what makes these definitions work for any domain and
            codomain. Your full lesson and laboratory are ready whenever you
            are.
          </p>
        </div>
        <div className="beginner-handoff-links">
          <ConceptLink id="foundations-functions" open={open}>
            Open the full functions lesson
          </ConceptLink>
          <ConceptLink
            id="lab:foundations-functions"
            open={() => openLab("foundations-functions")}
          >
            Use the existing laboratory
          </ConceptLink>
          {returnTo && (
            <ConceptLink
              id={`${returnTo.lab ? "lab:" : ""}${returnTo.lessonId}`}
              open={() =>
                returnTo.lab
                  ? openLab(returnTo.lessonId)
                  : open(returnTo.lessonId)
              }
            >
              Return to the lesson you came from
            </ConceptLink>
          )}
        </div>
      </footer>
    </section>
  );
}
