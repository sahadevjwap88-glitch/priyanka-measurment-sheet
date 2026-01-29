import { z } from 'zod';

export const MeasurementSchema = z.object({
  length: z.string().describe('The length of the granite slab in inches.'),
  width: z.string().describe('The width of the granite slab in inches.'),
});

export const ExtractMeasurementsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a list of measurements, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractMeasurementsInput = z.infer<typeof ExtractMeasurementsInputSchema>;

export const ExtractMeasurementsOutputSchema = z.object({
  measurements: z.array(MeasurementSchema).describe('The list of extracted measurements.'),
});
export type ExtractMeasurementsOutput = z.infer<typeof ExtractMeasurementsOutputSchema>;
