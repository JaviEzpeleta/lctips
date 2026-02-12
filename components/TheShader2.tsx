// @ts-nocheck
"use client"

import React, { useEffect, useRef } from "react"

const ShaderVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    if (!gl) {
      console.error("WebGL not supported")
      return
    }

    // Vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    // Fragment shader
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 r;
      uniform float t;
      
      void main() {
        vec4 o = vec4(0.0);
        vec2 FC = gl_FragCoord.xy;
        vec2 p = (FC.xy * 2.0 - r) / r.y;
        
        // Equivalent of: for(float i=1.;i<8e1;i/=.8)
        float i = 1.0;
        for(int j = 0; j < 64; j++) {
          if(i > 80.0) break;
          
          // Unrolled original computation
          vec4 cosResult = cos(5.0 * sqrt(i) + vec4(2.0, 4.0, 0.0, 0.0)) + 1.1;
          float sinResult = sin(p.x * i + t) / i - p.y;
          float divisor = abs(sinResult) + 0.002;
          o = o + (cosResult / divisor / i);
          
          // i /= 0.8
          i = i / 0.8;
        }
        
        // o=tanh(o/5e1)
        o = o / 50.0;
        // Approximate tanh
        o = o / (1.0 + abs(o));
        
        o.a = 1.0;
        gl_FragColor = o;
      }
    `

    // Compile shader
    const createShader = (
      gl: WebGLRenderingContext,
      type: number,
      source: string
    ) => {
      const shader = gl.createShader(type)
      if (!shader) return null

      gl.shaderSource(shader, source)
      gl.compileShader(shader)

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader))
        console.error("Shader source:", source)
        gl.deleteShader(shader)
        return null
      }

      return shader
    }

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    )

    if (!vertexShader || !fragmentShader) {
      console.error("Failed to create shaders")
      return
    }

    // Create program
    const program = gl.createProgram()
    if (!program) return

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program))
      return
    }

    // Set up geometry (full screen quad)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, "a_position")
    const resolutionLocation = gl.getUniformLocation(program, "r")
    const timeLocation = gl.getUniformLocation(program, "t")

    // Animation loop
    let startTime = Date.now()

    const render = () => {
      const currentTime = (Date.now() - startTime) / 1000

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(program)

      // Set uniforms
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform1f(timeLocation, currentTime)

      // Set up attribute
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animationRef.current = requestAnimationFrame(render)
    }

    render()

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      gl.deleteBuffer(positionBuffer)
    }
  }, [])

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="p-2 bg-black rounded-2xl overflow-hidden shadow-2xl">
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="block rounded-lg"
          />
        </div>
      </div>
    </div>
  )
}

export default ShaderVisualization
