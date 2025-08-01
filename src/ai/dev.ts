import { config } from 'dotenv';
config();

import '@/ai/flows/error-auto-fix.ts';
import '@/ai/flows/natural-language-code-search.ts';
import '@/ai/flows/code-indexer.ts';
import '@/ai/flows/ai-code-explanation.ts';