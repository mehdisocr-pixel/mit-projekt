import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, map } from 'rxjs';
import { DropdownBssidScansComponent } from '../dropdown-bssid-scans/dropdown-bssid-scans.component';
import { AccessPointScan, PrototypetrackerScan, PrototypetrackerService } from '../prototypetracker/prototypetracker.service';
import { ApResolverService } from '../regionh-tracker/ap-resolver.service';

interface EntryView {
  bssid: string;
  rssiText: string;
  channelText: string;
  locationLabel: string;
  matchClass: 'matched' | 'unmatched';
}

interface BssidScanRow {
  id: string;
  timestampText: string;
  bestBssid: string;
  rssiText: string;
  channelText: string;
  locationLabel: string;
  matchClass: 'matched' | 'unmatched';
  entries: EntryView[];
}

@Component({
  selector: 'app-bssid-scans',
  standalone: true,
  imports: [CommonModule, DropdownBssidScansComponent],
  templateUrl: './bssid-scans.component.html',
  styleUrls: ['./bssid-scans.component.css'],
})
export class BssidScansComponent {
  readonly rows$: Observable<BssidScanRow[]>;

  constructor(
    private prototypetrackerService: PrototypetrackerService,
    private apResolver: ApResolverService,
  ) {
    this.rows$ = combineLatest([
      this.prototypetrackerService.loadAllScans(),
      this.apResolver.cacheChanges$,
    ]).pipe(
      map(([scans]) => scans.map(scan => this.toRow(scan))),
    );
  }

  private toRow(scan: PrototypetrackerScan): BssidScanRow {
    const best = scan.bestEntry;
    const resolved = this.apResolver.resolveBssid(best?.bssid);

    const timestampText = scan.timestamp
      ? scan.timestamp.toLocaleString('da-DK', {
          timeZone: 'Europe/Copenhagen',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      : 'Ukendt tidspunkt';

    const bestBssid = best?.bssid ?? 'Ukendt BSSID';
    const rssiText = typeof best?.rssi === 'number' ? `${best.rssi} dBm` : 'Ukendt';
    const channelText = typeof best?.ch === 'number' && !Number.isNaN(best.ch) ? `CH ${best.ch}` : '-';

    const locationLabel = resolved?.location?.trim()
      ? resolved.location
      : 'Sporet uden registrering';

    return {
      id: scan.id || '(uden id)',
      timestampText,
      bestBssid,
      rssiText,
      channelText,
      locationLabel,
      matchClass: resolved ? 'matched' : 'unmatched',
      entries: this.toEntryViews(scan.entries ?? []),
    };
  }

  private toEntryViews(entries: AccessPointScan[]): EntryView[] {
    return entries.map(entry => {
      const resolved = this.apResolver.resolveBssid(entry.bssid);
      const locationLabel = resolved?.location?.trim()
        ? resolved.location
        : 'Sporet uden registrering';
      return {
        bssid: entry.bssid,
        rssiText: typeof entry.rssi === 'number' ? `${entry.rssi} dBm` : 'Ukendt',
        channelText: typeof entry.ch === 'number' && !Number.isNaN(entry.ch) ? `ch ${entry.ch}` : '',
        locationLabel,
        matchClass: resolved ? 'matched' : 'unmatched',
      };
    });
  }
}
