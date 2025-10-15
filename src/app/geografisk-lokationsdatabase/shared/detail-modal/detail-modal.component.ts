import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detail-modal.component.html',
  styleUrls: ['./detail-modal.component.css']
})
export class DetailModalComponent {
  @Input() title = '';
  @Input() data: Record<string, any> | null = null;

  @Output() closed = new EventEmitter<void>();

  onBackdrop(event: MouseEvent) {
    // klik på baggrunden lukker — klik inde i boksen gør ikke
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closed.emit();
    }
  }
}
