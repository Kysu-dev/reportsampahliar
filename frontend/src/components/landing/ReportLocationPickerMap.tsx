'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L, { type DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface ReportLocationPickerMapProps {
  value: Coordinates | null;
  onSelect: (coordinates: Coordinates) => void;
}

const DEFAULT_CENTER: [number, number] = [-6.8986, 107.6366];

const manualPinIcon: DivIcon = L.divIcon({
  className: 'cleantrack-leaflet-marker',
  html: '<span style="--marker-color:#059669" class="marker-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function ClickToSelectPin({ onSelect }: Pick<ReportLocationPickerMapProps, 'onSelect'>) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

function CenterToSelectedPin({ value }: Pick<ReportLocationPickerMapProps, 'value'>) {
  const map = useMap();

  useEffect(() => {
    if (!value) {
      return;
    }

    map.flyTo([value.latitude, value.longitude], 17, {
      duration: 0.7,
    });
  }, [map, value]);

  return null;
}

export function ReportLocationPickerMap({ value, onSelect }: ReportLocationPickerMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (value) {
      return [value.latitude, value.longitude];
    }

    return DEFAULT_CENTER;
  }, [value]);

  return (
    <MapContainer
      center={center}
      zoom={value ? 17 : 15}
      scrollWheelZoom
      className='h-[270px] w-full rounded-2xl ring-1 ring-emerald-200'
    >
      <TileLayer
        url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      />

      <ClickToSelectPin onSelect={onSelect} />
      <CenterToSelectedPin value={value} />

      {value && <Marker position={[value.latitude, value.longitude]} icon={manualPinIcon} />}
    </MapContainer>
  );
}
