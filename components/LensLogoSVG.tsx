interface LensLogoSVGProps {
  className?: string
  width?: number | string
  height?: number | string
  style?: React.CSSProperties
}

const LensLogoSVG = ({
  className,
  width = "20",
  height = "13",
  style = {},
}: LensLogoSVGProps = {}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M16.22 2.56C15.28 2.56 14.43 2.93 13.79 3.52L13.72 3.49C13.58 1.54 11.99 0 10 0C8.01 0 6.42 1.54 6.28 3.49L6.21 3.52C5.57 2.93 4.72 2.56 3.78 2.56C1.69 2.56 0 4.25 0 6.35C0 8.15 1.79 9.7 2.24 10.06C4.33 11.73 7.06 12.7 10 12.7C12.94 12.7 15.67 11.73 17.76 10.06C18.21 9.7 20 8.16 20 6.35C20 4.25 18.31 2.56 16.22 2.56H16.22Z"
        fill="currentColor"
      ></path>
    </svg>
  )
}

export default LensLogoSVG
