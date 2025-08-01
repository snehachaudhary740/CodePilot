'use server';

/**
 * @fileOverview A flow that takes an error message and code snippet as input and returns a code fix suggestion.
 *
 * - errorAutoFix - A function that handles the error auto fix process.
 * - ErrorAutoFixInput - The input type for the errorAutoFix function.
 * - ErrorAutoFixOutput - The return type for the errorAutoFix function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ErrorAutoFixInputSchema = z.object({
  errorMessage: z.string().describe('The error message to be fixed.'),
  codeSnippet: z.string().describe('The code snippet that caused the error.'),
});
export type ErrorAutoFixInput = z.infer<typeof ErrorAutoFixInputSchema>;

const ErrorAutoFixOutputSchema = z.object({
  fixedCode: z.string().describe('The suggested code fix.'),
  explanation: z.string().describe('An explanation of the fix.'),
});
export type ErrorAutoFixOutput = z.infer<typeof ErrorAutoFixOutputSchema>;

export async function errorAutoFix(input: ErrorAutoFixInput): Promise<ErrorAutoFixOutput> {
  return errorAutoFixFlow(input);
}

const prompt = ai.definePrompt({
  name: 'errorAutoFixPrompt',
  input: {schema: ErrorAutoFixInputSchema},
  output: {schema: ErrorAutoFixOutputSchema},
  prompt: `You are an AI code assistant that helps developers fix errors in their code.

You will be given an error message and a code snippet. You should analyze the error message and the code snippet and suggest a fix for the error. You should also provide an explanation of the fix.

Error message: {{{errorMessage}}}
Code snippet: {{{codeSnippet}}}

Suggest code fix:`,
});

const errorAutoFixFlow = ai.defineFlow(
  {
    name: 'errorAutoFixFlow',
    inputSchema: ErrorAutoFixInputSchema,
    outputSchema: ErrorAutoFixOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
