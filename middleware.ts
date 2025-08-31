import { authMiddleware, redirectToSignIn } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)", "/api/webhooks/clerk", "/about", "/contact", "/waitlist"],
  async afterAuth(auth, req) {
    // Handle users who aren't authenticated for a public route
    if (!auth.userId && auth.isPublicRoute) {
      return NextResponse.next();
    }

    // Redirect logged in users to /dashboard if they try to access a public route
    if (auth.userId && auth.isPublicRoute) {
      let path = "/dashboard";
      return NextResponse.redirect(new URL(path, req.url));
    }

    // If the user is not logged in and trying to access a private route, redirect them to sign-in
    if (!auth.userId && !auth.isPublicRoute) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    // Allow user to proceed if they are logged in and accessing a private route
    if (auth.userId && !auth.isPublicRoute) {
      return NextResponse.next();
    }

    return NextResponse.next();
  },
});

export const config = {
  matcher: ['/((?!.+\\\.[\\w]+$|_next).*)', '/(api|trpc)(.*)'],
};
