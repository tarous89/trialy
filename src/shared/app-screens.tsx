import React from 'react';
import type {AccessPanel,AccessPage} from './AccessPanel.js';
import type {ConnectorReview} from './ConnectorsPanel.js';
/**
 * L4.5 (docs/scopes/LOADING_SPEED_2026-11-22.md): screens an app opens on request (its sharing and access settings, an
 * access page, a connector review), which the first screen never shows. Shared code renders them through appScreen() so
 * the plugin widget can supply them from its second part (src/embed/late-part.tsx); the website supplies them directly
 * (src/shared/app-screens-direct.ts, imported first by every website entry). Type-only imports: nothing is bundled here.
 */
export type AppScreenComponents={AccessPanel:typeof AccessPanel;AccessPage:typeof AccessPage;ConnectorReview:typeof ConnectorReview};
let screens:AppScreenComponents|null=null;
export function provideAppScreens(value:AppScreenComponents){screens=value;}
export function appScreen<K extends keyof AppScreenComponents>(name:K){
 function Screen(props:React.ComponentProps<AppScreenComponents[K]>){
  const Component=screens?.[name] as React.ComponentType<any>|undefined;
  if(!Component)throw Error(`App screen ${String(name)} is not provided (src/shared/app-screens.tsx)`);
  return <Component {...props}/>;
 }
 Screen.displayName='AppScreen('+String(name)+')';
 return Screen;
}
