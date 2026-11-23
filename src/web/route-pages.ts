/**
 * L1.5: pages with their own address (a shared app, joining an app or a workspace, a form, an exchange). Only those
 * addresses load this chunk, started as soon as the main script runs (src/web/main.tsx); the Apps page never loads it.
 */
export {PublicApp,JoinApp} from './PublicApp.js';
export {PublicExchange} from './PublicExchange.js';
export {RecipientExchange} from './RecipientExchange.js';
export {JoinWorkspace} from './Invitations.js';
