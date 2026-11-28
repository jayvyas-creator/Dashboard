import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import styles from './Sheet.module.css'

/**
 * The canvas for this component is at tempo/designs/design-system/overlays-dialogs/index.canvas.tsx.
 * If you adjust this component in any way, ensure the canvas and its asset
 * declaration stay consistent.
 */
export const Sheet = DialogPrimitive.Root

export const SheetTrigger = DialogPrimitive.Trigger

export type SheetSide = 'top' | 'right' | 'bottom' | 'left'

interface SheetContentProps extends DialogPrimitive.DialogContentProps {
  className?: string
  /** Edge the panel slides in from. @default 'right' */
  side?: SheetSide
}

export function SheetContent({ className, side = 'right', children, ...rest }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={styles.overlay} />
      <DialogPrimitive.Content
        className={[styles.content, styles[side], className].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
        <DialogPrimitive.Close className={styles.close} aria-label="Close">
          <X size={16} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

interface SheetSectionProps extends HTMLAttributes<HTMLDivElement> {}

export function SheetHeader({ className, ...rest }: SheetSectionProps) {
  return <div className={[styles.header, className].filter(Boolean).join(' ')} {...rest} />
}

export function SheetFooter({ className, ...rest }: SheetSectionProps) {
  return <div className={[styles.footer, className].filter(Boolean).join(' ')} {...rest} />
}

interface SheetTitleProps extends DialogPrimitive.DialogTitleProps {
  className?: string
}

export function SheetTitle({ className, ...rest }: SheetTitleProps) {
  return <DialogPrimitive.Title className={[styles.title, className].filter(Boolean).join(' ')} {...rest} />
}

interface SheetDescriptionProps extends DialogPrimitive.DialogDescriptionProps {
  className?: string
}

export function SheetDescription({ className, ...rest }: SheetDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={[styles.description, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

