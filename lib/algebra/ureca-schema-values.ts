import { z } from "zod";

export const urecaSourceUrlSchema = z.string().refine((value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
});

export const urecaUtcTimestampSchema = z.union([
  z.iso.datetime(),
  z.iso.datetime({ precision: -1 }),
]);
