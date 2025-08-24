"use client";
import { useEffect } from "react";
import { CardTitle } from "./shadcn/card";
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { useFormStore } from "../store/useFormStore";

interface StreakCounterProps {
  streakCount: number;
  header: string;
}

export default function StreakCounter({ streakCount, header}: StreakCounterProps) {
    const { userData } = useFormStore();
    const isInactive = streakCount === 0;
    const isActive = streakCount > 0 && streakCount < 6;
    const isOnFire = streakCount > 5 && streakCount < 8;
    const isOnFirePlus = streakCount > 7;

    // Different messages based on streak count
    let streakMessage = "Start your streak today!";
    let progressMessage = "Complete a task to begin";
    let progressWidth = 0;
    
    if (isActive) {
      streakMessage = ` ${streakCount}-Day Streak!`;
      progressMessage = `Complete a task to continue your streak`;
      // Calculate progress as a fraction of 7 days
      progressWidth = Math.min(100, Math.floor((streakCount / 7) * 100));
    } else if (isOnFire) {
      streakMessage = ` ${streakCount}-Day Streak!`;
      progressMessage = `You're on fire! Keep it up!`;
      // Only show full width at 7 days
      progressWidth = streakCount === 7 ? 100 : Math.floor((6 / 7) * 100);
    } else if (isOnFirePlus) {
      streakMessage = ` ${streakCount}-Day Streak!`;
      progressMessage = `Amazing streak! Keep it going!`;
      progressWidth = 100;
    }

    useEffect(() => {
      if (streakCount > 7) {
          const canvas = document.querySelector('#fire-animation-canvas') as HTMLCanvasElement | null;
          if (canvas) {
          new DotLottie({
              autoplay: true,
              loop: true,
              canvas: canvas,
              src: "https://lottie.host/b903d801-3895-4a94-9340-c59c8e989e28/1fi7YdANEj.lottie",
          });
          
          return () => {
              // Cleanup Lottie animation on unmount
          };
          }
      }
      }, [streakCount]);

    return (
      <div className={`flex flex-col h-full p-4 text-center rounded-[10px] shadow-[0px_2px_5.1px_-1px_rgba(0,0,0,0.25)] 
        ${isOnFirePlus ? 'border border-orange-500 animate-fire-glow' : ''}
        ${userData?.theme === "dark" ? "bg-foreground-dark border-gray-800 border" : "bg-foreground-light"}`}
      >
        <div className="flex w-full items-start">
        <CardTitle className={`text-text ${userData?.theme === "dark" ? "text-white" : "text-black"}`}>
          {header}
        </CardTitle>
        </div>
        <div className="flex flex-col items-center justify-center h-full">
        <div className="relative mb-4">
          {isOnFirePlus ? (
            <div id="fire-animation-container" className="relative w-16 h-16">
              <canvas id="fire-animation-canvas" className="w-full h-full" />
              <div className="absolute -bottom-2 -right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-10">
                {streakCount}
              </div>
            </div>
          ) : (
            <>
              <div className={isOnFire ? 'fire-animation' : ''}>
                {isInactive ? (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 448 512"
                className="w-16 h-16 text-gray-300"
              >
                <path 
                  fill="currentColor" 
                  d="M159.3 5.4c7.8-7.3 19.9-7.2 27.7 .1c27.6 25.9 53.5 53.8 77.7 84c11-14.4 23.5-30.1 37-42.9c7.9-7.4 20.1-7.4 28 .1c34.6 33 63.9 76.6 84.5 118c20.3 40.8 33.8 82.5 33.8 111.9C448 404.2 348.2 512 224 512C98.4 512 0 404.1 0 276.5c0-38.4 17.8-85.3 45.4-131.7C73.3 97.7 112.7 48.6 159.3 5.4zM225.7 416c25.3 0 47.7-7 68.8-21c42.1-29.4 53.4-88.2 28.1-134.4c-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5c-16.5-21-46-58.5-62.8-79.8c-6.3-8-18.3-8.1-24.7-.1c-33.8 42.5-50.8 69.3-50.8 99.4C112 375.4 162.6 416 225.7 416z"
                />
              </svg>
                ) : (
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 448 512"
                    className={`w-16 h-16 ${isOnFire ? 'text-orange-500' : 'text-orange-400'}`}
                  >
                    <path 
                      fill="currentColor" 
                      d="M159.3 5.4c7.8-7.3 19.9-7.2 27.7 .1c27.6 25.9 53.5 53.8 77.7 84c11-14.4 23.5-30.1 37-42.9c7.9-7.4 20.1-7.4 28 .1c34.6 33 63.9 76.6 84.5 118c20.3 40.8 33.8 82.5 33.8 111.9C448 404.2 348.2 512 224 512C98.4 512 0 404.1 0 276.5c0-38.4 17.8-85.3 45.4-131.7C73.3 97.7 112.7 48.6 159.3 5.4zM225.7 416c25.3 0 47.7-7 68.8-21c42.1-29.4 53.4-88.2 28.1-134.4c-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5c-16.5-21-46-58.5-62.8-79.8c-6.3-8-18.3-8.1-24.7-.1c-33.8 42.5-50.8 69.3-50.8 99.4C112 375.4 162.6 416 225.7 416z"
                    />
                  </svg>
                )}
              </div>
            </>
          )}
          {!isInactive && !isOnFirePlus && (
            <div className={`absolute -top-2 -right-2 ${
              isOnFire ? 'bg-red-500' : 'bg-blue-500'
            } text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold`}>
              {streakCount}
            </div>
          )}
        </div>
        <h3 className={`text-xl font-bold ${userData?.theme === "dark" ? "text-white" : "text-gray-800"} mb-2 `}>{streakMessage}</h3>
        <p className="text-gray-600 mb-4">{progressMessage}</p>
        {!isInactive && (
          <>
            <div className={`w-full rounded-full h-2.5 ${
              userData?.theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
              <div 
                className={`h-2.5 rounded-full ${
                  isOnFire || isOnFirePlus 
                    ? 'bg-red-500' 
                    : userData?.theme === 'dark' 
                      ? 'bg-orange-400' 
                      : 'bg-orange-400'
                }`} 
                style={{ width: `${progressWidth}%` }}
              ></div>
              </div>
            <p className="text-xs text-gray-500 mt-2">
              {isOnFire 
                ? 'Amazing! Keep the streak going!' 
                : `Complete a task to continue your streak`
              }
            </p>
          </>
        )}
        </div>
      </div>
    );
  };

