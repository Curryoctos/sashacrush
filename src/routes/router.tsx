import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRedirect } from '@/components/auth/RoleRedirect'
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminChatPage } from '@/pages/admin/AdminChat'
import { AdminDocumentsPage } from '@/pages/admin/AdminDocuments'
import { AdminLandRecordsPage } from '@/pages/admin/LandRecords'
import { AgentDashboard } from '@/pages/agent/Dashboard'
import { ExecutiveDashboard } from '@/pages/executive/Dashboard'
import { ExecutiveChatPage } from '@/pages/executive/ExecutiveChat'
import { LoginPage } from '@/pages/Login'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SellerDashboard } from '@/pages/seller/Dashboard'
import { SellerChatPage } from '@/pages/seller/SellerChat'
import { SellerDocumentsPage } from '@/pages/seller/SellerDocuments'

export const router = createBrowserRouter([
  { path: '/', element: <RoleRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'land-records', element: <AdminLandRecordsPage /> },
      { path: 'documents', element: <AdminDocumentsPage /> },
      { path: 'chat', element: <AdminChatPage /> },
    ],
  },
  {
    path: '/executive',
    element: <ProtectedRoute allowedRoles={['executive']} />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <ExecutiveDashboard /> },
      { path: 'chat', element: <ExecutiveChatPage /> },
    ],
  },
  {
    path: '/agent',
    element: <ProtectedRoute allowedRoles={['agent']} />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AgentDashboard /> },
    ],
  },
  {
    path: '/seller',
    element: <ProtectedRoute allowedRoles={['seller']} />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <SellerDashboard /> },
      { path: 'chat', element: <SellerChatPage /> },
      { path: 'documents', element: <SellerDocumentsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
