

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ORS_API_KEY = process.env.ORS_API_KEY;

const removeAccents = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "");

app.post('/calcular-distancia', async (req, res) => {
  const { origen, destino } = req.body;

  if (!origen || !destino || origen.trim().length < 3 || destino.trim().length < 3) {
    return res.status(400).json({ error: 'Debes proporcionar origen y destino válidos.' });
  }

  try {
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

    const route = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      { coordinates: [[lon1, lat1], [lon2, lat2]] },
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const routeFeature = route.data.features?.[0];
    const summary = routeFeature?.properties?.summary;

    if (!summary || typeof summary.distance !== 'number') {
      throw new Error(`No se pudo calcular una ruta válida entre "${origen}" y "${destino}".`);
    }

    const distanciaKm = summary.distance / 1000;
    const coordenadas = routeFeature.geometry.coordinates.map(c => [c[1], c[0]]);

    res.json({ distancia: distanciaKm, coordenadas });
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


const barrios = [
  "Cuba, Pereira",
  "Parque Arboleda, Pereira",
  "Villa Verde, Pereira",
  "Los Álamos, Pereira",
  "Boston, Pereira",
  "San Joaquín, Pereira",
  "El Jardín, Pereira"
];

function autocompletar(inputId) {
  const input = document.getElementById(inputId);
  input.addEventListener('input', () => {
    const valor = input.value.toLowerCase();
    const sugerencias = barrios.filter(b => b.toLowerCase().includes(valor));
    const datalist = document.getElementById('barrios');
    datalist.innerHTML = '';
    sugerencias.forEach(op => {
      const option = document.createElement('option');
      option.value = op;
      datalist.appendChild(option);
    });
  });
}

autocompletar('origen');
autocompletar('destino');

function detectarUbicacion() {
  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
    const data = await res.json();
    if (data && data.display_name) {
      document.getElementById('origen').value = data.display_name;
    }
  }, err => {
    alert('No se pudo obtener tu ubicación');
  });
}

if (error.response && error.response.status === 400) {
  errorDiv.innerHTML = `❌ ${data.error}`;
} else {
  errorDiv.innerHTML = `❌ ${error.message}`;
}
