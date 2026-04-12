import { useEffect } from 'react';
import L from 'leaflet';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-leaflet';
import { useMap } from 'react-leaflet';

export const OPEN_FREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function MapLibreBaseLayer({ styleUrl = OPEN_FREEMAP_STYLE_URL }) {
  const map = useMap();

  useEffect(() => {
    const previousMapLibre = globalThis.maplibregl;
    globalThis.maplibregl = maplibregl;

    const layer = L.maplibreGL({
      style: styleUrl
    }).addTo(map);

    return () => {
      map.removeLayer(layer);
      if (previousMapLibre) {
        globalThis.maplibregl = previousMapLibre;
        return;
      }
      delete globalThis.maplibregl;
    };
  }, [map, styleUrl]);

  return null;
}
