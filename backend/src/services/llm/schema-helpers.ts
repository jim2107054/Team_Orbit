import { z } from 'zod';

/**
 * Model output is validated strictly where the value is semantic (enums,
 * probabilities, booleans) and leniently where it is only length: a model that
 * writes a 90-character label against an 80-character limit has still produced a
 * correct answer, and discarding the whole response over verbosity throws away
 * a paid-for result and drops the request back to the rules for no good reason.
 * Over-long text is trimmed and over-long lists are cut instead.
 */
export const text = (max: number) =>
  z.string().transform(value => (value.length > max ? `${value.slice(0, Math.max(0, max - 1)).trimEnd()}\u2026` : value));

export const list = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z.array(item).transform(items => items.slice(0, max));
