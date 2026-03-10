interface LogoProps {
  size?: number
  className?: string
}

export default function Logo({ size = 44, className }: LogoProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.18),
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <img
        src="/favicon.ico"
        alt="CaniKit"
        width={size}
        height={size}
        style={{ display: 'block', objectFit: 'contain' }}
        onError={(e) => {
          // fallback: hide broken img, show background color
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    </div>
  )
}
