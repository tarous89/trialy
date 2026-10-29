import {z} from 'zod';
// Compatibility metadata for older clients; customization needs no exception.
export const designExceptionSchema=z.object({capability:z.string().max(100),userRequirement:z.string().max(1000),whyStandardInsufficient:z.string().max(1000),fieldIds:z.array(z.string().max(64)).max(200)}).strict();
