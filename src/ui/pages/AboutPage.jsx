import { Navigate } from 'react-router-dom'

/** Маркетинговый лендинг перенесён на `/`; старый URL сохраняем редиректом. */
export default function AboutPage() {
  return <Navigate to="/" replace />
}
