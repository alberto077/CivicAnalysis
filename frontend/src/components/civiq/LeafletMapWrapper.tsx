"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function LeafletMapWrapper({
  isDark,
  tileUrl,
  geoData,
  districtActivity,
  selectedDistrictId,
  getColor,
  baseColor,
  handleDistrictClick,
}: any) {
  const geoJsonRef = useRef<any>(null);

  // handle style updates via a ref to not recreate the GeoJSON layer entirely
  useEffect(() => {
    const layer = geoJsonRef.current;
    if (!layer) return;
    layer.eachLayer((sub: any) => {
      const id = parseInt(sub.feature?.properties?.coun_dist);
      const sel = selectedDistrictId === id;
      sub.setStyle({
        fillColor: getColor(districtActivity[id] ?? 0),
        fillOpacity: sel ? 0.95 : 0.78,
        weight: sel ? 2.5 : 0.6,
        color: sel ? baseColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
        opacity: 1,
      });
    });
  }, [selectedDistrictId, districtActivity, baseColor, isDark, getColor]);

  return (
    <MapContainer
      center={[40.7128, -74.006]}
      zoom={10}
      scrollWheelZoom={true}
      touchZoom={true}
      zoomControl={false}
      style={{ width: "100%", height: "100%", minHeight: "420px", background: isDark ? "#111827" : "#f8fafc" }}
    >
      <TileLayer
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {geoData && (
        <GeoJSON
          ref={geoJsonRef}
          data={geoData}
          style={(feature: any) => {
            const id = parseInt(feature.properties.coun_dist);
            const sel = selectedDistrictId === id;
            return {
              fillColor: getColor(districtActivity[id] ?? 0),
              fillOpacity: sel ? 0.95 : 0.78,
              weight: sel ? 2.5 : 0.6,
              color: sel ? baseColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
              opacity: 1,
            };
          }}
          onEachFeature={(feature: any, layer: any) => {
            layer.on({
              mouseover: (e: any) => {
                const id = parseInt(feature.properties.coun_dist);
                if (id !== selectedDistrictId) e.target.setStyle({ weight: 2, color: baseColor, fillOpacity: 0.9 });
              },
              mouseout: (e: any) => {
                const id = parseInt(feature.properties.coun_dist);
                if (id !== selectedDistrictId) e.target.setStyle({ weight: 0.6, color: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)", fillOpacity: 0.78 });
              },
              click: () => handleDistrictClick(parseInt(feature.properties.coun_dist), feature),
            });
          }}
        />
      )}
      <ZoomControl position="bottomright" />
    </MapContainer>
  );
}
