import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownOpgavetyperComponent } from '../dropdown-opgavetyper/dropdown-opgavetyper.component';

type SortDirection = 'asc' | 'desc' | '';

@Component({
  selector: 'app-opgavetyper',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownOpgavetyperComponent],
  templateUrl: './opgavetyper.component.html',
  styleUrls: ['./opgavetyper.component.css']
})
export class OpgavetyperComponent {
  dbRows: any[] = [];
  newOpgavetype: string = '';
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

  apiUrl = 'https://script.google.com/macros/s/AKfycbxb4g6escu_D8YjCL3MM9gUVYWYj4pzXqSwCvGiCGqa9S9kqOoFiK6aVNB4xivU_zsXRA/exec';

  constructor() {
    this.hentOpgavetyper();
  }

  hentOpgavetyper() {
    this.isLoading = true;
    this.errorMsg = '';
    fetch(`${this.apiUrl}?action=get`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sorter eller bearbejd data om nødvendigt
          this.dbRows = data;
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

  opretOpgavetype() {
    if (!this.newOpgavetype.trim()) return;
    this.isLoading = true;
    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add',
        opgavetype: this.newOpgavetype.trim()
      })
    })
      .then(res => res.json())
      .then(() => {
        this.newOpgavetype = '';
        this.hentOpgavetyper();
      })
      .catch(() => {
        alert('Kunne ikke gemme opgavetype. Tjek din internetforbindelse.');
        this.isLoading = false;
      });
  }

  // ---------- BULK IMPORT ----------
  openBulkModal() {
    this.showBulkModal = true;
    this.bulkText = '';
    this.bulkMsg = '';
    this.bulkInProgress = false;
  }

  bulkOpretOpgavetype() {
    if (!this.bulkText.trim()) return;
    this.bulkInProgress = true;
    this.bulkMsg = '';

    const lines = this.bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let posted = 0, failed = 0;

    const process = (i: number) => {
      if (i >= lines.length) {
        this.bulkMsg = `Oprettede ${posted} opgavetyper${failed ? `. ${failed} fejlede.` : ''}`;
        this.bulkInProgress = false;
        this.hentOpgavetyper();
        return;
      }
      const opgavetype = lines[i];
      fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          opgavetype
        })
      })
        .then(res => res.json())
        .then(() => {
          posted++;
          process(i + 1);
        })
        .catch(() => {
          failed++;
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
    this.isLoading = true;
    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit',
        rowIndex: this.editingRow['rowIndex'],
        opgavetype: this.editingRow['Opgavetype']
      })
    })
      .then(res => res.json())
      .then(() => {
        this.hentOpgavetyper();
        this.editingRow = null;
      })
      .catch(() => {
        alert('Kunne ikke opdatere. Tjek din internetforbindelse.');
        this.isLoading = false;
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
    this.isLoading = true;
    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        rowIndex: this.rowToDelete['rowIndex']
      })
    })
      .then(res => res.json())
      .then(() => {
        this.hentOpgavetyper();
        this.rowToDelete = null;
      })
      .catch(() => {
        alert('Kunne ikke slette. Tjek din internetforbindelse.');
        this.rowToDelete = null;
        this.isLoading = false;
      });
  }

  cancelDelete() {
    this.rowToDelete = null;
  }

  // ---------- FILTRERING OG SORTERING ----------
  get filteredRows() {
    let data = [...this.dbRows];
    const s = this.searchText.trim().toLowerCase();
    if (s) {
      data = data.filter(row =>
        (row['Opgavetype'] || '').toLowerCase().includes(s)
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
  get totalRows() {
    return this.dbRows.length;
  }
  get shownRows() {
    return this.filteredRows.length;
  }
  sortBy(column: string) {
    if (this.sortColumn === column) {
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
