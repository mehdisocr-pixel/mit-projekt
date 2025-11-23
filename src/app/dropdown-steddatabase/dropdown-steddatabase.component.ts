import { Component, HostListener, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dropdown-steddatabase',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown-steddatabase.component.html',
  styleUrls: ['./dropdown-steddatabase.component.css']
})
export class DropdownSteddatabaseComponent {
  showDropdown = false;

  @Output() bulkCreate = new EventEmitter<void>();

  constructor(public router: Router) {}

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  goToForside() {
    this.showDropdown = false;
    this.router.navigate(['/']);
  }

  goToLocationDb() {
    this.showDropdown = false;
    this.router.navigate(['/location-db']);
  }

  goToRegionhTracker() {
    this.showDropdown = false;
    this.router.navigate(['/regionh-tracker']);
  }

  openBulkModal() {
    this.showDropdown = false;
    this.bulkCreate.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event) {
    if (this.showDropdown) this.showDropdown = false;
  }
}
