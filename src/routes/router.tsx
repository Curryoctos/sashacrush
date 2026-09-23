import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRedirect } from '@/components/auth/RoleRedirect'
import { AdminPortalLayout } from '@/components/layout/AdminPortalLayout'
import { AgentPortalLayout } from '@/components/layout/AgentPortalLayout'
import { ExecutivePortalLayout } from '@/components/layout/ExecutivePortalLayout'
import { SellerPortalLayout } from '@/components/layout/SellerPortalLayout'
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalytics'
import { AdminAuditLogPage } from '@/pages/admin/AdminAuditLog'
import { AdminCapitalPage } from '@/pages/admin/AdminCapital'
import { AdminChatPage } from '@/pages/admin/AdminChat'
import { AdminDealPage } from '@/pages/admin/AdminDeal'
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminDocumentsPage } from '@/pages/admin/AdminDocuments'
import { AdminLandRecordsPage } from '@/pages/admin/LandRecords'
import { AdminInvestorDocumentsPage } from '@/pages/admin/AdminInvestorDocuments'
import { AdminPaymentsPage } from '@/pages/admin/AdminPayments'
import { AdminPhotosPage } from '@/pages/admin/AdminPhotos'
import { AdminSuggestionsPage } from '@/pages/admin/AdminSuggestions'
import { AdminCommunityPage } from '@/pages/admin/AdminCommunity'
import { AdminCargoPage } from '@/pages/admin/AdminCargo'
import { AdminMediaPage } from '@/pages/admin/AdminMedia'
import { AdminUsersPage } from '@/pages/admin/AdminUsers'
import { AdminWalletPage } from '@/pages/admin/AdminWallet'
import { AdminWalletConvertPage } from '@/pages/admin/AdminWalletConvert'
import { AgentAgreementsPage } from '@/pages/agent/AgentAgreements'
import { AgentAnalyticsPage } from '@/pages/agent/AgentAnalytics'
import { AgentCargoPage } from '@/pages/agent/AgentCargo'
import { AgentChatPage } from '@/pages/agent/AgentChat'
import { AgentDashboard } from '@/pages/agent/Dashboard'
import { AgentDealPage } from '@/pages/agent/AgentDeal'
import { AgentLandRecordsPage } from '@/pages/agent/AgentLandRecords'
import { AgentDocumentsPage } from '@/pages/agent/AgentDocuments'
import { AgentInvestmentsPage } from '@/pages/agent/AgentInvestments'
import { AgentPhotosPage } from '@/pages/agent/AgentPhotos'
import { AgentReceiptsPage } from '@/pages/agent/AgentReceipts'
import { AgentSuggestionsPage } from '@/pages/agent/AgentSuggestions'
import { ExecutiveDashboard } from '@/pages/executive/Dashboard'
import { ExecutiveAnalyticsPage } from '@/pages/executive/ExecutiveAnalytics'
import { ExecutiveChatPage } from '@/pages/executive/ExecutiveChat'
import { ExecutiveDealPage } from '@/pages/executive/ExecutiveDeal'
import { ExecutiveDealsPage } from '@/pages/executive/ExecutiveDeals'
import { ExecutiveMediaPage } from '@/pages/executive/ExecutiveMedia'
import { CommunityLayout } from '@/components/layout/CommunityLayout'
import { CommunityBoardPage } from '@/pages/community/CommunityBoard'
import { CommunityLoginPage } from '@/pages/community/CommunityLogin'
import { CommunityRegisterPage } from '@/pages/community/CommunityRegister'
import { CommunitySchedulePage } from '@/pages/community/CommunitySchedule'
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
    path: '/community',
    element: <CommunityLayout />,
    children: [
      { index: true, element: <CommunityBoardPage /> },
      { path: 'schedule', element: <CommunitySchedulePage /> },
      { path: 'register', element: <CommunityRegisterPage /> },
      { path: 'login', element: <CommunityLoginPage /> },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      {
        element: <AdminPortalLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <AdminDashboard /> },
          { path: 'analytics', element: <AdminAnalyticsPage /> },
          { path: 'suggestions', element: <AdminSuggestionsPage /> },
          { path: 'community', element: <AdminCommunityPage /> },
          { path: 'cargo', element: <AdminCargoPage /> },
          { path: 'media', element: <AdminMediaPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'land-records', element: <AdminLandRecordsPage /> },
          { path: 'deals/:landId', element: <AdminDealPage /> },
          { path: 'documents', element: <AdminDocumentsPage /> },
          { path: 'investor-documents', element: <AdminInvestorDocumentsPage /> },
          { path: 'photos', element: <AdminPhotosPage /> },
          { path: 'payments', element: <AdminPaymentsPage /> },
          { path: 'capital', element: <AdminCapitalPage /> },
          { path: 'wallet', element: <AdminWalletPage /> },
          { path: 'wallet/convert', element: <AdminWalletConvertPage /> },
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
          { path: 'analytics', element: <ExecutiveAnalyticsPage /> },
          { path: 'deals', element: <ExecutiveDealsPage /> },
          { path: 'deals/:landId', element: <ExecutiveDealPage /> },
          { path: 'communications', element: <ExecutiveChatPage /> },
          { path: 'chat', element: <Navigate to="/executive/communications" replace /> },
          { path: 'media', element: <ExecutiveMediaPage /> },
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
          { path: 'analytics', element: <AgentAnalyticsPage /> },
          { path: 'suggestions', element: <AgentSuggestionsPage /> },
          { path: 'cargo', element: <AgentCargoPage /> },
          { path: 'land-records', element: <AgentLandRecordsPage /> },
          { path: 'deals/:landId', element: <AgentDealPage /> },
          { path: 'documents', element: <AgentDocumentsPage /> },
          { path: 'receipts', element: <AgentReceiptsPage /> },
          { path: 'investments', element: <AgentInvestmentsPage /> },
          { path: 'agreements', element: <AgentAgreementsPage /> },
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
