import {FoundationPanel} from './FoundationPanel.js';
import {CollectionsPanel} from './CollectionsPanel.js';
import {ProjectSettings} from './ProjectSettings.js';
import {ProjectsPanel} from './ProjectsPanel.js';
import {ResourcesPanel} from './ResourcesPanel.js';
import type {HomeScreenComponents} from './home-screens.js';
/** The website's Home screens, bundled with the page as before (see home-screens.ts). */
export const directHomeScreens:HomeScreenComponents={FoundationPanel,CollectionsPanel,ProjectSettings,ProjectsPanel,ResourcesPanel};
