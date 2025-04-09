"use client";

import { useState } from "react";
import Image from "next/image";
import { STYLE_CATEGORIES, StyleCategory } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function StylePresets({
  onSelect,
}: {
  onSelect: (presetId: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] =
    useState<StyleCategory | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Category Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STYLE_CATEGORIES.map((category) => (
          <div
            key={category.id}
            onClick={() => setSelectedCategory(category)}
            className="group hover:border-primary relative cursor-pointer overflow-hidden rounded-lg border transition-all hover:shadow-md"
          >
            <div className="relative aspect-video">
              <Image
                src={category.thumbnail}
                alt={category.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4">
                <h3 className="text-lg font-semibold text-white">
                  {category.name}
                </h3>
                <p className="text-sm text-white/80">{category.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preset Selection Dialog */}
      <Dialog
        open={!!selectedCategory}
        onOpenChange={(open) => !open && setSelectedCategory(null)}
      >
        {selectedCategory && (
          <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCategory.name} 风格选择</DialogTitle>
              <p className="text-muted-foreground text-sm">
                {selectedCategory.description}
              </p>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedCategory.presets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    onSelect(preset.id);
                    setSelectedCategory(null);
                  }}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    selectedPreset === preset.id
                      ? "ring-primary border-primary ring-2"
                      : "hover:border-gray-300"
                  }`}
                >
                  <div className="relative mb-2 aspect-square">
                    <Image
                      src={preset.preview}
                      alt={preset.name}
                      fill
                      className="rounded-md object-cover"
                    />
                  </div>
                  <h3 className="font-medium">{preset.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {preset.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedCategory(null)}
              >
                返回
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
