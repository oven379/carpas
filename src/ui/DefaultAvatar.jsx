import { avatarPlaceholderColors, avatarPlaceholderLetter } from '../lib/avatarPlaceholder.js'

/**
 * Плейсхолдер вместо фото: инициалы имени (название сервиса), иначе буква из email; цвет по имени.
 */
export default function DefaultAvatar({ email, fallback = '', className = '', alt = '', style, ...rest }) {
  const letter = avatarPlaceholderLetter(email, fallback)
  const { bg, fg } = avatarPlaceholderColors(email, fallback)
  return (
    <span
      className={['defaultAvatarImg', className].filter(Boolean).join(' ')}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{ background: bg, color: fg, ...style }}
      {...rest}
    >
      {letter}
    </span>
  )
}
