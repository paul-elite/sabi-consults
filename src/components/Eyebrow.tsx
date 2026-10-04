import StickerIcon, { type StickerName } from './StickerIcon'

const tones = {
  brand: 'text-brand',
  muted: 'text-neutral-500',
  light: 'text-white/85',
}

/** Small uppercase label above a heading, with a sticker icon centred on the text. */
export default function Eyebrow({
  icon,
  children,
  tone = 'brand',
  center = false,
  size = 'sm',
  className = '',
}: {
  icon?: StickerName
  children: React.ReactNode
  tone?: keyof typeof tones
  center?: boolean
  size?: 'xs' | 'sm'
  className?: string
}) {
  return (
    <p
      className={`eyebrow font-medium uppercase tracking-wider ${size === 'xs' ? 'text-xs' : 'text-sm'} ${tones[tone]} ${center ? 'justify-center' : ''} ${className}`}
    >
      {icon && <StickerIcon name={icon} size={size === 'xs' ? 24 : 30} />}
      <span>{children}</span>
    </p>
  )
}
