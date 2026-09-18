import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dropdown-bssid-scans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown-bssid-scans.component.html',
  styleUrls: ['./dropdown-bssid-scans.component.css'],
})
export class DropdownBssidScansComponent {
  showDropdown = false;

  constructor(public router: Router) {}

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  goTo(path: string) {
    this.showDropdown = false;
    this.router.navigate([path]);
  }

  goToForside() { this.goTo('/'); }
  goToRegionhTracker() { this.goTo('/regionh-tracker'); }
  goToPrototypetracker() { this.goTo('/prototypetracker'); }
  goToLocationDb() { this.goTo('/location-db'); }
  goToSteddatabase() { this.goTo('/steddatabase'); }
  goToOpgavetyper() { this.goTo('/opgavetyper'); }
  goToGeoWorkbench() { this.goTo('/geografisk-lokationsdatabase'); }
  goToBssidScans() { this.goTo('/bssid-scans'); }
  goToVogndepotFlow() { this.goTo('/vogndepot-flow'); }

  @HostListener('document:click')
  onDocClick() {
    if (this.showDropdown) this.showDropdown = false;
  }
}
