// The system prompt moved to src/designer/agent/prompt.ts so the published
// page can build it too. This file stays so nothing that imported it moves.
export { failureMessage, systemPrompt } from '../../src/designer/agent/prompt.ts';
