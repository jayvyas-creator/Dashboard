import { Slot } from '@radix-ui/react-slot'
import type { HTMLAttributes } from 'react'
import styles from './Sidebar.module.css'

/** A labeled section inside SidebarContent — wrap one or more SidebarMenu lists in this. */
export function SidebarGroup({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="group"
      data-slot="sidebar-group"
      className={[styles.group, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

interface SidebarGroupLabelProps extends HTMLAttributes<HTMLDivElement> {
  /** Render as the passed single child element instead of a div — e.g. a disclosure trigger. */
  asChild?: boolean
}

/** The small heading above a SidebarGroup's content. Fades out when the sidebar collapses to icons. */
export function SidebarGroupLabel({ className, asChild, ...rest }: SidebarGroupLabelProps) {
  const Comp = asChild ? Slot : 'div'
  return (
    <Comp
      data-sidebar="group-label"
      data-slot="sidebar-group-label"
      className={[styles.groupLabel, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

interface SidebarGroupActionProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

/** A small icon-button pinned to the top-right of a SidebarGroup — e.g. an "add item" action. */
export function SidebarGroupAction({ className, asChild, ...rest }: SidebarGroupActionProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      data-sidebar="group-action"
      data-slot="sidebar-group-action"
      className={[styles.groupAction, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/** Wraps a SidebarGroup's body content, typically a SidebarMenu. */
export function SidebarGroupContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      className={[styles.groupContent, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
