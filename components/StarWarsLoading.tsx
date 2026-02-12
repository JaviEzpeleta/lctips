"use client"

import React, { useEffect, useRef } from "react"
import * as THREE from "three"

const StarWarsLoading: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const textContainerRef = useRef<HTMLDivElement>(null)
  const frameId = useRef<number>(0)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const starsRef = useRef<THREE.Group[]>([])
  const windParticlesRef = useRef<THREE.Points | null>(null)

  // Mouse parallax state
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000) // Pure black background
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 10)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create spherical stars with flying through space effect
    const createStars = () => {
      const starLayers = [
        {
          count: 300,
          spread: 800,
          size: [0.3, 1.2],
          speed: 8,
          color: 0xffffff,
          emissive: 0x444444,
        },
        {
          count: 200,
          spread: 1200,
          size: [0.8, 2.0],
          speed: 5,
          color: 0xffffcc,
          emissive: 0x444400,
        },
        {
          count: 150,
          spread: 1600,
          size: [1.2, 3.0],
          speed: 3,
          color: 0xccddff,
          emissive: 0x001144,
        },
      ]

      starLayers.forEach((layer, layerIndex) => {
        const starGroup = new THREE.Group()
        starGroup.userData = { stars: [], speed: layer.speed, layerIndex }

        for (let i = 0; i < layer.count; i++) {
          // Create spherical star geometry
          const starSize =
            Math.random() * (layer.size[1] - layer.size[0]) + layer.size[0]
          const geometry = new THREE.SphereGeometry(starSize * 0.1, 8, 6)

          const material = new THREE.MeshStandardMaterial({
            color: layer.color,
            emissive: layer.emissive,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.8 + Math.random() * 0.2,
          })

          const star = new THREE.Mesh(geometry, material)

          // Position stars in a sphere around the camera
          const theta = Math.random() * Math.PI * 2
          const phi = Math.random() * Math.PI
          const radius = layer.spread * (0.5 + Math.random() * 0.5)

          star.position.x = radius * Math.sin(phi) * Math.cos(theta)
          star.position.y = radius * Math.sin(phi) * Math.sin(theta)
          star.position.z = radius * Math.cos(phi) - layer.spread

          // Store original data for animation
          star.userData = {
            originalSize: starSize,
            twinklePhase: Math.random() * Math.PI * 2,
            originalOpacity: material.opacity,
            originalEmissive: layer.emissive,
            velocity: {
              x: (Math.random() - 0.5) * 0.1,
              y: (Math.random() - 0.5) * 0.1,
              z: 0,
            },
          }

          starGroup.add(star)
          starGroup.userData.stars.push(star)
        }

        scene.add(starGroup)
        starsRef.current.push(starGroup)
      })
    }

    // Create hyperspace star trails and wind particles
    const createWindParticles = () => {
      const geometry = new THREE.BufferGeometry()
      const vertices = []
      const velocities = []
      const lifetimes = []
      const trails = []

      for (let i = 0; i < 500; i++) {
        vertices.push(
          (Math.random() - 0.5) * 1000,
          (Math.random() - 0.5) * 600,
          Math.random() * 200 - 400
        )
        velocities.push(
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.0,
          Math.random() * 15 + 10 // Faster forward motion for trails
        )
        lifetimes.push(Math.random())
        trails.push(Math.random() > 0.7 ? 1 : 0) // 30% chance to be a trail
      }

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      )
      geometry.setAttribute(
        "velocity",
        new THREE.Float32BufferAttribute(velocities, 3)
      )
      geometry.setAttribute(
        "lifetime",
        new THREE.Float32BufferAttribute(lifetimes, 1)
      )
      geometry.setAttribute(
        "trail",
        new THREE.Float32BufferAttribute(trails, 1)
      )

      const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      })

      const particles = new THREE.Points(geometry, material)
      scene.add(particles)
      windParticlesRef.current = particles
    }

    // Animation loop
    const animate = () => {
      frameId.current = requestAnimationFrame(animate)

      const time = Date.now() * 0.001

      // Smooth mouse parallax
      mouseRef.current.x +=
        (mouseTargetRef.current.x - mouseRef.current.x) * 0.06
      mouseRef.current.y +=
        (mouseTargetRef.current.y - mouseRef.current.y) * 0.06

      // Enhanced camera movement for flying through space
      if (cameraRef.current) {
        // More dramatic camera shake for hyperspace feel
        cameraRef.current.position.x =
          Math.sin(time * 0.3) * 1.5 + Math.sin(time * 1.1) * 0.5
        cameraRef.current.position.y =
          Math.cos(time * 0.25) * 1.2 + Math.cos(time * 0.9) * 0.3
        cameraRef.current.rotation.z = Math.sin(time * 0.2) * 0.01

        // Subtle forward/backward movement
        cameraRef.current.position.z = 10 + Math.sin(time * 0.1) * 2
      }

      // Animate spherical stars with flying effect
      starsRef.current.forEach((starGroup, layerIndex) => {
        if (!starGroup || !starGroup.userData.stars) return

        // Parallax shift per layer (closer layers move more)
        const parallaxBase = 12
        const layerMultiplier =
          layerIndex === 0 ? 1.0 : layerIndex === 1 ? 0.6 : 0.35
        starGroup.position.x =
          mouseRef.current.x * parallaxBase * layerMultiplier
        starGroup.position.y =
          mouseRef.current.y * parallaxBase * layerMultiplier

        const speed = starGroup.userData.speed
        const stars = starGroup.userData.stars

        stars.forEach((star: THREE.Mesh) => {
          if (!star.userData) return

          // Flying through space movement - stars approach from behind
          star.position.z += speed

          // Add subtle random drift
          star.position.x +=
            star.userData.velocity.x +
            Math.sin(time * 0.3 + star.userData.twinklePhase) * 0.05
          star.position.y +=
            star.userData.velocity.y +
            Math.cos(time * 0.2 + star.userData.twinklePhase) * 0.03

          // Twinkling effect on scale and opacity
          const twinkle =
            Math.sin(time * 4 + star.userData.twinklePhase) * 0.3 + 0.7
          const pulse =
            Math.sin(time * 2 + star.userData.twinklePhase) * 0.2 + 0.8

          star.scale.setScalar(twinkle)

          if (star.material instanceof THREE.MeshStandardMaterial) {
            star.material.opacity = star.userData.originalOpacity * pulse

            // Add glow effect based on distance
            const distance = star.position.distanceTo(
              cameraRef.current!.position
            )
            const glowIntensity = Math.max(0, 1 - distance / 300)

            // Apply glow effect - use emissiveIntensity instead of multiplyScalar
            const glowMultiplier = 1 + glowIntensity * 0.5
            star.material.emissive.setHex(star.userData.originalEmissive)
            star.material.emissiveIntensity = glowMultiplier
          }

          // Reset star when it passes the camera
          if (star.position.z > 50) {
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * Math.PI
            const spread =
              layerIndex === 0 ? 800 : layerIndex === 1 ? 1200 : 1600
            const radius = spread * (0.5 + Math.random() * 0.5)

            star.position.x = radius * Math.sin(phi) * Math.cos(theta)
            star.position.y = radius * Math.sin(phi) * Math.sin(theta)
            star.position.z = -spread - Math.random() * 200

            // Reset material properties
            if (star.material instanceof THREE.MeshStandardMaterial) {
              // Reset to original emissive color based on layer
              const layerColors = [0x444444, 0x444400, 0x001144]
              star.material.emissive.setHex(layerColors[layerIndex] || 0x444444)
            }

            // New random velocity
            star.userData.velocity.x = (Math.random() - 0.5) * 0.1
            star.userData.velocity.y = (Math.random() - 0.5) * 0.1
          }

          // Rotation for more dynamic feel
          star.rotation.x += 0.005
          star.rotation.y += 0.008
        })
      })

      // Animate hyperspace trails and particles
      if (windParticlesRef.current) {
        // Slight parallax on particles
        windParticlesRef.current.position.x = mouseRef.current.x * 12 * 0.15
        windParticlesRef.current.position.y = mouseRef.current.y * 12 * 0.15

        const positions = windParticlesRef.current.geometry.attributes.position
        const velocities = windParticlesRef.current.geometry.attributes.velocity
        const lifetimes = windParticlesRef.current.geometry.attributes.lifetime
        const trails = windParticlesRef.current.geometry.attributes.trail

        for (let i = 0; i < positions.count; i++) {
          let x = positions.getX(i)
          let y = positions.getY(i)
          let z = positions.getZ(i)

          const vx = velocities.getX(i)
          const vy = velocities.getY(i)
          const vz = velocities.getZ(i)
          const isTrail = trails.getX(i)

          // Enhanced movement for hyperspace effect
          if (isTrail > 0.5) {
            // Star trails - fast straight lines
            x += vx * 0.5
            y += vy * 0.5
            z += vz * 1.5 // Much faster for streak effect
          } else {
            // Regular particles with curves
            x += vx + Math.sin(time + i * 0.01) * 0.05
            y += vy + Math.cos(time * 0.8 + i * 0.01) * 0.03
            z += vz * 0.8
          }

          let lifetime = lifetimes.getX(i)
          lifetime += isTrail > 0.5 ? 0.015 : 0.008 // Trails fade faster

          if (lifetime > 1 || z > 150) {
            // Reset particle from behind camera
            positions.setX(i, (Math.random() - 0.5) * 1000)
            positions.setY(i, (Math.random() - 0.5) * 600)
            positions.setZ(i, Math.random() * 200 - 800)
            lifetimes.setX(i, 0)

            // Reassign trail probability
            trails.setX(i, Math.random() > 0.7 ? 1 : 0)

            // New velocity for variety
            velocities.setX(i, (Math.random() - 0.5) * 1.5)
            velocities.setY(i, (Math.random() - 0.5) * 1.0)
            velocities.setZ(i, Math.random() * 15 + 10)
          } else {
            positions.setX(i, x)
            positions.setY(i, y)
            positions.setZ(i, z)
            lifetimes.setX(i, lifetime)
          }
        }

        positions.needsUpdate = true
        lifetimes.needsUpdate = true
        trails.needsUpdate = true

        // Dynamic opacity for hyperspace effect
        if (windParticlesRef.current.material instanceof THREE.PointsMaterial) {
          windParticlesRef.current.material.opacity =
            0.4 + Math.sin(time * 2) * 0.2
        }
      }

      renderer.render(scene, camera)
    }

    // Initialize
    createStars()
    createWindParticles()
    animate()

    // Pointer-based parallax
    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      mouseTargetRef.current.x = nx
      mouseTargetRef.current.y = -ny
    }
    window.addEventListener("pointermove", handlePointerMove)

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current)
      }
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("pointermove", handlePointerMove)

      // Clean up Three.js resources
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }

      // Clean up star layers
      starsRef.current.forEach((starGroup) => {
        if (starGroup && starGroup.userData.stars) {
          starGroup.userData.stars.forEach((star: THREE.Mesh) => {
            if (star.geometry) star.geometry.dispose()
            if (star.material instanceof THREE.Material) {
              star.material.dispose()
            }
          })
        }
      })

      // Clean up wind particles
      if (windParticlesRef.current) {
        windParticlesRef.current.geometry.dispose()
        if (windParticlesRef.current.material instanceof THREE.Material) {
          windParticlesRef.current.material.dispose()
        }
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Three.js canvas for stars */}
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{
          width: "100vw",
          height: "100vh",
        }}
      />

      {/* CSS-based Star Wars crawl text */}
      <div
        ref={textContainerRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: "300px" }}
      >
        <div
          className="star-wars-crawl"
          style={{
            position: "relative",
            transformOrigin: "50% 100%",
            transform: "perspective(300px) rotateX(25deg)",
            animation: "starWarsScroll 15s linear infinite",
          }}
        >
          <div className="text-center text-yellow-300 font-bold leading-relaxed">
            <div className="text-2xl md:text-4xl mb-8 tracking-wider">
              READING BLOCKCHAIN TRANSACTIONS...
            </div>

            <div className="text-xl md:text-3xl mb-8 tracking-wide opacity-90">
              Analyzing tip data from the Lens Protocol
            </div>

            <div className="text-lg md:text-2xl mb-8 tracking-wide opacity-80">
              Processing transaction history...
            </div>

            <div className="text-lg md:text-2xl mb-8 tracking-wide opacity-70">
              Aggregating amounts...
            </div>

            <div className="text-xl md:text-3xl mb-8 tracking-wide opacity-90">
              WILL BE READY SOON...
            </div>

            <div className="text-lg md:text-2xl mb-8 tracking-wide opacity-60">
              Thanks for your patience
            </div>

            <div className="text-sm md:text-lg opacity-50">
              May the tips be with you
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes starWarsScroll {
          0% {
            transform: perspective(300px) rotateX(25deg) translateY(100vh);
            opacity: 1;
          }
          100% {
            transform: perspective(300px) rotateX(25deg) translateY(-150vh);
            opacity: 0;
          }
        }

        .star-wars-crawl {
          font-family: "Arial", sans-serif;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  )
}

export default StarWarsLoading
