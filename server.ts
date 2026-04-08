import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Inheritance Logic for Route Evaluation ---

enum ServiceType {
  CORPORATE = "corporativo",
  SCHOOL = "escolar",
  INDUSTRIAL = "industrial",
  TOURIST = "turístico",
}

interface RouteData {
  id: string;
  name: string;
  distance: number; // km
  time: number; // minutes
  trafficLevel: "low" | "medium" | "high";
  riskLevel: number; // 1-10
  coordinates: [number, number][];
}

abstract class RouteEvaluator {
  abstract serviceType: ServiceType;

  // Common logic for all services
  protected calculateBaseScore(route: RouteData): number {
    let score = 100;
    score -= route.distance * 0.5;
    score -= route.time * 0.2;
    
    if (route.trafficLevel === "high") score -= 20;
    if (route.trafficLevel === "medium") score -= 10;
    
    score -= route.riskLevel * 5;
    return score;
  }

  // Each service has its own recommendation logic (Polymorphism)
  abstract getRecommendation(route: RouteData): string;
  abstract getSpecificRisk(route: RouteData): string;
}

class CorporateEvaluator extends RouteEvaluator {
  serviceType = ServiceType.CORPORATE;

  getRecommendation(route: RouteData): string {
    if (route.trafficLevel === "low" && route.time < 45) {
      return "Excelente para ejecutivos, puntualidad garantizada.";
    }
    return "Ruta aceptable, pero considere posibles retrasos en horas pico.";
  }

  getSpecificRisk(route: RouteData): string {
    return route.riskLevel > 5 ? "Riesgo de retraso en zona financiera." : "Bajo riesgo operativo.";
  }
}

class SchoolEvaluator extends RouteEvaluator {
  serviceType = ServiceType.SCHOOL;

  getRecommendation(route: RouteData): string {
    if (route.riskLevel < 3) {
      return "Prioridad máxima en seguridad: Ruta recomendada para transporte escolar.";
    }
    return "Evitar si es posible, zonas con alto flujo peatonal o riesgos detectados.";
  }

  getSpecificRisk(route: RouteData): string {
    return route.riskLevel > 3 ? "Zona con cruces peligrosos para niños." : "Ruta escolar segura.";
  }
}

class IndustrialEvaluator extends RouteEvaluator {
  serviceType = ServiceType.INDUSTRIAL;

  getRecommendation(route: RouteData): string {
    if (route.distance > 50) {
      return "Ruta larga, ideal para unidades de gran capacidad.";
    }
    return "Ruta eficiente para turnos operativos.";
  }

  getSpecificRisk(route: RouteData): string {
    return "Riesgo de tráfico pesado por zona de carga.";
  }
}

class TouristEvaluator extends RouteEvaluator {
  serviceType = ServiceType.TOURIST;

  getRecommendation(route: RouteData): string {
    return "Ruta panorámica sugerida para turistas.";
  }

  getSpecificRisk(route: RouteData): string {
    return "Posible congestión en puntos de interés.";
  }
}

// Factory for evaluators
function getEvaluator(type: string): RouteEvaluator {
  switch (type.toLowerCase()) {
    case ServiceType.CORPORATE: return new CorporateEvaluator();
    case ServiceType.SCHOOL: return new SchoolEvaluator();
    case ServiceType.INDUSTRIAL: return new IndustrialEvaluator();
    case ServiceType.TOURIST: return new TouristEvaluator();
    default: return new CorporateEvaluator();
  }
}

// --- Express Server Setup ---

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Route Analysis
  app.post("/api/analyze-routes", (req, res) => {
    const { serviceType, routes } = req.body;
    const evaluator = getEvaluator(serviceType);

    const analyzedRoutes = routes.map((route: RouteData) => ({
      ...route,
      recommendation: evaluator.getRecommendation(route),
      specificRisk: evaluator.getSpecificRisk(route),
      score: (evaluator as any).calculateBaseScore(route) // Accessing protected for demo
    }));

    // Sort by score descending
    analyzedRoutes.sort((a: any, b: any) => b.score - a.score);

    res.json({
      bestRouteId: analyzedRoutes[0].id,
      routes: analyzedRoutes
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
