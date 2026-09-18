import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-speed-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './speed-control.component.html',
  styleUrls: ['./speed-control.component.css'],
})
export class SpeedControlComponent {
  @Input() speed = 120; // minutter per sekund
  @Output() speedChange = new EventEmitter<number>();

  onChange(value: number): void {
    this.speed = Math.max(0, value);
    this.speedChange.emit(this.speed);
  }
}
