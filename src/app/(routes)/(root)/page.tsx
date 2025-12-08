"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/shadcn/button";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function Home() {
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      }
    };
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="relative bg-gradient-to-r from-primary-default to-primary-100 text-white">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Get More Done with Less Stress
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              The all-in-one productivity app that helps you organize tasks,
              track progress, and achieve your goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push("/signup")}
                className="bg-white text-primary-default hover:bg-primary-50 px-8 py-6 text-lg font-semibold"
              >
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => router.push("/login")}
                variant="outline"
                className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to help you stay organized and
              productive
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary-default" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Task Management</h3>
              <p className="text-gray-600">
                Create, organize, and prioritize your tasks with our intuitive
                interface.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-primary-default" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Goal Tracking</h3>
              <p className="text-gray-600">
                Set and track your goals with detailed progress metrics and
                insights.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary-default" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Productivity Analytics
              </h3>
              <p className="text-gray-600">
                Get insights into your productivity patterns and optimize your
                workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ready to boost your productivity?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of users who are getting more done with our app.
            </p>
            <Button
              onClick={() => router.push("/signup")}
              className="bg-primary-default hover:bg-primary-600 px-8 py-6 text-lg font-semibold"
            >
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#19768D] text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <Clock className="h-8 w-8 text-white mr-2" />
              <span className="text-2xl font-bold text-white">Get It Done</span>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-white">
                About
              </a>
              <a href="#" className="hover:text-white">
                Features
              </a>
              <a href="#" className="hover:text-white">
                Pricing
              </a>
              <a href="#" className="hover:text-white">
                Contact
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center md:text-left">
            <p>
              © {new Date().getFullYear()} Get It Done. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
