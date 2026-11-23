/**
 * L4.5 (docs/scopes/LOADING_SPEED_2026-11-22.md, owner decision 23 November, section 6 item 9): the widget's second part.
 * Pages the first screen (Apps home, an app, a preview) never shows. scripts/build-embed.ts keeps everything reachable
 * from src/embed/main.tsx in the widget file and puts what only this module reaches into one file, downloaded right
 * after the first screen is shown (src/embed/late-part.tsx). Nothing here may be imported by main.tsx directly.
 */
export {TemplateCatalog} from '../shared/TemplateCatalog.js';
export {EmbeddedConnectors} from './Connectors.js';
export {AutomationsPage} from '../shared/AutomationsPage.js';
export {CreationCenter} from '../shared/CreationCenter.js';
export {LogsPanel} from '../shared/LogsPanel.js';
export {DatabasePanel} from '../shared/DatabasePanel.js';
export {RecordHistory} from '../shared/RecordHistory.js';
export {DocumentControls} from '../shared/DocumentControls.js';
export {BulkImport} from '../shared/BulkImport.js';
export {ViewPicker,RecordView} from '../shared/WorkspaceViews.js';
export {FieldEditor} from '../shared/FieldEditor.js';
// Apps home's screens other than an app (src/shared/home-screens.ts).
export {FoundationPanel} from '../shared/FoundationPanel.js';
export {CollectionsPanel} from '../shared/CollectionsPanel.js';
export {ProjectSettings} from '../shared/ProjectSettings.js';
export {ProjectsPanel} from '../shared/ProjectsPanel.js';
export {ResourcesPanel} from '../shared/ResourcesPanel.js';
// An app's access screens and the connector review (src/shared/app-screens.tsx).
export {AccessPanel,AccessPage} from '../shared/AccessPanel.js';
export {ConnectorReview} from '../shared/ConnectorsPanel.js';
