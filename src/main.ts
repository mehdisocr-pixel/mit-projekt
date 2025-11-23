// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { firstValueFrom, catchError, timeout, of } from 'rxjs';

import { appConfig } from './app/app.config';
import { App } from './app/app';

// Service der skal preloades
import { HospitalService } from './app/geografisk-lokationsdatabase/services/hospital.service';

// Preloader hospitalsdata før app starter (med timeout og fejlfangst)
function preloadHospitals(hospitalService: HospitalService) {
  return () =>
    firstValueFrom(
      hospitalService.syncFromSheets().pipe(
        timeout(8000),
        catchError(err => {
          console.warn('Preload af hospitaler fejlede eller timed out', err);
          return of(null);
        }),
      ),
    ).then(() => void 0);
}

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig?.providers ?? []),

    importProvidersFrom(HttpClientModule, HttpClientJsonpModule),

    {
      provide: APP_INITIALIZER,
      useFactory: preloadHospitals,
      deps: [HospitalService],
      multi: true,
    },
  ],
}).catch(err => console.error(err));
