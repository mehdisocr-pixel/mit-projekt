import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, getFirestore } from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AccessPointScan {
  bssid: string;
  rssi: number;
  ch?: number;
}

export interface PrototypetrackerScan {
  id: string;
  timestamp: Date | null;
  bestEntry: AccessPointScan | null;
  entries: AccessPointScan[];
}

type PrototypetrackerRaw = {
  id?: unknown;
  scan_data?: unknown;
  timestamp?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
};

@Injectable({ providedIn: 'root' })
export class PrototypetrackerService {
  private readonly firestore: Firestore;

  constructor() {
    const existing: FirebaseApp | undefined = getApps().find(app => app.name === 'dualtracker');
    const app = existing ?? initializeApp(environment.dualTrackerFirebase, 'dualtracker');
    this.firestore = getFirestore(app);
  }

  loadLatestScan(): Observable<PrototypetrackerScan | null> {
    const collectionRef = collection(this.firestore, 'scans');
    return collectionData<PrototypetrackerRaw>(collectionRef, { idField: 'id' }).pipe(
      map(rows => this.pickNewest(rows, Date.now())),
      catchError(() => of(null)),
    );
  }

  loadAllScans(): Observable<PrototypetrackerScan[]> {
    const collectionRef = collection(this.firestore, 'scans');
    return collectionData<PrototypetrackerRaw>(collectionRef, { idField: 'id' }).pipe(
      map(rows => rows
        .map(row => this.mapRow(row, Date.now()))
        .filter((scan): scan is PrototypetrackerScan => !!scan)
        .sort((a, b) => {
          const ta = a.timestamp?.getTime() ?? 0;
          const tb = b.timestamp?.getTime() ?? 0;
          return tb - ta;
        }),
      ),
      catchError(() => of([])),
    );
  }

  private pickNewest(rows: PrototypetrackerRaw[], fallbackNow: number): PrototypetrackerScan | null {
    if (!rows?.length) return null;
    const mapped = rows
      .map(row => this.mapRow(row, fallbackNow))
      .filter((scan): scan is PrototypetrackerScan => !!scan);

    if (!mapped.length) return null;

    return mapped.reduce((latest: PrototypetrackerScan, current: PrototypetrackerScan) => {
      const latestTime = latest?.timestamp?.getTime() ?? 0;
      const currentTime = current?.timestamp?.getTime() ?? 0;
      return currentTime >= latestTime ? current : latest;
    }, mapped[0]);
  }

  private mapRow(raw: PrototypetrackerRaw | undefined, fallbackNow: number): PrototypetrackerScan | null {
    if (!raw) return null;
    const entries = this.parseScanData(raw.scan_data);
    const bestEntry = this.pickBest(entries);
    const parsedTs = this.parseDate(raw.timestamp ?? raw.createdAt ?? raw.created_at);
    return {
      id: typeof raw.id === 'string' ? raw.id : '',
      timestamp: parsedTs ?? (bestEntry ? new Date(fallbackNow) : null),
      bestEntry,
      entries,
    };
  }

  private parseScanData(value: unknown): AccessPointScan[] {
    if (!value && value !== '') return [];
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;

      const arrayCandidate: unknown[] | null = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as any)?.bssids)
          ? (parsed as any).bssids
          : null;
      if (!arrayCandidate) return [];

      return arrayCandidate
        .map((item: unknown) => this.normalizeScanEntry(item))
        .filter((entry: AccessPointScan | null): entry is AccessPointScan => !!entry);
    } catch {
      return [];
    }
  }

  private normalizeScanEntry(value: unknown): AccessPointScan | null {
    if (!value || typeof value !== 'object') return null;
    const bssidRaw = (value as any).bssid;
    const rssiRaw = (value as any).rssi;
    if (typeof bssidRaw !== 'string') return null;

    const rssi = typeof rssiRaw === 'number' ? rssiRaw : Number(rssiRaw);
    if (Number.isNaN(rssi)) return null;

    const chRaw = (value as any).ch;
    const ch = typeof chRaw === 'number' ? chRaw : Number(chRaw);

    return {
      bssid: bssidRaw.trim().toLowerCase(),
      rssi,
      ch: Number.isNaN(ch) ? undefined : ch,
    };
  }

  private pickBest(entries: AccessPointScan[]): AccessPointScan | null {
    if (!entries.length) return null;
    return [...entries].sort((a, b) => b.rssi - a.rssi)[0] ?? null;
  }

  private parseDate(value: unknown): Date | null {
    if (!value && value !== 0) return null;
    if (value instanceof Timestamp) return value.toDate();

    const candidate = value as { seconds?: number; toDate?: () => Date };
    if (typeof candidate?.toDate === 'function') {
      try { return candidate.toDate(); } catch {}
    }
    if (typeof candidate?.seconds === 'number') return new Date(candidate.seconds * 1000);

    if (typeof value === 'number' && !Number.isNaN(value)) return new Date(value);
    if (typeof value === 'string') {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) return new Date(numeric);
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  }
}
