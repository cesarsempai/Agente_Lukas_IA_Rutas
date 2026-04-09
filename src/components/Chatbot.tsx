import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, UserPreferences } from '../types';
import { getChatResponse } from '../services/aiService';

interface ChatbotProps {
  onComplete: (prefs: UserPreferences) => void;
  mapOrigin: [number, number] | null;
  mapDestination: [number, number] | null;
}

export default function Chatbot({ onComplete, mapOrigin, mapDestination }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hola, soy Lukas IA. Marca el origen y destino en el mapa para comenzar.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Acknowledge map selections
  useEffect(() => {
    if (mapOrigin && mapDestination && messages.length < 3) {
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: 'Puntos detectados. ¿A qué hora necesitas llegar y qué servicio prefieres (Corporativo, Escolar, Industrial o Turístico)?' }
      ]);
    }
  }, [mapOrigin, mapDestination]);

  const triggerManualComplete = () => {
    onComplete({
      origin: "Punto en el mapa",
      destination: "Punto en el mapa",
      originCoords: mapOrigin!,
      destinationCoords: mapDestination!,
      arrivalTime: "Lo antes posible",
      serviceType: "corporativo",
      zonesToAvoid: []
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getChatResponse([...messages, userMessage]);
      
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*"complete":\s*true[\s\S]*\}/);
      let cleanText = responseText;
      
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[0].replace(/```json|```/g, '').trim();
          const data = JSON.parse(jsonStr);
          if (data.complete && data.preferences) {
            onComplete(data.preferences);
            cleanText = responseText.replace(jsonMatch[0], '').trim();
            if (!cleanText) cleanText = "¡Perfecto! He recolectado toda la información. Generando rutas recomendadas...";
          }
        } catch (e) {
          console.error("Error parsing JSON from AI", e);
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: cleanText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu solicitud. ¿Podrías intentar de nuevo?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-primary text-white flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg">
          <Bot size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight text-bg-soft">Lukas IA</h3>
          <p className="text-xs text-bg-soft/80">Asistente Logístico</p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-main/30"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user' ? 'bg-secondary/20 text-primary' : 'bg-white border border-gray-200 text-gray-600'
                }`}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Manual Trigger Button */}
        {mapOrigin && mapDestination && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center py-2"
          >
            <button 
              onClick={triggerManualComplete}
              className="px-6 py-2.5 bg-accent text-gray-800 font-bold rounded-xl shadow-lg hover:bg-accent/90 transition-all flex items-center gap-2 border border-accent/20"
            >
              <Navigation size={18} />
              Generar Rutas Ahora
            </button>
          </motion.div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span className="text-xs text-gray-500">Lukas IA está pensando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe tu mensaje..."
            className="w-full pl-4 pr-12 py-3 bg-bg-main/20 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-primary text-white rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:hover:bg-primary transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
