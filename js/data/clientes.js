/* ============================================================
   data/clientes.js — tipos de cliente y su apariencia.

     paciencia   segundos que aguanta (en dificultad Normal)
     exigencia   0..1 (qué tanto castiga los errores)
     pago        multiplicador del precio
     propina     multiplicador de la propina
     complejidad cuántas cosas suele pedir [mín, máx]
     combo       probabilidad de pedir una crepa de la casa
     cambios     probabilidad de pedirle cambios al combo ("sin plátano")
     peso        qué tan seguido aparece
     porDia      cuánto cambia el peso cada día (la mezcla se pone difícil)
     desdeDia    a partir de qué día aparece
     repMin      reputación mínima para que aparezca
   ============================================================ */
export const TIPOS_CLIENTE = [
  { id: 'tranquilo', nombre: 'Tranquilo', emoji: '😌', nota: 'Tiene mucha paciencia',
    paciencia: 170, exigencia: 0.3, pago: 1.0, propina: 1.0, complejidad: [1, 3], combo: 0.4, cambios: 0.1,
    peso: 3, porDia: -0.25, desdeDia: 1 },
  { id: 'normal', nombre: 'Normal', emoji: '🙂', nota: '',
    paciencia: 130, exigencia: 0.5, pago: 1.0, propina: 1.0, complejidad: [2, 4], combo: 0.45, cambios: 0.25,
    peso: 3, porDia: 0, desdeDia: 1 },
  { id: 'nino', nombre: 'Niño', emoji: '👶', nota: 'Le encanta el dulce y la decoración exagerada',
    paciencia: 110, exigencia: 0.35, pago: 0.8, propina: 0.4, complejidad: [3, 5], combo: 0.15, cambios: 0,
    peso: 1.2, porDia: 0, desdeDia: 1 },
  { id: 'apurado', nombre: 'Apurado', emoji: '⏱️', nota: 'Tiene prisa: si eres rápida, paga bien',
    paciencia: 65, exigencia: 0.5, pago: 1.1, propina: 1.3, complejidad: [1, 2], combo: 0.5, cambios: 0,
    peso: 1, porDia: 0.15, desdeDia: 2 },
  { id: 'exigente', nombre: 'Exigente', emoji: '😤', nota: 'Castiga cualquier error, pero paga más',
    paciencia: 100, exigencia: 0.85, pago: 1.25, propina: 1.6, complejidad: [2, 4], combo: 0.6, cambios: 0.7,
    peso: 1, porDia: 0.3, desdeDia: 2 },
  { id: 'gourmet', nombre: 'Crítico gourmet', emoji: '🧐', nota: 'Solo lo impresiona una crepa casi perfecta',
    paciencia: 140, exigencia: 0.95, pago: 1.5, propina: 2.0, complejidad: [4, 6], combo: 0.5, cambios: 0.5,
    peso: 0.6, porDia: 0.2, desdeDia: 4 },
  { id: 'vip', nombre: 'Cliente VIP', emoji: '🤓', nota: 'Siempre pide su favorita y paga extra',
    paciencia: 150, exigencia: 0.6, pago: 1.4, propina: 1.8, complejidad: [2, 4], combo: 1, cambios: 0,
    peso: 0.9, porDia: 0, desdeDia: 1, repMin: 4 },
];

// La paciencia se multiplica según la dificultad elegida
export const MULT_PACIENCIA = { relajado: 3, normal: 1, desafio: 0.75 };

/* Clientes VIP / habituales: siempre los mismos, con nombre y su
   crepa favorita. Aparecen cuando la reputación es de 4★ o más. */
export const VIPS = [
  { id: 'lupita', nombre: 'Doña Lupita', favorito: 'cajeta_nuez',
    apariencia: { piel: '#E8B08A', pelo: '#D9D9E0', ropa: '#8B5CF6', peinado: 'chongo', accesorio: 'lentes', colorAcc: '#8B5CF6' } },
  { id: 'beto', nombre: 'Don Beto', favorito: 'clasica',
    apariencia: { piel: '#C98E66', pelo: '#9A9AA3', ropa: '#14B8A6', peinado: 'calvo', accesorio: 'boina', colorAcc: '#1B2A55' } },
  { id: 'sofi', nombre: 'Sofi', favorito: 'nutella_fresa',
    apariencia: { piel: '#FFE0C7', pelo: '#B8462E', ropa: '#FF4FA3', peinado: 'coleta', accesorio: 'moño', colorAcc: '#FFD84D' } },
  { id: 'memo', nombre: 'Memo', favorito: 'banana_split',
    apariencia: { piel: '#A26B48', pelo: '#1B1B2B', ropa: '#FFB020', peinado: 'rizado', accesorio: 'gorra', colorAcc: '#1F5FFF' } },
  { id: 'vale', nombre: 'Vale', favorito: 'frutos_rojos',
    apariencia: { piel: '#F6C9A4', pelo: '#2B1B12', ropa: '#22C55E', peinado: 'largo', accesorio: 'bufanda', colorAcc: '#FF6B4A' } },
];

/* La crítica famosa (evento "Visita famosa"): viene una vez ese día,
   es tan estricta como un gourmet y su reseña mueve mucho la reputación. */
export const FAMOSA = {
  nombre: 'Lulú Estrella',
  titulo: 'crítica de comida famosa en internet',
  apariencia: { piel: '#F6C9A4', pelo: '#E8C27A', ropa: '#8B5CF6', peinado: 'largo', accesorio: 'lentesSol', colorAcc: '#1B1B2B' },
};

// ---------- Apariencia (se combina al azar) ----------
export const PIELES = ['#FFE0C7', '#F6C9A4', '#E8B08A', '#C98E66', '#A26B48', '#7A4E33'];
export const PELOS = ['#2B1B12', '#4A2E1C', '#7A4A26', '#C68B4B', '#E8C27A', '#1B1B2B', '#B8462E'];
// Ropa en colores vivos
export const ROPAS = ['#FF4FA3', '#3DA5FF', '#14B8A6', '#FFB020', '#8B5CF6', '#FF6B4A', '#22C55E', '#1F5FFF'];
export const PEINADOS = ['corto', 'largo', 'chongo', 'rizado', 'coleta', 'calvo'];
export const ACCESORIOS = ['ninguno', 'ninguno', 'gorra', 'lentes', 'moño', 'bufanda'];
