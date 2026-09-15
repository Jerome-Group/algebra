import type { Lesson } from "./engine";
const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\\mathbb\s*\{?([a-z])\}?/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function searchLessons(lessons: Lesson[], query: string) {
  const terms = normalize(query).split(" ").filter(Boolean);
  return lessons
    .map((lesson) => {
      const title = `${lesson.navTitle} ${lesson.title} ${(lesson.aliases || []).join(" ")}`;
      const passages = [
        lesson.intuition,
        lesson.definition,
        lesson.explanation,
        lesson.theorem,
        lesson.proof,
        lesson.pitfall,
        ...(lesson.worked?.steps || []),
        ...(lesson.reading || []).flatMap((note) => [
          note.title,
          ...note.paragraphs,
        ]),
      ];
      const index = normalize(
        [title, lesson.subject, lesson.family, ...passages].join(" "),
      );
      const matches = terms.every((term) => index.includes(term));
      const score = terms.filter((term) =>
        normalize(title).includes(term),
      ).length;
      const snippet =
        passages.find((p) =>
          terms.some((term) => normalize(p).includes(term)),
        ) || lesson.intuition;
      return { lesson, snippet, score, matches };
    })
    .filter((result) => result.matches)
    .sort((a, b) => b.score - a.score);
}
