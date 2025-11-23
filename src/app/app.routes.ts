import { Routes } from '@angular/router';

import { ForsideComponent } from './forside/forside.component';
import { LocationDbComponent } from './location-db/location-db.component';
import { SteddatabaseComponent } from './steddatabase/steddatabase.component';
import { OpgavetyperComponent } from './opgavetyper/opgavetyper.component';
import { RegionhTrackerComponent } from './regionh-tracker/regionh-tracker.component';

import { GEOGRAFISK_LOKATION_ROUTES } from './geografisk-lokationsdatabase/geografisk-lokationsdatabase.routes';

export const routes: Routes = [
  { path: '', component: ForsideComponent },
  { path: 'location-db', component: LocationDbComponent },
  { path: 'steddatabase', component: SteddatabaseComponent },
  { path: 'opgavetyper', component: OpgavetyperComponent },
  { path: 'regionh-tracker', component: RegionhTrackerComponent },

  // Geo samlet side
  { path: 'geografisk-lokationsdatabase', children: GEOGRAFISK_LOKATION_ROUTES },
];
