import { Injectable } from '@angular/core';
import { LocationModel } from '../models/location.model';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LocationService {
  // Mock-lager – skift til HTTP senere
  private store: LocationModel[] = [];

  create(loc: LocationModel): Observable<LocationModel> {
    const id = crypto.randomUUID?.() ?? String(Date.now());
    const saved = { ...loc, id };
    this.store.push(saved);
    console.log('[LocationService] saved', saved);
    return of(saved);
  }

  list(): Observable<LocationModel[]> {
    return of(this.store);
  }

  get(id: string): Observable<LocationModel | undefined> {
    return of(this.store.find(x => x.id === id));
  }
}
