'use server';
/**
 * @fileOverview An AI flow for extracting granite measurements from an image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MeasurementSchema = z.object({
  length: z.string().describe('The length of the granite slab in inches.'),
  width: z.string().describe('The width of the granite slab in inches.'),
});

const ExtractMeasurementsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a list of measurements, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractMeasurementsInput = z.infer<typeof ExtractMeasurementsInputSchema>;

const ExtractMeasurementsOutputSchema = z.object({
  measurements: z.array(MeasurementSchema).describe('The list of extracted measurements.'),
});
export type ExtractMeasurementsOutput = z.infer<typeof ExtractMeasurementsOutputSchema>;

const extractMeasurementsPrompt = ai.definePrompt({
    name: 'extractMeasurementsPrompt',
    input: {schema: ExtractMeasurementsInputSchema},
    output: {schema: ExtractMeasurementsOutputSchema},
    model: 'googleai/gemini-pro-vision', // Specify vision model
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
