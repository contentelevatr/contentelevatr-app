import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-50">
      {/* Navbar */}
      <header className="flex h-16 items-center justify-between px-6 lg:px-12 border-b border-white/10">
        <div className="text-xl font-bold tracking-tight">
          Content<span className="text-primary">Elevatr</span>
        </div>
        <nav>
          {userId ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 transition-colors"
            >
              Log In
            </Link>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center lg:px-12 relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-[100%] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[300px] bg-purple-500/20 blur-[100px] rounded-[100%] pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-8">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 py-1 px-3 text-xs font-semibold text-slate-300">
            ✨ AI-Powered Social Media Management
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent">
            Elevate your content game.
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-slate-400 sm:text-xl leading-relaxed">
            ContentElevatr is the ultimate toolkit for creators and agencies. Draft, schedule, and engage across LinkedIn, Twitter, Instagram, and more—all with the power of AI.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {userId ? (
              <Link
                href="/dashboard"
                className="flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 hover:bg-primary/90 transition-all"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 hover:bg-primary/90 transition-all"
                >
                  Start for Free
                </Link>
                <Link
                  href="/sign-in"
                  className="flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 text-base font-medium text-white hover:bg-white/10 transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-500 border-t border-white/10">
        <p>© {new Date().getFullYear()} ContentElevatr. All rights reserved.</p>
      </footer>
    </div>
  );
}
