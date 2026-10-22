import units from "./units.json" with { type: "json" };

export const learningRoutes = units;
export type LearningUnit = (typeof learningRoutes)[number];
