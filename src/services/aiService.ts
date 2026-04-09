import { GoogleGenAI } from "@google/genai";
import { ChatMessage, UserPreferences, RouteData } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will not work.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || "dummy-key" });
  }
  return aiInstance;
}

export async function getChatResponse(messages: ChatMessage[]) {
  const ai = getAI();
  const systemInstruction = `
    Eres "Lukas IA", un asistente de logística directo y eficiente.
    
    OBJETIVO:
    Ayudar al usuario a generar rutas de transporte.
    
    REGLAS:
    1. NO preguntes por el clima ni por accidentes.
    2. NO menciones "en cualquier parte del mundo".
    3. NO pidas el origen y destino si el usuario ya los marcó en el mapa.
    4. SÉ BREVE. No des explicaciones largas de los servicios a menos que te lo pidan.
    5. Solo necesitas saber: Hora de llegada y Tipo de servicio (corporativo, escolar, industrial o turístico).
    
    IMPORTANTE: 
    - Cuando tengas la hora y el tipo de servicio, genera el JSON final inmediatamente.
    - El JSON debe incluir las coordenadas reales de los puntos seleccionados.
      { 
        "complete": true, 
        "preferences": { 
          "origin": "Origen", 
          "destination": "Destino",
          "originCoords": [lat, lng],
          "destinationCoords": [lat, lng],
          "arrivalTime": "hora",
          "serviceType": "tipo",
          "zonesToAvoid": []
        } 
      }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    config: {
      systemInstruction,
    }
  });

  return response.text;
}

async function fetchOSRMRoute(points: [number, number][], profile: string = 'driving'): Promise<{ coordinates: [number, number][], distance: number, duration: number }> {
  try {
    const coordinates = points.map(p => `${p[1]},${p[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('OSRM route not found');
    }

    return {
      coordinates: data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]),
      distance: data.routes[0].distance, // in meters
      duration: data.routes[0].duration  // in seconds
    };
  } catch (error) {
    console.error("OSRM Error:", error);
    return {
      coordinates: [points[0], points[points.length - 1]],
      distance: 0,
      duration: 0
    };
  }
}

async function fetchOSRMAlternatives(start: [number, number], end: [number, number]): Promise<{ coordinates: [number, number][], distance: number, duration: number }[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&alternatives=3`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes) {
      return [{ coordinates: [start, end], distance: 0, duration: 0 }];
    }

    return data.routes.map((route: any) => ({
      coordinates: route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]),
      distance: route.distance,
      duration: route.duration
    }));
  } catch (error) {
    console.error("OSRM Alternatives Error:", error);
    return [{ coordinates: [start, end], distance: 0, duration: 0 }];
  }
}

export async function generateRealRoutes(prefs: UserPreferences, originCoords: [number, number], destCoords: [number, number]): Promise<RouteData[]> {
  // 1. Try to get natural alternatives first
  let routes = await fetchOSRMAlternatives(originCoords, destCoords);
  
  // 2. If we don't have 3 distinct paths, force them using waypoints
  if (routes.length < 3) {
    const midLat = (originCoords[0] + destCoords[0]) / 2;
    const midLng = (originCoords[1] + destCoords[1]) / 2;
    
    // Create two different waypoints by offsetting the midpoint
    const waypoint1: [number, number] = [midLat + 0.008, midLng - 0.008];
    const waypoint2: [number, number] = [midLat - 0.008, midLng + 0.008];

    const routeVia1 = await fetchOSRMRoute([originCoords, waypoint1, destCoords]);
    const routeVia2 = await fetchOSRMRoute([originCoords, waypoint2, destCoords]);

    // Rebuild the routes array to ensure diversity
    routes = [routes[0], routeVia1, routeVia2];
  }

  const routeNames = [
    'Ruta Principal (Vía Rápida)',
    'Ruta Alternativa (Vía Secundaria)',
    'Ruta de Contingencia (Zonas Residenciales)'
  ];

  const weatherOptions = ['Despejado', 'Nublado', 'Lluvia ligera', 'Neblina'];
  
  return routes.slice(0, 3).map((route, index) => {
    const distanceKm = Number((route.distance / 1000).toFixed(1));
    const accidentOptions = [
      `Colisión menor en km ${Math.max(0.1, (Math.random() * distanceKm)).toFixed(1)}`,
      'Obras en la vía (carril derecho cerrado)',
      'Vehículo varado obstruyendo paso',
      'Manifestación pacífica en glorieta'
    ];

    return {
      id: `route-${index + 1}`,
      name: routeNames[index],
      distance: distanceKm, // meters to km
      time: Math.round(route.duration / 60), // seconds to minutes
      trafficLevel: index === 0 ? 'low' : index === 1 ? 'medium' : 'high',
      riskLevel: index === 0 ? 2 : index === 1 ? 1 : 4,
      coordinates: route.coordinates,
      weather: weatherOptions[Math.floor(Math.random() * weatherOptions.length)],
      accidents: index === 2 ? [accidentOptions[Math.floor(Math.random() * accidentOptions.length)]] : []
    };
  });
}
