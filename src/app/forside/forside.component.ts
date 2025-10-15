import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DropdownForsideComponent } from '../dropdown-forside/dropdown-forside.component';

const COLUMN_STORAGE_KEY = 'mitprojekt.selectedColumns';

@Component({
  selector: 'app-forside',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownForsideComponent],
  templateUrl: './forside.component.html',
  styleUrls: ['./forside.component.css']
})
export class ForsideComponent {
  Object = Object;
  data: any[] = [];
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

  constructor(private http: HttpClient, private router: Router) {
    const storedColumns = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (storedColumns) {
      try { this.selectedColumns = JSON.parse(storedColumns) ?? []; }
      catch { this.selectedColumns = []; }
    }

    // Hent hoveddata (opgaver, CSV)
    this.http.get('https://docs.google.com/spreadsheets/d/e/2PACX-1vQENXQS_JPiQ5C_6d2nAFkECeuFRdb1YQYEa0vz7asljjdZ7CUbPlbpMPIeb4p0Scy6nqokuEPeHAja/pub?gid=0&single=true&output=csv',
      { responseType: 'text' }
    ).subscribe(csvData => {
      this.data = this.csvToArray(csvData);
      this.updateTableColumns();
    });

    // Hent steddata (til destination-feltet i modal)
    this.http.get<any[]>('https://script.google.com/macros/s/AKfycby3shcE6oEhKJCZcakPdttUZoUPjOlhY5E8gJZA_rzbiibOBsCnHDb4IQ1uOjzaQqDf/exec?action=get'
    ).subscribe(res => {
      if (Array.isArray(res)) {
        this.stedData = res
          .filter(row => row['Sted'] && typeof row['Sted'] === 'string')
          .map(row => row['Sted']);
      }
    });
  }

  csvToArray(csv: string): any[] {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).filter(line => line.trim().length > 0).map(line => {
      const values = line.split(',');
      const obj: any = {};
      headers.forEach((header, idx) => { obj[header] = values[idx]?.trim(); });
      return obj;
    });
  }

  updateTableColumns() {
    if (this.data.length > 0) {
      this.tableColumns = Object.keys(this.data[0]);
    }
  }

  get dataSorted() {
    return [...this.data].sort((a, b) => {
      return (new Date(b['Oprettelsestid']).getTime() - new Date(a['Oprettelsestid']).getTime());
    });
  }

  get filteredData() {
    if (!this.filterText) { return this.dataSorted; }
    const search = this.filterText.toLowerCase();
    return this.dataSorted.filter(row => Object.values(row).some(val => (val || '').toString().toLowerCase().includes(search)));
  }

  get columnsToShow() {
    return (this.selectedColumns.length === 0) ? this.tableColumns : this.selectedColumns;
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
