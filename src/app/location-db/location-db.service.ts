import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from '@angular/fire/firestore';
import { serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

const COLLECTION = 'accessPoints';
const BATCH_LIMIT = 400;

interface LocationDbDocument {
  apName: string;
  macAddress: string;
  location: string;
  createdAt?: Timestamp | FieldValue | null;
}

export interface LocationDbRecord {
  id: string;
  createdAt: string;
  apName: string;
  macAddress: string;
  location: string;
}

export type NewLocationDbRecord = Omit<LocationDbRecord, 'id' | 'createdAt'>;

@Injectable({ providedIn: 'root' })
export class LocationDbService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, COLLECTION);

  loadAll(): Observable<LocationDbRecord[]> {
    return collectionData(this.collectionRef, { idField: 'id' }).pipe(
      map(rows =>
        rows.map(row => this.mapToRecord(row as LocationDbDocument & { id: string })),
      ),
    );
  }

  add(record: NewLocationDbRecord): Observable<void> {
    const payload: LocationDbDocument = {
      apName: record.apName,
      macAddress: record.macAddress,
      location: record.location,
      createdAt: serverTimestamp(),
    };
    return from(addDoc(this.collectionRef, payload)).pipe(map(() => void 0));
  }

  update(id: string, record: Partial<NewLocationDbRecord>): Observable<void> {
    const ref = doc(this.firestore, `${COLLECTION}/${id}`);
    return from(updateDoc(ref, record)).pipe(map(() => void 0));
  }

  delete(id: string): Observable<void> {
    const ref = doc(this.firestore, `${COLLECTION}/${id}`);
    return from(deleteDoc(ref)).pipe(map(() => void 0));
  }

  async bulkAdd(records: NewLocationDbRecord[]): Promise<void> {
    if (!records.length) return;
    for (let i = 0; i < records.length; i += BATCH_LIMIT) {
      const chunk = records.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(this.firestore);
      chunk.forEach(record => {
        const ref = doc(this.collectionRef);
        batch.set(ref, {
          apName: record.apName,
          macAddress: record.macAddress,
          location: record.location,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  }

  private mapToRecord(raw: LocationDbDocument & { id: string }): LocationDbRecord {
    return {
      id: raw.id,
      apName: raw.apName ?? '',
      macAddress: raw.macAddress ?? '',
      location: raw.location ?? '',
      createdAt: this.formatTimestamp(raw.createdAt),
    };
  }

  private formatTimestamp(input?: Timestamp | FieldValue | null): string {
    if (!input) return '';
    const candidate = input as any;
    const toDate = candidate?.toDate;
    if (typeof toDate !== 'function') return '';
    try {
      const date: Date | undefined = toDate.call(candidate);
      if (!date) {
        return '';
      }
      return date.toISOString().substring(0, 16).replace('T', ' ');
    } catch {
      return '';
    }
  }
}
