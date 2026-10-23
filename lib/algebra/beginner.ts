import { z } from "zod";

export const inputs = ["0", "1", "2"] as const;
export const outputs = ["a", "b", "c"] as const;
export type Input = (typeof inputs)[number];
export type Output = (typeof outputs)[number];
export type FiniteMap =
  | { kind: "two-outputs"; values: Readonly<Record<Input, "a" | "b">> }
  | { kind: "three-outputs"; values: Readonly<Record<Input, Output>> };

export const beginnerMoves = ["name", "read", "reason", "change"] as const;
export type BeginnerMove = (typeof beginnerMoves)[number];
export const moves = [
  { id: "name", title: "Name the objects", cue: "An arrow gets a language." },
  {
    id: "read",
    title: "Read the sentence",
    cue: "Turn symbols into a search.",
  },
  {
    id: "reason",
    title: "Give a reason",
    cue: "Point to evidence in your map.",
  },
  {
    id: "change",
    title: "Change an assumption",
    cue: "Same arrows. A new question.",
  },
] as const satisfies readonly {
  id: BeginnerMove;
  title: string;
  cue: string;
}[];

export const symbolMeanings = [
  {
    id: "function",
    tex: "f",
    label: "f, the function",
    meaning:
      "A function assigns exactly one allowed output to each input. Its domain and codomain are part of the function.",
  },
  {
    id: "domain",
    tex: "X",
    label: "X, the domain",
    meaning:
      "The domain is the set of inputs. Here $X=\\{0,1,2\\}$. A set is a collection of distinct objects; the order in which we list them does not matter.",
  },
  {
    id: "arrow",
    tex: "\\to",
    label: "Arrow, from domain to codomain",
    meaning:
      "The arrow in $f:X\\to Y$ reads “from X to Y”. Each drawn arrow records one assignment, such as $f(0)=a$.",
  },
  {
    id: "codomain",
    tex: "Y",
    label: "Y, the codomain",
    meaning:
      "The codomain is the set of allowed outputs. An allowed output can have several incoming arrows, one, or none. Allowed does not mean reached.",
  },
] as const;
export type SymbolMeaning = (typeof symbolMeanings)[number]["id"];
export type ReadingPhrase = "every-output" | "some-input" | "hits-output";
export type Claim = "surjective" | "injective";
export type Witness =
  | { kind: "missing-output"; output: Output }
  | { kind: "collision"; first: Input; second: Input };
export type Feedback = {
  kind: "witness" | "not-witness" | "refused";
  message: string;
};
type Selection =
  | { kind: "missing-output"; output: Output | null }
  | { kind: "collision"; first: Input | null; second: Input | null };
export type RunwayState = {
  map: FiniteMap;
  move: BeginnerMove;
  symbol: SymbolMeaning;
  phrase: ReadingPhrase;
  readOutput: Output;
  selection: Selection;
  feedback: Feedback | null;
};

const actionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("move"), move: z.enum(beginnerMoves) }).strict(),
  z
    .object({
      kind: z.literal("symbol"),
      symbol: z.enum(["function", "domain", "arrow", "codomain"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("phrase"),
      phrase: z.enum(["every-output", "some-input", "hits-output"]),
    })
    .strict(),
  z
    .object({ kind: z.literal("read-output"), output: z.enum(outputs) })
    .strict(),
  z
    .object({
      kind: z.literal("choose-claim"),
      claim: z.enum(["surjective", "injective"]),
    })
    .strict(),
  z
    .object({ kind: z.literal("choose-output"), output: z.enum(outputs) })
    .strict(),
  z
    .object({
      kind: z.literal("choose-input"),
      place: z.enum(["first", "second"]),
      input: z.enum(inputs),
    })
    .strict(),
  z
    .object({
      kind: z.literal("assign"),
      input: z.enum(inputs),
      output: z.enum(outputs),
    })
    .strict(),
  z
    .object({
      kind: z.literal("set-codomain"),
      codomain: z.enum(["two-outputs", "three-outputs"]),
    })
    .strict(),
  z.object({ kind: z.literal("check") }).strict(),
  z.object({ kind: z.literal("reset") }).strict(),
]);
export type RunwayAction = z.infer<typeof actionSchema>;

export function initialRunway(move: BeginnerMove = "name"): RunwayState {
  return {
    map: { kind: "three-outputs", values: { "0": "a", "1": "a", "2": "b" } },
    move,
    symbol: "domain",
    phrase: "every-output",
    readOutput: "c",
    selection: { kind: "missing-output", output: null },
    feedback: null,
  };
}

export function mapFacts(map: FiniteMap) {
  const allowed: readonly Output[] =
    map.kind === "two-outputs" ? ["a", "b"] : outputs;
  const fibers = {
    a: inputs.filter((input) => map.values[input] === "a"),
    b: inputs.filter((input) => map.values[input] === "b"),
    c: inputs.filter((input) => map.values[input] === "c"),
  };
  const missing = allowed.filter((output) => fibers[output].length === 0);
  const collisions: [Input, Input][] = [];
  for (const [index, first] of inputs.entries())
    for (const second of inputs.slice(index + 1))
      if (map.values[first] === map.values[second])
        collisions.push([first, second]);
  return {
    outputs: allowed,
    fibers,
    missing,
    collisions,
    surjective: missing.length === 0,
    injective: collisions.length === 0,
  };
}

export function diagnoseWitness(
  map: FiniteMap,
  claim: Claim,
  witness: Witness,
): Feedback {
  const facts = mapFacts(map);
  if (claim === "surjective") {
    if (witness.kind !== "missing-output")
      return {
        kind: "not-witness",
        message:
          "This sentence asks about allowed outputs. Choose one output with no incoming arrow.",
      };
    if (!facts.outputs.includes(witness.output))
      return {
        kind: "not-witness",
        message: `$${witness.output}$ is outside this codomain. A missing output must be an allowed output.`,
      };
    const incoming = facts.fibers[witness.output];
    if (incoming.length === 0)
      return {
        kind: "witness",
        message: `$${witness.output}\\in Y$, but no input reaches it. This single missing output disproves “every allowed output is reached”. This function is not surjective.`,
      };
    return {
      kind: "not-witness",
      message: `Input${incoming.length === 1 ? "" : "s"} $${incoming.join(",")}$ ${incoming.length === 1 ? "reaches" : "reach"} $${witness.output}$. At least one incoming arrow is enough, so this output is not a counterexample.`,
    };
  }
  if (witness.kind !== "collision")
    return {
      kind: "not-witness",
      message:
        "This sentence compares inputs. Choose two distinct inputs that reach the same output.",
    };
  if (witness.first === witness.second)
    return {
      kind: "not-witness",
      message: `You chose input $${witness.first}$ twice. A collision needs two distinct inputs; an input agreeing with itself disproves nothing.`,
    };
  const firstOutput = map.values[witness.first];
  const secondOutput = map.values[witness.second];
  if (firstOutput !== secondOutput)
    return {
      kind: "not-witness",
      message: `$f(${witness.first})=${firstOutput}$ and $f(${witness.second})=${secondOutput}$. These outputs differ. Look for two distinct inputs whose arrows end together.`,
    };
  return {
    kind: "witness",
    message: `$${witness.first}\\ne ${witness.second}$, but $f(${witness.first})=f(${witness.second})=${firstOutput}$. This collision disproves “different inputs have different outputs”. This function is not injective.`,
  };
}

function refuse(state: RunwayState, message: string): RunwayState {
  return { ...state, feedback: { kind: "refused", message } };
}

function changedMap(state: RunwayState, map: FiniteMap): RunwayState {
  return {
    ...state,
    map,
    readOutput:
      map.kind === "two-outputs" && state.readOutput === "c"
        ? "a"
        : state.readOutput,
    selection:
      state.selection.kind === "missing-output"
        ? { kind: "missing-output", output: null }
        : { kind: "collision", first: null, second: null },
    feedback: null,
  };
}

export function runwayTransition(
  state: RunwayState,
  candidate: unknown,
): RunwayState {
  const parsed = actionSchema.safeParse(candidate);
  if (!parsed.success)
    return refuse(
      state,
      "That change is not available. Choose a displayed input, allowed output, or workshop move.",
    );
  const action = parsed.data;
  switch (action.kind) {
    case "move":
      return { ...state, move: action.move, feedback: null };
    case "symbol":
      return { ...state, symbol: action.symbol };
    case "phrase":
      return { ...state, phrase: action.phrase };
    case "read-output":
      return mapFacts(state.map).outputs.includes(action.output)
        ? { ...state, readOutput: action.output }
        : refuse(state, "Choose an output in the current codomain.");
    case "choose-claim":
      return {
        ...state,
        selection:
          action.claim === "surjective"
            ? { kind: "missing-output", output: null }
            : { kind: "collision", first: null, second: null },
        feedback: null,
      };
    case "choose-output":
      if (state.selection.kind !== "missing-output")
        return refuse(
          state,
          "For this sentence, choose two inputs instead of an output.",
        );
      return mapFacts(state.map).outputs.includes(action.output)
        ? {
            ...state,
            selection: { kind: "missing-output", output: action.output },
            feedback: null,
          }
        : refuse(state, "Choose an output in the current codomain.");
    case "choose-input":
      if (state.selection.kind !== "collision")
        return refuse(
          state,
          "For this sentence, choose an allowed output instead of an input.",
        );
      return {
        ...state,
        selection: { ...state.selection, [action.place]: action.input },
        feedback: null,
      };
    case "assign": {
      if (state.map.kind === "two-outputs") {
        if (action.output === "c")
          return refuse(
            state,
            "Output $c$ is outside this codomain. Restore $c$ before assigning an input to it.",
          );
        return changedMap(state, {
          kind: "two-outputs",
          values: { ...state.map.values, [action.input]: action.output },
        });
      }
      return changedMap(state, {
        kind: "three-outputs",
        values: { ...state.map.values, [action.input]: action.output },
      });
    }
    case "set-codomain": {
      if (state.map.kind === action.codomain) return state;
      if (action.codomain === "three-outputs")
        return changedMap(state, {
          kind: "three-outputs",
          values: state.map.values,
        });
      const { "0": zero, "1": one, "2": two } = state.map.values;
      if (zero === "c" || one === "c" || two === "c") {
        const usedBy = inputs.filter(
          (input) => state.map.values[input] === "c",
        );
        return refuse(
          state,
          `Cannot remove $c$: input${usedBy.length === 1 ? "" : "s"} $${usedBy.join(",")}$ still ${usedBy.length === 1 ? "uses" : "use"} it. Reassign ${usedBy.length === 1 ? "that input" : "those inputs"} first, so every arrow ends in the codomain.`,
        );
      }
      return changedMap(state, {
        kind: "two-outputs",
        values: { "0": zero, "1": one, "2": two },
      });
    }
    case "check": {
      const selection = state.selection;
      if (selection.kind === "missing-output")
        return selection.output === null
          ? refuse(state, "Choose one allowed output to test.")
          : {
              ...state,
              feedback: diagnoseWitness(state.map, "surjective", {
                kind: "missing-output",
                output: selection.output,
              }),
            };
      return selection.first === null || selection.second === null
        ? refuse(state, "Choose both inputs before checking the pair.")
        : {
            ...state,
            feedback: diagnoseWitness(state.map, "injective", {
              kind: "collision",
              first: selection.first,
              second: selection.second,
            }),
          };
    }
    case "reset":
      return initialRunway(state.move);
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
