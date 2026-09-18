import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dropdown-prototypetracker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown-prototypetracker.component.html',
  styleUrls: ['./dropdown-prototypetracker.component.css'],
})
export class DropdownPrototypetrackerComponent {
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
  goToLocationDb() { this.goTo('/location-db'); }
  goToSteddatabase() { this.goTo('/steddatabase'); }
  goToBssidScans() { this.goTo('/bssid-scans'); }
  goToGeoWorkbench() { this.goTo('/geografisk-lokationsdatabase'); }
  goToVogndepotFlow() { this.goTo('/vogndepot-flow'); }

  @HostListener('document:click')
  onDocClick() {
    if (this.showDropdown) this.showDropdown = false;
  }
}
