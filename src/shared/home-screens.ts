import React from 'react';
import type {FoundationPanel} from './FoundationPanel.js';
import type {CollectionsPanel} from './CollectionsPanel.js';
import type {ProjectSettings} from './ProjectSettings.js';
import type {ProjectsPanel} from './ProjectsPanel.js';
import type {ResourcesPanel} from './ResourcesPanel.js';
/**
 * L4.5 (docs/scopes/LOADING_SPEED_2026-11-22.md): the screens Apps home opens from a card other than an app (automation
 * code, shared links, project settings, projects, forms). HomePanel takes them from this context instead of importing them,
 * so the plugin widget can load them in its second part (src/embed/late-part.tsx) while the website passes them directly
 * (src/shared/home-screens-direct.ts). Type-only imports: nothing is bundled from here.
 */
export type HomeScreenComponents={FoundationPanel:typeof FoundationPanel;CollectionsPanel:typeof CollectionsPanel;ProjectSettings:typeof ProjectSettings;ProjectsPanel:typeof ProjectsPanel;ResourcesPanel:typeof ResourcesPanel};
export const HomeScreens=React.createContext<HomeScreenComponents|null>(null);
export function useHomeScreens(){const screens=React.useContext(HomeScreens);if(!screens)throw Error('HomePanel needs HomeScreens (src/shared/home-screens.ts)');return screens;}
