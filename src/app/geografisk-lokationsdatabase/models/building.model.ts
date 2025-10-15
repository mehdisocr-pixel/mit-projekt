export interface BuildingModel {
  id: string;

  // Brug 'name' som det primære (du kan beholde 'navn' valgfrit for kompatibilitet)
  name?: string;
  navn?: string;

  polygon: {
    type: 'Polygon';
    coordinates: number[][][]; // [ [ [lng,lat], ... ] ]
  };

  // VIGTIGT: valgfri og et enkelt tal (ikke array)
  floors?: number;

  // valgfri relation hvis du senere kobler hospitaler på
  hospitalId?: string;
}

export type NewBuilding = Omit<BuildingModel, 'id'>;
