'use client'

import { PanelLeft } from 'lucide-react'
import type { ComponentPropsWithoutRef, HTMLAttributes } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Separator } from '@/components/atoms/Separator'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/molecules/Sheet'
import { useSidebar } from './SidebarContext'
import styles from './Sidebar.module.css'

export type SidebarSide = 'left' | 'right'
export type SidebarVariant = 'sidebar' | 'floating' | 'inset'
export type SidebarCollapsible = 'offcanvas' | 'icon' | 'none'

interface SidebarProps extends HTMLAttributes<HTMLDivElement> {
  /** Which edge of the viewport the panel is anchored to. @default 'left' */
  side?: SidebarSide
  /** `'sidebar'` sits flush against the edge; `'floating'`/`'inset'` add padding and a rounded panel. @default 'sidebar' */
  variant?: SidebarVariant
  /** `'offcanvas'` slides fully off-screen, `'icon'` shrinks to an icon rail, `'none'` never collapses. @default 'offcanvas' */
  collapsible?: SidebarCollapsible
}

/**
 * The collapsible app-shell navigation panel. Composes SidebarHeader/SidebarContent/
 * SidebarFooter (and, inside those, SidebarGroup/SidebarMenu) between its children. Must be
 * rendered inside a SidebarProvider — on mobile it automatically renders as a Sheet instead
 * of the fixed desktop panel. Pair with SidebarInset for the main content area, and
 * SidebarTrigger/SidebarRail to toggle it.
 *
 * The canvas for this component is at tempo/designs/design-system/app-shell/index.canvas.tsx.
 * If you adjust this component in any way, ensure the canvas and its asset
 * declaration stay consistent.
 */
export function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...rest
}: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        className={[styles.sidebarStatic, className].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          side={side}
          className={styles.sidebarMobileContent}
        >
          <SheetTitle className={styles.srOnly}>Sidebar</SheetTitle>
          <SheetDescription className={styles.srOnly}>Displays the mobile sidebar.</SheetDescription>
          <div className={styles.sidebarMobileInner}>{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={styles.root}
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      <div className={styles.gap} data-slot="sidebar-gap" />
      <div
        data-slot="sidebar-container"
        className={[styles.container, className].filter(Boolean).join(' ')}
        {...rest}
      >
        <div data-sidebar="sidebar" data-slot="sidebar-inner" className={styles.inner}>
          {children}
        </div>
      </div>
    </div>
  )
}

interface SidebarTriggerProps extends ComponentPropsWithoutRef<typeof Button> {}

/**
 * A ghost icon Button that calls `toggleSidebar()`. Place it anywhere inside the
 * SidebarProvider tree — typically in the page header, outside the Sidebar itself.
 *
 * The canvas for this component is at tempo/designs/design-system/app-shell/index.canvas.tsx.
 */
export function SidebarTrigger({ className, onClick, ...rest }: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={[styles.trigger, className].filter(Boolean).join(' ')}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...rest}
    >
      <PanelLeft size={16} />
      <span className={styles.srOnly}>Toggle Sidebar</span>
    </Button>
  )
}

/**
 * A thin invisible strip along the Sidebar's edge that also toggles it on click — lets users
 * grab the boundary between the sidebar and the content to open/close it, desktop only.
 */
export function SidebarRail({ className, ...rest }: ComponentPropsWithoutRef<'button'>) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      type="button"
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      title="Toggle Sidebar"
      onClick={toggleSidebar}
      className={[styles.rail, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/**
 * The main-content region that sits beside the Sidebar. Required when `variant="inset"`;
 * recommended in every layout so content gets the right offset/rounding next to the panel.
 * Renders a `<main>`.
 */
export function SidebarInset({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={[styles.inset, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/** An Input styled to sit inside the Sidebar (e.g. a nav search field). Sub-part — not a top-level asset. */
export function SidebarInput({ className, ...rest }: ComponentPropsWithoutRef<typeof Input>) {
  return (
    <Input
      data-sidebar="input"
      data-slot="sidebar-input"
      className={[styles.input, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/** A Separator styled to sit inside the Sidebar, between groups or around the header/footer. */
export function SidebarSeparator({ className, ...rest }: ComponentPropsWithoutRef<typeof Separator>) {
  return (
    <Separator
      data-sidebar="separator"
      data-slot="sidebar-separator"
      className={[styles.separator, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/** Sticky area at the top of the Sidebar — typically a team/account switcher or logo. */
export function SidebarHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="header"
      data-slot="sidebar-header"
      className={[styles.header, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/** Sticky area at the bottom of the Sidebar — typically a user menu. */
export function SidebarFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="footer"
      data-slot="sidebar-footer"
      className={[styles.footer, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/** The scrollable middle region of the Sidebar — wrap SidebarGroup(s) in this. */
export function SidebarContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="content"
      data-slot="sidebar-content"
      className={[styles.content, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

