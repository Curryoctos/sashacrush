import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRedirect } from '@/components/auth/RoleRedirect'
import { AdminPortalLayout } from '@/components/layout/AdminPortalLayout'
import { AgentPortalLayout } from '@/components/layout/AgentPortalLayout'
import { ExecutivePortalLayout } from '@/components/layout/ExecutivePortalLayout'
import { SellerPortalLayout } from '@/components/layout/SellerPortalLayout'
import { AdminAuditLogPage } from '@/pages/admin/AdminAuditLog'
import { AdminChatPage } from '@/pages/admin/AdminChat'
import { AdminDealPage } from '@/pages/admin/AdminDeal'
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminDocumentsPage } from '@/pages/admin/AdminDocuments'
import { AdminLandRecordsPage } from '@/pages/admin/LandRecords'
import { AdminPaymentsPage } from '@/pages/admin/AdminPayments'
import { AdminUsersPage } from '@/pages/admin/AdminUsers'
import { AgentChatPage } from '@/pages/agent/AgentChat'
import { AgentDashboard } from '@/pages/agent/Dashboard'
import { AgentDealPage } from '@/pages/agent/AgentDeal'
import { AgentLandRecordsPage } from '@/pages/agent/AgentLandRecords'
import { AgentDocumentsPage } from '@/pages/agent/AgentDocuments'
import { AgentPhotosPage } from '@/pages/agent/AgentPhotos'
import { ExecutiveDashboard } from '@/pages/executive/Dashboard'
import { ExecutiveChatPage } from '@/pages/executive/ExecutiveChat'
import { ExecutiveDealPage } from '@/pages/executive/ExecutiveDeal'
import { ExecutiveDealsPage } from '@/pages/executive/ExecutiveDeals'
import { LoginPage } from '@/pages/Login'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SellerDashboard } from '@/pages/seller/Dashboard'
import { SellerChatPage } from '@/pages/seller/SellerChat'
import { SellerDocumentsPage } from '@/pages/seller/SellerDocuments'
import { SellerPhotosPage } from '@/pages/seller/SellerPhotos'
import { SellerReceiptsPage } from '@/pages/seller/SellerReceipts'
// MFA temporarily disabled — uncomment imports + routes below to restore.
// import { StaffMfaChallengePage } from '@/pages/staff/MfaChallenge'
// import { StaffMfaSetupPage } from '@/pages/staff/MfaSetup'

export const router = createBrowserRouter([
  { path: '/', element: <RoleRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      {
        element: <AdminPortalLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <AdminDashboard /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'land-records', element: <AdminLandRecordsPage /> },
          { path: 'deals/:landId', element: <AdminDealPage /> },
          { path: 'documents', element: <AdminDocumentsPage /> },
          { path: 'payments', element: <AdminPaymentsPage /> },
          { path: 'chat', element: <AdminChatPage /> },
          { path: 'audit-log', element: <AdminAuditLogPage /> },
          // { path: 'mfa-setup', element: <StaffMfaSetupPage backPath="/admin/dashboard" /> },
          // { path: 'mfa-challenge', element: <StaffMfaChallengePage backPath="/admin/dashboard" /> },
        ],
      },
    ],
  },
  {
    path: '/executive',
    element: <ProtectedRoute allowedRoles={['executive']} />,
    children: [
      {
        element: <ExecutivePortalLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <ExecutiveDashboard /> },
          { path: 'deals', element: <ExecutiveDealsPage /> },
          { path: 'deals/:landId', element: <ExecutiveDealPage /> },
          { path: 'chat', element: <ExecutiveChatPage /> },
          // { path: 'mfa-setup', element: <StaffMfaSetupPage backPath="/executive/dashboard" /> },
          // { path: 'mfa-challenge', element: <StaffMfaChallengePage backPath="/executive/dashboard" /> },
        ],
      },
    ],
  },
  {
    path: '/agent',
    element: <ProtectedRoute allowedRoles={['agent']} />,
    children: [
      {
        element: <AgentPortalLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <AgentDashboard /> },
          { path: 'land-records', element: <AgentLandRecordsPage /> },
          { path: 'deals/:landId', element: <AgentDealPage /> },
          { path: 'documents', element: <AgentDocumentsPage /> },
          { path: 'chat', element: <AgentChatPage /> },
          { path: 'photos', element: <AgentPhotosPage /> },
          // { path: 'mfa-setup', element: <StaffMfaSetupPage backPath="/agent/dashboard" /> },
          // { path: 'mfa-challenge', element: <StaffMfaChallengePage backPath="/agent/dashboard" /> },
        ],
      },
    ],
  },
  {
    path: '/seller',
    element: <ProtectedRoute allowedRoles={['seller']} />,
    children: [
      {
        element: <SellerPortalLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <SellerDashboard /> },
          { path: 'chat', element: <SellerChatPage /> },
          { path: 'documents', element: <SellerDocumentsPage /> },
          { path: 'receipts', element: <SellerReceiptsPage /> },
          { path: 'photos', element: <SellerPhotosPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
