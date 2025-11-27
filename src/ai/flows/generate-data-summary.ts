'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a text summary of granite measurement data.
 *
 * generateDataSummary - A function that takes granite measurement data as input and returns a text summary.
 * GenerateDataSummaryInput - The input type for the generateDataSummary function.
 * GenerateDataSummaryOutput - The return type for the generateDataSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDataSummaryInputSchema = z.object({
  data: z.array(
    z.object({
      length: z.number(),
      width: z.number(),
    })
  ).describe('An array of granite measurement data, where each element contains length and width properties.'),
});
export type GenerateDataSummaryInput = z.infer<typeof GenerateDataSummaryInputSchema>;

const GenerateDataSummaryOutputSchema = z.object({
  summary: z.string().describe('A text summary of the granite measurement data.'),
});
export type GenerateDataSummaryOutput = z.infer<typeof GenerateDataSummaryOutputSchema>;

export async function generateDataSummary(input: GenerateDataSummaryInput): Promise<GenerateDataSummaryOutput> {
  return generateDataSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDataSummaryPrompt',
  input: {schema: GenerateDataSummaryInputSchema},
  output: {schema: GenerateDataSummaryOutputSchema},
  prompt: `You are an expert data analyst specializing in summarizing numerical data.

You will be provided with an array of granite measurement data, where each element contains length and width properties. Your task is to generate a concise text summary of the data, highlighting key characteristics such as the average length and width, the range of lengths and widths, and any notable patterns or outliers.

Granite Measurement Data:
{{#each data}}
- Length: {{this.length}}, Width: {{this.width}}
{{/each}}
`,
});

const generateDataSummaryFlow = ai.defineFlow(
  {
    name: 'generateDataSummaryFlow',
    inputSchema: GenerateDataSummaryInputSchema,
    outputSchema: GenerateDataSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
