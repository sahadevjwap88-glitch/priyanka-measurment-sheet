'use server';
/**
 * @fileOverview An AI flow for providing granite project estimations from images or drawings.
 *
 * - estimateProject - A function that handles the project estimation process.
 * - EstimationInput - The input type for the estimateProject function.
 * - EstimationOutput - The return type for the estimateProject function.
 */

import { ai } from '@/ai/genkit';
import {
  EstimationInputSchema,
  type EstimationInput,
  EstimationOutputSchema,
  type EstimationOutput,
} from './estimation-types';

const estimationPrompt = ai.definePrompt({
    name: 'estimationPrompt',
    input: {schema: EstimationInputSchema},
    output: {schema: EstimationOutputSchema},
    prompt: `You are an expert granite project estimator.
    The user has provided an image which could be a hand-drawn site plan, a photo of a kitchen/area, or a list of required pieces.
    Your task is to estimate or extract the required granite measurements (length and width in inches) for each piece.
    
    Notes provided by user: {{notes}}

    Analyze the image and provide the measurements. 
    If it's a handwritten list, extract the numbers accurately.
    If it's a drawing or photo, estimate the dimensions as best as you can based on standard sizes or visible scale.

    Image: {{media url=photoDataUri}}`,
});

const estimationFlow = ai.defineFlow(
  {
    name: 'estimationFlow',
    inputSchema: EstimationInputSchema,
    outputSchema: EstimationOutputSchema,
  },
  async (input) => {
    const { output } = await estimationPrompt(input);
    return output!;
  }
);

export async function estimateProject(input: EstimationInput): Promise<EstimationOutput> {
  return await estimationFlow(input);
}
