"use client";
import { useRouter } from "next/navigation";
import LoginForm from "@/app/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();

  // Handle view changes (e.g., switch to signup or forgot password)
  const handleViewChange = (view: string) => {
    if (view === "signup") {
      router.push("/signup");
    } else if (view === "forgotPassword") {
      router.push("/forgot-password");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <div className="relative min-h-screen w-full flex-col items-center justify-center grid lg:grid-cols-2">
          {/* Left side - Form */}
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
                  &ldquo;The best way to get something done is to begin.&rdquo;
                </p>
                <footer className="text-sm">Author Unknown</footer>
              </blockquote>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="lg:p-8">
            <div className="mx-auto flex w-full flex-col justify-center items-center space-y-6 sm:w-[350px]">
              <LoginForm onChangeView={handleViewChange} />
              
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
