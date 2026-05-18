"use client"

import React, { useCallback, useRef } from "react"
import {
  HtmlInCanvas,
  type HtmlInCanvasOnInit,
  type HtmlInCanvasOnPaint,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import type { EffectDef, SetupTexture, UniformValue } from "./types"
import { usePaintLoop } from "./usePaintLoop"

const VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  // Flip Y so DOM-origin pixels appear upright.
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
}`

type GpuState = {
  gl: WebGL2RenderingContext
  program: WebGLProgram
  vao: WebGLVertexArrayObject
  vbo: WebGLBuffer
  videoTexture: WebGLTexture
  uniformCache: Map<string, WebGLUniformLocation | null>
  extraTextures: SetupTexture[]
  extraCleanup?: () => void
}

const compileShader = (
  gl: WebGL2RenderingContext,
  type: number,
  src: string
) => {
  const sh = gl.createShader(type)
  if (!sh) throw new Error("createShader failed")
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? ""
    gl.deleteShader(sh)
    throw new Error(`Shader compile error: ${log}\n\n${src}`)
  }
  return sh
}

const buildProgram = (gl: WebGL2RenderingContext, frag: string) => {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag)
  const program = gl.createProgram()
  if (!program) throw new Error("createProgram failed")
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? ""
    gl.deleteProgram(program)
    throw new Error(`Program link error: ${log}`)
  }
  return program
}

const setUniform = (
  gl: WebGL2RenderingContext,
  loc: WebGLUniformLocation,
  v: UniformValue
) => {
  if (typeof v === "number") gl.uniform1f(loc, v)
  else if (v.length === 2) gl.uniform2f(loc, v[0], v[1])
  else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2])
  else gl.uniform4f(loc, v[0], v[1], v[2], v[3])
}

type Props = {
  effect: EffectDef
  params: Record<string, number>
  width: number
  height: number
  children: React.ReactNode
}

export const ShaderEffect: React.FC<Props> = ({
  effect,
  params,
  width,
  height,
  children,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const gpuRef = useRef<GpuState | null>(null)
  const paramsRef = useRef(params)
  paramsRef.current = params
  const canvasRef = usePaintLoop()

  const onInit: HtmlInCanvasOnInit = useCallback(
    ({ canvas }) => {
      const gl = canvas.getContext("webgl2")
      if (!gl) throw new Error("WebGL2 unavailable on OffscreenCanvas")

      const program = buildProgram(gl, effect.fragment)
      gl.useProgram(program)

      // Fullscreen triangle pair
      const vbo = gl.createBuffer()
      if (!vbo) throw new Error("createBuffer failed")
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      )
      const vao = gl.createVertexArray()
      if (!vao) throw new Error("createVertexArray failed")
      gl.bindVertexArray(vao)
      const posLoc = gl.getAttribLocation(program, "a_pos")
      gl.enableVertexAttribArray(posLoc)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

      // Video texture (unit 0)
      const videoTexture = gl.createTexture()
      if (!videoTexture) throw new Error("createTexture failed")
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, videoTexture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      const uniformCache = new Map<string, WebGLUniformLocation | null>()
      uniformCache.set("u_tex", gl.getUniformLocation(program, "u_tex"))

      let extraTextures: SetupTexture[] = []
      let extraCleanup: (() => void) | undefined
      if (effect.setup) {
        const r = effect.setup(gl)
        extraTextures = r.textures ?? []
        extraCleanup = r.cleanup
        for (const tex of extraTextures) {
          uniformCache.set(
            tex.uniformName,
            gl.getUniformLocation(program, tex.uniformName)
          )
        }
      }

      gpuRef.current = {
        gl,
        program,
        vao,
        vbo,
        videoTexture,
        uniformCache,
        extraTextures,
        extraCleanup,
      }

      return () => {
        extraCleanup?.()
        gl.deleteProgram(program)
        gl.deleteBuffer(vbo)
        gl.deleteVertexArray(vao)
        gl.deleteTexture(videoTexture)
        gpuRef.current = null
      }
    },
    [effect]
  )

  const onPaint: HtmlInCanvasOnPaint = useCallback(
    ({ elementImage }) => {
      const gpu = gpuRef.current
      if (!gpu) return
      const { gl, program, vao, videoTexture, uniformCache, extraTextures } =
        gpu

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.useProgram(program)
      gl.bindVertexArray(vao)

      // Bind the captured HTML render to TEXTURE0.
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, videoTexture)
      try {
        gl.texElementImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          elementImage
        )
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[ShaderEffect] texElementImage2D failed", err)
        return
      }

      const uTex = uniformCache.get("u_tex")
      if (uTex) gl.uniform1i(uTex, 0)

      // Bind effect-provided textures (e.g. glyph atlas).
      for (const tex of extraTextures) {
        gl.activeTexture(gl.TEXTURE0 + tex.unit)
        gl.bindTexture(gl.TEXTURE_2D, tex.texture)
        const loc = uniformCache.get(tex.uniformName)
        if (loc) gl.uniform1i(loc, tex.unit)
      }

      // Per-frame uniforms.
      const values = effect.uniforms({
        time: frame / fps,
        width,
        height,
        params: paramsRef.current,
      })
      for (const [name, val] of Object.entries(values)) {
        let loc = uniformCache.get(name)
        if (loc === undefined) {
          loc = gl.getUniformLocation(program, name)
          uniformCache.set(name, loc)
        }
        if (loc) setUniform(gl, loc, val)
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6)
    },
    [effect, frame, fps, width, height]
  )

  return (
    <HtmlInCanvas
      ref={canvasRef}
      width={width}
      height={height}
      onInit={onInit}
      onPaint={onPaint}
    >
      {children}
    </HtmlInCanvas>
  )
}
