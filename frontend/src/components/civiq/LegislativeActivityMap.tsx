"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Mail, Phone, ExternalLink, Plus, Minus, X } from "lucide-react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { type PolicyBriefing, getDistrictsMap, getDistricts, type District } from "@/lib/api";
import { type CivicProfile } from "@/lib/useProfile";
import { useTheme } from "next-themes";
import { MotionReveal } from "./MotionReveal";
import { POLICY_AREAS, getPolicyAreaMetadata, srcColor, timeAgo } from "@/lib/policyMetadata";
import dynamic from "next/dynamic";

const LeafletMapWrapper = dynamic(() => import("./LeafletMapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-50 dark:bg-[#111827]">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)]" />
    </div>
  ),
});

const LOCATION_TO_BORO: Record<string, string> = {
  Manhattan: "Manhattan", Brooklyn: "Brooklyn", Queens: "Queens",
  Bronx: "Bronx", "Staten Island": "Staten Island",
};

export type LegislativeActivityMapProps = {
  isPersonalized: boolean;
  profile: CivicProfile | null;
  policies: PolicyBriefing[];
  selectedArea: string;
  setSelectedArea: (v: string) => void;
  selectedLocation: string;
  onSearch?: (query: string) => void;
  hasBriefing?: boolean;
  mapMode: "vector" | "satellite";
  setMapMode: (v: "vector" | "satellite") => void;
};

function matchesArea(policy: PolicyBriefing, areaId: string): boolean {
  if (areaId === "All") return true;
  const kws = getPolicyAreaMetadata(areaId).keywords;
  const hay = `${policy.title} ${(policy.topic_tags ?? []).join(" ")}`.toLowerCase();
  return !kws.length || kws.some((k) => hay.includes(k));
}

function DistrictPanel({
  districtId, feature, districtObj,
  districtPolicies, allPoliciesForDistrict,
  activeArea, baseColor, onClose,
}: {
  districtId: number;
  feature: any;
  districtObj: District | undefined;
  districtPolicies: PolicyBriefing[];
  allPoliciesForDistrict: PolicyBriefing[];
  activeArea: { label: string; color: string; id: string };
  baseColor: string;
  onClose: () => void;
}) {
  const boroughName = feature.properties?.boro_name ?? "";
  const districtName = feature.properties?.name ?? `District ${districtId}`;

  // group policies by source type for the summary bar
  const totalAll = allPoliciesForDistrict.length;
  const totalFiltered = districtPolicies.length;
  const displayPolicies = totalFiltered > 0 ? districtPolicies : allPoliciesForDistrict;
  const noData = totalAll === 0;

  const recentPolicies = useMemo(() =>
    [...displayPolicies]
      .sort((a, b) => new Date(b.published_date ?? 0).getTime() - new Date(a.published_date ?? 0).getTime())
      .slice(0, 6),
    [displayPolicies]
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allPoliciesForDistrict.forEach((p) => {
      const t = p.source_type || "Other";
      counts[t] = (counts[t] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allPoliciesForDistrict]);

  return (
    <div className="flex h-full flex-col">
      {/* popout header */}
      <div className="shrink-0 flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <p className="font-work-sans text-[8px] font-bold uppercase tracking-widest text-[var(--muted)] leading-none mb-0.5">
            {boroughName}
          </p>
          <h3 className="font-limelight text-[13px] font-bold text-slate-800 dark:text-white truncate leading-tight">
            {districtName}
          </h3>
        </div>
        <button onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
          aria-label="Close panel">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* mini representative card */}
        {districtObj?.rep && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[var(--surface-elevated)] p-3">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${baseColor}cc, ${baseColor})` }}>
                {districtObj.rep.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Council Member</p>
                <p className="font-limelight text-[12px] font-bold text-slate-800 dark:text-white truncate">{districtObj.rep}</p>
                {districtObj.political_stance && districtObj.political_stance !== "N/A" && (
                  <p className="text-[9px] text-slate-500 mt-0.5">{districtObj.political_stance}</p>
                )}
              </div>
            </div>
            {/* contact info */}
            {(districtObj.phone || districtObj.email || districtObj.website) && (
              <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {districtObj.phone && (
                  <a href={`tel:${districtObj.phone}`}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors">
                    <Phone className="h-2.5 w-2.5" /> Call
                  </a>
                )}
                {districtObj.email && (
                  <a href={`mailto:${districtObj.email}`}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors">
                    <Mail className="h-2.5 w-2.5" /> Email
                  </a>
                )}
                {districtObj.website && districtObj.website !== "N/A" && (
                  <a href={districtObj.website} target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors">
                    <ExternalLink className="h-2.5 w-2.5" /> Web
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* activity summary */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Indexed Records</span>
            <span className="text-[12px] font-black" style={{ color: noData ? "#94a3b8" : baseColor }}>
              {totalAll} record{totalAll !== 1 ? "s" : ""}
            </span>
          </div>
          {noData ? (
            <p className="text-[10px] text-slate-400 leading-relaxed">
              No records are indexed for this district yet. Map shading is estimated.
              The briefing below still runs using your current filters.
            </p>
          ) : (
            <>
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(4, totalAll * 10))}%`,
                    background: baseColor,
                    boxShadow: `0 0 6px ${baseColor}50`,
                  }} />
              </div>
              <div className="flex flex-wrap gap-1">
                {typeCounts.slice(0, 5).map(([type, count]) => (
                  <span key={type}
                    className="px-1.5 py-0.5 rounded text-[8px] font-bold border"
                    style={{ color: srcColor(type), background: `${srcColor(type)}12`, borderColor: `${srcColor(type)}30` }}>
                    {type} {count}
                  </span>
                ))}
              </div>
              {activeArea.id !== "All" && (
                <p className="mt-1.5 text-[9px] text-slate-400">
                  {totalFiltered > 0
                    ? <><span className="font-semibold" style={{ color: baseColor }}>{totalFiltered}</span> match {activeArea.label}</>
                    : <>No {activeArea.label} records — showing all {totalAll}</>
                  }
                </p>
              )}
            </>
          )}
        </div>

        {/* policy records */}
        {recentPolicies.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {totalFiltered > 0 && activeArea.id !== "All" ? `${activeArea.label} Records` : "Most Recent"}
            </p>
            {recentPolicies.map((policy, idx) => {
              const color = srcColor(policy.source_type);
              return (
                <div key={policy.id || idx}
                  className="relative rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[var(--surface-card)] p-2.5 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                  <div className="absolute left-0 inset-y-2 w-[2.5px] rounded-full" style={{ background: color }} />
                  <div className="pl-2.5">
                    <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug mb-1">
                      {policy.title}
                    </p>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-bold border"
                        style={{ color, background: `${color}12`, borderColor: `${color}30` }}>
                        {policy.source_type || "Record"}
                      </span>
                      {policy.published_date && (
                        <span className="text-[8px] text-slate-400">{timeAgo(policy.published_date)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[9px] text-slate-400 text-center pb-1">↓ Full briefing updates below</p>
      </div>
    </div>
  );
}


export function LegislativeActivityMap({
  isPersonalized, profile, policies,
  selectedArea, setSelectedArea, selectedLocation, onSearch,
  hasBriefing = false, mapMode, setMapMode,
}: LegislativeActivityMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [hoveredDistrictId, setHoveredDistrictId] = useState<number | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const geoJsonRef = useRef<any>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [vectorPos, setVectorPos] = useState({
    coordinates: [-73.94, 40.712] as [number, number],
    zoom: 1,
  });

  useEffect(() => { getDistrictsMap().then(setGeoData); }, []);
  useEffect(() => { getDistricts().then(setDistricts).catch(console.error); }, []);

  const activeArea = POLICY_AREAS.find((a) => a.id === selectedArea) ?? POLICY_AREAS[0];
  const baseColor = activeArea.color;

  const filteredDistrictIds = useMemo<Set<number> | null>(() => {
    const bFilter = LOCATION_TO_BORO[selectedLocation];
    if (!bFilter || !geoData?.features) return null;
    const ids = new Set<number>();
    geoData.features.forEach((f: any) => {
      if (f.properties.boro_name === bFilter) ids.add(parseInt(f.properties.coun_dist));
    });
    return ids;
  }, [selectedLocation, geoData]);

  // real activity per district from actual policy data
  const districtActivity = useMemo(() => {
    const raw: Record<number, number> = {};
    policies.forEach((p) => {
      if (!matchesArea(p, selectedArea)) return;
      (p.districts ?? []).forEach((d) => { raw[d] = (raw[d] ?? 0) + 1; });
    });
    const hasRealData = Object.keys(raw).length > 0;
    const maxCount = hasRealData ? Math.max(1, ...Object.values(raw)) : 1;
    const out: Record<number, number> = {};
    for (let i = 1; i <= 51; i++) {
      const dim = (!filteredDistrictIds || filteredDistrictIds.has(i)) ? 1 : 0.1;
      if (hasRealData) {
        const count = raw[i] ?? 0;
        out[i] = (count > 0 ? Math.min(1, 0.25 + (count / maxCount) * 0.75) : 0.04) * dim;
      } else {
        out[i] = 0.06 * dim;
      }
    }
    return out;
  }, [policies, selectedArea, filteredDistrictIds]);

  const getColor = (val: number) => {
    if (val < 0.06) return isDark ? "rgba(30,41,59,0.25)" : "rgba(226,232,240,0.25)";
    if (val < 0.25) return `${baseColor}20`;
    if (val < 0.5) return `${baseColor}50`;
    if (val < 0.75) return `${baseColor}85`;
    return baseColor;
  };

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
  }, [selectedDistrictId, districtActivity, baseColor, isDark]);

  useEffect(() => {
    if (selectedDistrictId && filteredDistrictIds && !filteredDistrictIds.has(selectedDistrictId)) {
      setSelectedDistrictId(null);
    }
  }, [filteredDistrictIds, selectedDistrictId]);

  const handleDistrictClick = (districtId: number) => {
    const isDeselect = selectedDistrictId === districtId;
    setSelectedDistrictId(isDeselect ? null : districtId);
    if (!isDeselect && onSearch && geoData?.features) {
      const feature = geoData.features.find((f: any) => parseInt(f.properties.coun_dist) === districtId);
      const name = feature?.properties?.name ?? `Council District ${districtId}`;
      const boro = feature?.properties?.boro_name ?? "";
      const areaStr = selectedArea !== "All" ? ` ${activeArea.label}` : "";
      onSearch(`${name} ${boro}${areaStr}`.trim());
    }
  };

  const activeBoroughLabel = LOCATION_TO_BORO[selectedLocation] ?? null;

  const selectedFeature = useMemo(() => {
    if (!selectedDistrictId || !geoData?.features) return null;
    return geoData.features.find((f: any) => parseInt(f.properties.coun_dist) === selectedDistrictId);
  }, [selectedDistrictId, geoData]);

  const selectedDistrictObj = useMemo(
    () => districts.find((d) => d.id === selectedDistrictId),
    [districts, selectedDistrictId]
  );

  const districtPolicies = useMemo(() => {
    if (!selectedDistrictId) return [];
    return policies.filter((p) => (p.districts ?? []).includes(selectedDistrictId) && matchesArea(p, selectedArea));
  }, [policies, selectedDistrictId, selectedArea]);

  const allPoliciesForDistrict = useMemo(() => {
    if (!selectedDistrictId) return [];
    return policies.filter((p) => (p.districts ?? []).includes(selectedDistrictId));
  }, [policies, selectedDistrictId]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const MAP_HEIGHT = 520;

  return (
    <MotionReveal>
      <section>
        <div className="relative flex rounded-[1.5rem] overflow-hidden border border-[var(--border)] shadow-md bg-white dark:bg-[var(--surface-card)]"
          style={{ minHeight: MAP_HEIGHT }}>

          {/* map container */}
          <div className="relative flex-1 min-w-0" style={{ minHeight: MAP_HEIGHT }}>
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/92 dark:bg-[var(--surface-elevated)]/92 backdrop-blur-md border border-[var(--border)] text-[9px] font-bold uppercase tracking-wider shadow-sm pointer-events-none">
              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: baseColor }} />
              <span className="text-[var(--muted)]">{activeBoroughLabel ? `${activeBoroughLabel} · ` : "All NYC · "}</span>
              <span style={{ color: baseColor }}>{activeArea.label}</span>
            </div>

            {!geoData ? (
              <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-[var(--surface-elevated)]" style={{ minHeight: MAP_HEIGHT }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)]" />
                  <p className="text-[11px] text-[var(--muted)]">Loading map…</p>
                </div>
              </div>
            ) : mapMode === "vector" ? (
              <div className="w-full relative flex items-center justify-center overflow-hidden" style={{ height: MAP_HEIGHT }}>
                {/* zoom controls */}
                <div className="absolute bottom-3 right-3 z-[1000] flex flex-col shadow-md rounded-lg overflow-hidden border border-[var(--border)] bg-white/95 dark:bg-[var(--surface-elevated)]/95 backdrop-blur-md">
                  <button type="button" onClick={() => setVectorPos(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-[var(--surface-card)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors border-b border-[var(--border)]" aria-label="Zoom in">
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <button type="button" onClick={() => setVectorPos(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-[var(--surface-card)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" aria-label="Zoom out">
                    <Minus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: 40000, center: [-73.94, 40.712] }} style={{ width: "100%", height: "100%" }}>
                  <ZoomableGroup center={vectorPos.coordinates} zoom={vectorPos.zoom} minZoom={1} maxZoom={8}
                    translateExtent={[[0, 0], [800, 600]]} onMoveEnd={setVectorPos}
                    filterZoomEvent={(e: any) => e.type === "wheel" ? true : !e.button}>
                    <Geographies geography={geoData}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const id = parseInt(geo.properties.coun_dist);
                          const activity = districtActivity[id] ?? 0;
                          const isSelected = selectedDistrictId === id;
                          return (
                            <Geography key={geo.rsmKey} geography={geo}
                              onMouseEnter={() => setHoveredDistrictId(id)}
                              onMouseLeave={() => setHoveredDistrictId(null)}
                              onClick={() => handleDistrictClick(id)}
                              style={{
                                default: { fill: getColor(activity), stroke: isSelected ? baseColor : "rgba(255,255,255,0.8)", strokeWidth: isSelected ? 1.5 : 0.4, outline: "none", transition: "all 150ms ease" },
                                hover: { fill: `${baseColor}85`, stroke: baseColor, strokeWidth: 1.5, outline: "none", cursor: "pointer" },
                                pressed: { fill: baseColor, outline: "none" },
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>
              </div>
            ) : (
              <div className="relative w-full" style={{ height: MAP_HEIGHT }}>
                <LeafletMapWrapper isDark={isDark} tileUrl={tileUrl} geoData={geoData}
                  districtActivity={districtActivity} selectedDistrictId={selectedDistrictId}
                  getColor={getColor} baseColor={baseColor} handleDistrictClick={handleDistrictClick} ref={geoJsonRef} />
              </div>
            )}

            {/* legend */}
            <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/92 dark:bg-[var(--surface-elevated)]/92 backdrop-blur-md border border-[var(--border)] text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] shadow-sm pointer-events-none">
              <span>Low</span>
              <div className="flex h-1.5 w-14 rounded-full overflow-hidden">
                <div className="h-full flex-1" style={{ background: `${baseColor}20` }} />
                <div className="h-full flex-1" style={{ background: `${baseColor}50` }} />
                <div className="h-full flex-1" style={{ background: `${baseColor}85` }} />
                <div className="h-full flex-1" style={{ background: baseColor }} />
              </div>
              <span>High activity</span>
            </div>

            {/* click hint when nothing selected */}
            {!selectedDistrictId && (
              <div className="absolute bottom-3 right-3 z-[1000] px-2.5 py-1 rounded-full bg-white/92 dark:bg-[var(--surface-elevated)]/92 backdrop-blur-md border border-[var(--border)] text-[9px] font-medium text-[var(--muted)] shadow-sm pointer-events-none">
                Click a district for details + briefing
              </div>
            )}
          </div>

          {/* side popout panel */}
          {selectedDistrictId && selectedFeature && (
            <div className="shrink-0 border-l border-[var(--border)] bg-white dark:bg-[var(--surface-card)] overflow-hidden"
              style={{ width: 248, height: MAP_HEIGHT, animation: "slideInRight 0.2s ease-out" }}>
              <DistrictPanel
                districtId={selectedDistrictId} feature={selectedFeature}
                districtObj={selectedDistrictObj} districtPolicies={districtPolicies}
                allPoliciesForDistrict={allPoliciesForDistrict} activeArea={activeArea}
                baseColor={baseColor} onClose={() => setSelectedDistrictId(null)}
              />
            </div>
          )}
        </div>

        <style>{`
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(16px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </section>
    </MotionReveal>
  );
}