'use server';

import { generateDataSummary } from '@/ai/flows/generate-data-summary';
import { z } from 'zod';

const ActionInputSchema = z.object({
  data: z.array(
    z.object({
      length: z.number(),
      width: z.number(),
    })
  ),
});

export async function generateSummaryAction(input: z.infer<typeof ActionInputSchema>) {
  const parsedInput = ActionInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      error: 'Invalid input data.',
      summary: null,
    };
  }

  try {
    const result = await generateDataSummary(parsedInput.data);
    return { summary: result.summary, error: null };
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      error: 'Failed to generate summary. Please try again.',
      summary: null,
    };
  }
}
