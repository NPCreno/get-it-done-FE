"use client"
import { INotificationProps } from "../interface/INotification";
import type { NotificationType } from "../contracts/enums";
import Image from "next/image";
import Link from "next/link";
import { routeForNotification } from "@/lib/notificationRoutes";

const ICONS: Record<NotificationType, string> = {
  achievement: "/svgs/notifIcons/trophy-yellow.svg",
  milestone: "/svgs/notifIcons/ribbon-steel.svg",
  streak: "/svgs/notifIcons/fire-orange.svg",
  levelUp: "/svgs/notifIcons/star-teal.svg",
  reward: "/svgs/notifIcons/medal-red.svg",
  taskDue: "/svgs/notifIcons/calendar-yellow.svg",
  assignment: "/svgs/notifIcons/checkmark-circle-outline.svg",
};

export default function NotificationCard({ notification, time, onMarkRead, pending }: INotificationProps) {
  const { notif_id, type, title, message, read, actionType } = notification;
  const unread = !read;
  const label = actionType === "acknowledge" || actionType === "claim" || actionType === "complete" ? "Acknowledge" : "Mark as read";
  // Where it leads comes from the FE allowlist only, never from the notification's data.
  const route = routeForNotification(type);

  return (
    // The card click is a mouse convenience; the button below is the keyboard path.
    <div
      role="presentation"
      onClick={() => {
        if (unread && !pending) onMarkRead(notif_id);
      }}
      className={`border-[2px] border-border p-[10px] h-[auto] rounded-[10px] bg-white flex justify-between items-start w-full ${unread ? "cursor-pointer" : ""}`}
    >
      <div className="flex flex-row gap-[10px]">
        <div className={`min-w-[5px] min-h-full rounded ${unread ? "bg-secondary-default" : "bg-white"}`}></div>

        <div className="flex items-start">
          <Image src={ICONS[type]} width={40} height={40} alt="" aria-hidden="true" />
        </div>

        <div className="flex flex-col w-full gap-[10px]">
          <div className="flex flex-col">
            <h2 className="font-lato font-bold text-[13px] text-black">
              {title}
              {unread && <span className="sr-only"> (unread)</span>}
            </h2>
            <span className="font-lato font-normal text-xs text-black">{message}</span>
          </div>
          {route && (
            <Link
              href={route}
              onClick={(e) => {
                e.stopPropagation();
                if (unread && !pending) onMarkRead(notif_id);
              }}
              className="w-fit font-lato text-[11px] font-bold text-primary-default underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default"
            >
              Open projects
            </Link>
          )}
          {unread && (
            <button
              type="button"
              disabled={pending}
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notif_id);
              }}
              className="flex flex-row gap-[5px] px-[10px] h-[30px] w-fit bg-background font-lato text-[10px] text-black items-center rounded-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default"
            >
              <svg aria-hidden="true" width="10" height="10" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M131.25 75.0139C131.25 43.9592 106.055 18.7639 75 18.7639C43.9453 18.7639 18.75 43.9592 18.75 75.0139C18.75 106.069 43.9453 131.264 75 131.264C106.055 131.264 131.25 106.069 131.25 75.0139Z" stroke="white" strokeWidth="10" strokeMiterlimit="10"/>
                <path d="M103.125 51.582L63.7502 98.457L46.8752 79.707" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {label}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start font-lato text-[10px] text-text gap-5">
        <span>{time}</span>
      </div>
    </div>
  );
}
