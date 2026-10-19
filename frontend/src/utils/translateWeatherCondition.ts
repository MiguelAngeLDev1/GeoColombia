/**
 * Traduce condiciones meteorológicas conocidas (inglés Open-Meteo / backend)
 * a español. No muta el valor original del API: solo presenta una etiqueta.
 */

const WEATHER_CONDITION_ES: Record<string, string> = {
  'clear sky': 'Cielo despejado',
  'mainly clear': 'Mayormente despejado',
  'partly cloudy': 'Parcialmente nublado',
  overcast: 'Nublado',
  fog: 'Niebla',
  'depositing rime fog': 'Niebla con escarcha',
  'light drizzle': 'Llovizna ligera',
  'moderate drizzle': 'Llovizna moderada',
  'dense drizzle': 'Llovizna intensa',
  'light freezing drizzle': 'Llovizna helada ligera',
  'dense freezing drizzle': 'Llovizna helada intensa',
  'slight rain': 'Lluvia ligera',
  'moderate rain': 'Lluvia moderada',
  'heavy rain': 'Lluvia intensa',
  'light freezing rain': 'Lluvia helada ligera',
  'heavy freezing rain': 'Lluvia helada intensa',
  'slight snowfall': 'Nevada ligera',
  'moderate snowfall': 'Nevada moderada',
  'heavy snowfall': 'Nevada intensa',
  'snow grains': 'Granos de nieve',
  'slight rain showers': 'Chubascos ligeros',
  'moderate rain showers': 'Chubascos moderados',
  'violent rain showers': 'Chubascos intensos',
  'slight snow showers': 'Chubascos de nieve ligeros',
  'heavy snow showers': 'Chubascos de nieve intensos',
  thunderstorm: 'Tormenta',
  'thunderstorm with slight hail': 'Tormenta con granizo ligero',
  'thunderstorm with heavy hail': 'Tormenta con granizo intenso',
  // Variantes ya vistas en español u otras
  nublado: 'Nublado',
  despejado: 'Despejado',
  'parcialmente nublado': 'Parcialmente nublado',
}

const UNKNOWN_CONDITION_FALLBACK = 'Condición no disponible'

export function translateWeatherCondition(
  condition: string | null | undefined,
): string | null {
  if (condition == null) {
    return null
  }

  const trimmed = condition.trim()
  if (!trimmed) {
    return null
  }

  const translated = WEATHER_CONDITION_ES[trimmed.toLowerCase()]
  if (translated) {
    return translated
  }

  // Si ya parece español (sin coincidencia exacta), se muestra tal cual.
  if (/[áéíóúñü]/i.test(trimmed) || !/[a-z]/i.test(trimmed)) {
    return trimmed
  }

  // Inglés desconocido: fallback claro, sin inventar clima.
  return UNKNOWN_CONDITION_FALLBACK
}

export { UNKNOWN_CONDITION_FALLBACK }
