import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { switchMap, map, tap, catchError } from 'rxjs/operators';
import { BuildingModel } from '../models/building.model';

@Injectable({ providedIn: 'root' })
export class BuildingService {
  private _items = new BehaviorSubject<BuildingModel[]>([]);
  private readonly API_URL =
    'https://script.google.com/macros/s/AKfycbwOCTG-MzhCq8A7sSveoAsBFn2DxmFi6XSseaqw37tYf2ADq9AAixzyi3BOvTvPY0Gs/exec'; // <- din webapp URL

  list(): Observable<BuildingModel[]> { return this._items.asObservable(); }
  all(): BuildingModel[] { return this._items.value; }
  getById(id: string): BuildingModel | undefined { return this._items.value.find(b => b.id === id); }

  /** Hent alle bygninger fra Sheets (GET ?action=get) og sync lokalt */
  syncFromSheets(): Observable<BuildingModel[]> {
    return fromFetch(`${this.API_URL}?action=get`).pipe(
      switchMap(res => res.json() as Promise<any[]>),
      map(rows => Array.isArray(rows) ? rows : []),
      map(rows =>
        rows
          .filter(r => r['Navn'] && r['Polygon'])
          .map(r => {
            let geom: any = null;
            try { geom = JSON.parse(r['Polygon']); } catch {}
            const floorsNum = Number(r['Antal etager']);
            const item: BuildingModel = {
              id: crypto.randomUUID(),
              name: String(r['Navn']),
              polygon: geom ?? { type: 'Polygon', coordinates: [] },
              // valgfri: sæt kun hvis det er et gyldigt tal
              floors: Number.isFinite(floorsNum) ? floorsNum : undefined
            };
            return item;
          })
      ),
      tap(list => this._items.next(list)),
      catchError(() => of(this._items.value))
    );
  }

  /** Opret lokalt + POST til Sheets (action=add). */
  create(input: Omit<BuildingModel, 'id'>): Observable<BuildingModel> {
    const item: BuildingModel = { id: crypto.randomUUID(), ...input };
    this._items.next([...this._items.value, item]); // optimistisk UI

    // "name" er valgt opgang – sendes også som 'opgang'
    const body = {
      action: 'add',
      oprettet: this.now(),
      navn: input.name ?? '',
      opgang: input.name ?? '',
      // valgfrit felt: send tom streng hvis ikke angivet
      antalEtager: (input as any).floors ?? '',
      polygon: JSON.stringify(input.polygon) // GeoJSON som tekst
    };

    fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).catch(() => { /* demo: ignorer netværksfejl */ });

    return of(item);
  }

  private now(): string {
    const d = new Date(); const p = (n: number) => n.toString().padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
}
