'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

interface PointsBadgeProps {
  points: number
  className?: string
}

function AnimatedCounter({ value }: { value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString('de-DE'))
  const prevRef = useRef(0)

  useEffect(() => {
    const controls = animate(prevRef.current, value, {
      duration: 0.8,
      ease: 'easeOut' as const,
      onUpdate: (v) => count.set(v),
    })
    prevRef.current = value
    return controls.stop
  }, [value, count])

  return <motion.span>{rounded}</motion.span>
}

export function PointsBadge({ points, className = '' }: PointsBadgeProps) {
  return (
    <div
      className={[
        'inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-primary to-dark text-white font-semibold text-sm shadow-md',
        className,
      ].join(' ')}
    >
      <span>🏆</span>
      <AnimatedCounter value={points} />
      <span className="font-normal opacity-80 text-xs">Punkte</span>
    </div>
  )
}
