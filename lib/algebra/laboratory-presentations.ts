import { z } from "zod";
import source from "./laboratory-presentations.json";

const presentation = z.enum(["model", "reference-diagram", "worked-example"]);
const presentations = z.record(z.string(), presentation).parse(source);

export function laboratoryPresentation(lessonId: string) {
  const value = presentations[lessonId];
  if (!value) throw Error(`Missing mathematical presentation for ${lessonId}`);
  return value;
}

export function laboratoryAction(lessonId: string) {
  switch (laboratoryPresentation(lessonId)) {
    case "model":
      return "Open experiment";
    case "reference-diagram":
      return "Read mathematical diagram";
    case "worked-example":
      return "Read worked example";
  }
}
