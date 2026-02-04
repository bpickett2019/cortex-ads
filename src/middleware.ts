import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const supabase = await createClient()

    // Check auth status
    const { data: { user } } = await supabase.auth.getUser()

    // Public routes that don't require auth
    const publicRoutes = ['/login', '/signup', '/auth/callback']
    const isPublicRoute = publicRoutes.some(route =>
        request.nextUrl.pathname.startsWith(route)
    )

    // API routes handling
    if (request.nextUrl.pathname.startsWith('/api/')) {
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