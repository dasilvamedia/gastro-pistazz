'use client'

/**
 * Externer Link, der in der App NIE Safari oeffnet: nativ geht er in den
 * In-App-Browser, im Web in einen neuen Tab.
 */
import { isNativeApp, openWebsite } from '@/lib/nativeLinks'

export default function ExtLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => { if (isNativeApp()) { e.preventDefault(); openWebsite(href) } }}
      className={className}
    >
      {children}
    </a>
  )
}
