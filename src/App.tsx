import { useState, useCallback } from 'react';
import { Map as MapIcon, MessageSquare, LayoutDashboard, Settings, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MapComponent from './components/MapComponent';
import Chatbot from './components/Chatbot';
import RouteCard from './components/RouteCard';
import { RouteData, UserPreferences } from './types';
import { generateRealRoutes } from './services/aiService';

export default function App() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [bestRouteId, setBestRouteId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'routes'>('chat');
  
  // Interactive Map Selection State
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!origin) {
      setOrigin([lat, lng]);
    } else if (!destination) {
      setDestination([lat, lng]);
    } else {
      // Reset and start over if both are set
      setOrigin([lat, lng]);
      setDestination(null);
    }
  }, [origin, destination]);

  const handleChatComplete = async (prefs: UserPreferences) => {
    setIsAnalyzing(true);
    setActiveTab('routes');
    
    // Use coordinates from map if available, otherwise use from chat (if AI extracted them)
    const finalOrigin = origin || prefs.originCoords;
    const finalDest = destination || prefs.destinationCoords;

    if (!finalOrigin || !finalDest) {
      console.warn("Missing coordinates for routing");
      setIsAnalyzing(false);
      return;
    }

    // 1. Generate real routes using OSRM
    try {
      const baseRoutes = await generateRealRoutes(prefs, finalOrigin, finalDest);
      
      // 2. Call backend for analysis
      const response = await fetch('/api/analyze-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: prefs.serviceType,
          routes: baseRoutes
        })
      });
      
      const data = await response.json();
      setRoutes(data.routes);
      setBestRouteId(data.bestRouteId);
      setSelectedRouteId(data.bestRouteId);
    } catch (error) {
      console.error("Error analyzing routes:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-bg-main font-sans text-gray-900 overflow-hidden">
      {/* Sidebar Navigation (Left) */}
      <aside className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-8 gap-8 shrink-0">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <MapIcon size={24} />
        </div>
        
        <nav className="flex flex-col gap-4">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-bg-soft text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <MessageSquare size={24} />
          </button>
          <button 
            onClick={() => setActiveTab('routes')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'routes' ? 'bg-bg-soft text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <LayoutDashboard size={24} />
          </button>
          <button className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <Settings size={24} />
          </button>
        </nav>

        <div className="mt-auto">
          <button className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <Info size={24} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">Lukas IA</h1>
            <p className="text-xs text-gray-500 font-medium">operaciones de ruta</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">Usuario Cesar e Israel</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Dragoncitos</p>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full border-2 border-white shadow-sm overflow-hidden">
              <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Cesar" alt="Avatar" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden p-6 gap-6">
          {/* Left Panel: Map */}
          <section className="flex-[2] relative min-w-0">
            <MapComponent 
              routes={routes} 
              selectedRouteId={selectedRouteId} 
              onMapClick={handleMapClick}
              origin={origin}
              destination={destination}
            />
            
            {/* Overlay Stats */}
            {selectedRouteId && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/50 z-[1000] flex justify-around items-center"
              >
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Distancia Total</p>
                  <p className="text-lg font-bold text-primary">{routes.find(r => r.id === selectedRouteId)?.distance} km</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tiempo Estimado</p>
                  <p className="text-lg font-bold text-primary">{routes.find(r => r.id === selectedRouteId)?.time} min</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nivel de Riesgo</p>
                  <p className="text-lg font-bold text-secondary">{routes.find(r => r.id === selectedRouteId)?.riskLevel}/10</p>
                </div>
              </motion.div>
            )}
          </section>

          {/* Right Panel: Chat or Routes */}
          <aside className="flex-1 min-w-[380px] max-w-[450px] flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {activeTab === 'chat' ? (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full"
                >
                  <Chatbot 
                    onComplete={handleChatComplete} 
                    mapOrigin={origin}
                    mapDestination={destination}
                  />
                </motion.div>
              ) : (
                <motion.div 
                  key="routes"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg">Comparativa de Rutas</h2>
                    <button 
                      onClick={() => setActiveTab('chat')}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Nueva Consulta
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-sm font-medium">Analizando rutas óptimas...</p>
                      </div>
                    ) : routes.length > 0 ? (
                      routes.map((route) => (
                        <RouteCard 
                          key={route.id}
                          route={route}
                          isSelected={selectedRouteId === route.id}
                          isBest={bestRouteId === route.id}
                          onSelect={() => setSelectedRouteId(route.id)}
                        />
                      ))
                    ) : origin && destination ? (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 text-center px-8">
                        <MapIcon size={48} strokeWidth={1} />
                        <p className="text-sm font-medium">No se pudieron generar rutas para estos puntos. Intenta con otros lugares.</p>
                        <button 
                          onClick={() => { setOrigin(null); setDestination(null); setRoutes([]); }}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Limpiar Mapa
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 text-center px-8">
                        <MapIcon size={48} strokeWidth={1} />
                        <p className="text-sm font-medium">Completa la conversación con el chatbot o marca puntos en el mapa para ver las rutas aquí.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>
      </main>
    </div>
  );
}
