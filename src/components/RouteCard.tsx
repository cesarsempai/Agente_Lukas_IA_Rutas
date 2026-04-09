import React from 'react';
import { Clock, MapPin, AlertTriangle, CheckCircle2, Star, Cloud, AlertCircle } from 'lucide-react';
import { RouteData } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { formatDuration, formatDistance } from '../lib/formatters';

interface RouteCardProps {
  route: RouteData;
  isSelected: boolean;
  isBest: boolean;
  onSelect: () => void;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, isSelected, isBest, onSelect }) => {
  const trafficColor = {
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-red-600 bg-red-50'
  }[route.trafficLevel];

  return (
    <div 
      onClick={onSelect}
      className={cn(
        "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
        isSelected 
          ? "border-primary bg-bg-soft/30 shadow-md" 
          : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
      )}
    >
      {isBest && (
        <div className="absolute -top-3 left-4 px-2 py-0.5 bg-accent text-gray-800 text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm">
          <Star size={10} fill="currentColor" />
          RECOMENDADA
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-gray-900 text-sm">{route.name}</h4>
        <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", trafficColor)}>
          Tráfico {route.trafficLevel === 'low' ? 'Bajo' : route.trafficLevel === 'medium' ? 'Medio' : 'Alto'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock size={16} className="text-secondary" />
          <span className="text-xs font-medium">{formatDuration(route.time)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin size={16} className="text-secondary" />
          <span className="text-xs font-medium">{formatDistance(route.distance)}</span>
        </div>
      </div>

      {/* Weather and Accidents */}
      <div className="flex flex-wrap gap-3 mb-4">
        {route.weather && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <Cloud size={14} className="text-secondary" />
            <span className="text-[11px]">{route.weather}</span>
          </div>
        )}
        {route.accidents && route.accidents.length > 0 && (
          <div className="flex items-center gap-1.5 text-primary font-medium">
            <AlertCircle size={14} />
            <span className="text-[11px]">{route.accidents[0]}</span>
          </div>
        )}
      </div>

      {route.recommendation && (
        <div className="mb-3 p-2 bg-bg-soft rounded-lg border border-bg-soft">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-primary leading-tight">{route.recommendation}</p>
          </div>
        </div>
      )}

      {route.specificRisk && (
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
          <p className="text-[11px] text-gray-500 leading-tight">
            <span className="font-bold text-primary">Riesgo:</span> {route.specificRisk}
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full",
                route.score && route.score > 80 ? "bg-secondary" : route.score && route.score > 50 ? "bg-accent" : "bg-primary"
              )}
              style={{ width: `${route.score || 0}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-gray-400">{Math.round(route.score || 0)}%</span>
        </div>
        <button className={cn(
          "text-[10px] font-bold px-3 py-1 rounded-lg transition-colors",
          isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}>
          {isSelected ? 'Seleccionada' : 'Seleccionar'}
        </button>
      </div>
    </div>
  );
};

export default RouteCard;
