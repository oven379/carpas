import { Link, useLocation, type LinkProps } from 'react-router-dom'

export function PartnerAuthLink({ state, ...props }: LinkProps) {
  const location = useLocation()
  return <Link {...props} state={{ ...state, partnerAuthBackground: location }} aria-haspopup="dialog" />
}
