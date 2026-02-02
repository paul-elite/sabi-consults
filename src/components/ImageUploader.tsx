'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
}

export default function ImageUploader({ images, onChange, maxImages = 10 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await res.json()
      return data.url
    } catch (err) {
      console.error('Upload error:', err)
      return null
    }
  }

  const handleFiles = async (files: FileList | File[]) => {
    setError('')
    const fileArray = Array.from(files)

    // Check if adding these would exceed max
    if (images.length + fileArray.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    setUploading(true)

    const uploadPromises = fileArray.map(file => uploadFile(file))
    const results = await Promise.all(uploadPromises)

    const successfulUrls = results.filter((url): url is string => url !== null)

    if (successfulUrls.length < fileArray.length) {
      setError(`${fileArray.length - successfulUrls.length} image(s) failed to upload`)
    }

    if (successfulUrls.length > 0) {
      onChange([...images, ...successfulUrls])
    }

    setUploading(false)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [images])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const removeImage = async (index: number) => {
    const imageUrl = images[index]
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)

    // Optionally delete from storage (don't block UI)
    if (imageUrl.includes('supabase')) {
      fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      }).catch(console.error)
    }
  }

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex < 0 || newIndex >= images.length) return

    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]]
    onChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-[#0055CC] bg-blue-50'
            : 'border-neutral-300 hover:border-neutral-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleInputChange}
          className="hidden"
        />

        <svg className="w-10 h-10 mx-auto text-neutral-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>

        {uploading ? (
          <p className="text-sm text-neutral-500">Uploading...</p>
        ) : (
          <>
            <p className="text-sm text-neutral-600 mb-2">
              Drag and drop images here, or{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[#0055CC] font-medium hover:underline"
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-neutral-400">
              JPEG, PNG, WebP, or GIF. Max 5MB each. {images.length}/{maxImages} images.
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.map((url, index) => (
            <div key={url} className="relative group aspect-square bg-neutral-100">
              <Image
                src={url}
                alt={`Property image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />

              {/* First image badge */}
              {index === 0 && (
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#0055CC] text-white text-xs font-medium">
                  Main
                </span>
              )}

              {/* Controls overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, 'up')}
                    className="p-2 bg-white/90 hover:bg-white rounded-full"
                    title="Move left"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, 'down')}
                    className="p-2 bg-white/90 hover:bg-white rounded-full"
                    title="Move right"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* URL Input Fallback */}
      <details className="text-sm">
        <summary className="text-neutral-500 cursor-pointer hover:text-neutral-700">
          Or add image by URL
        </summary>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const input = e.currentTarget
                const url = input.value.trim()
                if (url && images.length < maxImages) {
                  onChange([...images, url])
                  input.value = ''
                }
              }
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement)
              const url = input.value.trim()
              if (url && images.length < maxImages) {
                onChange([...images, url])
                input.value = ''
              }
            }}
            className="px-4 py-2 bg-neutral-100 border border-neutral-200 text-sm hover:bg-neutral-200 transition-colors"
          >
            Add
          </button>
        </div>
      </details>
    </div>
  )
}
