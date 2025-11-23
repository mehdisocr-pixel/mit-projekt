import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DropdownLocationDbComponent } from '../dropdown-location-db/dropdown-location-db.component';
import {
  LocationDbService,
  LocationDbRecord,
  NewLocationDbRecord,
} from './location-db.service';
import { parseLocationDetails } from './location-parser';

type SortDirection = 'asc' | 'desc' | '';

type UiLocationRow = LocationDbRecord & {
  Oprettet: string;
  'AP navn': string;
  'Mac adresse': string;
  Lokation: string;
  Afsnitsnr: string;
  Opgang: string;
  Etage: string;
  Afsnit: string;
};

@Component({
  selector: 'app-location-db',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownLocationDbComponent],
  templateUrl: './location-db.component.html',
  styleUrls: ['./location-db.component.css'],
})
export class LocationDbComponent implements OnDestroy {
  private rowsSub: Subscription | null = null;

  dbRows: UiLocationRow[] = [];
  newApNavn = '';
  newMac = '';
  newLocation = '';
  hoveredRow: UiLocationRow | null = null;
  editingRow: UiLocationRow | null = null;
  rowToDelete: UiLocationRow | null = null;

  isLoading = false;
  errorMsg = '';

  searchText = '';
  sortColumn = '';
  sortDirection: SortDirection = '';

  showBulkModal = false;
  bulkText = '';
  bulkMsg = '';
  bulkInProgress = false;

  constructor(private locationDbService: LocationDbService) {
    this.hentLokationer();
  }

  ngOnDestroy(): void {
    this.rowsSub?.unsubscribe();
  }

  hentLokationer() {
    this.isLoading = true;
    this.errorMsg = '';
    this.rowsSub?.unsubscribe();
    this.rowsSub = this.locationDbService.loadAll().subscribe({
      next: rows => {
        this.dbRows = rows.map(record => this.toUiRow(record));
        this.isLoading = false;
      },
      error: () => {
        this.dbRows = [];
        this.isLoading = false;
        this.errorMsg = 'Kunne ikke hente data. Proev igen senere.';
      },
    });
  }

  opretLokation() {
    const payload = this.buildPayload(this.newApNavn, this.newMac, this.newLocation);
    if (!payload.apName && !payload.macAddress && !payload.location) {
      alert('Angiv mindst et felt foer oprettelse.');
      return;
    }
    this.locationDbService.add(payload).subscribe({
      next: () => {
        this.newApNavn = '';
        this.newMac = '';
        this.newLocation = '';
      },
      error: () => {
        alert('Kunne ikke gemme lokation. Tjek din internetforbindelse.');
      },
    });
  }

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

    const lines = this.bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const parsed: NewLocationDbRecord[] = [];
    let failedRows = 0;

    for (const line of lines) {
      const parsedLine = this.parseBulkLine(line);
      if (!parsedLine) {
        failedRows++;
        continue;
      }
      const payload = this.buildPayload(parsedLine[0], parsedLine[1], parsedLine[2]);
      if (!payload.apName && !payload.macAddress && !payload.location) {
        failedRows++;
        continue;
      }
      parsed.push(payload);
    }

    if (!parsed.length) {
      this.bulkMsg = failedRows
        ? `Ingen raekker oprettet. ${failedRows} fejlede.`
        : 'Ingen gyldige raekker fundet.';
      this.bulkInProgress = false;
      return;
    }

    this.locationDbService
      .bulkAdd(parsed)
      .then(() => {
        const posted = parsed.length;
        this.bulkMsg = `Oprettede ${posted} AP${posted === 1 ? '' : 's'}${
          failedRows ? `. ${failedRows} fejlede.` : ''
        }`;
      })
      .catch(() => {
        this.bulkMsg = 'Kunne ikke oprette AP i bulk. Proev igen senere.';
      })
      .finally(() => {
        this.bulkInProgress = false;
      });
  }

  editRow(row: UiLocationRow) {
    this.editingRow = { ...row };
  }

  saveEdit() {
    if (!this.editingRow || !this.editingRow.id) return;

    const payload: Partial<NewLocationDbRecord> = {
      apName: (this.editingRow['AP navn'] ?? '').trim(),
      macAddress: (this.editingRow['Mac adresse'] ?? '').trim(),
      location: (this.editingRow['Lokation'] ?? '').trim(),
    };

    this.locationDbService.update(this.editingRow.id, payload).subscribe({
      next: () => {
        this.editingRow = null;
      },
      error: () => {
        alert('Kunne ikke opdatere. Tjek din internetforbindelse.');
      },
    });
  }

  cancelEdit() {
    this.editingRow = null;
  }

  confirmDeleteRow(row: UiLocationRow) {
    this.rowToDelete = row;
  }

  deleteRowConfirmed() {
    if (!this.rowToDelete || !this.rowToDelete.id) return;

    this.locationDbService.delete(this.rowToDelete.id).subscribe({
      next: () => {
        this.rowToDelete = null;
      },
      error: () => {
        alert('Kunne ikke slette. Tjek din internetforbindelse.');
        this.rowToDelete = null;
      },
    });
  }

  cancelDelete() {
    this.rowToDelete = null;
  }

  get filteredRows() {
    let data = [...this.dbRows];
    const s = this.searchText.trim().toLowerCase();
    if (s) {
      data = data.filter(row =>
        Object.values(row)
          .join(' ')
          .toLowerCase()
          .includes(s),
      );
    }
    if (this.sortColumn) {
      data = data.sort((a, b) => {
        const valA = (a as Record<string, any>)[this.sortColumn] ?? '';
        const valB = (b as Record<string, any>)[this.sortColumn] ?? '';
        if (this.sortDirection === 'asc') {
          return String(valA).localeCompare(String(valB), undefined, { numeric: true });
        }
        if (this.sortDirection === 'desc') {
          return String(valB).localeCompare(String(valA), undefined, { numeric: true });
        }
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
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortColumn = '';
        this.sortDirection = '';
      } else {
        this.sortDirection = 'asc';
      }
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  sortIcon(column: string): string {
    if (this.sortColumn !== column) return '--';
    return this.sortDirection === 'asc' ? '^' : 'v';
  }

  private toUiRow(record: LocationDbRecord): UiLocationRow {
    const parsed = parseLocationDetails(record.location);
    return {
      ...record,
      Oprettet: record.createdAt,
      'AP navn': record.apName,
      'Mac adresse': record.macAddress,
      Lokation: record.location,
      Afsnitsnr: parsed?.afsnitsnr ?? '',
      Opgang: parsed?.opgang ?? '',
      Etage: parsed?.etage ?? '',
      Afsnit: parsed?.afsnit ?? '',
    };
  }

  private parseBulkLine(line: string): [string, string, string] | null {
    let parts = line.split('\t');
    if (parts.length < 3) parts = line.split(';');
    if (parts.length < 3) parts = line.split(',');
    if (parts.length < 3) return null;
    return [parts[0].trim(), parts[1].trim(), parts[2].trim()];
  }

  private buildPayload(apName: string, macAddress: string, location: string): NewLocationDbRecord {
    const trimmedApName = apName.trim();
    const trimmedMac = macAddress.trim();
    const trimmedLocation = location.trim();
    return {
      apName: trimmedApName,
      macAddress: trimmedMac,
      location: trimmedLocation,
    };
  }

}
