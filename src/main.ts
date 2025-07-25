import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeSr from '@angular/common/locales/sr';

// Register Serbian locale
registerLocaleData(localeSr);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    { provide: LOCALE_ID, useValue: 'sr' }  // Set default locale to Serbian
  ]
}).catch((err) => console.error(err));
