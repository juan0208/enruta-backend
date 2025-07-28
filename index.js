const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ORS_API_KEY = process.env.ORS_API_KEY;

app.post('/calcular-distancia', async (req, res) => {
  const { origen, destino } = req.body;

  try {
    const getCoords = async (lugar) => {
      const res = await axios.get('https://api.openrouteservice.org/geocode/search', {
        params: {
          api_key: ORS_API_KEY,
          text: lugar,
          'boundary.country': 'CO',
        },
      });

      if (!res.data.features.length) {
        throw new Error(`No se encontraron coordenadas para: ${lugar}`);
      }

      return res.data.features[0].geometry.coordinates;
    };

    const [lon1, lat1] = await getCoords(origen);
    const [lon2, lat2] = await getCoords(destino);

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

    const distanciaKm = route.data.features[0].properties.summary.distance / 1000;
    const coordenadas = route.data.features[0].geometry.coordinates.map(c => [c[1], c[0]]); // [lat, lon]

    res.json({
      distancia: distanciaKm,
      coordenadas
    });

  } catch (error) {
    console.error('❌ Error al calcular distancia:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error calculando distancia' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Servidor escuchando en puerto 3000');
});
