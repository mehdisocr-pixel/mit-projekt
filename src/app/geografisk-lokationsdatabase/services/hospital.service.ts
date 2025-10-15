// src/app/services/hospital.service.ts
// Husk at have HttpClientModule i dit AppModule.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { HospitalModel } from '../models/hospital.model';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class HospitalService {
  private _items = new BehaviorSubject<HospitalModel[]>([]);
  private readonly API_URL = 'https://script.google.com/macros/s/AKfycbyD0-UJoIXlBXQwTChGzAP6gBwkEqNFdQn83unHTvyF4IyYKsoGzBZObVeN_ty2KUzK/exec';

  constructor(private http: HttpClient) {}

  list(): Observable<HospitalModel[]> {
    return this._items.asObservable();
  }

  /** Hent alle hospitaler fra Sheets (GET ?action=get) og sync lokalt */
  syncFromSheets(): Observable<HospitalModel[]> {
    // Henter raekker via standard HTTP GET
    const url = `${this.API_URL}?action=get&_t=${Date.now()}`;
    return this.http.get<any[]>(url).pipe(
      map(rows => Array.isArray(rows) ? rows : []),
      map(rows =>
        rows
          .filter(r => r['Navn'] && r['Polygon'])
          .map(r => {
            let geom: any = null;
            try { geom = JSON.parse(r['Polygon']); } catch {}
            const item: HospitalModel = {
              id: crypto.randomUUID(),
              name: String(r['Navn']),
              polygon: geom ?? { type: 'Polygon', coordinates: [] }
            };
            return item;
          })
      ),
      tap(list => this._items.next(list)),
      catchError(() => of(this._items.value))
    );
  }

  /** Opret lokalt + POST til Sheets (action=add). */
  create(input: Omit<HospitalModel, 'id'>): Observable<HospitalModel> {
    const item: HospitalModel = { id: crypto.randomUUID(), ...input };
    this._items.next([...this._items.value, item]); // optimistisk

    const body = {
      action: 'add',
      oprettet: this.now(),
      navn: input.name ?? '',
      polygon: JSON.stringify(input.polygon) // send som string
    };

    // Beholder 'text/plain' for at undgå CORS preflight
    fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).catch(() => {});

    return of(item);
  }

  private now(): string {
    const d = new Date(); const p = (n: number) => n.toString().padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
}
