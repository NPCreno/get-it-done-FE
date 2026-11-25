"use client";
import { useFormState } from "@/app/context/FormProvider";
import { Dialog } from "@/app/components/shadcn/dialog";
import { pomodoroStyleOf } from "@/lib/pomodoroStyle";
import ConfirmationModal from "./confirmation";
import DialTimer from "../pomodoro/DialTimer";
import TicketTimer from "../pomodoro/TicketTimer";
import HorizonTimer from "../pomodoro/HorizonTimer";
import { usePomodoroController } from "../pomodoro/usePomodoroController";

interface PomodoroModalProps {
  onClose: () => void;
}

const FACES = { dial: DialTimer, ticket: TicketTimer, horizon: HorizonTimer } as const;

const titleCase = (type: string) => type.replace(/^\w/, (c) => c.toUpperCase());

/**
 * The Pomodoro timer dialog. FEAT-10: the behaviour lives in `usePomodoroController`; the face is
 * the user's style from `pomodoroStyleOf(userData)` (the dial when none is set, and always in
 * `/demo`). The style is read from context, never from `useProfile` (this is shared with `/demo`).
 */
export default function PomodoroModal({ onClose }: PomodoroModalProps) {
  const { userData } = useFormState();
  const ctl = usePomodoroController();
  const Face = FACES[pomodoroStyleOf(userData)];
  const pending = ctl.confirm.pending;

  return (
    <>
      {pending && (
        <ConfirmationModal
          onClose={ctl.confirm.cancel}
          title={`Switch to ${titleCase(pending)}?`}
          description={`Switching to ${titleCase(pending)} mode will reset the timer.`}
          actions={[
            { label: "Cancel", onClick: ctl.confirm.cancel, variant: "secondary" },
            { label: "Switch", onClick: ctl.confirm.accept, variant: "primary" },
          ]}
        />
      )}
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <Face ctl={ctl} dark={userData?.theme === "dark"} />
      </Dialog>
    </>
  );
}
