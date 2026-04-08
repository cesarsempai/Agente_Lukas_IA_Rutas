export type ServiceType = 'corporativo' | 'escolar' | 'industrial' | 'turístico';

export interface RouteData {
  id: string;
  name: string;
  distance: number;
  time: number;
  trafficLevel: 'low' | 'medium' | 'high';
  riskLevel: number;
  coordinates: [number, number][];
  recommendation?: string;
  specificRisk?: string;
  score?: number;
  weather?: string;
  accidents?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UserPreferences {
  origin: string;
  destination: string;
  originCoords?: [number, number];
  destinationCoords?: [number, number];
  arrivalTime: string;
  serviceType: ServiceType;
  zonesToAvoid: string[];
}
