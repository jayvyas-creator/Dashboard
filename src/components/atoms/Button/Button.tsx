import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[color,background-color,border-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 text-base has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 text-sm has-[>svg]:px-2.5',
        lg: 'h-10 px-5 text-lg has-[>svg]:px-4',
        icon: 'aspect-square p-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Rendered before `children`. */
  icon?: ReactNode
  /** Render as the single child element (via Radix Slot) instead of a `<button>`. */
  asChild?: boolean
}

/**
 * The canvas for this component is at tempo/designs/design-system/buttons/index.canvas.tsx.
 * If you adjust this component in any way, ensure the canvas and its asset
 * declaration stay consistent.
 */
export function Button({
  variant = 'default',
  size = 'default',
  type = 'button',
  icon,
  className,
  children,
  asChild = false,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className, 'h-max py-2')}
      {...rest}
    >
      {icon}
      {children}
    </Comp>
  )
}

