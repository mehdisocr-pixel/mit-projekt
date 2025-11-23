import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RegionhTrackerService } from '../regionh-tracker/regionh-tracker.service';

@Component({
  selector: 'app-dropdown-regionh-tracker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown-regionh-tracker.component.html',
  styleUrls: ['./dropdown-regionh-tracker.component.css'],
})
export class DropdownRegionhTrackerComponent {
  showDropdown = false;
  isSaving = false;
  errorMsg = '';

  ssidOptions = ['RegHAdm', 'RegHTeknik', 'RegHGaest', 'RegHMedico'];
  channelOptions = Array.from({ length: 13 }, (_, i) => i + 1);
  selectedSsid = '';
  selectedChannel: number | null = null;

  constructor(public router: Router, private trackerService: RegionhTrackerService) {}

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  goTo(path: string) {
    this.showDropdown = false;
    this.router.navigate([path]);
  }

  goToForside() { this.goTo('/'); }
  goToLocationDb() { this.goTo('/location-db'); }
  goToSteddatabase() { this.goTo('/steddatabase'); }
  goToOpgavetyper() { this.goTo('/opgavetyper'); }

  // ENESTE geo-punkt vi beholder
  goToGeoWorkbench() { this.goTo('/geografisk-lokationsdatabase'); }
  goToRegionHTracker() { this.goTo('/regionh-tracker'); }

  @HostListener('document:click')
  onDocClick() {
    if (this.showDropdown) this.showDropdown = false;
  }

  async onSelectSsid(value: string) {
    this.selectedSsid = value;
    await this.updateAll('selectedSsid', value);
  }

  async onSelectChannel(value: number) {
    this.selectedChannel = value;
    await this.updateAll('selectedChannel', Number(value));
  }

  private async updateAll(field: 'selectedSsid' | 'selectedChannel', value: string | number) {
    this.isSaving = true;
    this.errorMsg = '';
    try {
      await this.trackerService.updateAllDevices(field, value);
    } catch (err) {
      console.error('Kunne ikke opdatere devices', err);
      this.errorMsg = 'Kunne ikke gemme valg. Prøv igen.';
    } finally {
      this.isSaving = false;
    }
  }
}
