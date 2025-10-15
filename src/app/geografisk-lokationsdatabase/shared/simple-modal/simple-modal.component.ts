import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';

@Component({
  selector: 'app-simple-modal',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet],
  templateUrl: './simple-modal.component.html',
  styleUrls: ['./simple-modal.component.css']
})
export class SimpleModalComponent {
  @Input() component!: any;
  @Input() inputs: Record<string, any> = {};
  @Output() closed = new EventEmitter<void>();

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.closed.emit();
  }
}
