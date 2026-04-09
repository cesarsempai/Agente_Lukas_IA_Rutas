import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteData } from '../types';

interface MapComponentProps {
  routes: RouteData[];
  selectedRouteId: string | null;
  onMapClick: (lat: number, lng: number) => void;
  origin: [number, number] | null;
  destination: [number, number] | null;
}

import { Search, Navigation } from 'lucide-react';

export default function MapComponent({ 
  routes, 
  selectedRouteId, 
  onMapClick, 
  origin, 
  destination 
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeLayersRef = useRef<{ [key: string]: L.Polyline }>({});
  const markersRef = useRef<L.Marker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 13);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocate = () => {
    if (!mapRef.current) return;
    mapRef.current.locate({ setView: true, maxZoom: 15 });
  };

  const originIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const destinationIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([19.4326, -99.1332], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);

    mapRef.current.on('click', (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onMapClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(m => mapRef.current?.removeLayer(m));
    markersRef.current = [];

    if (origin) {
      const m = L.marker(origin, { icon: originIcon }).addTo(mapRef.current).bindPopup('Origen');
      markersRef.current.push(m);
    }

    if (destination) {
      const m = L.marker(destination, { icon: destinationIcon }).addTo(mapRef.current).bindPopup('Destino');
      markersRef.current.push(m);
    }
  }, [origin, destination]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing routes
    Object.values(routeLayersRef.current).forEach(layer => mapRef.current?.removeLayer(layer));
    routeLayersRef.current = {};

    routes.forEach(route => {
      const isSelected = route.id === selectedRouteId;
      const layer = L.polyline(route.coordinates, {
        color: isSelected ? '#3b82f6' : '#94a3b8',
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 1 : 0.6
      }).addTo(mapRef.current!);

      layer.bindPopup(`<b>${route.name}</b><br>${route.distance} km | ${route.time} min`);
      routeLayersRef.current[route.id] = layer;

      if (isSelected) {
        layer.bringToFront();
        mapRef.current?.fitBounds(layer.getBounds(), { padding: [50, 50] });
      }
    });
  }, [routes, selectedRouteId]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative z-0">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1001] flex gap-2 pointer-events-none">
        <form 
          onSubmit={handleSearch}
          className="flex-1 max-w-md pointer-events-auto flex gap-2"
        >
          <div className="relative flex-1">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ciudad o dirección en todo el mundo..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/95 backdrop-blur shadow-xl rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
          <button 
            type="submit"
            disabled={isSearching}
            className="bg-primary text-white p-2.5 rounded-xl shadow-xl hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {isSearching ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <Search size={20} />}
          </button>
        </form>
        
        <button 
          onClick={handleLocate}
          className="pointer-events-auto bg-white/95 backdrop-blur p-2.5 rounded-xl shadow-xl border border-gray-200 text-primary hover:bg-gray-50 transition-all"
          title="Mi ubicación"
        >
          <Navigation size={20} />
        </button>
      </div>

      {/* Map Instructions Overlay */}
      {!origin || !destination ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-blue-100 text-xs font-bold text-blue-600 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
          <span>{!origin ? 'Haz clic para marcar el PUNTO DE PARTIDA' : 'Haz clic para marcar el DESTINO'}</span>
        </div>
      ) : null}
    </div>
  );
}
