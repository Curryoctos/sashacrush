import { lazy, type ComponentType } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleRedirect } from '@/components/auth/RoleRedirect'
import { AdminPortalLayout } from '@/components/layout/AdminPortalLayout'
import { AgentPortalLayout } from '@/components/layout/AgentPortalLayout'
import { CommunityLayout } from '@/components/layout/CommunityLayout'
import { ExecutivePortalLayout } from '@/components/layout/ExecutivePortalLayout'
import { SellerPortalLayout } from '@/components/layout/SellerPortalLayout'
import { page } from '@/routes/lazyPage'
import { LoginPage } from '@/pages/Login'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { StaffMfaChallengePage } from '@/pages/staff/MfaChallenge'
import { StaffMfaSetupPage } from '@/pages/staff/MfaSetup'

function lazyPage<T extends Record<string, ComponentType>>(
  loader: () => Promise<T>,
  exportName: keyof T & string,
) {
  return lazy(async () => {
    const mod = await loader()
    return { default: mod[exportName] as ComponentType }
  })
}

const AdminAnalyticsPage = lazyPage(() => import('@/pages/admin/AdminAnalytics'), 'AdminAnalyticsPage')
const AdminAuditLogPage = lazyPage(() => import('@/pages/admin/AdminAuditLog'), 'AdminAuditLogPage')
const AdminCapitalPage = lazyPage(() => import('@/pages/admin/AdminCapital'), 'AdminCapitalPage')
const AdminCargoPage = lazyPage(() => import('@/pages/admin/AdminCargo'), 'AdminCargoPage')
const AdminChatPage = lazyPage(() => import('@/pages/admin/AdminChat'), 'AdminChatPage')
const AdminCommunityPage = lazyPage(() => import('@/pages/admin/AdminCommunity'), 'AdminCommunityPage')
const AdminDashboard = lazyPage(() => import('@/pages/admin/Dashboard'), 'AdminDashboard')
const AdminDealPage = lazyPage(() => import('@/pages/admin/AdminDeal'), 'AdminDealPage')
const AdminDocumentsHubPage = lazyPage(
  () => import('@/pages/admin/AdminDocumentsHub'),
  'AdminDocumentsHubPage',
)
const AdminDocumentsPage = lazyPage(() => import('@/pages/admin/AdminDocuments'), 'AdminDocumentsPage')
const AdminFinanceHubPage = lazyPage(() => import('@/pages/admin/AdminFinanceHub'), 'AdminFinanceHubPage')
const AdminInvestorDocumentsPage = lazyPage(
  () => import('@/pages/admin/AdminInvestorDocuments'),
  'AdminInvestorDocumentsPage',
)
const AdminLandRecordsPage = lazyPage(() => import('@/pages/admin/LandRecords'), 'AdminLandRecordsPage')
const AdminMediaHubPage = lazyPage(() => import('@/pages/admin/AdminMediaHub'), 'AdminMediaHubPage')
const AdminMediaPage = lazyPage(() => import('@/pages/admin/AdminMedia'), 'AdminMediaPage')
const AdminPaymentsPage = lazyPage(() => import('@/pages/admin/AdminPayments'), 'AdminPaymentsPage')
const AdminPhotosPage = lazyPage(() => import('@/pages/admin/AdminPhotos'), 'AdminPhotosPage')
const AdminPipelineHubPage = lazyPage(
  () => import('@/pages/admin/AdminPipelineHub'),
  'AdminPipelineHubPage',
)
const AdminSuggestionsPage = lazyPage(
  () => import('@/pages/admin/AdminSuggestions'),
  'AdminSuggestionsPage',
)
const AdminUsersPage = lazyPage(() => import('@/pages/admin/AdminUsers'), 'AdminUsersPage')
const AdminWalletConvertPage = lazyPage(
  () => import('@/pages/admin/AdminWalletConvert'),
  'AdminWalletConvertPage',
)
const AdminWalletPage = lazyPage(() => import('@/pages/admin/AdminWallet'), 'AdminWalletPage')
const WalletLayout = lazyPage(() => import('@/components/layout/WalletLayout'), 'WalletLayout')

const AgentAgreementsPage = lazyPage(() => import('@/pages/agent/AgentAgreements'), 'AgentAgreementsPage')
const AgentAnalyticsPage = lazyPage(() => import('@/pages/agent/AgentAnalytics'), 'AgentAnalyticsPage')
const AgentCapitalHubPage = lazyPage(() => import('@/pages/agent/AgentCapitalHub'), 'AgentCapitalHubPage')
const AgentCargoPage = lazyPage(() => import('@/pages/agent/AgentCargo'), 'AgentCargoPage')
const AgentChatPage = lazyPage(() => import('@/pages/agent/AgentChat'), 'AgentChatPage')
const AgentDashboard = lazyPage(() => import('@/pages/agent/Dashboard'), 'AgentDashboard')
const AgentDealPage = lazyPage(() => import('@/pages/agent/AgentDeal'), 'AgentDealPage')
const AgentDocumentsPage = lazyPage(() => import('@/pages/agent/AgentDocuments'), 'AgentDocumentsPage')
const AgentInvestmentsPage = lazyPage(
  () => import('@/pages/agent/AgentInvestments'),
  'AgentInvestmentsPage',
)
const AgentLandRecordsPage = lazyPage(
  () => import('@/pages/agent/AgentLandRecords'),
  'AgentLandRecordsPage',
)
const AgentPaperworkHubPage = lazyPage(
  () => import('@/pages/agent/AgentPaperworkHub'),
  'AgentPaperworkHubPage',
)
const AgentPhotosPage = lazyPage(() => import('@/pages/agent/AgentPhotos'), 'AgentPhotosPage')
const AgentReceiptsPage = lazyPage(() => import('@/pages/agent/AgentReceipts'), 'AgentReceiptsPage')
const AgentSuggestionsPage = lazyPage(
  () => import('@/pages/agent/AgentSuggestions'),
  'AgentSuggestionsPage',
)

const ExecutiveAnalyticsPage = lazyPage(
  () => import('@/pages/executive/ExecutiveAnalytics'),
  'ExecutiveAnalyticsPage',
)
const ExecutiveChatPage = lazyPage(() => import('@/pages/executive/ExecutiveChat'), 'ExecutiveChatPage')
const ExecutiveDashboard = lazyPage(() => import('@/pages/executive/Dashboard'), 'ExecutiveDashboard')
const ExecutiveDealPage = lazyPage(() => import('@/pages/executive/ExecutiveDeal'), 'ExecutiveDealPage')
const ExecutiveDealsPage = lazyPage(() => import('@/pages/executive/ExecutiveDeals'), 'ExecutiveDealsPage')
const ExecutiveMediaPage = lazyPage(() => import('@/pages/executive/ExecutiveMedia'), 'ExecutiveMediaPage')

const CommunityBoardPage = lazyPage(
  () => import('@/pages/community/CommunityBoard'),
  'CommunityBoardPage',
)
const CommunityLoginPage = lazyPage(
  () => import('@/pages/community/CommunityLogin'),
  'CommunityLoginPage',
)
const CommunityRegisterPage = lazyPage(
  () => import('@/pages/community/CommunityRegister'),
  'CommunityRegisterPage',
)
const CommunitySchedulePage = lazyPage(
  () => import('@/pages/community/CommunitySchedule'),
  'CommunitySchedulePage',
)

const SellerChatPage = lazyPage(() => import('@/pages/seller/SellerChat'), 'SellerChatPage')
const SellerDashboard = lazyPage(() => import('@/pages/seller/Dashboard'), 'SellerDashboard')
const SellerDocumentsPage = lazyPage(() => import('@/pages/seller/SellerDocuments'), 'SellerDocumentsPage')
const SellerPhotosPage = lazyPage(() => import('@/pages/seller/SellerPhotos'), 'SellerPhotosPage')
const SellerReceiptsPage = lazyPage(() => import('@/pages/seller/SellerReceipts'), 'SellerReceiptsPage')

export const router = createBrowserRouter([
  { path: '/', element: <RoleRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/community',
    element: <CommunityLayout />,
    children: [
      { index: true, element: page(<CommunityBoardPage />) },
      { path: 'schedule', element: page(<CommunitySchedulePage />) },
      { path: 'register', element: page(<CommunityRegisterPage />) },
      { path: 'login', element: page(<CommunityLoginPage />) },
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
          { path: 'dashboard', element: page(<AdminDashboard />) },
          { path: 'analytics', element: page(<AdminAnalyticsPage />) },
          { path: 'media-hub', element: page(<AdminMediaHubPage />) },
          { path: 'documents-hub', element: page(<AdminDocumentsHubPage />) },
          { path: 'finance', element: page(<AdminFinanceHubPage />) },
          { path: 'pipeline', element: page(<AdminPipelineHubPage />) },
          { path: 'suggestions', element: page(<AdminSuggestionsPage />) },
          { path: 'community', element: page(<AdminCommunityPage />) },
          { path: 'cargo', element: page(<AdminCargoPage />) },
          { path: 'media', element: page(<AdminMediaPage />) },
          { path: 'users', element: page(<AdminUsersPage />) },
          { path: 'land-records', element: page(<AdminLandRecordsPage />) },
          { path: 'deals/:landId', element: page(<AdminDealPage />) },
          { path: 'documents', element: page(<AdminDocumentsPage />) },
          { path: 'investor-documents', element: page(<AdminInvestorDocumentsPage />) },
          { path: 'photos', element: page(<AdminPhotosPage />) },
          { path: 'payments', element: page(<AdminPaymentsPage />) },
          { path: 'capital', element: page(<AdminCapitalPage />) },
          {
            element: page(<WalletLayout />),
            children: [
              { path: 'wallet', element: page(<AdminWalletPage />) },
              { path: 'wallet/convert', element: page(<AdminWalletConvertPage />) },
            ],
          },
          { path: 'chat', element: page(<AdminChatPage />) },
          { path: 'audit-log', element: page(<AdminAuditLogPage />) },
          {
            path: 'mfa-setup',
            element: <StaffMfaSetupPage backPath="/admin/dashboard" />,
          },
          {
            path: 'mfa-challenge',
            element: <StaffMfaChallengePage backPath="/admin/dashboard" />,
          },
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
          { path: 'dashboard', element: page(<ExecutiveDashboard />) },
          { path: 'analytics', element: page(<ExecutiveAnalyticsPage />) },
          { path: 'deals', element: page(<ExecutiveDealsPage />) },
          { path: 'deals/:landId', element: page(<ExecutiveDealPage />) },
          { path: 'communications', element: page(<ExecutiveChatPage />) },
          { path: 'chat', element: <Navigate to="/executive/communications" replace /> },
          { path: 'media', element: page(<ExecutiveMediaPage />) },
          {
            path: 'documents',
            element: <Navigate to="/executive/dashboard" replace />,
          },
          {
            path: 'mfa-setup',
            element: <StaffMfaSetupPage backPath="/executive/dashboard" />,
          },
          {
            path: 'mfa-challenge',
            element: <StaffMfaChallengePage backPath="/executive/dashboard" />,
          },
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
          { path: 'dashboard', element: page(<AgentDashboard />) },
          { path: 'analytics', element: page(<AgentAnalyticsPage />) },
          { path: 'paperwork', element: page(<AgentPaperworkHubPage />) },
          { path: 'capital', element: page(<AgentCapitalHubPage />) },
          { path: 'suggestions', element: page(<AgentSuggestionsPage />) },
          { path: 'cargo', element: page(<AgentCargoPage />) },
          { path: 'land-records', element: page(<AgentLandRecordsPage />) },
          { path: 'deals/:landId', element: page(<AgentDealPage />) },
          { path: 'documents', element: page(<AgentDocumentsPage />) },
          { path: 'receipts', element: page(<AgentReceiptsPage />) },
          { path: 'investments', element: page(<AgentInvestmentsPage />) },
          { path: 'agreements', element: page(<AgentAgreementsPage />) },
          { path: 'chat', element: page(<AgentChatPage />) },
          { path: 'photos', element: page(<AgentPhotosPage />) },
          {
            path: 'mfa-setup',
            element: <StaffMfaSetupPage backPath="/agent/dashboard" />,
          },
          {
            path: 'mfa-challenge',
            element: <StaffMfaChallengePage backPath="/agent/dashboard" />,
          },
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
          { path: 'dashboard', element: page(<SellerDashboard />) },
          { path: 'chat', element: page(<SellerChatPage />) },
          { path: 'documents', element: page(<SellerDocumentsPage />) },
          { path: 'receipts', element: page(<SellerReceiptsPage />) },
          { path: 'photos', element: page(<SellerPhotosPage />) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
