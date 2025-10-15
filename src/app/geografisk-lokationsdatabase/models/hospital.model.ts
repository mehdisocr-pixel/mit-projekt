export interface HospitalModel {
  id: string;
  name: string;                         // fx "Rigshospitalet"
  polygon: { type: 'Polygon'; coordinates: number[][][] }; // [ [ [lng,lat], ...] ]
}
