import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import styles from './Tooltip.module.css'

interface TooltipProps extends TooltipPrimitive.TooltipProps {
  /** Delay (ms) before the tooltip appears, forwarded to an internal Provider. */
  delayDuration?: number
}

/**
 * Self-contained — wraps its own Radix Provider so each usage works without an
 * app-level TooltipProvider ancestor.
 *
 * The canvas for this component is at tempo/designs/design-system/feedback-toggles/index.canvas.tsx.
 * If you adjust this component in any way, ensure the canvas and its asset
 * declaration stay consistent.
 */
export function Tooltip({ delayDuration = 0, ...rest }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root {...rest} />
    </TooltipPrimitive.Provider>
  )
}

export const TooltipTrigger = TooltipPrimitive.Trigger

interface TooltipContentProps extends TooltipPrimitive.TooltipContentProps {
  className?: string
}

export function TooltipContent({
  className,
  children,
  side = 'top',
  sideOffset = 6,
  ...rest
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={[styles.content, className].filter(Boolean).join(' ')}
        side={side}
        sideOffset={sideOffset}
        {...rest}
      >
        {children}
        <TooltipPrimitive.Arrow className={styles.arrow} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

