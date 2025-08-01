'use server';

import { codeIndexer, CodeIndexerInput } from '@/ai/flows/code-indexer';
import { naturalLanguageCodeSearch, NaturalLanguageCodeSearchInput } from '@/ai/flows/natural-language-code-search';
import { explainCode, ExplainCodeInput } from '@/ai/flows/ai-code-explanation';
import { errorAutoFix, ErrorAutoFixInput } from '@/ai/flows/error-auto-fix';

export async function startIndexing(input: CodeIndexerInput) {
    // This is now a no-op as indexing is handled on the client.
    return { success: true, message: 'Code will be processed on the client.' };
}

export async function searchCode(input: NaturalLanguageCodeSearchInput) {
    return await naturalLanguageCodeSearch(input);
}

export async function getCodeExplanation(input: ExplainCodeInput) {
    return await explainCode(input);
}

export async function fixCodeError(input: ErrorAutoFixInput) {
    return await errorAutoFix(input);
}
