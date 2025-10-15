import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-geo-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './geo-actions.component.html',
  styleUrl: './geo-actions.component.css'
})
export class GeoActionsComponent {
  @Output() createBuilding = new EventEmitter<void>();
  @Output() createSection  = new EventEmitter<void>();
}
