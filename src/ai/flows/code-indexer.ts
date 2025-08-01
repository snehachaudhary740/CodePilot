'use server';
/**
 * @fileOverview A code indexing AI agent. This has been simplified to no longer use a vector store
 * to improve performance.
 *
 * - codeIndexer - A function that handles the code indexing process.
 * - CodeIndexerInput - The input type for the codeIndexer function.
 * - CodeIndexerOutput - The return type for the codeIndexer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import JSZip from 'jszip';

const CodeIndexerInputSchema = z.object({
  codebase: z.string().describe("The codebase to index, as a ZIP file data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type CodeIndexerInput = z.infer<typeof CodeIndexerInputSchema>;

const CodeIndexerOutputSchema = z.object({
  success: z.boolean().describe('Whether the code was successfully indexed.'),
  message: z.string().describe('A message indicating the result of the indexing process.'),
});
export type CodeIndexerOutput = z.infer<typeof CodeIndexerOutputSchema>;

// This is now a no-op as indexing is handled on the client.
export async function codeIndexer(input: CodeIndexerInput): Promise<CodeIndexerOutput> {
  return codeIndexerFlow(input);
}

const codeIndexerFlow = ai.defineFlow(
  {
    name: 'codeIndexerFlow',
    inputSchema: CodeIndexerInputSchema,
    outputSchema: CodeIndexerOutputSchema,
  },
  async input => {
    return {
      success: true,
      message: 'Code will be processed on the client.',
    };
  }
);
