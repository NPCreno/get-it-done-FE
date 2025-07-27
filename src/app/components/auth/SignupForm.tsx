"use client";
import React, { useState } from "react";
import { useFormik } from "formik";
import { signUpSchema } from "@/app/schemas/signUpSchema";
import { createUser, loginEmail } from "@/app/api/userRequests";
import InputBox from "@/app/components/inputBox";
import { getIPAddress } from "@/app/utils/utils";

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
    const ipAddress = await getIPAddress();
    
    try {
      // Create user payload
      const userPayload = {
        username: values.username,
        email: values.email,
        password: values.password,
        full_name: values.fullname
      };

      // Create user
      const signupResponse = await createUser(userPayload);

      if (signupResponse.error) {
        throw new Error(signupResponse.error.message || "Failed to create account");
      }

      // Log in the user
      const { data } = await loginEmail(values.email, values.password, true, ipAddress);
  
      if (data) {
        document.cookie = `access_token=${data.access_token}; path=/; secure; SameSite=Strict`; // Store in cookie
        document.cookie = `refresh_token=${data.refresh_token}; path=/; secure; SameSite=Strict`; // Store in cookie
        onChangeView("signedUp");
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
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold text-primary-default">Create an account</h2>
        <p className="text-gray-600">
          Enter your information to create an account
        </p>
      </div>
      
      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-default hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-default/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </div>
      </form>
      
      <div className="text-sm text-center text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onChangeView("login")}
          className="font-medium text-primary-default hover:text-primary-hover transition-colors"
          disabled={isLoading}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
