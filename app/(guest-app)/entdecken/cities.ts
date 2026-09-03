// Karten-Zentrierung fuer die Stadtauswahl. Unbekannte Stadt -> Deutschland-Mitte.
export const GERMAN_CITIES: Record<string, [number, number]> = {
  'Aachen':        [50.7753, 6.0839],
  'Augsburg':      [48.3705, 10.8978],
  'Berlin':        [52.5200, 13.4050],
  'Bielefeld':     [52.0210, 8.5335],
  'Bochum':        [51.4818, 7.2162],
  'Bonn':          [50.7374, 7.0982],
  'Bremen':        [53.0793, 8.8017],
  'Chemnitz':      [50.8278, 12.9214],
  'Dortmund':      [51.5136, 7.4653],
  'Dresden':       [51.0504, 13.7373],
  'Duisburg':      [51.4344, 6.7623],
  'Düsseldorf':    [51.2217, 6.7762],
  'Erfurt':        [50.9848, 11.0299],
  'Essen':         [51.4556, 7.0116],
  'Frankfurt':     [50.1109, 8.6821],
  'Freiburg':      [47.9990, 7.8421],
  'Gelsenkirchen': [51.5177, 7.0857],
  'Hamburg':       [53.5753, 10.0153],
  'Hannover':      [52.3759, 9.7320],
  'Heidenheim':    [48.6775, 10.1534],
  'Karlsruhe':     [49.0069, 8.4037],
  'Kiel':          [54.3233, 10.1228],
  'Köln':          [50.9333, 6.9500],
  'Leipzig':       [51.3397, 12.3731],
  'Lübeck':        [53.8655, 10.6866],
  'Magdeburg':     [52.1317, 11.6392],
  'Mainz':         [49.9929, 8.2473],
  'Mannheim':      [49.4875, 8.4660],
  'München':       [48.1351, 11.5820],
  'Münster':       [51.9607, 7.6261],
  'Nürnberg':      [49.4521, 11.0767],
  'Rostock':       [54.0924, 12.0991],
  'Saarbrücken':   [49.2354, 6.9969],
  'Stuttgart':     [48.7758, 9.1829],
  'Ulm':           [48.3974, 9.9934],
  'Wiesbaden':     [50.0782, 8.2398],
  'Wuppertal':     [51.2562, 7.1508],
}

export const GERMANY_CENTER: [number, number] = [51.1657, 10.4515]

export function cityCenter(city: string): [number, number] {
  return GERMAN_CITIES[city] ?? GERMANY_CENTER
}
