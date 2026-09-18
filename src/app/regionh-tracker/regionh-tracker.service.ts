import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  getFirestore,
  writeBatch,
} from '@angular/fire/firestore';
import { getApp, getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { Timestamp } from 'firebase/firestore';
import { Observable, catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RegionhDeviceState {
  id: string;
  name?: string;
  bssid?: string;
  online: boolean | null;
  lastSeen: Date | null;
  ip: string;
  selectedSsid?: string;
  selectedChannel?: number;
}

type RegionhDeviceRaw = {
  id?: unknown;
  name?: unknown;
  bssid?: unknown;
  online?: unknown;
  lastSeen?: unknown;
  ip?: unknown;
  selectedSsid?: unknown;
  selectedChannel?: unknown;
};

const OFFLINE_THRESHOLD_MS = 6_000;

@Injectable({ providedIn: 'root' })
export class RegionhTrackerService {
  private readonly firestore: Firestore;

  constructor() {
    // Brug sekundær app til m5demo projektet, så location-db (default app) forbliver intakt
    const existing: FirebaseApp | undefined = getApps().find(app => app.name === 'm5demo');
    const app = existing ?? initializeApp(environment.m5DemoFirebase, 'm5demo');
    this.firestore = getFirestore(app);
  }

  getDevice(): Observable<RegionhDeviceState> {
    const ref = doc(this.firestore, 'devices/m5demo');
    return docData<RegionhDeviceRaw>(ref).pipe(
      map(data => this.mapRawToState(data, 'm5demo')),
      catchError(() => of({ id: 'm5demo', online: null, lastSeen: null, ip: '' })),
    );
  }

  getDevices(): Observable<RegionhDeviceState[]> {
    const colRef = collection(this.firestore, 'devices');
    return collectionData<RegionhDeviceRaw>(colRef, { idField: 'id' }).pipe(
      switchMap(rows => {
        if (!rows?.length) return of<RegionhDeviceState[]>([]);
        // For live updates fra hvert dokument
        const streams = rows.map(raw => {
          const id = (raw as any)?.id;
          if (!id) return of(null);
          return docData<RegionhDeviceRaw>(doc(this.firestore, 'devices', id)).pipe(
            map(payload => this.mapRawToState(payload, id)),
            catchError(() => of(this.mapRawToState(undefined, id))),
          );
        });
        return combineLatest(streams).pipe(
          map(list => list.filter((v): v is RegionhDeviceState => !!v)),
        );
      }),
      catchError(() => of([])),
    );
  }

  async updateAllDevices(field: 'selectedSsid' | 'selectedChannel', value: string | number): Promise<void> {
    const ids = await collectionData(collection(this.firestore, 'devices'), { idField: 'id' })
      .pipe(
        map(items => items.map(item => (item as any).id as string)),
        catchError(() => of([] as string[])),
      )
      .toPromise();
    if (!ids || !ids.length) throw new Error('Ingen devices fundet');

    const batch = writeBatch(this.firestore);
    ids.forEach(id => {
      const ref = doc(this.firestore, 'devices', id);
      batch.set(ref, { [field]: value }, { merge: true });
    });
    await batch.commit();
  }

  private mapRawToState(data: RegionhDeviceRaw | undefined, id: string): RegionhDeviceState {
    const lastSeen = this.parseLastSeen(data?.lastSeen);
    const onlineRaw = typeof data?.online === 'boolean' ? data.online : null;
    let online: boolean | null = onlineRaw;

    if (lastSeen) {
      const age = Date.now() - lastSeen.getTime();
      online = age > OFFLINE_THRESHOLD_MS ? false : true;
      if (onlineRaw === false) online = false;
    }

    return {
      id,
      name: typeof data?.name === 'string' ? data.name : undefined,
      bssid: typeof data?.bssid === 'string' ? data.bssid : undefined,
      online,
      lastSeen,
      ip: typeof data?.ip === 'string' ? data.ip : '',
      selectedSsid: typeof data?.selectedSsid === 'string' ? data.selectedSsid : undefined,
      selectedChannel: typeof data?.selectedChannel === 'number' ? data.selectedChannel : undefined,
    };
  }

  private parseLastSeen(value: unknown): Date | null {
    if (!value && value !== 0) return null;
    if (value instanceof Timestamp) return value.toDate();

    const maybeTs = value as { seconds?: number; nanoseconds?: number; toDate?: () => Date };
    if (typeof maybeTs?.toDate === 'function') {
      try { return maybeTs.toDate(); } catch {}
    }
    if (typeof maybeTs?.seconds === 'number') return new Date(maybeTs.seconds * 1000);

    if (typeof value === 'number' && !Number.isNaN(value)) return new Date(value);
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return new Date(parsed);
      const maybeDate = new Date(value);
      if (!Number.isNaN(maybeDate.getTime())) return maybeDate;
    }
    return null;
  }
}
