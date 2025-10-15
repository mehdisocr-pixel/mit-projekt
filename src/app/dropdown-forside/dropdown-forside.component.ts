import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dropdown-forside',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown-forside.component.html',
  styleUrls: ['./dropdown-forside.component.css']
})
export class DropdownForsideComponent {
  showDropdown = false;

  @Output() openColumnModal = new EventEmitter<void>();

  constructor(public router: Router) {}

  private closeAnd(navigateTo: string) {
    this.showDropdown = false;
    this.router.navigate([navigateTo]);
  }

  goToForside()        { this.closeAnd('/'); }
  goToLocationDb()     { this.closeAnd('/location-db'); }
  goToSteddatabase()   { this.closeAnd('/steddatabase'); }
  goToOpgavetyper()    { this.closeAnd('/opgavetyper'); }

  // ENESTE geo-punkt vi beholder
  goToGeoWorkbench()   { this.closeAnd('/geografisk-lokationsdatabase'); }

  handleOpenColumnModal(event: MouseEvent) {
    event.stopPropagation();
    this.showDropdown = false;
    this.openColumnModal.emit();
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.showDropdown) this.showDropdown = false;
  }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }
}
