import { Injectable } from '@angular/core';

export interface StedRow {
  Oprettet: string;
  Sted: string;
  Afsnitsnr: string;
  AfsnitsnavnRumnavn: string;
  Opgang: string;
  Etage: string;
  Afsnit: string;
}

@Injectable({ providedIn: 'root' })
export class SteddataService {
  private apiUrl = 'https://script.google.com/macros/s/AKfycbzQfldXlDLnCMVmOZOTb1kpUF9koF4uQH_dXaqoIXM9RuoBUpgfdZ00Znwm7UDzrGPy/exec';

  async getAll(): Promise<StedRow[]> {
    const res = await fetch(`${this.apiUrl}?action=get`);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((r: any) => r['Sted'])
      .map((r: any) => ({
        Oprettet: r['Oprettet'] ?? '',
        Sted: r['Sted'] ?? '',
        Afsnitsnr: r['Afsnitsnr'] ?? '',
        AfsnitsnavnRumnavn: r['Afsnitsnavn og/eller rumnavn'] ?? r['AfsnitsnavnRumnavn'] ?? '',
        Opgang: String(r['Opgang'] ?? ''),
        Etage: r['Etage'] ?? '',
        Afsnit: String(r['Afsnit'] ?? '')
      }));
  }

  async getUniqueOpgange(): Promise<string[]> {
    const rows = await this.getAll();
    const uniq = Array.from(new Set(rows.map(r => r.Opgang).filter(Boolean)));
    return uniq.sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }

  async getByOpgang(opgang: string): Promise<StedRow[]> {
    const rows = await this.getAll();
    return rows.filter(r => r.Opgang === String(opgang));
  }
}
