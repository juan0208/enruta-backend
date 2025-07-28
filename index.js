const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ORS_API_KEY = process.env.ORS_API_KEY;

// Función para eliminar tildes
const removeAccents = (text) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

app.post('/calcular-distancia', async (req, res) => {
  const { origen, destino } = req.body;

  try {
    // Obtener coordenadas desde OpenRouteService
    const getCoords = async (lugar) => {
      const limpio = removeAccents(lugar.trim());
      const lugarCompleto = `${limpio}, Pereira, Colombia`;

      const response = await axios.get('https://api.openrouteservice.org/geocode/search', {
        params: {
          api_key: ORS_API_KEY,
          text: lugarCompleto,
          'boundary.country': 'CO',
        },
      });

      if (!response.data.features.length) {
        throw new Error(`No se encontraron coordenadas para: "${lugar}"`);
      }

      return response.data.features[0].geometry.coordinates;
    };

    const [lon1, lat1] = await getCoords(origen);
    const [lon2, lat2] = await getCoords(destino);

    // Obtener ruta entre puntos
    const route = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        coordinates: [[lon1, lat1], [lon2, lat2]]
      },
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (
      !route.data.features ||
      !route.data.features.length ||
      !route.data.features[0].geometry.coordinates
    ) {
      throw new Error(`No se pudo calcular ruta entre "${origen}" y "${destino}". Intenta escribir con más detalle o verifica los nombres.`);
    }

    const routeFeature = route.data.features[0];
    const distanciaKm = routeFeature.properties.summary.distance / 1000;
    const coordenadas = routeFeature.geometry.coordinates.map(c => [c[1], c[0]]); // [lat, lon]

    res.json({
      distancia: distanciaKm,
      coordenadas
    });

  } catch (error) {
    const msg = error.response?.data?.error || error.message || 'Error calculando distancia';
    console.error('❌ Error al calcular distancia:', msg);
    res.status(500).json({ error: msg });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
