"use client";
import React, { useState } from "react";
import { useFormik } from "formik";
import { loginSchema } from "@/app/schemas/loginSchema";
import { useRouter } from "next/navigation";
import { loginEmail, loginUsername } from "@/app/api/userRequests";
import { Loader2 } from "lucide-react";
import InputBox from "@/app/components/inputBox";
import Cookies from 'js-cookie';

interface LoginFormValues {
  usernameOrEmail: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginForm({
  onChangeView,
}: {
  onChangeView: (view: "signup" | "forgotPassword") => void;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const formik = useFormik<LoginFormValues>({
    initialValues: {
      usernameOrEmail: "",
      password: "",
      rememberMe: false,
    },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        setError('');

        let response;
        if (values.usernameOrEmail.includes('@')) {
          response = await loginEmail(values.usernameOrEmail, values.password);
        } else {
          response = await loginUsername(values.usernameOrEmail, values.password);
        }

        // The API returns { data, error } format
        if (response.error) {
          throw new Error(response.error || 'Login failed');
        }

        // Store the access token in a cookie
        if (response.data?.access_token) {
          const cookieOptions = {
            expires: values.rememberMe ? 30 : 1, // 30 days if remember me is checked, otherwise 1 day
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const,
            path: '/',
          };
          
          Cookies.set('access_token', response.data.access_token, cookieOptions);
          // Store the remember me preference
          if (values.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('rememberMe');
          }
        }

        // Show success state
        setLoginSuccess(true);
        
        // Redirect after a short delay to show the success state
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh(); // Ensure the layout updates with the new auth state
        }, 800);
      } catch (error) {
        console.error("Login error:", error);
        if (error instanceof Error) {
          setError(error.message || "An error occurred during login");
        } 
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Handle input change for InputBox component
  const handleInputChange = (fieldName: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    formik.setFieldValue(fieldName, e.target.value);
    // Reset login success when user starts typing again
    if (loginSuccess) setLoginSuccess(false);
  };
  
  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    formik.setFieldValue('rememberMe', e.target.checked);
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold text-primary-default">Welcome Back</h2>
        <p className="text-gray-600">
          Enter your credentials to access your account
        </p>
      </div>
      
      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
          {error}
        </div>
      )}
      
      <form className="space-y-4" onSubmit={formik.handleSubmit}>
        <div className="space-y-2">
          <div>
            <InputBox
              label="Username or Email"
              placeholder="Enter your username or email"
              value={{ name: formik.values.usernameOrEmail }}
              onChange={handleInputChange('usernameOrEmail')}
              type="text"
              onBlur={formik.handleBlur}
              error={formik.touched.usernameOrEmail ? formik.errors.usernameOrEmail : undefined}
              disabled={isLoading}
              isLabelVisible={true}
              customClass={loginSuccess ? 'ring-2 ring-green-500 ring-offset-2 transition-all duration-500' : 'w-full'}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>

          </div>
          <div>
            <InputBox
              label="Password"
              placeholder="Enter your password"
              value={{ name: formik.values.password }}
              onChange={handleInputChange('password')}
              type="password"
              onBlur={formik.handleBlur}
              error={formik.touched.password ? formik.errors.password : undefined}
              disabled={isLoading}
              isLabelVisible={false}
              customClass={loginSuccess ? 'ring-2 ring-green-500 ring-offset-2 transition-all duration-500' : 'w-full'}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formik.values.rememberMe}
                onChange={handleCheckboxChange}
                disabled={isLoading}
                className="h-4 w-4 text-primary-default focus:ring-primary-default border-gray-300 rounded"
              />
              <label
                htmlFor="rememberMe"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Remember me
              </label>
            </div>

            <div className="text-right">
                <button
                  type="button"
                  onClick={() => onChangeView("forgotPassword")}
                  disabled={isLoading}
                  className="text-sm font-medium text-primary-default hover:text-primary-hover transition-colors items-center"
                >
                  Forgot password?
                </button>
              </div>
          </div>
        </div>
        
        <button 
          type="submit"
          className="relative w-full px-6 py-2.5 flex flex-row gap-2 items-center justify-center rounded-sm h-10 font-lato font-medium text-white 
          bg-gradient-to-r from-primary-default to-primary-200 shadow-md hover:shadow-lg
          transform transition-all duration-300 hover:translate-y-[-1px] active:translate-y-0 active:scale-95 overflow-hidden group
          before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary-200 before:to-primary-default
          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
          disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {/* Animated ring effect */}
          <span className="absolute inset-0 rounded-sm overflow-hidden">
            <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </span>

          {isLoading ? (
            <>
              <div className="relative z-10 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
              <span className="relative z-10 text-base font-medium tracking-wide">
                Signing in...
              </span>
            </>
          ) : (
            <span className="relative z-10 text-base font-medium tracking-wide">
              Sign in
            </span>
          )}

          {/* Subtle shine effect on hover */}
          <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></span>
        </button>
      </form>
      
      <div className="text-sm text-center text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => onChangeView("signup")}
          className="font-medium text-primary-default hover:text-primary-hover transition-colors"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
