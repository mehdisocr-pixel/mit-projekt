import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

const hasFirebaseConfig = !!environment?.firebase;
const hasM5DemoConfig = !!environment?.m5DemoFirebase;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(HttpClientModule),
    importProvidersFrom(FormsModule),
    provideFirebaseApp(() => {
      if (!hasFirebaseConfig) {
        console.warn('Firebase default config mangler i environment.');
      }
      return initializeApp(environment.firebase);
    }),
    // Default app Firestore/Auth
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    // Ekstra app til m5demo (navngivet, så default ikke overskrives)
    ...(hasM5DemoConfig
      ? [
          provideFirebaseApp(() => initializeApp(environment.m5DemoFirebase, 'm5demo')),
        ]
      : []),
  ],
};
