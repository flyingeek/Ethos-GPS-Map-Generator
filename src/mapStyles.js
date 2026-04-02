const GOOGLE_SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3'];
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmx5aW5nZWVrIiwiYSI6ImNqcmtsb2c3MjBtbDE0NHF3bWM1OHJrYTUifQ.KoP6rRLsaH1xPZX6MMCZhQ';

function tilesForLayer(layerCode) {
  return GOOGLE_SUBDOMAINS.map((subdomain) =>
    `https://${subdomain}.google.com/vt/lyrs=${layerCode}&x={x}&y={y}&z={z}&hl=en`
  );
}

export const MAP_TYPES = {
  y: 'Google Hybrid',
  s: 'Google Satellite',
  p: 'Google Terrain',
  esri: 'ESRI Satellite',
  mapbox: 'Mapbox Satellite',
};

export function buildRasterStyle(layerCode = 'y') {
  if (layerCode === 'esri') {
    return {
      version: 8,
      name: 'esri-satellite',
      sources: {
        base: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '<span style="font-family:sans-serif">©</span> Esri',
        }
      },
      layers: [
        {
          id: 'esri-raster',
          type: 'raster',
          source: 'base',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };
  }

  if (layerCode === 'mapbox') {
    return {
      version: 8,
      name: 'mapbox-satellite',
      sources: {
        base: {
          type: 'raster',
          tiles: [`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`],
          tileSize: 256,
          attribution: '<span style="font-family:sans-serif">©</span> Mapbox',
        }
      },
      layers: [
        {
          id: 'mapbox-raster',
          type: 'raster',
          source: 'base',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };
  }

  return {
    version: 8,
    name: `google-${layerCode}`,
    sources: {
      base: {
        type: 'raster',
        tiles: tilesForLayer(layerCode),
        tileSize: 256,
        attribution: '<span style="font-family:sans-serif">©</span> Google Maps',
      }
    },
    layers: [
      {
        id: 'google-raster',
        type: 'raster',
        source: 'base',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  };
}
