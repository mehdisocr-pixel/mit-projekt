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
import { getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { Timestamp } from 'firebase/firestore';
import { Observable, catchError, combineLatest, firstValueFrom, map, of, switchMap } from 'rxjs';
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
  id?: unknown; // injected by collectionData via idField
  name?: unknown;
  bssid?: unknown;
  online?: unknown;
  lastSeen?: unknown;
  ip?: unknown;
  selectedSsid?: unknown;
  selectedChannel?: unknown;
};

// Marker enhed offline, hvis der ikke er modtaget heartbeat inden for denne grænse.
const OFFLINE_THRESHOLD_MS = 6_000;

@Injectable({ providedIn: 'root' })
export class RegionhTrackerService {
  private readonly firestore: Firestore;
  private readonly documentRef: ReturnType<typeof doc>;

  constructor() {
    // Sørg for at m5demo-appen er initialiseret uden at røre default app
    const existing: FirebaseApp | undefined = getApps().find((a: FirebaseApp) => a.name === 'm5demo');
    const app = existing ?? initializeApp(environment.m5DemoFirebase, 'm5demo');
    this.firestore = getFirestore(app);
    this.documentRef = doc(this.firestore, 'devices/m5demo');
  }

  // Beholder single-device endpoint hvis du bruger det andre steder.
  getDevice(): Observable<RegionhDeviceState> {
    return docData<RegionhDeviceRaw>(this.documentRef).pipe(
      map(data => this.mapRawToState(data, 'm5demo')),
      catchError(() => of({ id: 'm5demo', online: null, lastSeen: null, ip: '' })),
    );
  }

  // Realtime: hent alle enheder og lyt på hvert dokument.
  getDevices(): Observable<RegionhDeviceState[]> {
    const colRef = collection(this.firestore, 'devices');
    return collectionData<RegionhDeviceRaw>(colRef, { idField: 'id' }).pipe(
      switchMap(rows => {
        if (!rows?.length) return of([]);
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
    const snap = await firstValueFrom(
      collectionData<RegionhDeviceRaw>(collection(this.firestore, 'devices'), { idField: 'id' }).pipe(
        map(items => items.map(item => (item as any).id as string)),
        catchError(() => of([] as string[])),
      ),
    );
    const ids = snap ?? [];
    if (!ids.length) throw new Error('Ingen devices fundet');

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
      // Hvis ingen heartbeat inden for grænsen, vis offline uanset flag.
      online = age > OFFLINE_THRESHOLD_MS ? false : true;
      // Respekter eksplicit false fra backend hvis den findes.
      if (onlineRaw === false) {
        online = false;
      }
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

    // Firestore Timestamp
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    // Plain object that looks like Timestamp
    const maybeTs = value as { seconds?: number; nanoseconds?: number; toDate?: () => Date };
    if (typeof maybeTs?.toDate === 'function') {
      try {
        return maybeTs.toDate();
      } catch {
        /* ignore */
      }
    }
    if (typeof maybeTs?.seconds === 'number') {
      return new Date(maybeTs.seconds * 1000);
    }

    // Number (ms) or numeric string
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return new Date(value);
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return new Date(parsed);
      const maybeDate = new Date(value);
      if (!Number.isNaN(maybeDate.getTime())) return maybeDate;
    }

    return null;
  }
}
