import { createRouter, createRoute, createRootRoute, redirect, Outlet } from '@tanstack/react-router'
import { LoginPage } from './login'
import { SignupPage } from './signup'
import { FaqsPage } from './faqs'
import { FaqDetailPage } from './faqs.$id'
import { AskPage } from './ask'
import { QuestionsPage } from './questions'
import { QuestionDetailPage } from './questions.$id'
import { AdminPage } from './admin'
import { AdminQueriesPage } from './admin.queries'
import { AdminFaqsPage } from './admin.faqs'
import { AdminAnalyticsPage } from './admin.analytics'
import { Navbar } from '@/components/Navbar'

// ---- Guard helpers ----

function requireAuth() {
  if (!localStorage.getItem('token')) {
    throw redirect({ to: '/login' })
  }
}

function requireAdmin() {
  requireAuth()
  const user = localStorage.getItem('user')
  if (!user) throw redirect({ to: '/login' })
  const { role } = JSON.parse(user) as { role: string }
  if (role !== 'admin' && role !== 'superadmin') {
    throw redirect({ to: '/faqs', search: {} })
  }
}

// ---- Root route ----

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <Outlet />
      </div>
    </>
  ),
})

// ---- Routes ----

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/faqs', search: {} }) },
  component: () => null,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (localStorage.getItem('token')) throw redirect({ to: '/faqs', search: {} })
  },
  component: () => <LoginPage />,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: () => {
    if (localStorage.getItem('token')) throw redirect({ to: '/faqs', search: {} })
  },
  component: () => <SignupPage />,
})

const faqsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/faqs',
  beforeLoad: () => requireAuth(),
  component: () => <FaqsPage />,
})

const faqDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/faqs/$id',
  beforeLoad: () => requireAuth(),
  component: () => <FaqDetailPage />,
})

const askRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ask',
  beforeLoad: () => requireAuth(),
  component: () => <AskPage />,
})

const questionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/questions',
  beforeLoad: () => requireAuth(),
  component: () => <QuestionsPage />,
})

const questionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/questions/$id',
  beforeLoad: () => requireAuth(),
  component: () => <QuestionDetailPage />,
})

// ---- Admin section (has its own sidebar layout) ----

const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: () => requireAdmin(),
  component: () => <AdminPage />,
})

const adminQueriesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'queries',
  beforeLoad: () => requireAdmin(),
  component: () => <AdminQueriesPage />,
})

const adminFaqsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'faqs',
  beforeLoad: () => requireAdmin(),
  component: () => <AdminFaqsPage />,
})

const adminAnalyticsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'analytics',
  beforeLoad: () => requireAdmin(),
  component: () => <AdminAnalyticsPage />,
})

// ---- Route tree ----

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  faqsRoute,
  faqDetailRoute,
  askRoute,
  questionsRoute,
  questionDetailRoute,
  adminLayoutRoute,
  adminQueriesRoute,
  adminFaqsRoute,
  adminAnalyticsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}