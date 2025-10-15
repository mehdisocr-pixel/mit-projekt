import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownSteddatabaseComponent } from '../dropdown-steddatabase/dropdown-steddatabase.component';

type SortDirection = 'asc' | 'desc' | '';

// Opgange til at afgøre 2-cifret opgang (61 fjernet som aftalt)
const OPGANGE_SET = new Set<number>([
  2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 39, 41, 42, 44, 45, 54, 55, 56, 57, 58,
  62, 75, 76, 85, 86, 87, 93, 94, 95, 99
]);

@Component({
  selector: 'app-steddatabase',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownSteddatabaseComponent],
  templateUrl: './steddatabase.component.html',
  styleUrls: ['./steddatabase.component.css']
})
export class SteddatabaseComponent {
  dbRows: any[] = [];
  newSted: string = '';
  hoveredRow: any = null;
  editingRow: any = null;
  rowToDelete: any = null;

  isLoading = false;
  errorMsg = '';

  searchText = '';
  sortColumn: string = '';
  sortDirection: SortDirection = '';

  showBulkModal = false;
  bulkText = '';
  bulkMsg = '';
  bulkInProgress = false;

  apiUrl = 'https://script.google.com/macros/s/AKfycbzQfldXlDLnCMVmOZOTb1kpUF9koF4uQH_dXaqoIXM9RuoBUpgfdZ00Znwm7UDzrGPy/exec';

  constructor() {
    this.hentSteder();
  }

  hentSteder() {
    this.isLoading = true;
    this.errorMsg = '';
    fetch(`${this.apiUrl}?action=get`)
      .then(res => res.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          this.dbRows = data
            .filter(row => row['Sted'] && typeof row['Sted'] === 'string')
            .map(row => {
              // Brug serverens felter hvis de findes
              if (row['Afsnitsnr'] && (row['Opgang'] || row['Opgang'] === 0) && row['Etage'] && (row['Afsnit'] || row['Afsnit'] === 0)) {
                return {
                  'Oprettet': row['Oprettet'] ?? '',
                  'Sted': row['Sted'] ?? '',
                  'Afsnitsnr': row['Afsnitsnr'] ?? '',
                  'AfsnitsnavnRumnavn': row['Afsnitsnavn og/eller rumnavn'] ?? row['AfsnitsnavnRumnavn'] ?? '',
                  'Opgang': String(row['Opgang'] ?? ''),
                  'Etage': row['Etage'] ?? '',
                  'Afsnit': String(row['Afsnit'] ?? '')
                };
              }
              // Fallback for gamle rækker: lokal parsing
              return this.parseSted(row['Sted'], row['Oprettet']);
            });
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

  danskTidsstempel(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // ---------- OPRET ----------
  opretSted() {
    if (!this.newSted.trim()) return;
    const oprettet = this.danskTidsstempel();
    const body = JSON.stringify({ action: 'add', oprettet, sted: this.newSted.trim() });

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // <- undgår preflight
      body
    })
      .then(res => res.json())
      .then(() => {
        this.hentSteder();
        this.newSted = '';
      })
      .catch(() => {
        alert('Kunne ikke gemme sted. Tjek din internetforbindelse.');
      });
  }

  // ---------- BULK IMPORT ----------
  openBulkModal() {
    this.showBulkModal = true;
    this.bulkText = '';
    this.bulkMsg = '';
    this.bulkInProgress = false;
  }

  bulkOpretSted() {
    if (!this.bulkText.trim()) return;
    this.bulkInProgress = true;
    this.bulkMsg = '';

    const lines = this.bulkText.split('\n').filter(l => l.trim().length > 0);
    let failedRows = 0, posted = 0;

    const process = (i: number) => {
      if (i >= lines.length) {
        this.bulkMsg = `Oprettede ${posted} sted${posted === 1 ? '' : 'er'}${failedRows ? `. ${failedRows} fejlede.` : ''}`;
        this.bulkInProgress = false;
        this.hentSteder();
        return;
      }
      const sted = lines[i].trim();
      if (!sted) { failedRows++; process(i + 1); return; }

      const oprettet = this.danskTidsstempel();
      const body = JSON.stringify({ action: 'add', oprettet, sted });

      fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // <- undgår preflight
        body
      })
        .then(res => res.json())
        .then(() => { posted++; process(i + 1); })
        .catch(() => { failedRows++; process(i + 1); });
    };

    process(0);
  }
  // ----------- SLUT BULK -----------

  // ---------- REDIGER / SLET ----------
  editRow(row: any) { this.editingRow = { ...row }; }

  saveEdit() {
    if (!this.editingRow) return;
    const rowIndex = this.dbRows.findIndex(r => r.Oprettet === this.editingRow['Oprettet']) + 2;
    const body = JSON.stringify({
      action: 'edit',
      rowIndex,
      oprettet: this.editingRow['Oprettet'],
      sted: this.editingRow['Sted']
    });

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // <- undgår preflight
      body
    })
      .then(res => res.json())
      .then(() => { this.hentSteder(); this.editingRow = null; })
      .catch(() => { alert('Kunne ikke opdatere. Tjek din internetforbindelse.'); });
  }

  cancelEdit() { this.editingRow = null; }

  confirmDeleteRow(row: any) { this.rowToDelete = row; }

  deleteRowConfirmed() {
    if (!this.rowToDelete) return;
    const rowIndex = this.dbRows.findIndex(r => r.Oprettet === this.rowToDelete['Oprettet']) + 2;
    const body = JSON.stringify({ action: 'edit', rowIndex, oprettet: '', sted: '' });

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // <- undgår preflight
      body
    })
      .then(res => res.json())
      .then(() => { this.hentSteder(); this.rowToDelete = null; })
      .catch(() => {
        alert('Kunne ikke slette (blanke). Tjek din internetforbindelse.');
        this.rowToDelete = null;
      });
  }

  cancelDelete() { this.rowToDelete = null; }

  // ---------- FILTRERING OG SORTERING ----------
  get filteredRows() {
    let data = [...this.dbRows];
    const s = this.searchText.trim().toLowerCase();
    if (s) {
      data = data.filter(row =>
        Object.values(row).join(' ').toLowerCase().includes(s)
      );
    }
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

  get totalRows() { return this.dbRows.length; }
  get shownRows() { return this.filteredRows.length; }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      if (this.sortDirection === 'asc') this.sortDirection = 'desc';
      else if (this.sortDirection === 'desc') { this.sortColumn = ''; this.sortDirection = ''; }
      else this.sortDirection = 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }
  sortIcon(column: string): string {
    if (this.sortColumn !== column) return '⇅';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // ---------- UAFHÆNGIG SPLIT/LOGIK ----------
  parseSted(stedString: string, oprettet?: string) {
    let afsnitsnr = '', afsnitsnavn = '', rumnavn = '', opgang = '', etage = '', afsnit = '';

    // Find 4-cifret afsnitsnummer først i strengen
    const m = (stedString || '').trim().match(/^(\d{4})(.*)$/);
    if (m) {
      afsnitsnr = m[1];                 // ABCD
      const rest = (m[2] || '').trim(); // evt. tekst efter

      const A  = afsnitsnr.substring(0, 1);               // A
      const AB = parseInt(afsnitsnr.substring(0, 2), 10); // AB
      const B  = afsnitsnr.substring(1, 2);               // B
      const C  = afsnitsnr.substring(2, 3);               // C
      const BC = afsnitsnr.substring(1, 3);               // BC
      const D  = afsnitsnr.substring(3, 4);               // D

      // 1) Find opgang (2-cifret hvis AB er i listen; 61 er ikke i listen)
      if (OPGANGE_SET.has(AB)) {
        opgang = String(AB);

        // 2) Etage for 2-cifret opgang: C
        if (C === '0') etage = 'Stue';
        else if (C >= '1' && C <= '7') etage = `${parseInt(C, 10)}. sal`;
        else if (C === '8') etage = 'Underkælder';
        else if (C === '9') etage = 'Kælder';
        else etage = '';

        afsnit = D;
      } else {
        // 1-cifret opgang: A
        opgang = A;

        if (A === '2' || A === '3') {
          // Opgang 2 og 3: etagekode = BC
          if (BC === '00') etage = 'Stue';
          else if (/^(0[1-9]|1[0-6])$/.test(BC)) etage = `${parseInt(BC, 10)}. sal`; // 01..16
          else if (BC === '18') etage = 'Underkælder';
          else if (BC === '19') etage = 'Kælder';
          else etage = '';
        } else {
          // Øvrige 1-cifrede: etagekode = B
          if (B === '0') etage = 'Stue';
          else if (B >= '1' && B <= '7') etage = `${parseInt(B, 10)}. sal`;
          else if (B === '8') etage = 'Underkælder';
          else if (B === '9') etage = 'Kælder';
          else etage = '';
        }

        afsnit = D;
      }

      // Navn/rumnavn efter afsnitsnummer
      if (rest) {
        const rumMatch = rest.match(/^(.+)\s+([^\s]+.*)$/);
        if (rumMatch) {
          afsnitsnavn = rumMatch[1];
          rumnavn = rumMatch[2];
        } else {
          afsnitsnavn = rest;
        }
      }
    }

    const samletNavn =
      afsnitsnavn && rumnavn ? `${afsnitsnavn} ${rumnavn}` :
      afsnitsnavn || rumnavn || '';

    return {
      'Oprettet': oprettet ?? '',
      'Sted': stedString,
      'Afsnitsnr': afsnitsnr,
      'AfsnitsnavnRumnavn': samletNavn,
      'Opgang': opgang,
      'Etage': etage,
      'Afsnit': afsnit
    };
  }
}
