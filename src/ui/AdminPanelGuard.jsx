import { Navigate } from 'react-router-dom'
import { hasAdminMockSession } from '../lib/adminMockSession.js'
import { hasAdminApiToken } from '../lib/adminApiSession.js'

export default function AdminPanelGuard({ children }) {
  if (!hasAdminMockSession() && !hasAdminApiToken()) {
    return <Navigate to="/admin/379team" replace />
  }
  return children
}
