import { Slot } from '@radix-ui/react-slot'
import { useMemo, type ComponentPropsWithoutRef, type HTMLAttributes } from 'react'
import { Skeleton } from '@/components/atoms/Skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/molecules/Tooltip'
import { useSidebar } from './SidebarContext'
import styles from './Sidebar.module.css'

/** An unordered list of SidebarMenuItems — the primary nav list inside a SidebarGroupContent. */
export function SidebarMenu({ className, ...rest }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      data-sidebar="menu"
      data-slot="sidebar-menu"
      className={[styles.menu, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/** One row in a SidebarMenu — wraps a SidebarMenuButton and optionally a SidebarMenuAction/Badge/Sub. */
export function SidebarMenuItem({ className, ...rest }: HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      className={[styles.menuItem, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

type SidebarMenuButtonVariant = 'default' | 'outline'
type SidebarMenuButtonSize = 'default' | 'sm' | 'lg'

interface SidebarMenuButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** Render as the passed single child (e.g. a Next.js `<Link>`) instead of a `<button>`. */
  asChild?: boolean
  /** Highlights the button as the current nav item. */
  isActive?: boolean
  variant?: SidebarMenuButtonVariant
  size?: SidebarMenuButtonSize
  /** Shown as a Tooltip, but only while the sidebar is collapsed to icons on desktop. */
  tooltip?: string | ComponentPropsWithoutRef<typeof TooltipContent>
}

/**
 * The clickable nav-item button inside a SidebarMenuItem. Pass `asChild` to render your own
 * link element instead, and `tooltip` to surface the label when the sidebar collapses to icons.
 */
export function SidebarMenuButton({
  asChild,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...rest
}: SidebarMenuButtonProps) {
  const { isMobile, state } = useSidebar()
  const Comp = asChild ? Slot : 'button'

  const button = (
    <Comp
      type={asChild ? undefined : 'button'}
      data-sidebar="menu-button"
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={[
        styles.menuButton,
        variant === 'outline' && styles.menuButtonOutline,
        size === 'sm' && styles.menuButtonSm,
        size === 'lg' && styles.menuButtonLg,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )

  if (!tooltip) {
    return button
  }

  const tooltipProps = typeof tooltip === 'string' ? { children: tooltip } : tooltip

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      {state === 'collapsed' && !isMobile ? (
        <TooltipContent side="right" align="center" {...tooltipProps} />
      ) : null}
    </Tooltip>
  )
}

interface SidebarMenuActionProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  /** Only visible on hover/focus of the parent SidebarMenuItem, instead of always-visible. */
  showOnHover?: boolean
}

/** A small icon-button pinned to the top-right of a SidebarMenuItem — e.g. a row-level overflow menu. */
export function SidebarMenuAction({ asChild, showOnHover, className, ...rest }: SidebarMenuActionProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      className={[styles.menuAction, showOnHover && styles.menuActionShowOnHover, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )
}

/** A small count/status badge pinned to the right edge of a SidebarMenuItem. */
export function SidebarMenuBadge({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      className={[styles.menuBadge, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

interface SidebarMenuSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Render a leading icon-shaped Skeleton alongside the text one. @default false */
  showIcon?: boolean
}

/** A loading placeholder for a SidebarMenuItem, built from the Skeleton atom. */
export function SidebarMenuSkeleton({ className, showIcon = false, ...rest }: SidebarMenuSkeletonProps) {
  const width = useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, [])

  return (
    <div
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      className={[styles.menuSkeleton, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {showIcon ? <Skeleton className={styles.menuSkeletonIcon} style={{ width: '1rem', height: '1rem' }} /> : null}
      <Skeleton className={styles.menuSkeletonText} style={{ width }} />
    </div>
  )
}

/** Nested sub-items under a SidebarMenuItem, indented and rail-connected. Hidden when collapsed to icons. */
export function SidebarMenuSub({ className, ...rest }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      className={[styles.menuSub, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/** One row inside a SidebarMenuSub. */
export function SidebarMenuSubItem({ className, ...rest }: HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      className={[styles.menuSubItem, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

interface SidebarMenuSubButtonProps extends ComponentPropsWithoutRef<'a'> {
  asChild?: boolean
  size?: 'sm' | 'md'
  isActive?: boolean
}

/** The clickable link inside a SidebarMenuSubItem. Renders an `<a>` by default; pass `asChild` for a real router Link. */
export function SidebarMenuSubButton({
  asChild,
  size = 'md',
  isActive = false,
  className,
  ...rest
}: SidebarMenuSubButtonProps) {
  const Comp = asChild ? Slot : 'a'
  return (
    <Comp
      data-sidebar="menu-sub-button"
      data-slot="sidebar-menu-sub-button"
      data-active={isActive}
      className={[styles.menuSubButton, size === 'sm' ? styles.menuSubButtonSm : styles.menuSubButtonMd, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )
}
