import defaultAvatarSrc from '../assets/default-avatar.png?url'

/**
 * Плейсхолдер аватара: фирменный трёхцветный знак (PNG). Приглушение: `.defaultAvatarImg` в App.css.
 */
export default function DefaultAvatar({ className = '', alt = '' }) {
  return (
    <img
      src={defaultAvatarSrc}
      alt={alt}
      className={['defaultAvatarImg', className].filter(Boolean).join(' ')}
      decoding="async"
    />
  )
}
