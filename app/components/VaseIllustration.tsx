"use client";

import React, { useId } from "react";
import type { MemoryMood } from "@/src/lib/db";
import {
  getVaseByCode,
  type VaseCatalogItem,
  type VasePattern,
} from "@/src/lib/vaseCatalog";

type VaseShape = "classic" | "amphora" | "chalice" | "faceted" | "lantern";

function getVaseShape(vase: Partial<VaseCatalogItem>): VaseShape {
  const code = vase.code ?? "";
  if (vase.pattern === "crystal" || vase.pattern === "stained") {
    return "faceted";
  }
  if (vase.pattern === "royal" || vase.pattern === "kintsugi") {
    return code.includes("kintsugi") ? "classic" : "chalice";
  }
  if (vase.pattern === "stars" || vase.pattern === "moon" || vase.pattern === "aurora") {
    return code.includes("lantern") ? "lantern" : "amphora";
  }
  if (vase.pattern === "floral" || vase.pattern === "striped") {
    return "amphora";
  }
  return "classic";
}

export interface VaseFlowerItem {
  mood?: MemoryMood;
  unlock_date?: string | null;
}

export type PlantHealth = "fresh" | "thirsty" | "wilting" | "withered";

interface VaseIllustrationProps {
  count?: number;
  flowers?: VaseFlowerItem[];
  monthIndex: number; // 0-11
  vaseCode?: string | null;
  isWatered?: boolean;
  plantHealth?: PlantHealth;
  className?: string;
}

const VASE_PALETTES = [
  { body: "#D99B84", shade: "#C27E66", rim: "#E5B29E", highlight: "#F3D3C6" }, // Terracotta
  { body: "#8FA992", shade: "#738E76", rim: "#A8BFA9", highlight: "#CBE0CC" }, // Sage Celadon
  { body: "#E8DDD0", shade: "#D4C4B2", rim: "#F2EAE0", highlight: "#FFFFFF" }, // Cream Stoneware
  { body: "#D6A3A6", shade: "#BE8689", rim: "#E5B9BC", highlight: "#F5D9DB" }, // Dusty Blush
  { body: "#9AAEC2", shade: "#7F94AA", rim: "#B3C4D4", highlight: "#D7E3EE" }, // Slate Ceramic
  { body: "#DFC38E", shade: "#C8A970", rim: "#ECD4A6", highlight: "#F8E9CA" }, // Ochre Clay
];

const COZY_DAISY_COLORS = [
  { petal: "#F3D2CF", inner: "#DCA8A4", center: "#E5B655" }, // Blush Cream
  { petal: "#B8A3CC", inner: "#9B82B5", center: "#F5D77F" }, // Lavender
  { petal: "#F0AE8D", inner: "#D88E6B", center: "#8A5D3B" }, // Warm Peach
  { petal: "#9BB5D6", inner: "#7B98BE", center: "#F6D578" }, // Periwinkle
];

type FlowerKind = "rose" | "sunflower" | "tulip" | "daisy" | "bud";

function getColorsForMood(mood: MemoryMood | undefined, index: number) {
  switch (mood) {
    case "date_night":
      return { petal: "#E28B90", inner: "#C96B71", center: "#F6D578" }; // Rose
    case "travel":
      return { petal: "#F2BE42", inner: "#D99A26", center: "#5E3D24" }; // Sunflower
    case "milestone":
      return { petal: "#DC846B", inner: "#C1664D", center: "#F8E192" }; // Tulip
    case "cozy":
    default:
      return COZY_DAISY_COLORS[index % COZY_DAISY_COLORS.length];
  }
}

function getKindForFlower(item: VaseFlowerItem, today: string): FlowerKind {
  if (item.unlock_date && item.unlock_date > today) {
    return "bud";
  }
  switch (item.mood) {
    case "date_night":
      return "rose";
    case "travel":
      return "sunflower";
    case "milestone":
      return "tulip";
    case "cozy":
    default:
      return "daisy";
  }
}

function renderFlowerHead(
  x: number,
  y: number,
  scale: number,
  rotation: number,
  colors: { petal: string; inner: string; center: string },
  kind: FlowerKind,
  key: string
) {
  return (
    <g
      key={key}
      transform={`translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`}
    >
      {kind === "bud" && (
        <>
          {/* Closed Time Capsule Flower Bud */}
          <path
            d="M -6,2 C -7,-8 -2,-15 0,-17 C 2,-15 7,-8 6,2 C 4,6 -4,6 -6,2 Z"
            fill={colors.petal}
          />
          <path
            d="M -3,1 C -3,-7 -1,-13 0,-16 C 1,-13 3,-7 3,1 Z"
            fill={colors.inner}
            opacity="0.65"
          />
          {/* Green wrapping sepals */}
          <path
            d="M -7,3 C -8,-3 -4,-8 -1,-4 C 0,0 -2,6 -7,3 Z"
            fill="#5C7D60"
          />
          <path
            d="M 7,3 C 8,-3 4,-8 1,-4 C 0,0 2,6 7,3 Z"
            fill="#6D8F71"
          />
          <circle cx="0" cy="-14" r="1.4" fill="#FFF8E7" opacity="0.85" />
        </>
      )}

      {kind === "sunflower" && (
        <>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
            (angle) => (
              <ellipse
                key={angle}
                cx="0"
                cy="-11"
                rx="3.1"
                ry="8.2"
                fill={angle % 60 === 0 ? colors.petal : colors.inner}
                transform={`rotate(${angle})`}
              />
            )
          )}
          <circle cx="0" cy="0" r="6.5" fill={colors.center} />
          <circle cx="-1.5" cy="-1.5" r="1.2" fill="#8C5E3C" />
          <circle cx="2" cy="1" r="1" fill="#8C5E3C" />
        </>
      )}

      {kind === "daisy" && (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ellipse
              key={angle}
              cx="0"
              cy="-10"
              rx="4.2"
              ry="8.5"
              fill={colors.petal}
              transform={`rotate(${angle})`}
            />
          ))}
          <circle cx="0" cy="0" r="5.2" fill={colors.center} />
          <circle cx="-1.5" cy="-1.5" r="1.4" fill="#FFF7D6" opacity="0.7" />
        </>
      )}

      {kind === "tulip" && (
        <>
          <path
            d="M -9,-4 C -11,-15 -3,-20 0,-12 C 3,-20 11,-15 9,-4 C 8,4 4,7 0,7 C -4,7 -8,4 -9,-4 Z"
            fill={colors.inner}
          />
          <path
            d="M -7,-2 C -8,-12 -2,-15 0,-9 C 2,-15 8,-12 7,-2 C 6,4 3,7 0,7 C -3,7 -6,4 -7,-2 Z"
            fill={colors.petal}
          />
          <path
            d="M -3,-8 C -2,-15 2,-15 3,-8 C 3,0 2,5 0,6 C -2,5 -3,0 -3,-8 Z"
            fill={colors.petal}
            opacity="0.9"
          />
        </>
      )}

      {kind === "rose" && (
        <>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <circle
              key={angle}
              cx="0"
              cy="-6.5"
              r="6.2"
              fill={colors.petal}
              transform={`rotate(${angle})`}
            />
          ))}
          {[30, 90, 150, 210, 270, 330].map((angle) => (
            <circle
              key={angle}
              cx="0"
              cy="-3.5"
              r="4.5"
              fill={colors.inner}
              opacity="0.75"
              transform={`rotate(${angle})`}
            />
          ))}
          <circle cx="0" cy="0" r="3.6" fill={colors.center} />
        </>
      )}
    </g>
  );
}

interface StemSpec {
  endX: number;
  endY: number;
  ctrlX: number;
  ctrlY: number;
  rotation: number;
  scale: number;
  kind: FlowerKind;
  colors: { petal: string; inner: string; center: string };
  leafSide: "left" | "right" | "both";
}

function buildBouquetSpecs(
  items: VaseFlowerItem[],
  monthIndex: number
): StemSpec[] {
  const count = items.length;
  if (count <= 0) return [];

  const today = new Date().toISOString().slice(0, 10);

  if (count === 1) {
    const item = items[0];
    return [
      {
        endX: 90,
        endY: 56,
        ctrlX: 84,
        ctrlY: 96,
        rotation: -4,
        scale: 1.08,
        kind: getKindForFlower(item, today),
        colors: getColorsForMood(item.mood, monthIndex),
        leafSide: "both",
      },
    ];
  }

  if (count === 2) {
    return [
      {
        endX: 67,
        endY: 64,
        ctrlX: 78,
        ctrlY: 96,
        rotation: -14,
        scale: 0.98,
        kind: getKindForFlower(items[0], today),
        colors: getColorsForMood(items[0].mood, monthIndex),
        leafSide: "left",
      },
      {
        endX: 113,
        endY: 54,
        ctrlX: 98,
        ctrlY: 94,
        rotation: 12,
        scale: 1.04,
        kind: getKindForFlower(items[1], today),
        colors: getColorsForMood(items[1].mood, monthIndex + 1),
        leafSide: "right",
      },
    ];
  }

  const specs: StemSpec[] = [];
  const goldenAngle = 2.39996;

  for (let i = 0; i < count; i++) {
    const item = items[i];
    const t = i / (count - 1);
    const layer = i % 3;

    const spread = Math.min(48, 24 + count * 3.2);
    const fanOffset = (t - 0.5) * 2 * spread;
    const jitterX = Math.sin(i * 2.7 + monthIndex) * 5;
    const endX = Math.max(28, Math.min(152, 90 + fanOffset + jitterX));

    const baseHeight = layer === 0 ? 38 : layer === 1 ? 56 : 74;
    const archDrop = Math.abs(endX - 90) * 0.28;
    const jitterY = Math.cos(i * goldenAngle + monthIndex) * 6;
    const endY = Math.max(24, Math.min(96, baseHeight + archDrop + jitterY));

    const ctrlX = 90 + (endX - 90) * 0.35;
    const ctrlY = 104 + layer * 4;
    const rotation = (endX - 90) * 0.36;
    const scale = count > 8 ? 0.78 : count > 5 ? 0.86 : 0.94;

    specs.push({
      endX,
      endY,
      ctrlX,
      ctrlY,
      rotation,
      scale,
      kind: getKindForFlower(item, today),
      colors: getColorsForMood(item.mood, i + monthIndex),
      leafSide: i % 2 === 0 ? "left" : "right",
    });
  }

  return specs.sort((a, b) => a.endY - b.endY);
}

function renderVasePattern(pattern: VasePattern, accent: string) {
  switch (pattern) {
    case "speckled":
      return (
        <g fill={accent} opacity="0.55">
          <circle cx="72" cy="154" r="1.4" />
          <circle cx="95" cy="148" r="1.2" />
          <circle cx="108" cy="162" r="1.6" />
          <circle cx="64" cy="172" r="1.3" />
          <circle cx="84" cy="178" r="1.5" />
          <circle cx="102" cy="182" r="1.2" />
          <circle cx="116" cy="152" r="1.1" />
          <circle cx="78" cy="164" r="1.1" />
        </g>
      );
    case "ripple":
      return (
        <g fill="none" stroke={accent} strokeWidth="1.4" opacity="0.5">
          <path d="M 55,152 Q 90,157 125,152" />
          <path d="M 51,164 Q 90,169 129,164" />
          <path d="M 53,176 Q 90,181 127,176" />
        </g>
      );
    case "striped":
      return (
        <g fill="none" stroke={accent} strokeWidth="3" opacity="0.45">
          <path d="M 56,154 Q 90,160 124,154" />
          <path d="M 52,172 Q 90,178 128,172" />
        </g>
      );
    case "floral":
      return (
        <g opacity="0.8">
          {[
            { x: 76, y: 158 },
            { x: 102, y: 170 },
          ].map((pos, idx) => (
            <g key={idx} transform={`translate(${pos.x}, ${pos.y})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle
                  key={a}
                  cx="0"
                  cy="-4"
                  r="2.6"
                  fill={accent}
                  transform={`rotate(${a})`}
                />
              ))}
              <circle cx="0" cy="0" r="2" fill="#F8E184" />
            </g>
          ))}
        </g>
      );
    case "stained":
      return (
        <g fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6">
          <path d="M 64,142 L 78,165 L 62,188" />
          <path d="M 90,140 L 78,165 L 102,168 L 116,142" />
          <path d="M 78,165 L 92,193" />
          <path d="M 102,168 L 118,187" />
        </g>
      );
    case "crystal":
      return (
        <g fill={accent} opacity="0.32">
          <polygon points="70,142 86,162 66,184 54,166" />
          <polygon points="104,145 122,166 108,188 92,166" />
        </g>
      );
    case "stars":
      return (
        <g fill={accent} opacity="0.9">
          {[
            { x: 72, y: 156, s: 1 },
            { x: 104, y: 152, s: 0.85 },
            { x: 88, y: 174, s: 1.1 },
            { x: 65, y: 176, s: 0.7 },
            { x: 112, y: 174, s: 0.75 },
          ].map((st, idx) => (
            <path
              key={idx}
              d={`M ${st.x},${st.y - 4 * st.s} L ${st.x + 1.2 * st.s},${st.y - 1.2 * st.s} L ${st.x + 4 * st.s},${st.y} L ${st.x + 1.2 * st.s},${st.y + 1.2 * st.s} L ${st.x},${st.y + 4 * st.s} L ${st.x - 1.2 * st.s},${st.y + 1.2 * st.s} L ${st.x - 4 * st.s},${st.y} L ${st.x - 1.2 * st.s},${st.y - 1.2 * st.s} Z`}
            />
          ))}
        </g>
      );
    case "moon":
      return (
        <g opacity="0.9">
          <circle cx="90" cy="166" r="10" fill={accent} />
          <circle cx="95" cy="163" r="8.5" fill="rgba(40, 28, 56, 0.85)" />
          <circle cx="70" cy="154" r="1.4" fill={accent} />
          <circle cx="111" cy="176" r="1.4" fill={accent} />
        </g>
      );
    case "aurora":
      return (
        <g fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity="0.45">
          <path d="M 58,154 Q 88,144 122,160" />
          <path d="M 55,172 Q 92,162 124,178" />
        </g>
      );
    case "kintsugi":
      return (
        <g fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.92">
          <path d="M 68,140 L 82,158 L 76,174 L 94,192" />
          <path d="M 82,158 L 106,164 L 122,154" />
          <path d="M 76,174 L 58,180" />
        </g>
      );
    case "marble":
      return (
        <g fill="none" stroke={accent} strokeWidth="1.6" opacity="0.45">
          <path d="M 64,144 Q 82,158 72,174 T 96,192" />
          <path d="M 106,144 Q 94,162 114,178" />
        </g>
      );
    case "royal":
      return (
        <g fill="none" stroke={accent} strokeWidth="1.8" opacity="0.82">
          <path d="M 52,164 Q 90,172 128,164" />
          <path d="M 54,169 Q 90,177 126,169" />
          <circle cx="90" cy="168" r="3" fill={accent} />
        </g>
      );
    case "band":
    default:
      return (
        <path
          d="M 52,167 Q 90,173 128,167"
          fill="none"
          stroke={accent}
          strokeWidth="1.4"
          opacity="0.45"
        />
      );
  }
}

export default function VaseIllustration({
  count,
  flowers,
  monthIndex,
  vaseCode,
  isWatered = false,
  plantHealth = "fresh",
  className = "",
}: VaseIllustrationProps) {
  const uid = useId().replace(/:/g, "");
  const resolvedItems: VaseFlowerItem[] =
    flowers ??
    Array.from({ length: count ?? 0 }, (_, idx) => ({
      mood: (["date_night", "travel", "milestone", "cozy"] as const)[idx % 4],
      unlock_date: null,
    }));

  const specialVase = getVaseByCode(vaseCode);
  const fallbackPalette = VASE_PALETTES[monthIndex % VASE_PALETTES.length];
  const vase = specialVase ?? {
    code: "starter_classic",
    body: fallbackPalette.body,
    gradientTo: fallbackPalette.shade,
    shade: fallbackPalette.shade,
    rim: fallbackPalette.rim,
    highlight: fallbackPalette.highlight,
    accent: fallbackPalette.highlight,
    pattern: "band" as VasePattern,
    isGlass: false,
    glowColor: undefined,
  };
  const shape = getVaseShape(vase);
  const gradId = `vaseGrad-${uid}`;
  const glowId = `vaseGlow-${uid}`;

  // Distinct artistic silhouettes
  const bodyPath =
    shape === "amphora"
      ? "M 70,134 C 69,144 50,152 52,172 C 54,188 68,195 90,195 C 112,195 126,188 128,172 C 130,152 111,144 110,134 Z"
      : shape === "chalice"
        ? "M 62,134 C 58,150 64,170 78,178 L 76,188 L 62,194 L 118,194 L 104,188 L 102,178 C 116,170 122,150 118,134 Z"
        : shape === "faceted"
          ? "M 66,134 L 50,158 L 58,188 L 76,195 L 104,195 L 122,188 L 130,158 L 114,134 Z"
          : shape === "lantern"
            ? "M 66,134 L 54,150 L 54,184 L 68,195 L 112,195 L 126,184 L 126,150 L 114,134 Z"
            : "M 64,134 C 60,144 48,154 50,174 C 52,188 64,195 90,195 C 116,195 128,188 130,174 C 132,154 120,144 116,134 Z";

  const shadePath =
    shape === "faceted"
      ? "M 92,134 L 108,158 L 100,195 L 104,195 L 122,188 L 130,158 L 114,134 Z"
      : shape === "chalice"
        ? "M 96,134 C 102,152 98,170 92,178 L 104,188 L 118,194 L 102,194 L 104,188 L 102,178 C 116,170 122,150 118,134 Z"
        : "M 96,134 C 102,146 112,156 110,175 C 108,186 100,193 90,195 C 116,195 128,188 130,174 C 132,154 120,144 116,134 Z";
  const stems = buildBouquetSpecs(resolvedItems, monthIndex);
  const swayDelay = `${(monthIndex % 5) * 0.55}s`;

  const plantFilter =
    plantHealth === "withered"
      ? "grayscale(0.95) sepia(0.28) brightness(0.82)"
      : plantHealth === "wilting"
        ? "saturate(0.45) sepia(0.25) brightness(0.92)"
        : plantHealth === "thirsty"
          ? "saturate(0.75) brightness(0.97)"
          : undefined;

  const plantDroopTransform =
    plantHealth === "withered"
      ? "translate(0, 12) rotate(7 90 134) scale(1, 0.9)"
      : plantHealth === "wilting"
        ? "translate(0, 5) rotate(3.5 90 134) scale(1, 0.96)"
        : undefined;

  return (
    <svg
      viewBox="0 0 180 210"
      className={`w-full h-auto overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      {/* Soft shelf shadow */}
      <ellipse cx="90" cy="196" rx="44" ry="7" fill="#3F322B" opacity="0.14" />

      {/* Animated stems, leaves & flowers */}
      {resolvedItems.length > 0 && (
        <g
          className={plantHealth === "withered" ? "" : "animate-sway"}
          style={{
            animationDelay: swayDelay,
            filter: plantFilter,
            transition: "filter 0.5s ease",
          }}
          transform={plantDroopTransform}
        >
          {resolvedItems.length >= 3 && (
            <g fill="#6B8E6E" opacity="0.88">
              <path d="M 88,132 Q 52,108 42,84 Q 68,94 86,124 Z" />
              <path d="M 92,132 Q 128,108 138,84 Q 112,94 94,124 Z" />
              <path d="M 90,130 Q 74,92 66,68 Q 86,88 90,122 Z" fill="#587A5B" />
              <path d="M 90,130 Q 108,92 116,68 Q 96,88 90,122 Z" fill="#587A5B" />
            </g>
          )}

          {stems.map((stem, idx) => {
            const startX =
              90 +
              (idx - (stems.length - 1) / 2) *
                (resolvedItems.length > 3 ? 2.2 : 0);
            const midX = (startX + stem.endX) / 2 + (stem.ctrlX - 90) * 0.2;
            const midY = (134 + stem.endY) / 2 + 6;

            return (
              <g key={`stem-${idx}`}>
                <path
                  d={`M ${startX},134 Q ${stem.ctrlX},${stem.ctrlY} ${stem.endX},${stem.endY}`}
                  fill="none"
                  stroke="#5C7D60"
                  strokeWidth={resolvedItems.length > 6 ? "2.4" : "3"}
                  strokeLinecap="round"
                />
                {(stem.leafSide === "left" || stem.leafSide === "both") && (
                  <path
                    d={`M ${midX},${midY} Q ${midX - 18},${midY - 8} ${midX - 22},${midY - 2} Q ${midX - 12},${midY + 6} ${midX},${midY} Z`}
                    fill="#739676"
                  />
                )}
                {(stem.leafSide === "right" || stem.leafSide === "both") && (
                  <path
                    d={`M ${midX},${midY - 4} Q ${midX + 18},${midY - 12} ${midX + 22},${midY - 6} Q ${midX + 12},${midY + 2} ${midX},${midY - 4} Z`}
                    fill="#658868"
                  />
                )}
              </g>
            );
          })}

          {stems.map((stem, idx) =>
            renderFlowerHead(
              stem.endX,
              stem.endY,
              stem.scale,
              stem.rotation,
              stem.colors,
              stem.kind,
              `flower-${idx}`
            )
          )}
        </g>
      )}

      {/* Watering Dewdrops & Sparkles */}
      {isWatered && (
        <g pointerEvents="none">
          {[
            { x: 52, y: 42, delay: "0s" },
            { x: 92, y: 28, delay: "0.2s" },
            { x: 128, y: 48, delay: "0.35s" },
            { x: 70, y: 74, delay: "0.15s" },
            { x: 110, y: 80, delay: "0.4s" },
          ].map((drop, i) => (
            <path
              key={`dew-${i}`}
              d={`M ${drop.x},${drop.y} C ${drop.x - 4},${drop.y + 7} ${drop.x - 4},${drop.y + 11} ${drop.x},${drop.y + 11} C ${drop.x + 4},${drop.y + 11} ${drop.x + 4},${drop.y + 7} ${drop.x},${drop.y} Z`}
              fill="#7FC4ED"
              className="animate-dew"
              style={{ animationDelay: drop.delay }}
            />
          ))}
          {[
            { x: 42, y: 66, delay: "0.1s" },
            { x: 136, y: 64, delay: "0.3s" },
            { x: 90, y: 18, delay: "0.2s" },
          ].map((sp, i) => (
            <path
              key={`sparkle-${i}`}
              d={`M ${sp.x},${sp.y - 6} L ${sp.x + 1.8},${sp.y - 1.8} L ${sp.x + 6},${sp.y} L ${sp.x + 1.8},${sp.y + 1.8} L ${sp.x},${sp.y + 6} L ${sp.x - 1.8},${sp.y + 1.8} L ${sp.x - 6},${sp.y} L ${sp.x - 1.8},${sp.y - 1.8} Z`}
              fill="#F7D96E"
              className="animate-sparkle"
              style={{
                transformOrigin: `${sp.x}px ${sp.y}px`,
                animationDelay: sp.delay,
              }}
            />
          ))}
        </g>
      )}

      {/* Vase Soil inside the opening */}
      <ellipse cx="90" cy="134" rx="26" ry="6.5" fill="#594134" />
      <ellipse cx="90" cy="133.5" rx="21" ry="4" fill="#463227" />
      <circle cx="79" cy="133" r="1.4" fill="#7C5E4D" />
      <circle cx="96" cy="134.5" r="1.6" fill="#7C5E4D" />
      <circle cx="104" cy="132.5" r="1.1" fill="#8C6C5A" />

      {/* Ceramic / Glass Vase Body */}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={vase.body} />
          <stop offset="100%" stopColor={vase.gradientTo} />
        </linearGradient>
        {vase.glowColor && (
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={vase.glowColor} stopOpacity="0.55" />
            <stop offset="65%" stopColor={vase.glowColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={vase.glowColor} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>

      {vase.glowColor && (
        <ellipse cx="90" cy="166" rx="58" ry="42" fill={`url(#${glowId})`} />
      )}

      <path
        d={bodyPath}
        fill={`url(#${gradId})`}
        opacity={vase.isGlass ? 0.86 : 1}
        style={
          vase.glowColor
            ? { filter: `drop-shadow(0 0 8px ${vase.glowColor})` }
            : undefined
        }
      />
      <path
        d={shadePath}
        fill={vase.shade}
        opacity={vase.isGlass ? 0.28 : 0.45}
      />

      {/* Amphora neck collar & Chalice handles */}
      {shape === "amphora" && (
        <path
          d="M 67,140 Q 90,145 113,140"
          fill="none"
          stroke={vase.accent}
          strokeWidth="2"
          opacity="0.7"
        />
      )}
      {shape === "chalice" && (
        <g fill="none" stroke={vase.rim} strokeWidth="3" strokeLinecap="round">
          <path d="M 62,140 C 46,142 46,160 63,162" />
          <path d="M 118,140 C 134,142 134,160 117,162" />
        </g>
      )}
      {shape === "faceted" && (
        <g fill="none" stroke={vase.highlight} strokeWidth="1.3" opacity="0.55">
          <path d="M 76,134 L 70,158 L 78,195" />
          <path d="M 104,134 L 110,158 L 102,195" />
          <path d="M 50,158 L 130,158" />
        </g>
      )}

      {renderVasePattern(vase.pattern, vase.accent)}

      <path
        d="M 65,146 C 59,156 58,170 62,180"
        fill="none"
        stroke={vase.highlight}
        strokeWidth={vase.isGlass ? "5.5" : "4.5"}
        strokeLinecap="round"
        opacity={vase.isGlass ? 0.82 : 0.65}
      />
      <path
        d="M 60,133 C 60,137.5 120,137.5 120,133 C 120,136.5 117,140 90,140 C 63,140 60,136.5 60,133 Z"
        fill={vase.rim}
      />
      <path
        d="M 62,132.5 C 62,136.5 118,136.5 118,132.5"
        fill="none"
        stroke={vase.highlight}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
