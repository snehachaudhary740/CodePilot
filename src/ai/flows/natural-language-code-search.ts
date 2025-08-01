'use server';
/**
 * @fileOverview An AI agent to search for code functionality using natural language queries.
 *
 * - naturalLanguageCodeSearch - A function that handles the code search process.
 * - NaturalLanguageCodeSearchInput - The input type for the naturalLanguageCodeSearch function.
 * - NaturalLanguageCodeSearchOutput - The return type for the naturalLanguageCodeSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NaturalLanguageCodeSearchInputSchema = z.object({
  query: z.string().describe('The natural language query to search for code functionality.'),
  codeSnippet: z.string().describe('A string containing the content of one or more source files. Each file\'s content is prefixed with its path, e.g., "File: src/components/button.tsx\\n\\n... file content ...". Files are separated by "---".'),
});
export type NaturalLanguageCodeSearchInput = z.infer<
  typeof NaturalLanguageCodeSearchInputSchema
>;

const NaturalLanguageCodeSearchOutputSchema = z.object({
  relevantCode: z.string().describe('A consolidated code block containing the most relevant functions or snippets from all provided files, based on the user\'s query. Each snippet should be clearly marked with a comment indicating its original file path, e.g., "// File: src/components/button.tsx".'),
  explanation: z.string().describe('An AI-generated explanation of the combined code snippets.'),
});
export type NaturalLanguageCodeSearchOutput = z.infer<
  typeof NaturalLanguageCodeSearchOutputSchema
>;

export async function naturalLanguageCodeSearch(
  input: NaturalLanguageCodeSearchInput
): Promise<NaturalLanguageCodeSearchOutput> {
  return naturalLanguageCodeSearchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'naturalLanguageCodeSearchPrompt',
  input: {schema: NaturalLanguageCodeSearchInputSchema},
  output: {schema: NaturalLanguageCodeSearchOutputSchema},
  prompt: `You are an AI code assistant. A user has searched their codebase with the query "{{query}}".

The following string contains the contents of one or more files that were found to contain the query. Your task is to analyze all the provided file contents and find the most relevant functions or code blocks that semantically match the user's query. The match does not need to be exact; for example, a query for "list tasks" should match a function named "list_task".

Combine all the relevant code snippets you find into a single code block. Crucially, before each snippet, you must add a comment with its original file path, for example:
// File: src/utils/tasks.ts
function list_task() { ... }

// File: src/components/task-list.tsx
// ... another relevant snippet

Finally, provide a concise explanation of the combined code you've extracted.

File Content(s):
\`\`\`
{{codeSnippet}}
\`\`\`
`,
});

const naturalLanguageCodeSearchFlow = ai.defineFlow(
  {
    name: 'naturalLanguageCodeSearchFlow',
    inputSchema: NaturalLanguageCodeSearchInputSchema,
    outputSchema: NaturalLanguageCodeSearchOutputSchema,
  },
  async (input) => {
    if (!input.codeSnippet) {
       return {
        relevantCode: 'No relevant code found.',
        explanation: 'Could not find any code matching your query.',
      };
    }

    const {output} = await prompt(input);
    return output!;
  }
);
