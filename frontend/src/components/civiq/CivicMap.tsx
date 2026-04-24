"use client";

import { MapPin, Users, Layers, Search, Map as MapIcon, Maximize2 } from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { getDistricts, getDistrictsMap, type District } from "@/lib/api";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";
import { AnimatePresence, motion } from "framer-motion";

export type CivicMapProps = {
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
};

export function CivicMap({
  title = "NY Explorer",
  subtitle = "Interactive district intelligence powered by ArcGIS.",
  hideHeader = false
}: CivicMapProps) {
  const [activeTab, setActiveTab] = useState<"nys" | "nyc">("nys");

  // NYC Tab State
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [geoData, setGeoData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // NYS Tab State
  const [activeQuery, setActiveQuery] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [d, g] = await Promise.all([getDistricts(), getDistrictsMap()]);
        setDistricts(d);
        setGeoData(g);
      } catch (e) {
        console.error("Failed to load map data", e);
      } finally {
        setLoading(false);
      }
    }
    if (activeTab === "nyc" && !geoData) {
      void load();
    }
  }, [activeTab, geoData]);

  const selectedDistrict = useMemo(() => {
    if (selectedDistrictId === null) return undefined;
    const found = districts.find(d => d.id === selectedDistrictId);
    if (found) return found;

    // Dynamic fallback for districts not in the mock database
    return {
      id: selectedDistrictId,
      name: `NYC Council District ${selectedDistrictId}`,
      rep: "Council Member",
      issues: ["Local Development", "Community Issues"],
      zip_codes: []
    } as District;
  }, [districts, selectedDistrictId]);

  const filteredDistricts = useMemo(() => {
    if (!searchTerm) return districts;
    const term = searchTerm.toLowerCase().trim();
    return districts.filter(d =>
      d.name.toLowerCase().includes(term) ||
      d.rep.toLowerCase().includes(term) ||
      (d.id.toString() === term) ||
      (d.zip_codes && d.zip_codes.some(z => z.includes(term)))
    );
  }, [districts, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "nys") {
      if (searchTerm.trim()) {
        setActiveQuery(encodeURIComponent(searchTerm.trim()));
      } else {
        setActiveQuery("");
      }
    }
  };

  const baseUrl = "https://nysboe.maps.arcgis.com/apps/instant/lookup/index.html?appid=0a08fa8c5ea2400d86ab65daa5aa4f0e";
  const iframeSrc = activeQuery ? `${baseUrl}#find=${activeQuery}` : baseUrl;

  return (
    <div className="w-full">
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div>
            <h2 className="font-display text-4xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-lg text-slate-500">{subtitle}</p>
          </div>
          <form onSubmit={handleSearch} className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === "nys" ? "Search address or zip code..." : "Search rep, district, or zip..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-24 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-shadow shadow-sm"
            />
            {activeTab === "nys" && (
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[var(--accent)] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[var(--accent-hover)] transition-colors"
              >
                Locate
              </button>
            )}
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("nys")}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${activeTab === "nys"
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
        >
          NYS Explorer (ArcGIS)
        </button>
        <button
          onClick={() => setActiveTab("nyc")}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${activeTab === "nyc"
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
        >
          NYC Local Explorer
        </button>
      </div>

      {activeTab === "nys" ? (
        /* NYS ArcGIS Tab */
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-[700px] relative flex flex-col group animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <MapIcon className="h-4 w-4 text-[var(--accent)]" />
              Interactive Boundary Map (NYS)
            </div>
            <button
              onClick={() => window.open(iframeSrc, '_blank')}
              className="text-xs font-semibold text-slate-400 hover:text-[var(--accent)] transition-colors flex items-center gap-1.5"
              title="Open full map in new tab"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expand
            </button>
          </div>
          <iframe
            key={iframeSrc}
            ref={iframeRef}
            src={iframeSrc}
            className="w-full flex-1 border-none bg-slate-100"
            title="NYS Districts ArcGIS Map"
            allow="geolocation"
            loading="lazy"
          />

          {!activeQuery && (
            <div className="absolute bottom-6 left-6 flex flex-col gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-md shadow-lg border border-slate-200/50 text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                💡 Tip: Type your address or Zip Code above to zoom in automatically.
              </div>
            </div>
          )}
        </div>
      ) : (
        /* NYC Local Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Map Area */}
          <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-[700px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm z-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
                  <p className="text-sm font-medium text-slate-500">Loading Geographic Data...</p>
                </div>
              </div>
            ) : geoData ? (
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  scale: 65000,
                  center: [-73.94, 40.70]
                }}
                className="w-full h-full"
              >
                <ZoomableGroup>
                  <Geographies geography={geoData}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const distId = parseInt(geo.properties.coun_dist);
                        const isSelected = selectedDistrictId === distId;
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onClick={() => setSelectedDistrictId(distId)}
                            style={{
                              default: {
                                fill: isSelected ? "var(--accent)" : "#f1f5f9",
                                stroke: isSelected ? "var(--accent-soft)" : "#cbd5e1",
                                strokeWidth: isSelected ? 1.5 : 0.5,
                                outline: "none",
                                transition: "all 250ms",
                              },
                              hover: {
                                fill: isSelected ? "var(--accent)" : "#e0e7ff",
                                stroke: "var(--accent)",
                                strokeWidth: 1,
                                outline: "none",
                                cursor: "pointer",
                              },
                              pressed: {
                                fill: "var(--accent-soft)",
                                outline: "none",
                              }
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <MapPin className="h-12 w-12 text-slate-300" />
                <p>Failed to load map data.</p>
              </div>
            )}

            <div className="absolute bottom-6 left-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur shadow-sm border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <Layers className="h-3 w-3" />
                51 Council Districts
              </div>
            </div>
          </div>

          {/* Sidebar / Info */}
          <div className="lg:col-span-4 space-y-6">
            <AnimatePresence mode="wait">
              {selectedDistrict ? (
                <motion.div
                  key={selectedDistrict.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="h-14 w-14 rounded-2xl bg-[var(--accent-soft)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-2xl">
                      {selectedDistrict.id}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest">District</span>
                  </div>

                  <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedDistrict.rep}</h2>
                  <p className="text-slate-500 text-sm font-medium mb-6">{selectedDistrict.name}</p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>Official Council Member</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>Primary District Office</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">Focus Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDistrict.issues.map(issue => (
                        <span key={issue} className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600">
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-slate-100/50 rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center h-[400px] flex flex-col items-center justify-center">
                  <MapPin className="h-10 w-10 text-slate-300 mb-4" />
                  <h3 className="text-slate-900 font-bold mb-2">No District Selected</h3>
                  <p className="text-sm text-slate-400 max-w-[200px]">Select a shape on the map or search to see representative data.</p>
                </div>
              )}
            </AnimatePresence>

            {/* Quick List Search Results */}
            {searchTerm && (
              <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm mt-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Search Results</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {filteredDistricts.slice(0, 5).map(d => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDistrictId(d.id)}
                      className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition text-sm flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{d.rep}</p>
                        <p className="text-xs text-slate-500">District {d.id} ({d.name})</p>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 transition text-[var(--accent)] font-bold">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
