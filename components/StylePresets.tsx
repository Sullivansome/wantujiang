"use client";

import { STYLE_PRESETS } from "@/lib/constants";
import Image from "next/image";
import { useState } from "react";

export function StylePresets({
  onSelect,
}: {
  onSelect: (presetId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {STYLE_PRESETS.map((preset) => (
        <div
          key={preset.id}
          onClick={() => {
            setSelected(preset.id);
            onSelect(preset.id);
          }}
          className={`cursor-pointer rounded-lg border p-3 transition-all ${
            selected === preset.id
              ? "ring-primary border-primary ring-2"
              : "hover:border-gray-300"
          }`}
        >
          <div className="relative mb-2 aspect-square">
            <Image
              src={preset.thumbnail}
              alt={preset.name}
              fill
              className="rounded-md object-cover"
            />
          </div>
          <h3 className="font-medium">{preset.name}</h3>
          <p className="text-muted-foreground text-sm">{preset.description}</p>
        </div>
      ))}
    </div>
  );
}
