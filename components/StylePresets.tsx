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
import { AlertCircle } from "lucide-react";

interface StylePresetsProps {
  onSelect: (presetId: string) => void;
  disabled?: boolean;
  currentPreset?: string | null;
}

export function StylePresets({
  onSelect,
  disabled = false,
  currentPreset = null,
}: StylePresetsProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<StyleCategory | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    currentPreset,
  );

  return (
    <div className="space-y-6">
      {disabled && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            当前绘画周期中无法更换风格。用完重试次数或开启新周期后可重新选择。
          </span>
        </div>
      )}

      {/* Category Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STYLE_CATEGORIES.map((category) => {
          const hasCurrentPreset =
            currentPreset &&
            category.presets.some((p) => p.id === currentPreset);
          const isCategoryDisabled = disabled && !hasCurrentPreset;

          return (
            <div
              key={category.id}
              onClick={() => {
                if (!isCategoryDisabled) {
                  setSelectedCategory(category);
                }
              }}
              className={`group relative cursor-pointer overflow-hidden rounded-lg border transition-all ${
                isCategoryDisabled
                  ? "cursor-not-allowed border-gray-200 opacity-60"
                  : "hover:border-primary hover:shadow-md"
              }`}
            >
              <div className="relative aspect-video">
                <Image
                  src={category.thumbnail}
                  alt={category.name}
                  fill
                  className={`object-cover transition-transform ${
                    !isCategoryDisabled ? "group-hover:scale-105" : ""
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="text-lg font-semibold text-white">
                    {category.name}
                  </h3>
                  <p className="text-sm text-white/80">
                    {category.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
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
              {selectedCategory.presets.map((preset) => {
                const isSelected = currentPreset === preset.id;
                const isPresetDisabled = disabled && !isSelected;

                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      if (!isPresetDisabled) {
                        setSelectedPreset(preset.id);
                        onSelect(preset.id);
                        setSelectedCategory(null);
                      }
                    }}
                    className={`cursor-pointer rounded-lg border p-3 transition-all ${
                      isPresetDisabled
                        ? "cursor-not-allowed opacity-60"
                        : isSelected
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
                );
              })}
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
