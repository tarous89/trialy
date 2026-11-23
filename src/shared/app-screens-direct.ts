import {AccessPanel,AccessPage} from './AccessPanel.js';
import {ConnectorReview} from './ConnectorsPanel.js';
import {provideAppScreens} from './app-screens.js';
/** The website's app screens, bundled with the page as before (see app-screens.tsx). Imported for its effect. */
provideAppScreens({AccessPanel,AccessPage,ConnectorReview});
