"use client";

import React from "react";

interface VaseIllustrationProps {
  count: number;
  monthIndex: number; // 0-11
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

const FLOWER_PALETTE = [
  { petal: "#E28B90", inner: "#C96B71", center: "#F6D578" }, // Dusty Rose
  { petal: "#ECC568", inner: "#D6A844", center: "#7C5238" }, // Buttercup
  { petal: "#DC846B", inner: "#C1664D", center: "#F8E192" }, // Terracotta Coral
  { petal: "#B8A3CC", inner: "#9B82B5", center: "#F5D77F" }, // Lavender
  { petal: "#F0AE8D", inner: "#D88E6B", center: "#8A5D3B" }, // Warm Peach
  { petal: "#F3D2CF", inner: "#DCA8A4", center: "#E5B655" }, // Blush Cream
  { petal: "#9BB5D6", inner: "#7B98BE", center: "#F6D578" }, // Periwinkle
];

type FlowerKind = "daisy" | "tulip" | "rose" | "cosmos";

function renderFlowerHead(
  x: number,
  y: number,
  scale: number,
  rotation: number,
  paletteIndex: number,
  kind: FlowerKind,
  key: string
) {
  const colors = FLOWER_PALETTE[paletteIndex % FLOWER_PALETTE.length];

  return (
    <g
      key={key}
      transform={`translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`}
    >
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

      {kind === "cosmos" && (
        <>
          {[0, 72, 144, 216, 288].map((angle) => (
            <path
              key={angle}
              d="M 0,0 C -5,-6 -7,-14 -2,-16 C 0,-14 0,-14 2,-16 C 7,-14 5,-6 0,0 Z"
              fill={colors.petal}
              transform={`rotate(${angle})`}
            />
          ))}
          <circle cx="0" cy="0" r="4.3" fill={colors.center} />
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
  colorIdx: number;
  leafSide: "left" | "right" | "both";
}

function buildBouquetSpecs(count: number, monthIndex: number): StemSpec[] {
  if (count <= 0) return [];

  const kinds: FlowerKind[] = ["rose", "daisy", "tulip", "cosmos"];

  if (count === 1) {
    return [
      {
        endX: 90,
        endY: 56,
        ctrlX: 84,
        ctrlY: 96,
        rotation: -4,
        scale: 1.08,
        kind: kinds[monthIndex % kinds.length],
        colorIdx: monthIndex % FLOWER_PALETTE.length,
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
        kind: kinds[monthIndex % kinds.length],
        colorIdx: monthIndex % FLOWER_PALETTE.length,
        leafSide: "left",
      },
      {
        endX: 113,
        endY: 54,
        ctrlX: 98,
        ctrlY: 94,
        rotation: 12,
        scale: 1.04,
        kind: kinds[(monthIndex + 1) % kinds.length],
        colorIdx: (monthIndex + 1) % FLOWER_PALETTE.length,
        leafSide: "right",
      },
    ];
  }

  // 3+ memories: lush multi-stem bouquet rendering 1 distinct flower per memory
  const specs: StemSpec[] = [];
  const goldenAngle = 2.39996; // phyllotaxis-inspired spread

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1); // 0..1
    const layer = i % 3; // 0 = tall back, 1 = mid, 2 = front lower

    // Spread stems across a natural fan
    const spread = Math.min(48, 24 + count * 3.2);
    const fanOffset = (t - 0.5) * 2 * spread;
    // Slight deterministic jitter so bouquet feels organic
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
      kind: kinds[(i + monthIndex) % kinds.length],
      colorIdx: (i + monthIndex) % FLOWER_PALETTE.length,
      leafSide: i % 2 === 0 ? "left" : "right",
    });
  }

  // Draw taller back stems first, front stems last
  return specs.sort((a, b) => a.endY - b.endY);
}

export default function VaseIllustration({
  count,
  monthIndex,
  className = "",
}: VaseIllustrationProps) {
  const vase = VASE_PALETTES[monthIndex % VASE_PALETTES.length];
  const stems = buildBouquetSpecs(count, monthIndex);
  const swayDelay = `${(monthIndex % 5) * 0.55}s`;

  return (
    <svg
      viewBox="0 0 180 210"
      className={`w-full h-auto overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      {/* Soft shelf shadow */}
      <ellipse cx="90" cy="196" rx="44" ry="7" fill="#3F322B" opacity="0.1" />

      {/* Animated stems, leaves & flowers */}
      {count > 0 && (
        <g className="animate-sway" style={{ animationDelay: swayDelay }}>
          {/* Extra lush bouquet foliage for 3+ memories */}
          {count >= 3 && (
            <g fill="#6B8E6E" opacity="0.88">
              <path d="M 88,132 Q 52,108 42,84 Q 68,94 86,124 Z" />
              <path d="M 92,132 Q 128,108 138,84 Q 112,94 94,124 Z" />
              <path d="M 90,130 Q 74,92 66,68 Q 86,88 90,122 Z" fill="#587A5B" />
              <path d="M 90,130 Q 108,92 116,68 Q 96,88 90,122 Z" fill="#587A5B" />
            </g>
          )}

          {/* Stems & leaves */}
          {stems.map((stem, idx) => {
            const startX = 90 + (idx - (stems.length - 1) / 2) * (count > 3 ? 2.2 : 0);
            const midX = (startX + stem.endX) / 2 + (stem.ctrlX - 90) * 0.2;
            const midY = (134 + stem.endY) / 2 + 6;

            return (
              <g key={`stem-${idx}`}>
                <path
                  d={`M ${startX},134 Q ${stem.ctrlX},${stem.ctrlY} ${stem.endX},${stem.endY}`}
                  fill="none"
                  stroke="#5C7D60"
                  strokeWidth={count > 6 ? "2.4" : "3"}
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

          {/* Flower blooms */}
          {stems.map((stem, idx) =>
            renderFlowerHead(
              stem.endX,
              stem.endY,
              stem.scale,
              stem.rotation,
              stem.colorIdx,
              stem.kind,
              `flower-${idx}`
            )
          )}
        </g>
      )}

      {/* Vase Soil inside the opening */}
      <ellipse cx="90" cy="134" rx="26" ry="6.5" fill="#594134" />
      <ellipse cx="90" cy="133.5" rx="21" ry="4" fill="#463227" />
      {/* Tiny soil pebbles */}
      <circle cx="79" cy="133" r="1.4" fill="#7C5E4D" />
      <circle cx="96" cy="134.5" r="1.6" fill="#7C5E4D" />
      <circle cx="104" cy="132.5" r="1.1" fill="#8C6C5A" />

      {/* Ceramic Vase Body */}
      <path
        d="M 64,134 C 60,144 48,154 50,174 C 52,188 64,195 90,195 C 116,195 128,188 130,174 C 132,154 120,144 116,134 Z"
        fill={vase.body}
      />

      {/* Right-side ceramic shading */}
      <path
        d="M 96,134 C 102,146 112,156 110,175 C 108,186 100,193 90,195 C 116,195 128,188 130,174 C 132,154 120,144 116,134 Z"
        fill={vase.shade}
        opacity="0.48"
      />

      {/* Left-side soft glaze highlight */}
      <path
        d="M 65,146 C 59,156 58,170 62,180"
        fill="none"
        stroke={vase.highlight}
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity="0.65"
      />

      {/* Vase Rim */}
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

      {/* Subtle decorative band on vase */}
      <path
        d="M 52,167 Q 90,173 128,167"
        fill="none"
        stroke={vase.highlight}
        strokeWidth="1.4"
        opacity="0.45"
      />
    </svg>
  );
}
