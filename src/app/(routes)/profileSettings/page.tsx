"use client";
import { getUser, updateUser } from "@/app/api/userRequests";
import MainLayout from "@/app/components/MainLayout";
import ToggleSwitch from "@/app/components/toggleSwitch";
import { updateUserSchema } from "@/app/schemas/updateUserSchema";
import { useFormik, FormikErrors } from "formik";
import { useEffect, useRef, useState } from "react";
import { Toast } from "@/app/components/toast";
import { getAccessToken, parseJwt } from "@/app/utils/utils";
import ConfirmationModal from "@/app/components/modals/confirmation";
import Cookies from 'js-cookie';
import LoadingPage from "@/app/components/loader";
import InputBox from "@/app/components/inputBox";
import { useFormState } from "@/app/context/FormProvider";
import { profileSettingsFormValues, toasMessage } from "@/app/interface/types";

export default function ProfileSettingsPage() {
  const { userData, setUserData } = useFormState();
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<toasMessage>({
    title: "",
    description: "",
    className: "",
    variant: "default",
  });
  const [isExitingToast, setIsExitingToast] = useState(false);
  const [isDoneFetchingUser, setIsDoneFetchingUser] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const isFirstLoad = useRef(true);
  const {
    validateForm,
    setFieldValue,
    values,
    errors,
    handleSubmit,
    handleChange,
    setSubmitting,
    handleBlur,
  } = useFormik({
    initialValues: {
      fullname: userData ? userData.fullname : "",
      username: userData ? userData.username : "",
      password: "",
      theme: userData?.theme ?? "light",
      enableNotifications: userData ? userData.enableNotifications === "true" : false,
      soundFx: userData ? userData.soundFx === "true" : false,
    },
    enableReinitialize: true,
    validationSchema: updateUserSchema,
    validateOnChange: false, // Disable real-time validation
    validateOnBlur: false,
    onSubmit: async (values: profileSettingsFormValues) => {
      setSubmitting(false);
      handleSubmitForm(values);
    },
  });

  const handleSubmitForm = async (values: profileSettingsFormValues) => {
    const validationErrors: FormikErrors<typeof values> = await validateForm();

    if (Object.keys(validationErrors).length === 0) {
      await update(values);
    }
    setSubmitting(false);
  };

  const update = async (values: profileSettingsFormValues) => {
    try {
      if (!userData) {
        console.error("No User data found");
        return;
      }

      const updateData = {
        ...values,
        enableNotifications: values.enableNotifications.toString(),
        soundFx: values.soundFx.toString(),
      };

      const response = await updateUser(userData.user_id, updateData);

      if (response) {
        setToastMessage({
          title: "Profile Settings Saved",
          description: "Your preferences have been saved",
          variant: "success"
        });

        setTimeout(() => {
          window.location.reload();
        }, 1000);
        setShowToast(true);
        setIsExitingToast(false);
      }
    } catch (error) {
      if (error instanceof Error) {
        setToastMessage({
          title: "Something Went Wrong",
          description: error.message,
          variant: "error"
        });
      } else {
        setToastMessage({
          title: "Something Went Wrong",
          description: "An unknown error occurred",
          variant: "error"
        });
      }
      setShowToast(true);
      setIsExitingToast(false);

      setTimeout(() => {
        setIsExitingToast(true); // Start exit animation
        setTimeout(() => {
          setShowToast(false); // Remove after animation completes
        }, 400); // Must match the toastOut animation duration
      }, 10000); // Toast display duration
    }
  };

  const handleToastClose = () => {
    setIsExitingToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 400);
  };

  const confirmLogout = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    localStorage.removeItem('pomodoroTimerState');
    window.location.href = '/';
  };

  useEffect(() => {
    const fetchUser = async () => {
      // Set loading state
      if (isFirstLoad.current) {
        setPageLoading(true);
      }
            
      if (isDoneFetchingUser) return;
      else {
        try {
          if (!userData) {
            // If no user, try getting one from cookies
            const token = getAccessToken();
            if (!token) {
              console.error("No access_token found in cookies");
              return;
            }
            const parsedUser = parseJwt(token).user;
            if (!parsedUser || !parsedUser.user_id) {
              console.error("Failed to parse user or missing user_id in token");
              return;
            }
            setIsDoneFetchingUser(true);
            setUserData(parsedUser);
            const response = await getUser(parsedUser.user_id);
            if (response) {
              setIsDoneFetchingUser(true);
              setUserData(response);
            }
            return;
          }
          // Only fetch updated user info if we have a user
          const response = await getUser(userData.user_id);
          if (response) {
            setIsDoneFetchingUser(true);
            setUserData(response);
          }
        } catch (error) {
          console.error("Failed to fetch user:", error);
        }
        finally{
          if (isFirstLoad.current) {
            setPageLoading(false);
            isFirstLoad.current = false;
          }
        }
      }
    };
    fetchUser();
  }, [userData, setUserData, isDoneFetchingUser]);

  useEffect(() => {
    if (!pageLoading) {
      setTimeout(() => setShowLoader(false), 500); // Match transition duration
    }
  }, [pageLoading]);

  return (
    <MainLayout>
      {showToast && (
        <div
          className={`fixed bottom-4 right-4 z-50 ${
            isExitingToast ? "toast-exit" : "toast-enter"
          }`}
        >
          <Toast {...toastMessage} onClose={handleToastClose} variant={toastMessage.variant} />
        </div>
      )}
      <div className="main flex justify-center w-full">
        {/* Main Page */}
        <div className="inside max-w-[1440px] w-full mx-auto gap-5 flex flex-col">
          {showLoader && (
            <div
              className={`transition-opacity duration-500 ${
                !pageLoading ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              <LoadingPage />
            </div>
          )}
          <div className="flex justify-between">
            {/* Left header */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-primary-default rounded-full"></div>
                <div>
                  <h1 className={`text-2xl md:text-3xl font-bold fade-in select-none bg-clip-text text-transparent ${
                        userData?.theme === "dark" 
                          ? "bg-gradient-to-r from-blue-300 via-amber-200 to-blue-300" 
                          : "bg-gradient-to-r from-gray-800 to-gray-600"
                  }`}>
                    Profile Settings
                  </h1>
                  <p className="font-lato text-sm text-gray-500 fade-in-delay-1 select-none mt-1">
                  Manage Your Profile & Preferences
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form
            className="flex flex-col md:flex-row gap-5"
            id="profileSettings"
            name="profileSettings"
            onSubmit={handleSubmit}
          >
            {/* left side */}
            <div className="flex flex-col gap-5 w-full md:min-w-[400px] lg:min-w-[700px] h-full">
              {/* Profile Information */}
              <div className={`flex flex-col rounded-[10px] ${userData?.theme === "dark" ? "bg-foreground-dark  border border-gray-800" : "bg-white"} p-5`}>
                {/* profile information header */}
                <div className="flex flex-row justify-between">
                  <div className="flex flex-col">
                    <div className="flex flex-row gap-5 ">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M19 21V19C19 17.9391 18.5786 16.9217 17.8284 16.1716C17.0783 15.4214 16.0609 15 15 15H9C7.93913 15 6.92172 15.4214 6.17157 16.1716C5.42143 16.9217 5 17.9391 5 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                          stroke="#FEAD03"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>

                      <p className="font-lato text-2xl text-primary-default fade-in-delay-1 select-none">
                        Profile Information
                      </p>
                    </div>
                    <p className={`font-lato text-[13px] text-text fade-in-delay-1 select-none ${userData?.theme === "dark" ? "text-white" : "text-text"}`}>
                      Update your personal information
                    </p>
                  </div>

                  <div className="flex flex-row justify-center items-center gap-4">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.0001 14.2534C13.2428 14.2534 14.2501 13.2461 14.2501 12.0034C14.2501 10.7608 13.2428 9.75342 12.0001 9.75342C10.7575 9.75342 9.75012 10.7608 9.75012 12.0034C9.75012 13.2461 10.7575 14.2534 12.0001 14.2534Z"
                        fill="#FEAD03"
                      />
                      <path
                        d="M22.0495 14.0654L22.0275 14.0476L20.5481 12.8875C20.4544 12.8133 20.3796 12.7181 20.3299 12.6094C20.2802 12.5008 20.257 12.382 20.2622 12.2626V11.7207C20.2575 11.6022 20.281 11.4842 20.3308 11.3764C20.3806 11.2687 20.4552 11.1743 20.5486 11.1011L22.0275 9.94043L22.0495 9.92262C22.2776 9.73262 22.4306 9.46768 22.4813 9.17518C22.532 8.88268 22.4769 8.5817 22.3261 8.32605L20.324 4.86199C20.3217 4.85872 20.3197 4.85528 20.3179 4.85168C20.1662 4.59957 19.931 4.40855 19.6532 4.31179C19.3753 4.21503 19.0723 4.21864 18.7968 4.32199L18.7804 4.32809L17.0414 5.02793C16.9316 5.07231 16.8129 5.08997 16.6949 5.07946C16.577 5.06894 16.4633 5.03056 16.3631 4.96746C16.2093 4.87059 16.0531 4.77902 15.8943 4.69277C15.7914 4.63696 15.703 4.55774 15.6364 4.46149C15.5697 4.36525 15.5265 4.25469 15.5104 4.13871L15.2484 2.28293L15.2428 2.24918C15.1857 1.96174 15.0315 1.7027 14.806 1.51558C14.5804 1.32847 14.2974 1.22469 14.0043 1.22168H9.99559C9.69843 1.22263 9.41114 1.32842 9.18433 1.52042C8.95752 1.71241 8.80575 1.97829 8.75574 2.27121L8.75153 2.29746L8.49043 4.15699C8.47442 4.27263 8.43162 4.38294 8.36546 4.47913C8.2993 4.57532 8.2116 4.65473 8.10934 4.71105C7.95013 4.79681 7.79379 4.88779 7.64059 4.98387C7.54059 5.04658 7.42713 5.08467 7.30955 5.09502C7.19196 5.10537 7.0736 5.08768 6.96418 5.0434L5.22371 4.34027L5.20731 4.33371C4.93143 4.23024 4.62801 4.22677 4.34983 4.32389C4.07166 4.42101 3.83634 4.61258 3.68481 4.86527L3.67871 4.87559L1.67387 8.34199C1.52276 8.5979 1.4676 8.89922 1.51827 9.19206C1.56894 9.4849 1.72212 9.75017 1.95043 9.94043L1.97246 9.95824L3.45184 11.1184C3.54552 11.1925 3.62029 11.2878 3.67 11.3964C3.7197 11.505 3.74293 11.6239 3.73777 11.7432V12.2851C3.74247 12.4037 3.71896 12.5217 3.66917 12.6294C3.61938 12.7372 3.54473 12.8315 3.45137 12.9048L1.97246 14.0654L1.95043 14.0832C1.72235 14.2732 1.56929 14.5382 1.51862 14.8307C1.46795 15.1232 1.52298 15.4242 1.67387 15.6798L3.6759 19.1439C3.6782 19.1471 3.68024 19.1506 3.68199 19.1542C3.83369 19.4063 4.06889 19.5973 4.34676 19.6941C4.62463 19.7908 4.92761 19.7872 5.20309 19.6839L5.21949 19.6778L6.95715 18.9779C7.06691 18.9335 7.18565 18.9159 7.30358 18.9264C7.42151 18.9369 7.53525 18.9753 7.63543 19.0384C7.78918 19.1356 7.94543 19.2271 8.10418 19.3131C8.20711 19.3689 8.29548 19.4481 8.36216 19.5444C8.42885 19.6406 8.47198 19.7512 8.48809 19.8671L8.74871 21.7229L8.75434 21.7567C8.81148 22.0446 8.96614 22.304 9.19225 22.4912C9.41835 22.6783 9.70207 22.7818 9.99559 22.7842H14.0043C14.3015 22.7832 14.5888 22.6774 14.8156 22.4854C15.0424 22.2934 15.1942 22.0276 15.2442 21.7346L15.2484 21.7084L15.5095 19.8489C15.5258 19.733 15.5689 19.6226 15.6355 19.5264C15.7021 19.4301 15.7902 19.3509 15.8929 19.2948C16.0532 19.2086 16.2098 19.1171 16.3617 19.022C16.4617 18.9593 16.5751 18.9212 16.6927 18.9108C16.8103 18.9005 16.9287 18.9182 17.0381 18.9625L18.7786 19.6632L18.795 19.6698C19.0708 19.7735 19.3743 19.777 19.6525 19.6799C19.9308 19.5828 20.1661 19.3911 20.3175 19.1382C20.3193 19.1347 20.3214 19.1313 20.3236 19.1279L22.3256 15.6643C22.477 15.4085 22.5323 15.1071 22.4817 14.8141C22.4312 14.5211 22.2779 14.2557 22.0495 14.0654V14.0654ZM15.7457 12.1792C15.7116 12.9051 15.4673 13.6054 15.0425 14.195C14.6177 14.7847 14.0308 15.2382 13.3531 15.5004C12.6753 15.7626 11.936 15.8223 11.225 15.6721C10.514 15.5219 9.8619 15.1684 9.34808 14.6545C8.83425 14.1406 8.48081 13.4885 8.33073 12.7775C8.18065 12.0665 8.24039 11.3271 8.5027 10.6494C8.76501 9.97174 9.21857 9.38484 9.80824 8.96014C10.3979 8.53543 11.0983 8.2912 11.8242 8.25715C12.3453 8.2342 12.8655 8.31995 13.3517 8.50894C13.8379 8.69793 14.2795 8.98602 14.6483 9.3549C15.0172 9.72378 15.3052 10.1654 15.4941 10.6516C15.6831 11.1378 15.7688 11.658 15.7457 12.1792V12.1792Z"
                        fill="#FED580"
                      />
                    </svg>

                    <p
                      className="font-lato text-base font-bold text-primary-default fade-in-delay-1 hover:cursor-pointer"
                      onClick={() => {
                        setIsEditEnabled(true);
                      }}
                    >
                      Edit
                    </p>
                  </div>
                </div>

                <div className="mt-5 fade-in-delay-1">
                  {/* fullname input */}
                  <InputBox
                    label="Full name"
                    placeholder="Enter your full name"
                    value={{ name: values.fullname }}
                    onChange={handleChange}
                    type="text"
                    onBlur={handleBlur}
                    error={errors.fullname}
                    disabled={!isEditEnabled}
                    isLabelVisible={true}
                  />

                  {/* username input */}
                  <InputBox
                    label="Username"
                    placeholder="Enter your username"
                    value={{ name: values.username }}
                    onChange={handleChange}
                    type="text"
                    onBlur={handleBlur}
                    error={errors.fullname}
                    disabled={!isEditEnabled}
                    isLabelVisible={true}
                  />

                  {/* password input */}
                  <InputBox
                    label="Password"
                    placeholder="Enter your password"
                    value={{ name: values.password }}
                    onChange={handleChange}
                    type="text"
                    onBlur={handleBlur}
                    error={errors.password}
                    disabled={!isEditEnabled}
                    isLabelVisible={true}
                  />
                </div>
              </div>

              {/* General Settings*/}
              <div className={`flex flex-col rounded-[10px] ${userData?.theme === "dark" ? "bg-foreground-dark  border border-gray-800" : "bg-white"} p-5 gap-[10px]`}>
                {/* profile information header */}
                <div className="flex flex-row justify-between">
                  <div className="flex flex-col">
                    <div className="flex flex-row gap-5 ">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.268 21C10.4435 21.304 10.696 21.5565 11 21.732C11.3041 21.9075 11.6489 21.9999 12 21.9999C12.3511 21.9999 12.6959 21.9075 13 21.732C13.304 21.5565 13.5565 21.304 13.732 21M3.262 15.326C3.13137 15.4692 3.04516 15.6472 3.01386 15.8385C2.98256 16.0298 3.00752 16.226 3.08571 16.4034C3.1639 16.5807 3.29194 16.7316 3.45426 16.8375C3.61658 16.9434 3.80618 16.9999 4 17H20C20.1938 17.0001 20.3834 16.9438 20.5459 16.8381C20.7083 16.7324 20.8365 16.5817 20.9149 16.4045C20.9933 16.2273 21.0185 16.0311 20.9874 15.8398C20.9564 15.6485 20.8704 15.4703 20.74 15.327C19.41 13.956 18 12.499 18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 12.499 4.589 13.956 3.262 15.326Z"
                          stroke="#FEAD03"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>

                      <p className="font-lato text-2xl text-primary-default fade-in-delay-1 select-none">
                        Notifications
                      </p>
                    </div>
                    <p className={`font-lato text-[13px] text-text fade-in-delay-1 select-none ${userData?.theme === "dark" ? "text-white" : "text-text"}`}>
                      Configure notification preferences
                    </p>
                  </div>
                </div>

                <div className="mt-5 fade-in-delay-1">
                  {/* Enable notifications */}
                  <div className="flex flex-row justify-between h-20 border-b border-border">
                    <div className="flex flex-col justify-center">
                      <p className="font-lato text-2xl text-primary-default fade-in-delay-1 select-none">
                        Enable notifications
                      </p>
                      <p className={`font-lato text-[13px] text-text fade-in-delay-1 select-none ${userData?.theme === "dark" ? "text-white" : "text-text"}`}>
                        Recieve notifications for tasks and reminders
                      </p>
                    </div>

                    <div className="flex flex-row justify-center items-center gap-4 ml-3">
                      <ToggleSwitch
                        name="enableNotifications"
                        value={values.enableNotifications}
                        onChange={setFieldValue}
                        onLabel="Enabled"
                        offLabel="Disabled"
                        className={`fade-in-delay-1 ${userData?.theme === "dark" ? "text-white" : "text-text"}`}
                        theme={userData?.theme}
                      />
                    </div>
                  </div>

                  {/*  */}
                  <div className="flex flex-row justify-between h-20">
                    <div className="flex flex-col justify-center">
                      <p className="font-lato text-2xl text-primary-default fade-in-delay-1 select-none">
                        Sound Effects
                      </p>
                      <p className={`font-lato text-[13px] text-text fade-in-delay-1 select-none ${userData?.theme === "dark" ? "text-white" : "text-text"}`}>
                        Play sound when completing tasks
                      </p>
                    </div>

                    <div className="flex flex-row justify-center items-center gap-4 ml-3">
                      <ToggleSwitch
                        name="soundFx"
                        value={values.soundFx}
                        onChange={setFieldValue}
                        onLabel="Enabled"
                        offLabel="Disabled"
                        className={`fade-in-delay-1 ${userData?.theme === "dark" ? "text-white" : "text-text"}`}
                        theme={userData?.theme}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* right side */}
            <div className="flex flex-col gap-5 w-full md:w-[350px] lg:w-[350px] fade-in-delay-1-2">
              <div className={`flex flex-col gap-5 p-5 rounded-[10px] ${userData?.theme === "dark" ? "bg-foreground-dark border border-gray-800" : "bg-white"}`}>
                {/* Appearance header */}
                <div className="flex-flex-col">
                  <p className="font-lato text-2xl text-primary-default fade-in-delay-1 select-none">
                    Appearance
                  </p>
                  <p className={`font-lato text-[13px] text-text fade-in-delay-1 select-none ${userData?.theme === "dark" ? "text-white" : "text-text"}`}>
                    Customize how Task Tracker looks
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <div className="flex flex-row gap-5">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M6.34 17.66L4.93 19.07M19.07 4.93L17.66 6.34M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z"
                        stroke={`${userData?.theme === "dark" ? "white" : "black"}`}
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>

                    <p className={`font-lato text-base font-bold fade-in-delay-1 select-none ${userData?.theme === "dark" ? "text-white" : "text-text"}`}>
                      Dark Mode
                    </p>
                  </div>
                  <ToggleSwitch
                    name="theme"
                    value={values.theme === "dark"}
                    onChange={(name, value) =>
                      setFieldValue(name, value ? "dark" : "light")
                    }
                    onLabel="Dark"
                    offLabel="Light"
                    className={`fade-in-delay-1 ${userData?.theme === "dark" ? "text-white" : "text-text"}`}
                    theme={userData?.theme}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="rounded-[10px] bg-primary-default flex flex-row justify-center items-center h-10 gap-5
              hover:shadow-[0px_4px_10.9px_0px_rgba(0,_0,_0,_0.25)] transition-all duration-300
              "
              >
                <svg
                  width="25"
                  height="24"
                  viewBox="0 0 25 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.5 21V14C17.5 13.7348 17.3946 13.4804 17.2071 13.2929C17.0196 13.1054 16.7652 13 16.5 13H8.5C8.23478 13 7.98043 13.1054 7.79289 13.2929C7.60536 13.4804 7.5 13.7348 7.5 14V21M7.5 3V7C7.5 7.26522 7.60536 7.51957 7.79289 7.70711C7.98043 7.89464 8.23478 8 8.5 8H15.5M15.7 3C16.2275 3.00751 16.7307 3.22317 17.1 3.6L20.9 7.4C21.2768 7.76926 21.4925 8.27246 21.5 8.8V19C21.5 19.5304 21.2893 20.0391 20.9142 20.4142C20.5391 20.7893 20.0304 21 19.5 21H5.5C4.96957 21 4.46086 20.7893 4.08579 20.4142C3.71071 20.0391 3.5 19.5304 3.5 19V5C3.5 4.46957 3.71071 3.96086 4.08579 3.58579C4.46086 3.21071 4.96957 3 5.5 3H15.7Z"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                <span className="font-lato text-lg font-bold text-white ">
                  Save Settings
                </span>
              </button>

              <button
                type="button"
                className="rounded-[10px] bg-error-300 flex flex-row justify-center items-center h-10 gap-5
                hover:shadow-[0px_4px_10.9px_0px_rgba(0,_0,_0,_0.25)] transition-all duration-300"
                onClick={() => setIsLogoutModalOpen(true)}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                <span className="font-lato text-lg font-bold text-white ">
                  Log out
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {isLogoutModalOpen && (
       <ConfirmationModal
       onClose={() => setIsLogoutModalOpen(false)}
       title="Are you sure you want to log out?"
       description="This will end your current session. You can log in again anytime"
       actions={[
         {
           label: 'Cancel',
           onClick: () => setIsLogoutModalOpen(false),
           variant: 'secondary'
         },
         {
           label: 'Log out',
           onClick: confirmLogout,
           variant: 'danger'
         }
       ]}
     />
      )}
    </MainLayout>
  );
}
