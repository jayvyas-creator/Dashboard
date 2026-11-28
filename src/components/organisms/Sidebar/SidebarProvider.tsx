'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
  SidebarContext,
  type SidebarContextValue,
} from './SidebarContext'
import styles from './Sidebar.module.css'

const MOBILE_BREAKPOINT = 768

/**
 * Local to the Sidebar kit on purpose — not exported from the barrel. Tracks whether the
 * viewport is under the mobile breakpoint so Sidebar can switch to its Sheet variant.
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    mql.addEventListener('change', onChange)
    onChange()
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

interface SidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
  /** Initial `open` state when uncontrolled. @default true */
  defaultOpen?: boolean
  /** Controlled `open` state. Pair with `onOpenChange`. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

/**
 * Root provider for the Sidebar kit — owns expanded/collapsed + mobile-sheet state, persists
 * the desktop state to a cookie so the next page load restores it, and binds Cmd/Ctrl+B to
 * toggleSidebar. Wrap the whole app-shell layout (Sidebar + SidebarInset) in one of these.
 *
 * The canvas for this component is at tempo/designs/design-system/app-shell/index.canvas.tsx.
 * If you adjust this component in any way, ensure the canvas and its asset
 * declaration stay consistent.
 */
export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...rest
}: SidebarProviderProps) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = useState(false)
  const [internalOpen, setInternalOpen] = useState(defaultOpen)

  const open = openProp ?? internalOpen

  const setOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value)
      } else {
        setInternalOpen(value)
      }

      if (typeof document !== 'undefined') {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      }
    },
    [onOpenChange],
  )

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value)
    } else {
      setOpen(!open)
    }
  }, [isMobile, open, setOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  const state: SidebarContextValue['state'] = open ? 'expanded' : 'collapsed'

  const contextValue = useMemo<SidebarContextValue>(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
            '--sidebar-width-mobile': SIDEBAR_WIDTH_MOBILE,
            ...style,
          } as CSSProperties
        }
        className={[styles.wrapper, className].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

