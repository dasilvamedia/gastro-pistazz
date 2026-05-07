'use client'

import { useRef, useState, DragEvent } from 'react'
import { Upload, X, ImageIcon, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const MAX_MB = 20
const MAX_BYTES = MAX_MB * 1024 * 1024

interface Props {
  /** Storage path inside the bucket, e.g. "{restaurantId}/logo" */
  storagePath: string
  value: string | null
  onChange: (url: string | null) => void
  /** Called after a successful upload — use to persist url to DB */
  onSaved?: (url: string) => void
  label?: string
  hint?: string
  /** 'contain' keeps full image visible (logos, deals). 'cover' fills the frame (banners). */
  fit?: 'contain' | 'cover'
  /** Aspect ratio class e.g. "aspect-square" "aspect-video" "aspect-[3/1]" */
  aspectClass?: string
  className?: string
}

export default function ImageUploader({
  storagePath,
  value,
  onChange,
  onSaved,
  label,
  hint,
  fit = 'contain',
  aspectClass = 'aspect-square',
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (file: File) => {
    // Client-side type check
    if (!file.type.startsWith('image/')) {
      toast.error('Nur Bilddateien erlaubt (JPG, PNG, WebP)')
      return
    }
    // Client-side size check
    if (file.size > MAX_BYTES) {
      toast.error(`Datei zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximal ${MAX_MB} MB erlaubt.`)
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('path', storagePath)

      // Simulate progress (XHR would give real progress; fetch doesn't)
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 85))
      }, 150)

      const res = await fetch('/api/dashboard/upload', { method: 'POST', body: fd })
      clearInterval(progressInterval)
      setProgress(100)

      const json = await res.json()

      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Upload fehlgeschlagen')
        setUploading(false)
        setProgress(0)
        return
      }

      onChange(json.url)
      onSaved?.(json.url)
    } catch (err) {
      console.error('[ImageUploader]', err)
      toast.error('Netzwerkfehler beim Upload')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[#1C1F1A]">{label}</label>
      )}

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          'relative w-full rounded-2xl overflow-hidden cursor-pointer',
          'border-2 transition-all duration-200',
          aspectClass,
          dragging
            ? 'border-[#8BB06A] bg-[#8BB06A]/5 scale-[1.01]'
            : value
              ? 'border-transparent hover:border-[#8BB06A]/40'
              : 'border-dashed border-gray-200 bg-gray-50/50 hover:border-[#8BB06A] hover:bg-[#8BB06A]/5',
        ].join(' ')}
      >
        {/* Preview image */}
        {value && (
          <img
            src={value}
            alt={label ?? 'Bild'}
            className={`w-full h-full transition-opacity duration-300 ${uploading ? 'opacity-30' : 'opacity-100'}`}
            style={{ objectFit: fit }}
          />
        )}

        {/* Empty state */}
        {!value && !uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <div className="w-10 h-10 rounded-xl bg-[#8BB06A]/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[#8BB06A]" />
            </div>
            <p className="text-xs font-medium text-gray-400 text-center leading-snug">
              Klicken oder Bild hierher ziehen
            </p>
            <p className="text-[11px] text-gray-300 text-center">
              {hint ?? `JPG, PNG, WebP · max. ${MAX_MB} MB`}
            </p>
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
            {/* Ring progress */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <circle
                  cx="22" cy="22" r="18" fill="none"
                  stroke="#8BB06A" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-150"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#8BB06A]">
                {progress}%
              </span>
            </div>
            <p className="text-xs font-medium text-[#8BB06A]">Wird hochgeladen…</p>
          </div>
        )}

        {/* Hover "replace" overlay on existing image */}
        {value && !uploading && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-[#1C1F1A] text-xs font-semibold shadow-lg">
              <Upload className="w-3 h-3" />
              Ersetzen
            </div>
          </div>
        )}

        {/* Progress bar at bottom */}
        {uploading && progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50">
            <div
              className="h-full bg-[#8BB06A] transition-all duration-150 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      {value && !uploading && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange(null) }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#E86B5A] transition-colors"
        >
          <X className="w-3 h-3" />
          Bild entfernen
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  )
}
