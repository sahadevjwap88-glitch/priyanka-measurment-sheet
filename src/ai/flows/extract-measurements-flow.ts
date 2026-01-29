'use server';
/**
 * @fileOverview An AI flow for extracting granite measurements from an image.
 */

import { ai } from '@/ai/genkit';
import {
  ExtractMeasurementsInputSchema,
  type ExtractMeasurementsInput,
  ExtractMeasurementsOutputSchema,
  type ExtractMeasurementsOutput,
} from './extract-measurements-types';

const extractMeasurementsPrompt = ai.definePrompt({
    name: 'extractMeasurementsPrompt',
    input: {schema: ExtractMeasurementsInputSchema},
    output: {schema: ExtractMeasurementsOutputSchema},
    model: 'googleai/gemini-pro-vision',
    prompt: `You are an expert at reading lists of granite measurements.
    The user has provided an image of a list of measurements.
    Each measurement consists of a length and a width in inches.
    Extract all the length and width pairs from the image.
    Ignore any other text or numbers.

    Image: {{media url=photoDataUri}}`,
});

const extractMeasurementsFlow = ai.defineFlow(
  {
    name: 'extractMeasurementsFlow',
    inputSchema: ExtractMeasurementsInputSchema,
    outputSchema: ExtractMeasurementsOutputSchema,
  },
  async (input) => {
    const { output } = await extractMeasurementsPrompt(input);
    return output!;
  }
);

export async function extractMeasurements(input: ExtractMeasurementsInput): Promise<ExtractMeasurementsOutput> {
  return await extractMeasurementsFlow(input);
}
