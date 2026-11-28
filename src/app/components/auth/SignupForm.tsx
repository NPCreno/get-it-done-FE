"use client";
import React, { useState } from "react";
import { useFormik } from "formik";
import { signUpSchema } from "@/app/schemas/signUpSchema";
import { createUser } from "@/app/api/userRequests";
import { toSignupRequest } from "@/app/contracts/mappers";
import { isUserFacing } from "@/lib/apiClient";
import InputBox from "@/app/components/inputBox";
import WakeHint from "./WakeHint";

interface SignupFormValues {
  username: string;
  fullname: string;
  email: string;
  password: string;
  confirmPassword: string;
  tier: string;
}

export default function SignupForm({
  onChangeView,
}: {
  onChangeView: (view: "login" | "signedUp") => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle input change for InputBox component
  const handleInputChange = (fieldName: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    formik.setFieldValue(fieldName, e.target.value);
  };

  // Handle form submission
  const handleSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    setError("");
    
    try {
      // Create user payload
      const userPayload = toSignupRequest(values);

      // Create user
      const signupResponse = await createUser(userPayload);

      if (!signupResponse.ok) {
        if (isUserFacing(signupResponse)) setError(signupResponse.message);
        return;
      }

      // Log in the user
      // The route handler sets the auth cookies server-side
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: values.email,
          password: values.password,
          rememberMe: true,
        }),
      });
      const loginResult = await loginResponse.json().catch(() => ({}));

      if (loginResponse.ok && loginResult.success) {
        onChangeView("signedUp");
      } else {
        setError("Account created, but sign-in failed. Please log in.");
      }
      
    } catch (error) {
      console.error("Signup error:", error);
      if (error instanceof Error) {
        setError(error.message || "An error occurred during signup. Please try again.");
      } 
    }finally {
      setIsLoading(false);
    }
  };

  const formik = useFormik<SignupFormValues>({
    initialValues: {
      username: "",
      fullname: "",
      email: "",
      password: "",
      confirmPassword: "",
      tier: "free",
    },
    validationSchema: signUpSchema,
    onSubmit: handleSubmit,
  });


  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-th-card rounded-lg shadow-md">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold text-th-acc-t">Create an account</h2>
        <p className="text-th-ink-body">
          Enter your information to create an account
        </p>
      </div>
      
      {error && (
        <div className="p-4 text-sm text-th-alert-t bg-th-alert-bg rounded-lg" role="alert">
          {error}
        </div>
      )}
      
      <form className="space-y-4" onSubmit={formik.handleSubmit}>
        <div className="space-y-2">
          <div className="relative">
              <InputBox
                label="Username"
                placeholder="Choose a username"
                value={{ name: formik.values.username }}
                onChange={handleInputChange('username')}
                type="text"
                onBlur={formik.handleBlur}
                error={formik.touched.username ? formik.errors.username : undefined}
                disabled={isLoading}
                isLabelVisible={true}
                customClass="w-full"
              />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
              <InputBox
                label="Full Name"
                placeholder="Enter your full name"
                value={{ name: formik.values.fullname }}
                onChange={handleInputChange('fullname')}
                type="text"
                onBlur={formik.handleBlur}
                error={formik.touched.fullname ? formik.errors.fullname : undefined}
                disabled={isLoading}
                isLabelVisible={true}
                customClass="w-full"
              />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
              <InputBox
                label="Email"
                placeholder="Enter your email"
                value={{ name: formik.values.email }}
                onChange={handleInputChange('email')}
                type="email"
                onBlur={formik.handleBlur}
                error={formik.touched.email ? formik.errors.email : undefined}
                disabled={isLoading}
                isLabelVisible={true}
                customClass="w-full"
              />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
              <InputBox
                label="Password"
                placeholder="Create a password"
                value={{ name: formik.values.password }}
                onChange={handleInputChange('password')}
                type="password"
                onBlur={formik.handleBlur}
                error={formik.touched.password ? formik.errors.password : undefined}
                disabled={isLoading}
                isLabelVisible={true}
                customClass="w-full"
              />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
              <InputBox
                label="Confirm Password"
                placeholder="Confirm your password"
                value={{ name: formik.values.confirmPassword }}
                onChange={handleInputChange('confirmPassword')}
                type="password"
                onBlur={formik.handleBlur}
                error={formik.touched.confirmPassword ? formik.errors.confirmPassword : undefined}
                disabled={isLoading}
                isLabelVisible={true}
                customClass="w-full"
              />
          </div>
        </div>
        
        <div className="grid gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-th-on-acc bg-th-acc focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--card)] focus:ring-th-focus disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
          {/* UX-03: a cold start can take up to a minute; say so after 5 s. */}
          <WakeHint pending={isLoading} />
        </div>
      </form>
      
      <div className="text-sm text-center text-th-ink-body">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onChangeView("login")}
          className="font-medium text-th-acc-t transition-colors"
          disabled={isLoading}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
