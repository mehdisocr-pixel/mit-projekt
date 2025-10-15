// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { appConfig } from './app/app.config';
import { App } from './app/app';

// 👉 Service vi vil kalde inden appen starter
import { HospitalService } from './app/geografisk-lokationsdatabase/services/hospital.service';

// APP_INITIALIZER skal returnere en factory, som returnerer en funktion der returnerer et Promise<void>
function preloadHospitals(hospitalService: HospitalService) {
  return () => firstValueFrom(hospitalService.syncFromSheets()).then(() => void 0);
}

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig?.providers ?? []),
    importProvidersFrom(HttpClientModule, HttpClientJsonpModule),
    { provide: APP_INITIALIZER, useFactory: preloadHospitals, deps: [HospitalService], multi: true },
  ],
}).catch(err => console.error(err));
