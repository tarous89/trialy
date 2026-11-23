import React from 'react';
/** How a host opens a TrialAgents link from the access screens (the plugins open it through the assistant's host). */
export const AccessHost=React.createContext<((url:string)=>void)|null>(null);
