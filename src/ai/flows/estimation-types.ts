import { z } from 'zod';

export const EstimationMeasurementSchema = z.object({
  length: z.string().describe('The estimated length of the granite piece in inches.'),
  width: z.string().describe('The estimated width of the granite piece in inches.'),
  label: z.string().optional().describe('A label for this piece (e.g., "Countertop", "Island").'),
});

export const EstimationInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo for estimation (e.g., a site drawing, kitchen photo, or list), as a data URI that must include a MIME type and use Base64 encoding."
    ),
  notes: z.string().optional().describe('Any additional context or notes for the estimation.'),
});
export type EstimationInput = z.infer<typeof EstimationInputSchema>;

export const EstimationOutputSchema = z.object({
  measurements: z.array(EstimationMeasurementSchema).describe('The list of estimated measurements.'),
  summary: z.string().optional().describe('A brief summary of the estimation logic.'),
});
export type EstimationOutput = z.infer<typeof EstimationOutputSchema>;
