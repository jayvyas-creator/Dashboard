import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marks the input as invalid. Equivalent to `aria-invalid`, kept as a dedicated prop for convenience. */
  invalid?: boolean
}

/**
 * The canvas for this component is at tempo/designs/design-system/form-inputs-text/index.canvas.tsx.
 * If you adjust this component in any way, ensure the canvas and its asset
 * declaration stay consistent.
 */
export function Input({ invalid = false, className, ...rest }: InputProps) {
  const { 'aria-invalid': ariaInvalidProp, ...inputRest } = rest
  const isInvalid = invalid || ariaInvalidProp === true || ariaInvalidProp === 'true'

  return (
    <input
      aria-invalid={isInvalid || undefined}
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25',
        className,
      )}
      {...inputRest}
    />
  )
}

