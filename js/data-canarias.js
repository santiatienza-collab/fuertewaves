/* Spots del resto de Canarias (BORRADOR, a verificar). Cada spot lleva "island". */
SPOTS.forEach((s) => { s.island = 'Fuerteventura'; });
(function () {
  const A = (island, id, name, zone, lat, lon, facing, exp, type, bottom, tide, swell, wave, min, max, wind, from, to) =>
    SPOTS.push({ id, name, zone, lat, lon, facing, exp, type, bottom, tide, swell, wave, min, max, wind, from, to, island });
  // Lanzarote
  A('Lanzarote', 'quemao', 'El Quemao', 'Oeste (La Santa)', 29.0, -13.65, 300, ['advanced'], 'reef', 'reef', 'mid_high', 300, 'left', 1.5, 4, 90, 10, 3);
  A('Lanzarote', 'la-santa', 'La Santa Isla', 'Norte (La Santa)', 29.003, -13.665, 340, ['intermediate', 'advanced'], 'reef', 'reef', 'all', 330, 'right', 1, 3, 150, 10, 3);
  A('Lanzarote', 'famara', 'Famara', 'Noroeste (Famara)', 29.05, -13.565, 300, ['beginner', 'intermediate'], 'beach', 'sand', 'all', 300, 'left_right', 0.8, 3, 100, 9, 4);
  A('Lanzarote', 'reducto', 'El Reducto', 'Este (Arrecife)', 28.955, -13.545, 110, ['beginner', 'intermediate'], 'beach', 'sand', 'mid_high', 90, 'left_right', 0.8, 2, 270, 10, 4);
  // Gran Canaria
  A('Gran Canaria', 'confital', 'El Confital', 'Norte (Las Palmas)', 28.1675, -15.4425, 350, ['advanced'], 'reef', 'reef', 'mid', 340, 'left_right', 1.5, 4, 180, 10, 3);
  A('Gran Canaria', 'cicer', 'La Cícer', 'Oeste (Las Canteras)', 28.137, -15.437, 280, ['beginner', 'intermediate'], 'beach', 'sand', 'mid_high', 290, 'left_right', 0.8, 2.5, 100, 10, 4);
  A('Gran Canaria', 'sardina', 'Sardina del Norte', 'Noroeste', 28.15, -15.705, 340, ['intermediate', 'advanced'], 'reef', 'reef', 'mid', 340, 'right', 1, 3, 180, 10, 3);
  A('Gran Canaria', 'pozo-izquierdo', 'Pozo Izquierdo', 'Este', 27.82, -15.43, 90, ['advanced'], 'reef', 'reef', 'all', 110, 'left_right', 1, 3, 270, 6, 10);
  A('Gran Canaria', 'playa-ingles', 'Playa del Inglés', 'Sur', 27.745, -15.575, 180, ['beginner', 'intermediate'], 'beach', 'sand', 'all', 190, 'left_right', 0.8, 2, 0, 5, 10);
  // Tenerife
  A('Tenerife', 'medano', 'El Médano', 'Sur', 28.045, -16.54, 180, ['beginner', 'intermediate'], 'beach', 'sand', 'all', 190, 'left_right', 0.8, 2.5, 0, 5, 10);
  A('Tenerife', 'americas', 'Las Américas', 'Suroeste', 28.058, -16.735, 220, ['intermediate', 'advanced'], 'reef', 'reef', 'mid', 220, 'left', 1, 3, 40, 5, 10);
  A('Tenerife', 'punta-brava', 'Punta Brava', 'Norte (Puerto de la Cruz)', 28.41, -16.55, 340, ['intermediate', 'advanced'], 'reef', 'reef', 'mid', 340, 'left_right', 1, 3, 180, 10, 3);
  A('Tenerife', 'bajamar', 'Bajamar', 'Norte', 28.555, -16.34, 350, ['intermediate', 'advanced'], 'reef', 'reef', 'mid_high', 340, 'right', 1, 3, 180, 10, 3);
  A('Tenerife', 'socorro', 'El Socorro', 'Norte', 28.43, -16.385, 20, ['advanced'], 'reef_beach', 'sand_rock', 'mid', 0, 'left_right', 1, 3, 200, 10, 3);
  A('Tenerife', 'almaciga', 'Almáciga', 'Noreste (Anaga)', 28.563, -16.17, 40, ['intermediate'], 'beach', 'sand_rock', 'all', 20, 'left_right', 1, 3, 220, 10, 3);
  // La Palma
  A('La Palma', 'cancajos', 'Los Cancajos', 'Este', 28.645, -17.765, 90, ['beginner', 'intermediate'], 'beach', 'sand_rock', 'mid', 60, 'left_right', 0.8, 2, 270, 10, 3);
  A('La Palma', 'tazacorte', 'Tazacorte', 'Oeste', 28.645, -17.935, 270, ['beginner', 'intermediate'], 'beach', 'sand', 'all', 290, 'left_right', 0.8, 2, 90, 10, 3);
  // La Gomera
  A('La Gomera', 'valle-gran-rey', 'La Puntilla (Valle Gran Rey)', 'Suroeste', 28.093, -17.345, 240, ['intermediate'], 'reef_beach', 'sand_rock', 'mid', 250, 'left_right', 0.8, 2.5, 90, 10, 3);
  A('La Gomera', 'playa-santiago', 'Playa de Santiago', 'Sur', 28.01, -17.2, 180, ['intermediate'], 'beach', 'sand_rock', 'mid', 190, 'left_right', 0.8, 2, 0, 5, 10);
  // El Hierro
  A('El Hierro', 'pozo-salud', 'Pozo de la Salud', 'Este', 27.755, -17.945, 110, ['advanced'], 'reef', 'reef', 'mid', 110, 'left_right', 1, 3, 270, 10, 3);
  A('El Hierro', 'tamaduste', 'Tamaduste', 'Noreste', 27.82, -17.905, 20, ['intermediate'], 'reef', 'reef', 'mid_high', 10, 'left_right', 1, 2.5, 200, 10, 3);
})();
const ISLANDS = {
  'Todas': { c: [28.3, -15.6], z: 7 },
  'Lanzarote': { c: [29.03, -13.6], z: 10 }, 'Fuerteventura': { c: [28.38, -14.02], z: 9.25 },
  'Gran Canaria': { c: [27.96, -15.6], z: 10 }, 'Tenerife': { c: [28.3, -16.55], z: 10 },
  'La Gomera': { c: [28.1, -17.14], z: 11 }, 'La Palma': { c: [28.68, -17.85], z: 10.5 }, 'El Hierro': { c: [27.75, -18.0], z: 11 },
};
const MUNIS_EXTRA = [
  { name: 'Arrecife', lat: 28.963, lon: -13.547 }, { name: 'Las Palmas', lat: 28.124, lon: -15.436 }, { name: 'Maspalomas', lat: 27.76, lon: -15.586 },
  { name: 'Santa Cruz de Tenerife', lat: 28.468, lon: -16.254 }, { name: 'Adeje', lat: 28.12, lon: -16.726 }, { name: 'Santa Cruz de La Palma', lat: 28.683, lon: -17.764 },
  { name: 'San Sebastián de La Gomera', lat: 28.092, lon: -17.113 }, { name: 'Valverde', lat: 27.806, lon: -17.915 },
];
