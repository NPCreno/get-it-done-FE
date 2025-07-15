"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SignupForm from "@/app/components/auth/SignupForm";
import { supabase } from "@/app/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedUp, setIsSignedUp] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      } else {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  // Handle view changes (e.g., switch to login)
  const handleViewChange = (view: string) => {
    if (view === "login") {
      router.push("/login");
    } else if (view === "signedUp") {
      setIsSignedUp(true);
      // Redirect to dashboard after showing success message for 3 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-default"></div>
      </div>
    );
  }

  if (isSignedUp) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Congratulations!</h2>
          <p className="text-muted-foreground">You&apos;ve successfully signed up. Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <div className="relative min-h-screen w-full flex-col items-center justify-center grid lg:grid-cols-2">
          {/* Left side - Image/Illustration */}
          <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-default to-primary-100" />
            <div className="relative z-20 flex items-center text-lg font-medium gap-5">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26.2499 15.0029C26.2499 8.79199 21.2108 3.75293 14.9999 3.75293C8.78897 3.75293 3.74991 8.79199 3.74991 15.0029C3.74991 21.2139 8.78897 26.2529 14.9999 26.2529C21.2108 26.2529 26.2499 21.2139 26.2499 15.0029Z" stroke="white" stroke-width="2" stroke-miterlimit="10"/>
              <g filter="url(#filter0_d_959_1658)">
              <path d="M21.5624 11.2515L15.0075 18.7515L12.198 15.939M11.247 18.7515L8.43741 15.939M17.9126 11.2515L14.8921 14.7085" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" shape-rendering="crispEdges"/>
              </g>
              <defs>
              <filter id="filter0_d_959_1658" x="3.43741" y="10.2515" width="23.125" height="17.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dy="4"/>
              <feGaussianBlur stdDeviation="2"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_959_1658"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_959_1658" result="shape"/>
              </filter>
              </defs>
              </svg>

              <h1
                className={`text-2xl text-white font-rancho transition-opacity duration-300 `}
              >
                Get it Done!
              </h1>
            </div>
            <div className="relative z-20 mt-auto">
              <blockquote className="space-y-2">
                <p className="text-lg">
                  &ldquo;The secret of getting ahead is getting started.&rdquo;
                </p>
                <footer className="text-sm">Mark Twain</footer>
              </blockquote>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="lg:p-8">
            <div className="mx-auto flex w-full flex-col justify-center items-center space-y-6 sm:w-[450px]">
              <SignupForm onChangeView={handleViewChange} />
              <p className="px-8 text-center text-sm text-muted-foreground">
                By clicking continue, you agree to our{" "}
                <a
                  href="/terms"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
