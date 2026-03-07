"use client";
import MapEmbed from "@/app/photo/[id]/MapEmbed";
export default function TestMap() {
  return <div className="p-10"><MapEmbed lat={43.1} lng={141.0} /></div>;
}
