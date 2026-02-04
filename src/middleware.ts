import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public API routes that don't require auth (webhooks, callbacks, cron)
const PUBLIC_API_ROUTES = [
    '/api/scraper/webhook',
    '/api/stripe/webhooks',
    '/api/meta/callback',
    '/api/cron/',
    '/api/auth/',
]

// Public page routes
const PUBLIC_ROUTES = ['/login', '/signup', '/auth/callback']

export async function middleware(request: NextRequest) {
    const supabase = await createClient()

    // Check auth status
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Check if it's a public API route
    const isPublicApiRoute = PUBLIC_API_ROUTES.some(route =>
        pathname.startsWith(route)
    )

    // Check if it's a public page route
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
        pathname.startsWith(route)
    )

    // API routes require auth (except public ones)
    if (pathname.startsWith('/api/')) {
        if (isPublicApiRoute) {
            return NextResponse.next()
        }

        // Require auth for protected API routes
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        return NextResponse.next()
    }

    // Redirect unauthenticated users to login
    if (!user && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect authenticated users away from auth pages
    if (user && isPublicRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}