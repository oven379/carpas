import { avatarPlaceholderLetter } from '../lib/avatarPlaceholder.js'

/**
 * Плейсхолдер вместо фото: буква из email, иначе из fallback (имя, название сервиса).
 */
export default function DefaultAvatar({ email, fallback = '', className = '', alt = '', ...rest }) {
  const letter = avatarPlaceholderLetter(email, fallback)
  return (
    <span
      className={['defaultAvatarImg', className].filter(Boolean).join(' ')}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      {...rest}
    >
      {letter}
    </span>
  )
}
