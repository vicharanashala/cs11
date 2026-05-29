import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { Outlet } from 'react-router-dom'
import { LoginPage } from './login'
import { SignupPage } from './signup'
import { FaqsPage } from './faqs'
import { FaqDetailPage } from './faqs.$id'
import { Navbar } from '@/components/Navbar'

// ─── Guard helpers ────────────────────────────────────────────────────────────

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
    throw redirect({ to: '/faqs' })
  }
}

// ─── Root route ───────────────────────────────────────────────────────────────

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

// ─── Placeholder components for stub routes ───────────────────────────────────

function Placeholder({ title }: { title: string }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-500">This page is under construction.</p>
    </div>
  )
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/faqs' }) },
  component: () => null,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (localStorage.getItem('token')) throw redirect({ to: '/faqs' })
  },
  component: () => <LoginPage />,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: () => {
    if (localStorage.getItem('token')) throw redirect({ to: '/faqs' })
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
  component: () => <Placeholder title="Ask a Question" />,
})

const questionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/questions',
  beforeLoad: () => requireAuth(),
  component: () => <Placeholder title="My Questions" />,
})

const questionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/questions/$id',
  beforeLoad: () => requireAuth(),
  component: ({ params }) => <Placeholder title={`Question: ${params.id}`} />,
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: () => requireAdmin(),
  component: () => <Placeholder title="Admin Dashboard" />,
})

const adminQueriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/queries',
  beforeLoad: () => requireAdmin(),
  component: () => <Placeholder title="Resolution Queue" />,
})

// ─── Route tree ───────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  faqsRoute,
  faqDetailRoute,
  askRoute,
  questionsRoute,
  questionDetailRoute,
  adminRoute,
  adminQueriesRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

