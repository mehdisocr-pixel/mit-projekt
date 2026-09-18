import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ModelsManifest } from './flow-types';

export interface ModelSelection {
  roomModel: string | null;
  cartModels: string[];
  all: string[];
}

export class ModelManifestService {
  constructor(private http: HttpClient) {}

  async load(): Promise<ModelSelection> {
    let files: string[] = [];
    try {
      const manifest = await firstValueFrom(
        this.http.get<ModelsManifest>('assets/models/models.json'),
      );
      files = Array.isArray(manifest?.files) ? manifest.files : [];
    } catch {
      files = [];
    }

    const roomModel = this.pickRoomModel(files);
    const cartModels = files.filter(f => f !== roomModel);
    return { roomModel, cartModels, all: files };
  }

  assetPath(name: string): string {
    return `assets/models/${name}`;
  }

  pickCartModel(cartModels: string[], cartType: string): string | null {
    if (!cartModels.length) return null;
    const lowerType = cartType.toLowerCase();
    return (
      cartModels.find(f => f.toLowerCase().includes(lowerType)) ??
      cartModels[0] ??
      null
    );
  }

  private pickRoomModel(files: string[]): string | null {
    const lower = files.map(f => f.toLowerCase());
    const depotIdx = lower.findIndex(f => f.includes('vogndepot') || f.includes('depot'));
    if (depotIdx >= 0) return files[depotIdx];
    return files.find(f => f.toLowerCase().includes('rum')) ?? null;
  }
}
