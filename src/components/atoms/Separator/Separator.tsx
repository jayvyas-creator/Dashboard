import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/lib/utils'

interface SeparatorProps extends SeparatorPrimitive.SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

/**
 * The canvas for this component is at tempo/designs/design-system/layout-primitives/index.canvas.tsx.
 * If you adjust this component in any way, ensure the canvas and its asset
 * declaration stay consistent.
 */
export function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
  ...rest
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      decorative={decorative}
      className={cn(
        'shrink-0 border-none bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...rest}
    />
  )
}

