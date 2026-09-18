import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { collection, DocumentData, getDocs, getFirestore, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { DropdownForsideComponent } from '../dropdown-forside/dropdown-forside.component';

const COLUMN_STORAGE_KEY = 'mitprojekt.selectedColumns';
const STERIL_APP_NAME = 'sterilvognscanner';
const COLLECTION_NAME = 'opgaver';

type ViewRow = Record<string, string>;
interface FirestoreOpgave {
  afsnitNummer?: string;
  lejeNummer?: string | number;
  macTekst?: string;
  vognNummer?: string | number;
  createdAt?: Timestamp | string;
  ap?: {
    bssid?: string;
    channel?: string | number;
    channelsAvailable?: string | number;
    rssi?: string | number;
    ssid?: string;
  };
}

@Component({
  selector: 'app-forside',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownForsideComponent],
  templateUrl: './forside.component.html',
  styleUrls: ['./forside.component.css']
})
export class ForsideComponent {
  Object = Object;
  data: ViewRow[] = [];
  filterText: string = '';
  selectedColumns: string[] = [];
  tableColumns: string[] = [];
  showColumnModal = false;

  // --- Opgave Modal ---
  showOpgaveModal = false;
  destinationSearch = '';
  opgaveSearch = '';
  valgtDestination = '';
  valgtOpgave = '';

  stedData: string[] = [];
  opgaveTyper: string[] = []; // <-- hentes fra API!
  private readonly displayColumns = [
    'afsnitNummer',
    'vognNummer',
    'lejeNummer',
    'macTekst',
    'ap.bssid',
    'ap.ssid',
    'ap.channel',
    'ap.channelsAvailable',
    'ap.rssi',
    'createdAt',
  ];

  constructor(private http: HttpClient, private router: Router) {
    const storedColumns = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (storedColumns) {
      try { this.selectedColumns = JSON.parse(storedColumns) ?? []; }
      catch { this.selectedColumns = []; }
    }

    // Hent hoveddata (opgaver) fra Firestore
    this.hentOpgaverFraFirestore();

    // Hent steddata (til destination-feltet i modal)
    this.http.get<any[]>('https://script.google.com/macros/s/AKfycby3shcE6oEhKJCZcakPdttUZoUPjOlhY5E8gJZA_rzbiibOBsCnHDb4IQ1uOjzaQqDf/exec?action=get'
    ).subscribe(res => {
      if (Array.isArray(res)) {
        this.stedData = res
          .filter(row => row['Sted'] && typeof row['Sted'] === 'string')
          .map(row => row['Sted']);
      }
    }, err => {
      console.error('Kunne ikke hente steddata', err);
      this.stedData = [];
    });
  }

  private async hentOpgaverFraFirestore() {
    try {
      const app = this.getSterilApp();
      const db = getFirestore(app);
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      this.data = snapshot.docs.map(doc => this.mapFirestoreDoc(doc));
      this.updateTableColumns();
    } catch (err) {
      console.error('Kunne ikke hente opgavedata fra Firestore', err);
      this.data = [];
      this.updateTableColumns();
      alert('Kunne ikke hente opgavedata. Prøv igen senere.');
    }
  }

  private getSterilApp(): FirebaseApp {
    const existing = getApps().find(app => app.name === STERIL_APP_NAME);
    if (existing) return existing;
    if (!environment.sterilVognFirebase) {
      throw new Error('Sterilvogn Firebase config mangler i environment.');
    }
    return initializeApp(environment.sterilVognFirebase, STERIL_APP_NAME);
  }

  private mapFirestoreDoc(doc: QueryDocumentSnapshot<DocumentData>): ViewRow {
    const data = (doc.data() || {}) as FirestoreOpgave;
    const ap = data.ap || {};
    return {
      afsnitNummer: this.toText(data.afsnitNummer),
      vognNummer: this.toText(data.vognNummer),
      lejeNummer: this.toText(data.lejeNummer),
      macTekst: this.toText(data.macTekst),
      'ap.bssid': this.toText(ap.bssid),
      'ap.ssid': this.toText(ap.ssid),
      'ap.channel': this.toText(ap.channel),
      'ap.channelsAvailable': this.toText(ap.channelsAvailable),
      'ap.rssi': this.toText(ap.rssi),
      createdAt: this.formatTimestamp(data.createdAt),
    };
  }

  private toText(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value);
  }

  private formatTimestamp(value: Timestamp | string | undefined): string {
    if (!value) return '';
    try {
      if (typeof value === 'string') return value;
      const date = value.toDate();
      if (!date) return '';
      return date.toISOString().substring(0, 16).replace('T', ' ');
    } catch {
      return '';
    }
  }

  updateTableColumns() {
    this.tableColumns = [...this.displayColumns];
  }

  get dataSorted() {
    return [...this.data].sort((a, b) => {
      return this.parseDate(b['createdAt']) - this.parseDate(a['createdAt']);
    });
  }

  private parseDate(value: string): number {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return 0;
    return parsed;
  }

  get filteredData() {
    if (!this.filterText) { return this.dataSorted; }
    const search = this.filterText.toLowerCase();
    return this.dataSorted.filter(row => Object.values(row).some(val => (val || '').toString().toLowerCase().includes(search)));
  }

  get columnsToShow() {
    const validSelection = this.selectedColumns.filter(col => this.tableColumns.includes(col));
    return (validSelection.length === 0) ? this.tableColumns : validSelection;
  }

  // Navigation og kolonner
  onGotoForside() { this.router.navigate(['/']); }
  onGotoLocationDb() { this.router.navigate(['/location-db']); }
  openColumnModal() { this.showColumnModal = true; }
  closeColumnModal() { this.showColumnModal = false; }

  toggleColumn(col: string) {
    if (this.selectedColumns.includes(col)) {
      this.selectedColumns = this.selectedColumns.filter(c => c !== col);
    } else {
      this.selectedColumns = [...this.selectedColumns, col];
    }
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(this.selectedColumns));
  }

  // ===================== OPGAVE MODAL LOGIK =====================

  openOpgaveModal() {
    this.showOpgaveModal = true;
    this.destinationSearch = '';
    this.opgaveSearch = '';
    this.valgtDestination = '';
    this.valgtOpgave = '';
    this.hentOpgaveTyperFraApi(); // <-- Hent opgavetyper FRA API HVER GANG!
  }
  closeOpgaveModal() { this.showOpgaveModal = false; }

  // Hent opgavetyper fra Google Sheet via din API
  hentOpgaveTyperFraApi() {
    this.http.get<any[]>(
      'https://script.google.com/macros/s/AKfycbxb4g6escu_D8YjCL3MM9gUVYWYj4pzXqSwCvGiCGqa9S9kqOoFiK6aVNB4xivU_zsXRA/exec'
    ).subscribe(res => {
      if (Array.isArray(res)) {
        this.opgaveTyper = res
          .filter(row => row['Opgavetype'] && typeof row['Opgavetype'] === 'string')
          .map(row => row['Opgavetype']);
      } else {
        this.opgaveTyper = [];
      }
    }, err => {
      console.error('Kunne ikke hente opgavetyper', err);
      this.opgaveTyper = [];
    });
  }

  get filteredSteder() {
    const search = (this.destinationSearch || '').toLowerCase();
    return this.stedData.filter(sted => sted.toLowerCase().includes(search)).slice(0, 8);
  }

  vaelgDestination(sted: string) {
    this.valgtDestination = sted;
    this.destinationSearch = sted;
  }

  get filteredOpgaver() {
    const search = (this.opgaveSearch || '').toLowerCase();
    return this.opgaveTyper.filter(opg => opg.toLowerCase().includes(search)).slice(0, 8);
  }

  vaelgOpgave(opg: string) {
    this.valgtOpgave = opg;
    this.opgaveSearch = opg;
  }

  opretOpgave() {
    alert(`Opgave oprettet: ${this.valgtOpgave} til ${this.valgtDestination}`);
    this.closeOpgaveModal();
  }
}
