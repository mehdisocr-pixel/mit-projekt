import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { SectionModel } from '../models/section.model';
import { StedRow } from './steddata.service'; // samme folder? justér stien hvis nødvendig

@Injectable({ providedIn: 'root' })
export class SectionService {
  private _items = new BehaviorSubject<SectionModel[]>([]);
  private items$ = this._items.asObservable();

  /** Liste over alle afsnit som Observable */
  list(): Observable<SectionModel[]> {
    return this.items$;
  }

  /** Opret ét afsnit */
  create(input: Omit<SectionModel, 'id'>): Observable<SectionModel> {
    const item: SectionModel = { id: crypto.randomUUID(), ...input };
    this._items.next([...this._items.value, item]);
    return of(item);
  }

  /** Opdater kun koordinat (bruges ved “Placer markør” hvis du vil) */
  setLocation(id: string, lng: number, lat: number): void {
    const next = this._items.value.map(s =>
      s.id === id ? { ...s, location: [lng, lat] as [number, number] } : s
    );
    this._items.next(next);
  }

  /**
   * Importér alle rækker fra Steddata for en given opgang som afsnit til en bygning.
   * Kalder KUN dine eksisterende public metoder: list() og create().
   * - De-duperer på Afsnitsnr pr. buildingId (ingen dubletter).
   * - Mapper Etage-tekst (fx "Stue", "3. sal", "Kælder") til dit eksisterende etage-kodefelt.
   */
  bulkCreateFromStedRows(buildingId: string, rows: StedRow[]): Observable<void> {
    return this.list().pipe(
      take(1),
      switchMap(existing => {
        // Eksisterende afsnitsnumre for denne bygning
        const existingKeys = new Set(
          existing
            .filter(s => s.buildingId === buildingId)
            .map(s => String((s as any).afsnit ?? (s as any).afsnitsnr ?? ''))
        );

        // Filtrér kun nye rækker
        const toCreate = rows.filter(r => !!r.Afsnitsnr && !existingKeys.has(String(r.Afsnitsnr)));

        // Opret alle
        const ops = toCreate.map(r =>
          this.create({
            afsnit: r.Afsnitsnr,                         // fx "2014"
            etage: this.etageTextToCode(r.Etage),        // 1..n
            buildingId,
            description: r.AfsnitsnavnRumnavn ?? '',
            location: undefined,                         // sættes senere via “Placer markør”
          } as any)
        );

        return ops.length ? forkJoin(ops).pipe(map(() => void 0)) : of(void 0);
      })
    );
  }

  /** Mapper etage-tekst til dine eksisterende etage-koder:
   *  1=Kælder, 2=Stue, 3=1. sal, 4=2. sal, 5=3. sal …
   */
  private etageTextToCode(etage: string): number {
    if (!etage) return 2; // default Stue
    const t = etage.trim().toLowerCase();

    if (t === 'kælder') return 1;
    if (t === 'stue')   return 2;

    const m = t.match(/^(\d+)\.\s*sal$/); // "1. sal", "2. sal" ...
    if (m) {
      const n = Number(m[1]);
      return 2 + n; // 1.sal -> 3, 2.sal -> 4, ...
    }
    if (t === 'underkælder') return 1; // tilpas hvis du har særkode

    return 2;
  }
}
