/**
 * L1.5 (docs/scopes/LOADING_SPEED_2026-11-22.md, choice C): the website's second step. Every signed-in page and dialog
 * the Apps page and an app's first screen never show, in one chunk that src/web/main.tsx loads right after the first
 * screen (quietly) or when such a page is opened first. Nothing here may be imported statically by main.tsx.
 */
export {TemplateCatalog} from '../shared/TemplateCatalog.js';
export {AccountProfile} from './AccountProfile.js';
export {Subscription} from './Subscription.js';
export {AppServicesPanel} from '../shared/AppServicesPanel.js';
export {ConnectorsPanel,ConnectorReview} from '../shared/ConnectorsPanel.js';
export {CreationCenter} from '../shared/CreationCenter.js';
export {AccessPage,AccessPanel} from '../shared/AccessPanel.js';
export {SupportForm} from './SupportForm.js';
export {DatabaseAccess} from './DatabaseAccess.js';
export {LogsPanel} from '../shared/LogsPanel.js';
export {DatabasePanel} from '../shared/DatabasePanel.js';
export {Invitations} from './Invitations.js';
export {AutomationRecord} from './AutomationRecord.js';
export {RecordHistory} from '../shared/RecordHistory.js';
export {DocumentText} from '../shared/DocumentText.js';
export {FieldEditor} from '../shared/FieldEditor.js';
export {DocumentControls} from '../shared/DocumentControls.js';
export {SchemaMigration} from './SchemaMigration.js';
export {AutomationsPage} from '../shared/AutomationsPage.js';
export {AutomationBoundary} from '../shared/AutomationSettings.js';
export {MfaSettings} from './MfaSettings.js';
export {AccountSecurity} from './AccountSecurity.js';
export {Connections} from './Connections.js';
export {BulkImport} from '../shared/BulkImport.js';
export {ViewPicker,RecordView} from '../shared/WorkspaceViews.js';
// Apps home's screens other than an app (src/shared/home-screens.ts).
export {FoundationPanel} from '../shared/FoundationPanel.js';
export {CollectionsPanel} from '../shared/CollectionsPanel.js';
export {ProjectSettings} from '../shared/ProjectSettings.js';
export {ProjectsPanel} from '../shared/ProjectsPanel.js';
export {ResourcesPanel} from '../shared/ResourcesPanel.js';
