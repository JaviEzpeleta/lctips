import type { EffectDef } from "./types"

/**
 * "VHS de San Valentín" — one combined pass that stacks the proven looks
 * from vfx-experiments (vhs + crt + halftone) into a single fragment so we
 * never have to nest HtmlInCanvas:
 *
 *   barrel curvature → chroma bleed → chroma undersample → pink/magenta
 *   grade → halftone print dots → scanlines → RGB phosphor mask → grain
 *   → soft rose vignette
 *
 * Tuned "marcado retro-cute": the filter is clearly present (visible
 * scanlines + evident dots) while the pink stays the protagonist.
 */
const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_chroma;
uniform float u_scan;
uniform float u_grain;
uniform float u_dots;
uniform float u_dotSize;
uniform float u_curve;
uniform float u_tint;
in vec2 v_uv;
out vec4 outColor;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 barrel(vec2 uv, float k) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  return 0.5 + c * (1.0 + k * r2);
}

float dotPattern(vec2 uv, float angle, vec2 res, float dotSize) {
  float ca = cos(angle);
  float sa = sin(angle);
  vec2 r = vec2(uv.x * ca - uv.y * sa, uv.x * sa + uv.y * ca);
  vec2 grid = r * res / dotSize;
  vec2 cell = fract(grid) - 0.5;
  return length(cell);
}

void main() {
  float t = u_time;

  // Subtle CRT tube bulge (CLAMP_TO_EDGE smears the corners — softer
  // than hard black bars, fits the cute look).
  vec2 uv = barrel(v_uv, u_curve);

  // Slow vertical roll
  float roll = step(0.992, fract(t * 0.7)) * 0.035;
  uv.y = fract(uv.y + roll);

  // Tape head wobble (low-freq horizontal sway)
  uv.x += sin(uv.y * 220.0 + t * 6.0) * 0.0010;
  uv.x += sin(uv.y * 18.0 + t * 1.3) * 0.0026;

  // Chromatic aberration (pink/cyan fringing)
  float a = u_chroma * 0.013;
  float r = texture(u_tex, uv + vec2(a, 0.0)).r;
  float g = texture(u_tex, uv).g;
  float b = texture(u_tex, uv - vec2(a, 0.0)).b;
  vec3 color = vec3(r, g, b);

  float lum = dot(color, vec3(0.299, 0.587, 0.114));

  // VHS undersamples chroma
  color = mix(vec3(lum), color, 0.82);

  // Valentine grade — magenta-rose shadows, peachy highlights
  vec3 graded = color;
  graded += vec3(0.05, -0.02, 0.03) * (1.0 - lum);
  graded += vec3(0.03, 0.005, -0.01) * lum;
  graded.r = min(1.0, graded.r * 1.04);
  color = mix(color, graded, u_tint);

  // Halftone print dots — modulate, keep source colour (so it reads as
  // risograph texture, not a posterised photocopy)
  float d = dotPattern(v_uv, 0.40, u_resolution, u_dotSize);
  float radius = sqrt(clamp(1.0 - lum, 0.0, 1.0)) * 0.5;
  float ink = smoothstep(radius, radius - 0.025, d);
  color = mix(color, color * ink, u_dots);

  // Scanlines
  float scan = sin(uv.y * u_resolution.y * 1.4) * 0.5 + 0.5;
  color *= 1.0 - u_scan * (1.0 - scan);

  // RGB phosphor mask
  float phase = mod(floor(v_uv.x * u_resolution.x), 3.0);
  vec3 mask = vec3(
    phase < 1.0 ? 1.06 : 0.95,
    (phase >= 1.0 && phase < 2.0) ? 1.06 : 0.95,
    phase >= 2.0 ? 1.06 : 0.95
  );
  color *= mix(vec3(1.0), mask, u_scan * 0.5);

  // Grain
  float n = rand(v_uv * u_resolution + t * 60.0);
  color += (n - 0.5) * u_grain * 0.16;

  // Soft pink vignette — warm the darkened edges toward rose, not black
  vec2 vc = v_uv - 0.5;
  float vig = clamp(1.0 - dot(vc, vc) * 0.85, 0.0, 1.0);
  color *= vig;
  color += vec3(0.04, 0.0, 0.02) * (1.0 - vig) * 0.6;

  outColor = vec4(color, 1.0);
}`

export const valentineVHS: EffectDef = {
  id: "valentine-vhs",
  name: "Valentine VHS",
  blurb:
    "VHS + CRT + halftone in one pass, graded pink. Marked retro-cute.",
  fragment: FRAG,
  params: [
    { name: "chroma", label: "Chroma bleed", min: 0, max: 2, step: 0.01, default: 1.1 },
    { name: "scan", label: "Scanlines", min: 0, max: 1, step: 0.01, default: 0.55 },
    { name: "grain", label: "Grain", min: 0, max: 2, step: 0.01, default: 0.7 },
    { name: "dots", label: "Halftone mix", min: 0, max: 1, step: 0.01, default: 0.36 },
    { name: "dotSize", label: "Dot size", min: 3, max: 24, step: 0.5, default: 7 },
    { name: "curve", label: "CRT curvature", min: 0, max: 0.4, step: 0.01, default: 0.1 },
    { name: "tint", label: "Pink grade", min: 0, max: 1, step: 0.01, default: 0.55 },
  ],
  uniforms: ({ time, width, height, params }) => ({
    u_time: time,
    u_resolution: [width, height],
    u_chroma: params.chroma,
    u_scan: params.scan,
    u_grain: params.grain,
    u_dots: params.dots,
    u_dotSize: params.dotSize,
    u_curve: params.curve,
    u_tint: params.tint,
  }),
}
