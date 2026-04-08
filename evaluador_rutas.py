import math

class Ruta:
    def __init__(self, id, nombre, distancia, tiempo, trafico, riesgo):
        self.id = id
        self.nombre = nombre
        self.distancia = distancia  # km
        self.tiempo = tiempo        # min
        self.trafico = trafico      # 'bajo', 'medio', 'alto'
        self.riesgo = riesgo        # 1-10
        self.score = 0
        self.recomendacion = ""

class EvaluadorRutas:
    """Clase Maestra (Padre)"""
    def __init__(self, servicio_type):
        self.servicio_type = servicio_type

    def evaluar(self, ruta):
        # Lógica base: menos tiempo es mejor
        score = 100 - (ruta.tiempo * 0.5)
        
        # Penalización por tráfico
        if ruta.trafico == 'alto': score -= 30
        elif ruta.trafico == 'medio': score -= 10
        
        ruta.score = max(0, score)
        return ruta

class EvaluadorEscolar(EvaluadorRutas):
    """Clase Hija (Herencia) especializada en seguridad"""
    def evaluar(self, ruta):
        # Primero usamos la lógica del padre
        super().evaluar(ruta)
        
        # Prioridad absoluta: Seguridad (Riesgo bajo)
        if ruta.riesgo > 5:
            ruta.score -= 40
            ruta.recomendacion = "No recomendada para niños por zona de riesgo."
        else:
            ruta.score += 10
            ruta.recomendacion = "Ruta segura y verificada para transporte escolar."
            
        return ruta

class EvaluadorCorporativo(EvaluadorRutas):
    """Clase Hija especializada en puntualidad"""
    def evaluar(self, ruta):
        super().evaluar(ruta)
        
        # Prioridad: Tiempo y Tráfico
        if ruta.tiempo < 30 and ruta.trafico == 'bajo':
            ruta.score += 15
            ruta.recomendacion = "Excelente opción para llegar a tiempo a la oficina."
            
        return ruta

# --- Ejemplo de uso ---
if __name__ == "__main__":
    # Creamos una ruta de prueba
    mi_ruta = Ruta("1", "Vía Rápida", 15.5, 45, "medio", 2)
    
    # Usamos el evaluador escolar (Python detecta cuál usar)
    evaluador = EvaluadorEscolar("escolar")
    resultado = evaluador.evaluar(mi_ruta)
    
    print(f"--- Evaluación en Python ---")
    print(f"Servicio: {evaluador.servicio_type}")
    print(f"Ruta: {resultado.nombre}")
    print(f"Puntaje: {resultado.score}%")
    print(f"Nota: {resultado.recomendacion}")
