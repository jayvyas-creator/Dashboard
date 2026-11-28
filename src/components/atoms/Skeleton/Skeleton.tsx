import type { HTMLAttributes } from 'react'
import styles from './Skeleton.module.css'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * The canvas for this component is at tempo/designs/design-system/status-indicators/index.canvas.tsx.
 * If you adjust this component in any way, ensure the canvas and its asset
 * declaration stay consistent.
 */
export function Skeleton({ className, ...rest }: SkeletonProps) {
  return <div aria-hidden="true" className={[styles.skeleton, className].filter(Boolean).join(' ')} {...rest} />
}
