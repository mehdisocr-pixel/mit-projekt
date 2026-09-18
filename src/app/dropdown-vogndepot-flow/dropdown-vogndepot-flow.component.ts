import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dropdown-vogndepot-flow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown-vogndepot-flow.component.html',
  styleUrls: ['./dropdown-vogndepot-flow.component.css'],
})
export class DropdownVogndepotFlowComponent {
  showDropdown = false;

  constructor(public router: Router) {}

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  private closeAnd(path: string) {
    this.showDropdown = false;
    this.router.navigate([path]);
  }

  goToForside() { this.closeAnd('/'); }
  goToLocationDb() { this.closeAnd('/location-db'); }
  goToSteddatabase() { this.closeAnd('/steddatabase'); }
  goToOpgavetyper() { this.closeAnd('/opgavetyper'); }
  goToRegionhTracker() { this.closeAnd('/regionh-tracker'); }
  goToPrototypetracker() { this.closeAnd('/prototypetracker'); }
  goToBssidScans() { this.closeAnd('/bssid-scans'); }
  goToGeoWorkbench() { this.closeAnd('/geografisk-lokationsdatabase'); }
  goToVogndepot() { this.closeAnd('/vogndepot-flow'); }

  @HostListener('document:click')
  onDocClick() {
    if (this.showDropdown) this.showDropdown = false;
  }
}
