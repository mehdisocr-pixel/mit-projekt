import { Injectable } from '@angular/core';
import { LocationDbService, LocationDbRecord } from '../location-db/location-db.service';
import { parseLocationDetails } from '../location-db/location-parser';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ResolvedLocation {
  apName: string;
  location: string;
  opgang: string;
  etage: string;
  afsnit: string;
  afsnitsnr: string;
}

@Injectable({ providedIn: 'root' })
export class ApResolverService {
  private cache = new Map<string, ResolvedLocation>();
  private cacheVersion$ = new BehaviorSubject<number>(0);

  constructor(private locationDbService: LocationDbService) {
    this.bootstrapCache();
  }

  /**
   * Emits whenever the AP cache is rebuilt, so consumers can re-run lookups.
   */
  get cacheChanges$(): Observable<number> {
    return this.cacheVersion$.asObservable();
  }

  resolveBssid(bssid: string | undefined | null): ResolvedLocation | null {
    if (!bssid) return null;
    return this.cache.get(bssid.trim().toLowerCase()) ?? null;
  }

  private bootstrapCache() {
    this.locationDbService.loadAll().subscribe({
      next: rows => this.rebuildCache(rows),
      error: () => {
        this.cache.clear();
        this.bumpVersion();
      },
    });
  }

  private rebuildCache(rows: LocationDbRecord[]) {
    const next = new Map<string, ResolvedLocation>();
    rows.forEach(row => {
      const mac = (row.macAddress || '').trim().toLowerCase();
      if (!mac) return;
      const parsed = parseLocationDetails(row.location);
      next.set(mac, {
        apName: row.apName ?? '',
        location: row.location ?? '',
        opgang: parsed?.opgang ?? '',
        etage: parsed?.etage ?? '',
        afsnit: parsed?.afsnit ?? '',
        afsnitsnr: parsed?.afsnitsnr ?? '',
      });
    });
    this.cache = next;
    this.bumpVersion();
  }

  private bumpVersion() {
    const nextVal = this.cacheVersion$.value + 1;
    this.cacheVersion$.next(nextVal);
  }
}
