"use client"
import LoadingPage from "@/app/components/loader";
import MainLayout from "@/app/components/MainLayout";
import NotificationCard from "@/app/components/notificationCard";
import { INotificationProps } from "@/app/interface/INotification";
import { useEffect, useState } from "react";
import { useFormState } from "@/app/context/FormProvider";

export default function NotificationsPage() {
  const { userData } = useFormState();
  // const [pageLoading, setIsPageLoading] = useState(false);
  const pageLoading = false
  const [showLoader, setShowLoader] = useState(true);
  // const isFirstLoad = useRef(true);
  // const [refreshPage, setRefreshPage] = useState(false)

  // const rawNotifications: Omit<INotificationProps, 'status'>[] = [
  //   {
  //     type: 'achievement',
  //     title: '🏆 Achievement Unlocked!',
  //     message: "You've completed 50 tasks!",
  //     time: '2h ago',
  //     onAcknowledge: () => alert('Achievement acknowledged'),
  //   },
  //   {
  //     type: 'milestone',
  //     title: 'Milestone Reached!',
  //     message: 'Halfway through Project Apollo!',
  //     time: '1d ago',
  //     onAcknowledge: () => alert('Milestone acknowledged'),
  //   },
  //   {
  //     type: 'streak',
  //     title: '7-Day Streak! 🔥',
  //     message: "You've been productive for 7 days straight!",
  //     time: '3h ago',
  //     onAcknowledge: () => alert('Streak acknowledged'),
  //   },
  //   {
  //     type: 'levelUp',
  //     title: 'Level Up!',
  //     message: "You've reached Productivity Level 3!",
  //     time: '5h ago',
  //     onAcknowledge: () => alert('Level up acknowledged'),
  //   },
  //   {
  //     type: 'bigReward',
  //     title: 'Big Reward Available 🎁',
  //     message: 'You can redeem your weekly reward now!',
  //     time: '30m ago',
  //     onAcknowledge: () => alert('Big reward acknowledged'),
  //   },
  //   {
  //     type: 'dueTomorrow',
  //     title: 'Task Due Tomorrow',
  //     message: 'Finish "Client Report" before 5 PM tomorrow.',
  //     time: '10m ago',
  //   },
  //   {
  //     type: 'taskCompleted',
  //     title: 'Task Completed',
  //     message: 'You completed "Design Dashboard Mockup".',
  //     time: '1h ago',
  //   },
  //   {
  //     type: 'smallReward',
  //     title: 'Small Reward Unlocked 🎉',
  //     message: "You've earned a coffee break token!",
  //     time: '4h ago',
  //   },
  //   {
  //     type: 'taskCompleted',
  //     title: 'Task Completed',
  //     message: 'Finished reading "Deep Work".',
  //     time: '2d ago',
  //   },
  //   {
  //     type: 'dueTomorrow',
  //     title: 'Task Due Tomorrow',
  //     message: "Prepare agenda for Thursday's standup.",
  //     time: '3h ago',
  //   },
  // ]
 
  
  const rawNotifications: Omit<INotificationProps, 'status'>[] = []

  const notifications: INotificationProps[] = rawNotifications.map((notif) => ({
    ...notif,
    status: Math.random() < 0.5 ? 'read' : 'unread',
  }));

useEffect(() => {
  if (!pageLoading) {
    setTimeout(() => setShowLoader(false), 500); // Match transition duration
  }
}, [pageLoading]);

  return (
    <MainLayout>
      <div className="main flex justify-center w-full flex-col overflow-y-auto">
        {/* Main Page */}
        <div className="inside max-w-[1440px] w-full mx-auto gap-5 flex flex-col ">
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
                    Notifications
                  </h1>
                  <p className="font-lato text-sm text-gray-500 fade-in-delay-1 select-none mt-1">
                  Never Miss an Important Update
                  </p>
                </div>
              </div>
            </div>

            <div className="flex font-lato font-bold text-[13px] fade-in-delay-2 text-text cursor-pointer items-end"> 
              Mark all as read
            </div>  
          </div>

          {showLoader && (
          <div className={`transition-opacity duration-500 ${!pageLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <LoadingPage />
          </div>
        )}

          {/* Main contents */}
          {pageLoading &&(
          <div className="">LOADING DATA....</div>
          )}


          {(rawNotifications.length != 0 && !pageLoading)&&(
          <div className="flex flex-col gap-[10px] overflow-y-auto fade-in-delay-1 max-h-[calc(100vh-130px)] pr-2 hide-scrollbar">
            {notifications.map((notif, index) => (
              <NotificationCard key={index} {...notif} />
            ))}
          </div>
          )}

          {(rawNotifications.length ===0 && !pageLoading) &&(
          <>
            <div className="w-full h-full flex items-start justify-center mt-12">
              <div className="flex flex-col gap-5 items-center max-w-[352px] justify-start">
                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="fade-in">
                <path d="M87.5 50.0098C87.5 29.3066 70.7031 12.5098 50 12.5098C29.2969 12.5098 12.5 29.3066 12.5 50.0098C12.5 70.7129 29.2969 87.5098 50 87.5098C70.7031 87.5098 87.5 70.7129 87.5 50.0098Z" stroke="#FEAD03" stroke-width="7" stroke-miterlimit="10"/>
                <path d="M68.75 34.3877L42.5 65.6377L31.25 53.1377" stroke="#FEAD03" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>

                <h1 className="font-lato text-2xl text-primary-default font-bold fade-in-delay-1 text-center">
                  You&apos;re All Caught Up! ✨
                </h1>
                <span className="font-lato text-base text-text text-center fade-in-delay-2">
                  No new notifications right now. When you start creating tasks and achieving goals, you&apos;ll see your progress updates here.
                </span>
              </div>
            </div>
          </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
