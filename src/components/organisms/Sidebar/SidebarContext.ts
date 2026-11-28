import { createContext, useContext } from 'react'

export type SidebarState = 'expanded' | 'collapsed'

export interface SidebarContextValue {
  /** `'expanded'` while `open` is true, `'collapsed'` otherwise. Mirrors shadcn's `useSidebar().state`. */
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  /** Whether the mobile Sheet variant of the sidebar is open. */
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  /** True under the mobile breakpoint — the Sidebar renders as a Sheet instead of a fixed panel. */
  isMobile: boolean
  /** Toggles `open` on desktop, `openMobile` on mobile. Bound to Cmd/Ctrl+B by SidebarProvider. */
  toggleSidebar: () => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

/**
 * Reads the Sidebar's shared state. Must be called from a descendant of SidebarProvider —
 * throws otherwise, matching shadcn's own `useSidebar` contract.
 */
export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.')
  }
  return context
}

export const SIDEBAR_COOKIE_NAME = 'sidebar_state'
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = '16rem'
export const SIDEBAR_WIDTH_MOBILE = '18rem'
export const SIDEBAR_WIDTH_ICON = '3rem'
export const SIDEBAR_KEYBOARD_SHORTCUT = 'b'
