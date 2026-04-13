import { Polygon, Tooltip } from 'react-leaflet';

import { CAMPUS_BUILDING_COLORS, CAMPUS_BUILDINGS } from '../lib/campusMapData.js';

export function CampusFeatureLayer({ campus }) {
  const features = CAMPUS_BUILDINGS[campus] || [];

  return (
    <>
      {features.map((feature) => {
        const palette = CAMPUS_BUILDING_COLORS[feature.type] || CAMPUS_BUILDING_COLORS.service;
        return (
          <Polygon
            key={`${campus}-${feature.name}`}
            positions={feature.positions}
            pathOptions={{
              color: palette.stroke,
              weight: 1.5,
              fillColor: palette.fill,
              fillOpacity: 0.45
            }}
          >
            <Tooltip direction="center" permanent sticky opacity={0.92} className="campus-feature-tooltip">
              {feature.name}
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
