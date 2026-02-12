const NoiseLayer = () => {
  return (
    <div
      style={{
        backgroundSize: "109px",
        backgroundRepeat: "repeat",
        backgroundImage: "url('/img/theNoise.png')",
        opacity: 0.05,
      }}
      className="fixed inset-0 pointer-events-none z-10"
    />
  )
}

export default NoiseLayer
