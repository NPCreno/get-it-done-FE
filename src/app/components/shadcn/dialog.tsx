"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogClose = DialogPrimitive.Close

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={className} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={className} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** Classes of the full-screen layer that holds the content (backdrop, centering, z-index). */
  overlayClassName?: string
  /** Portal target. Defaults to document.body. */
  container?: HTMLElement | null
  /** Props for the overlay layer (for example onClick). */
  overlayProps?: Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>, "className" | "children">
}

// The overlay wraps the content so the existing "backdrop is also the flex centering
// container" markup keeps working. Radix still dismisses on a press outside the
// content, so clicking the backdrop closes the dialog.
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, overlayClassName, container, overlayProps, children, onCloseAutoFocus, ...props }, ref) => {
  // These dialogs are controlled and have no <DialogTrigger>. Radix returns focus to the trigger on close,
  // which is null here, so remember the element that was focused when the dialog opened and restore it.
  const [opener] = React.useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null)
  )
  return (
    <DialogPrimitive.Portal container={container ?? undefined}>
      <DialogPrimitive.Overlay className={overlayClassName} {...overlayProps}>
        <DialogPrimitive.Content
          ref={ref}
          className={cn("outline-none", className)}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event)
            if (event.defaultPrevented) return
            event.preventDefault()
            if (opener && opener !== document.body && opener.isConnected) opener.focus()
          }}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle }
