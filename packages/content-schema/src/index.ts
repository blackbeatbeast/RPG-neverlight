import { z } from 'zod';

const contentEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.literal('foundation-note'),
  text: z.string().trim().min(1).max(200),
});

export const contentBundleSchema = z.object({
  contentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  entries: z.array(contentEntrySchema).min(1).max(20),
  schemaVersion: z.literal(1),
});

export type ContentBundle = z.infer<typeof contentBundleSchema>;
export type ContentEntry = z.infer<typeof contentEntrySchema>;

export function parseContentBundle(input: unknown): ContentBundle {
  return contentBundleSchema.parse(input);
}
