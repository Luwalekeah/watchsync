import { z } from "zod";

/**
 * Schema for a single Netflix viewing-activity item.
 * Netflix exports include extra fields we don't need — strip them with .strip().
 */
const NetflixItemSchema = z
  .object({
    title:       z.string().min(1).max(500),
    seriesTitle: z.string().max(500).optional().nullable(),
    date:        z.string().optional().nullable(),
    duration:    z.string().optional().nullable(),
  })
  .strip(); // ignore unknown keys — safe against extra fields

export const NetflixHistorySchema = z
  .array(NetflixItemSchema)
  .min(1, "History is empty")
  .max(50_000, "History exceeds maximum allowed size");

/**
 * Parse and validate raw JSON string from the Netflix extraction script.
 * Throws a descriptive ZodError on failure.
 * @param {string} raw - JSON string pasted by the user
 * @returns {{ title: string, seriesTitle?: string }[]}
 */
export function parseNetflixHistory(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "Could not parse JSON. Make sure you copied the full output from the script."
    );
  }

  const result = NetflixHistorySchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.errors[0];
    throw new Error(`Invalid history data: ${first.message} (at ${first.path.join(".")})`);
  }

  return result.data;
}
