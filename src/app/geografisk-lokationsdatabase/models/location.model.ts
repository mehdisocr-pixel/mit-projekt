// GeoJSON-typer (minimal) + din Location-model
export type Position = [number, number]; // [lon, lat]

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: Position;
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: Position[][][]; // ydre + (optionelt) huller
}

export type Geometry = GeoJsonPoint | GeoJsonPolygon;

export interface LocationModel {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  geometry: Geometry; // Point eller Polygon
  // evt. metadata: createdBy, validFrom, validTo, etc.
}
