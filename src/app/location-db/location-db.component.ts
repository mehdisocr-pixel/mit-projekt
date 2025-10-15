import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownLocationDbComponent } from '../dropdown-location-db/dropdown-location-db.component';

type SortDirection = 'asc' | 'desc' | '';

@Component({
  selector: 'app-location-db',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownLocationDbComponent],
  templateUrl: './location-db.component.html',
  styleUrls: ['./location-db.component.css']
})
export class LocationDbComponent {
  dbRows: any[] = [];
  newApNavn: string = '';
  newMac: string = '';
  newLocation: string = '';
  hoveredRow: any = null;
  editingRow: any = null;
  rowToDelete: any = null;

  // Loader & error
  isLoading = false;
  errorMsg = '';

  // Søgning og sortering
  searchText = '';
  sortColumn: string = '';
  sortDirection: SortDirection = '';

  // Bulk AP modal state
  showBulkModal = false;
  bulkText = '';
  bulkMsg = '';
  bulkInProgress = false;

  apiUrl = 'https://script.google.com/macros/s/AKfycbz_-uwxG8OLja0a64a7qTyobO79gxOLzkblhC5KeTLuTSrbUKwSbmLjzzPajng0epSzUQ/exec';

  constructor() {
    this.hentLokationer();
  }

  hentLokationer() {
    this.isLoading = true;
    this.errorMsg = '';
    fetch(`${this.apiUrl}?action=get`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // FILTRÉR HELT TOMME RÆKKER VÆK!
          this.dbRows = data
            .filter(row =>
              row['Oprettet']?.trim() ||
              row['AP navn']?.trim() ||
              row['Mac adresse']?.trim() ||
              row['Lokation']?.trim()
            )
            .map(row => ({
              Oprettet: row['Oprettet'],
              'AP navn': row['AP navn'],
              'Mac adresse': row['Mac adresse'],
              Lokation: row['Lokation']
            }));
        } else {
          this.dbRows = [];
        }
        this.isLoading = false;
      })
      .catch(() => {
        this.dbRows = [];
        this.isLoading = false;
        this.errorMsg = 'Kunne ikke hente data. Prøv igen senere.';
      });
  }

  opretLokation() {
    const now = new Date();
    const oprettet = now.toISOString().substring(0, 16).replace('T', ' ');

    const body = new URLSearchParams({
      action: 'add',
      oprettet,
      apnavn: this.newApNavn,
      macadresse: this.newMac,
      lokation: this.newLocation
    });

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body
    })
      .then(res => res.json())
      .then(() => {
        this.hentLokationer();
        this.newApNavn = '';
        this.newMac = '';
        this.newLocation = '';
      })
      .catch(() => {
        alert('Kunne ikke gemme lokation. Tjek din internetforbindelse.');
      });
  }

  // ---------- BULK IMPORT ----------
  openBulkModal() {
    this.showBulkModal = true;
    this.bulkText = '';
    this.bulkMsg = '';
    this.bulkInProgress = false;
  }

  bulkOpretAP() {
    if (!this.bulkText.trim()) return;
    this.bulkInProgress = true;
    this.bulkMsg = '';

    // Split linjer
    const lines = this.bulkText.split('\n').filter(l => l.trim().length > 0);
    let failedRows = 0, posted = 0;

    // Helper: parse line
    const parseLine = (line: string): [string, string, string] | null => {
      let vals = line.split('\t');
      if (vals.length < 3) vals = line.split(';');
      if (vals.length < 3) vals = line.split(',');
      if (vals.length < 3) return null;
      return [vals[0].trim(), vals[1].trim(), vals[2].trim()];
    };

    const process = (i: number) => {
      if (i >= lines.length) {
        this.bulkMsg = `Oprettede ${posted} AP${posted === 1 ? '' : 's'}${failedRows ? `. ${failedRows} fejlede.` : ''}`;
        this.bulkInProgress = false;
        this.hentLokationer();
        return;
      }
      const row = parseLine(lines[i]);
      if (!row) {
        failedRows++;
        process(i + 1);
        return;
      }
      const [apnavn, macadresse, lokation] = row;
      const oprettet = new Date().toISOString().substring(0, 16).replace('T', ' ');
      const body = new URLSearchParams({
        action: 'add',
        oprettet,
        apnavn,
        macadresse,
        lokation
      });

      fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body
      })
        .then(res => res.json())
        .then(() => {
          posted++;
          process(i + 1);
        })
        .catch(() => {
          failedRows++;
          process(i + 1);
        });
    };

    process(0);
  }
  // ----------- SLUT BULK -----------

  editRow(row: any) {
    this.editingRow = { ...row };
  }

  saveEdit() {
    if (!this.editingRow) return;
    const rowIndex = this.dbRows.findIndex(r => r.Oprettet === this.editingRow['Oprettet']) + 2;

    const body = new URLSearchParams({
      action: 'edit',
      rowIndex: String(rowIndex),
      oprettet: this.editingRow['Oprettet'],
      apnavn: this.editingRow['AP navn'],
      macadresse: this.editingRow['Mac adresse'],
      lokation: this.editingRow['Lokation']
    });

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body
    })
      .then(res => res.json())
      .then(() => {
        this.hentLokationer();
        this.editingRow = null;
      })
      .catch(() => {
        alert('Kunne ikke opdatere. Tjek din internetforbindelse.');
      });
  }

  cancelEdit() {
    this.editingRow = null;
  }

  confirmDeleteRow(row: any) {
    this.rowToDelete = row;
  }

  deleteRowConfirmed() {
    if (!this.rowToDelete) return;
    const rowIndex = this.dbRows.findIndex(r => r.Oprettet === this.rowToDelete['Oprettet']) + 2;

    const body = new URLSearchParams({
      action: 'edit',
      rowIndex: String(rowIndex),
      oprettet: '',
      apnavn: '',
      macadresse: '',
      lokation: ''
    });

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body
    })
      .then(res => res.json())
      .then(() => {
        this.hentLokationer();
        this.rowToDelete = null;
      })
      .catch(() => {
        alert('Kunne ikke slette (blanke). Tjek din internetforbindelse.');
        this.rowToDelete = null;
      });
  }

  cancelDelete() {
    this.rowToDelete = null;
  }

  // ---------- FILTRERING OG SORTERING ----------
  get filteredRows() {
    let data = [...this.dbRows];
    // Fritekstsøgning på alle synlige felter
    const s = this.searchText.trim().toLowerCase();
    if (s) {
      data = data.filter(row =>
        Object.values(row)
          .join(' ')
          .toLowerCase()
          .includes(s)
      );
    }
    // Sortering
    if (this.sortColumn) {
      data = data.sort((a, b) => {
        let valA = a[this.sortColumn] ?? '';
        let valB = b[this.sortColumn] ?? '';
        if (this.sortDirection === 'asc') return valA.localeCompare(valB, undefined, { numeric: true });
        if (this.sortDirection === 'desc') return valB.localeCompare(valA, undefined, { numeric: true });
        return 0;
      });
    }
    return data;
  }

  get totalRows() {
    return this.dbRows.length;
  }

  get shownRows() {
    return this.filteredRows.length;
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      // Skift retning eller nulstil
      if (this.sortDirection === 'asc') this.sortDirection = 'desc';
      else if (this.sortDirection === 'desc') {
        this.sortColumn = '';
        this.sortDirection = '';
      } else this.sortDirection = 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  sortIcon(column: string): string {
    if (this.sortColumn !== column) return '⇅';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }
}
