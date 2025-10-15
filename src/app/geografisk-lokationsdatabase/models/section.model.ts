export type EtageKode = 1 | 2 | 3 | 4 | 5;

export interface SectionModel {
  id: string;
  afsnit: string;
  etage: EtageKode;
  buildingId: string;
  description?: string;
  // NY: gør valgfri, så eksisterende create(...) ikke fejler
  location?: [number, number]; // [lng, lat] — sættes fra markør senere
}
export type NewSection = Omit<SectionModel, 'id'>;
