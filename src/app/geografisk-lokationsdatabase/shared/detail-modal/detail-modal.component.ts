import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationDbRecord } from '../../../location-db/location-db.service';

export interface DetailSection {
  title: string;
  rows: Record<string, any>;
  apEntries?: LocationDbRecord[];
}

@Component({
  selector: 'app-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detail-modal.component.html',
  styleUrls: ['./detail-modal.component.css'],
})
export class DetailModalComponent {
  @Input() title = '';
  private _sections: DetailSection[] | null = null;
  @Input() set sections(value: DetailSection[] | null) {
    this._sections = value;
    this.activeTab = 0;
    this.editIndex = null;
    this.editingId = null;
  }
  get sections(): DetailSection[] | null {
    return this._sections;
  }

  @Output() closed = new EventEmitter<void>();
  @Output() apUpdated = new EventEmitter<{ id: string; changes: { apName: string; macAddress: string; location: string } }>();

  activeTab = 0;
  editIndex: number | null = null;
  editModel = { apName: '', macAddress: '', location: '' };
  editingId: string | null = null;

  setTab(index: number) {
    this.activeTab = index;
    this.editIndex = null;
    this.editingId = null;
  }

  get currentRows(): Record<string, any> | null {
    if (!this.sections || !this.sections.length) return null;
    return this.sections[this.activeTab]?.rows ?? null;
  }

  get currentSection(): DetailSection | null {
    if (!this.sections || !this.sections.length) return null;
    return this.sections[this.activeTab] ?? null;
  }

  beginEdit(ap: LocationDbRecord, index: number) {
    this.editIndex = index;
    this.editingId = ap.id;
    this.editModel = {
      apName: ap.apName,
      macAddress: ap.macAddress,
      location: ap.location,
    };
  }

  cancelEdit() {
    this.editIndex = null;
    this.editingId = null;
    this.editModel = { apName: '', macAddress: '', location: '' };
  }

  saveEdit(ap: LocationDbRecord) {
    if (!this.editingId) return;
    const changes = {
      apName: this.editModel.apName.trim(),
      macAddress: this.editModel.macAddress.trim(),
      location: this.editModel.location.trim(),
    };
    this.apUpdated.emit({ id: this.editingId, changes });
    Object.assign(ap, changes);
    this.cancelEdit();
  }

  onBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closed.emit();
    }
  }
}
