export type ParamDef = {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
};

export type EffectContext = {
  time: number;
  width: number;
  height: number;
  params: Record<string, number>;
};

export type SetupTexture = {
  uniformName: string;
  unit: number;
  texture: WebGLTexture;
};

export type SetupResult = {
  textures?: SetupTexture[];
  cleanup?: () => void;
};

export type UniformValue = number | [number, number] | [number, number, number] | [number, number, number, number];

export type EffectDef = {
  id: string;
  name: string;
  blurb: string;
  fragment: string;
  params: ParamDef[];
  uniforms: (ctx: EffectContext) => Record<string, UniformValue>;
  setup?: (gl: WebGL2RenderingContext) => SetupResult;
};
