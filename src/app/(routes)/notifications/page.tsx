"use client"
import { useState } from "react";
import MainLayout from "@/app/components/MainLayout";
import NotificationCard from "@/app/components/notificationCard";
import ConfirmationModal from "@/app/components/modals/confirmation";
import LoadError, { useRecoveryFocus } from "@/app/components/LoadError";
import LoadingPage from "@/app/components/loader";
import ToastHost from "@/app/components/ToastHost";
import { useFormState } from "@/app/context/FormProvider";
import { useToastController } from "@/hooks/useToastController";
import {
  useClearNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/query/notifications";
import { loadStateOf } from "@/lib/query/loadState";
import { settled } from "@/lib/query/unwrap";
import { isUserFacing } from "@/lib/apiClient";
import { formatRelativeTime } from "@/lib/relativeTime";
import type { Notification } from "@/app/contracts/responses";

export default function NotificationsPage() {
  const { userData } = useFormState();
  const toast = useToastController();
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const clearAll = useClearNotifications();
  const [confirmClear, setConfirmClear] = useState(false);

  const items: Notification[] = query.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = query.data?.pages[0]?.unread_count ?? 0;
  const state = loadStateOf(
    {
      status: query.status,
      data: query.data ? items : undefined,
      error: query.error,
      isPlaceholderData: query.isPlaceholderData,
    },
    (d) => d.length === 0
  );
  const regionRef = useRecoveryFocus<HTMLDivElement>(state.status);
  const now = Date.now();

  const report = (r: Awaited<ReturnType<typeof settled>>) => {
    if (!r.ok && isUserFacing(r.failure)) toast.failure(r.failure);
  };
  const onMarkRead = async (id: string) => report(await settled(markRead.mutateAsync(id)));
  const onMarkAll = async () => report(await settled(markAll.mutateAsync(undefined)));
  const onClear = async () => {
    setConfirmClear(false);
    report(await settled(clearAll.mutateAsync(undefined)));
  };

  return (
    <MainLayout>
      <div className="main flex justify-center w-full flex-col overflow-y-auto">
        <div className="inside max-w-[1440px] w-full mx-auto gap-5 flex flex-col ">
          <div className="flex justify-between">
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

            {items.length > 0 && (
              <div className="flex gap-4 font-lato font-bold text-[13px] fade-in-delay-2 text-text items-end">
                <button
                  type="button"
                  disabled={unread === 0 || markAll.isPending}
                  onClick={onMarkAll}
                  className="disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default rounded"
                >
                  Mark all as read
                </button>
                <button
                  type="button"
                  disabled={clearAll.isPending}
                  onClick={() => setConfirmClear(true)}
                  className="disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default rounded"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div ref={regionRef} tabIndex={-1} className="outline-none">
            {state.status === "loading" && <LoadingPage />}

            {state.status === "error" && (
              <LoadError
                widget="your notifications"
                failure={state.failure}
                onRetry={() => void query.refetch()}
                retrying={query.isFetching}
                theme={userData?.theme}
              />
            )}

            {state.status === "ready" && (
              <>
                {state.refreshFailure && (
                  <LoadError
                    variant="compact"
                    widget="your notifications"
                    failure={state.refreshFailure}
                    onRetry={() => void query.refetch()}
                    retrying={query.isFetching}
                    theme={userData?.theme}
                  />
                )}
                <div className="flex flex-col gap-[10px] overflow-y-auto fade-in-delay-1 max-h-[calc(100vh-130px)] pr-2 hide-scrollbar">
                  {items.map((n) => (
                    <NotificationCard
                      key={n.notif_id}
                      notification={n}
                      time={formatRelativeTime(n.createdAt, now)}
                      onMarkRead={onMarkRead}
                    />
                  ))}
                  {query.hasNextPage && (
                    <button
                      type="button"
                      disabled={query.isFetchingNextPage}
                      onClick={() => void query.fetchNextPage()}
                      className="self-center font-lato font-bold text-[13px] text-text py-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default rounded"
                    >
                      {query.isFetchingNextPage ? "Loading…" : "Load more"}
                    </button>
                  )}
                </div>
              </>
            )}

            {state.status === "empty" && (
              <div className="w-full h-full flex items-start justify-center mt-12">
                <div className="flex flex-col gap-5 items-center max-w-[352px] justify-start">
                  <svg aria-hidden="true" width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="fade-in">
                    <path d="M87.5 50.0098C87.5 29.3066 70.7031 12.5098 50 12.5098C29.2969 12.5098 12.5 29.3066 12.5 50.0098C12.5 70.7129 29.2969 87.5098 50 87.5098C70.7031 87.5098 87.5 70.7129 87.5 50.0098Z" stroke="#FEAD03" strokeWidth="7" strokeMiterlimit="10"/>
                    <path d="M68.75 34.3877L42.5 65.6377L31.25 53.1377" stroke="#FEAD03" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <h2 className="font-lato text-2xl text-primary-default font-bold fade-in-delay-1 text-center">
                    You&apos;re All Caught Up! ✨
                  </h2>
                  <span className="font-lato text-base text-text text-center fade-in-delay-2">
                    No new notifications right now. When you start creating tasks and achieving goals, you&apos;ll see your progress updates here.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmClear && (
        <ConfirmationModal
          onClose={() => setConfirmClear(false)}
          title="Clear all notifications?"
          description="This permanently removes every notification. It cannot be undone."
          actions={[
            { label: "Cancel", onClick: () => setConfirmClear(false), variant: "secondary" },
            { label: "Clear all", onClick: onClear, variant: "danger" },
          ]}
        />
      )}
      <ToastHost controller={toast} />
    </MainLayout>
  );
}
