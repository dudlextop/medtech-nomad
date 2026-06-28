"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";

export type ClinicMapItem = {
  id: string;
  name: string;
  city: string;
  address: string;
  minPrice: number;
  servicesCount: number;
  serviceNames: string[];
  branchNote?: string;
  updatedAt?: string;
  lat?: number | null;
  lng?: number | null;
};

type ClinicMapClientProps = {
  clinics: ClinicMapItem[];
  selectedClinicId?: string;
  selectedCity: string;
  onSelectClinic: (clinicId: string) => void;
};

const cityCenters: Record<string, [number, number]> = {
  Алматы: [43.2389, 76.8897],
  Астана: [51.1694, 71.4491],
  Шымкент: [42.3417, 69.5901],
  Караганда: [49.8047, 73.1094],
  Актобе: [50.2839, 57.167],
  Павлодар: [52.2873, 76.9674],
  Костанай: [53.2198, 63.6354],
  Атырау: [47.0945, 51.9238],
  Тараз: [42.8997, 71.3772]
};

export function ClinicMapClient({ clinics, selectedClinicId, selectedCity, onSelectClinic }: ClinicMapClientProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectClinic);

  const selected = clinics.find((clinic) => clinic.id === selectedClinicId);
  const center = useMemo<[number, number]>(() => {
    return selected?.lat && selected.lng ? [selected.lat, selected.lng] : cityCenters[selectedCity] ?? cityCenters["Алматы"];
  }, [selected, selectedCity]);
  const zoom = selected?.lat ? 14 : 12;

  const icons = useMemo(() => ({
    default: markerIcon(false),
    selected: markerIcon(true)
  }), []);

  useEffect(() => {
    onSelectRef.current = onSelectClinic;
  }, [onSelectClinic]);

  useEffect(() => {
    const node = mapNodeRef.current as (HTMLDivElement & { _leaflet_id?: number }) | null;
    if (!node || mapRef.current) return;

    if (node._leaflet_id) delete node._leaflet_id;

    const map = L.map(node, {
      scrollWheelZoom: true,
      zoomControl: true
    }).setView(cityCenters["Алматы"], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      map.remove();
      mapRef.current = null;
      if (node._leaflet_id) delete node._leaflet_id;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setView(center, zoom, { animate: true, duration: 0.4 });
  }, [center, zoom]);

  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    clinics.forEach((clinic) => {
      if (typeof clinic.lat !== "number" || typeof clinic.lng !== "number") return;

      const active = clinic.id === selectedClinicId;
      const marker = L.marker([clinic.lat, clinic.lng], {
        icon: active ? icons.selected : icons.default,
        title: clinic.name
      });

      marker.on("click", () => {
        onSelectRef.current(clinic.id);
        marker.openPopup();
      });
      marker.bindPopup(popupHtml(clinic), { minWidth: 250 });
      marker.addTo(layer);
    });
  }, [clinics, icons.default, icons.selected, selectedClinicId]);

  return <div ref={mapNodeRef} className="h-full min-h-[420px] w-full rounded-2xl" />;
}

function markerIcon(selected: boolean) {
  const size = selected ? 42 : 34;
  const ring = selected ? "box-shadow:0 0 0 6px rgba(255,59,31,.18),0 12px 24px rgba(20,23,31,.22);" : "box-shadow:0 10px 22px rgba(20,23,31,.18);";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 6],
    html: `<span style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:#ff3b1f;color:white;border:3px solid white;${ring}">
      <svg viewBox="0 0 24 24" width="${selected ? 22 : 18}" height="${selected ? 22 : 18}" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>
    </span>`
  });
}

function popupHtml(clinic: ClinicMapItem) {
  const priceText = clinic.minPrice ? `цена от ${formatKztLocal(clinic.minPrice)}` : clinic.servicesCount ? `${clinic.servicesCount} услуг` : "Профиль клиники";
  const address = clinic.address || clinic.branchNote || "Адрес уточняется";
  return `
    <div style="display:grid;gap:10px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#151922;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="display:flex;height:34px;width:34px;align-items:center;justify-content:center;border-radius:12px;background:#fff0ed;color:#ff3b1f;font-size:12px;font-weight:800;">${escapeHtml(clinicInitials(clinic.name))}</span>
        <div>
          <div style="font-weight:800;font-size:14px;line-height:1.25;">${escapeHtml(clinic.name)}</div>
          <div style="font-size:12px;color:#667085;">${escapeHtml(clinic.city)}</div>
        </div>
      </div>
      <div style="font-size:13px;line-height:1.45;color:#4b5563;">${escapeHtml(address)}</div>
      <div style="font-size:13px;font-weight:800;">${escapeHtml(priceText)}</div>
      <a href="/clinics/${encodeURIComponent(clinic.id)}" style="display:flex;min-height:38px;align-items:center;justify-content:center;border-radius:12px;background:#ff3b1f;color:white;text-decoration:none;font-size:13px;font-weight:800;">Открыть клинику</a>
    </div>
  `;
}

function clinicInitials(name: string) {
  const letters = name
    .replace(/public prices|public_prices|price page/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "NR";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatKztLocal(value: number) {
  return new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(value);
}
