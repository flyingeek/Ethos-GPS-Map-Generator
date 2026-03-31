const GOOGLE_SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3'];

function tilesForLayer(layerCode) {
  return GOOGLE_SUBDOMAINS.map((subdomain) =>
    `https://${subdomain}.google.com/vt/lyrs=${layerCode}&x={x}&y={y}&z={z}&hl=en`
  );
}

export const MAP_TYPES = {
  y: 'Google Hybrid',
  s: 'Satellite Only',
  p: 'Terrain'
};

export function buildRasterStyle(layerCode = 'y') {
  return {
    version: 8,
    name: `google-${layerCode}`,
    sources: {
      base: {
        type: 'raster',
        tiles: tilesForLayer(layerCode),
        tileSize: 256,
        attribution: 'Map data © Google'
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
