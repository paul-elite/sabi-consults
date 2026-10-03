'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Image01Icon, Link01Icon, ListSettingIcon, ListViewIcon, QuoteDownIcon, TextAlignCenterIcon, TextAlignLeftIcon, TextBoldIcon, TextItalicIcon, TextUnderlineIcon } from '@hugeicons/core-free-icons'

import { useRef, useCallback } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }, [execCommand])

  const insertImage = useCallback(() => {
    const url = prompt('Enter image URL:')
    if (url) {
      execCommand('insertImage', url)
    }
  }, [execCommand])

  return (
    <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-neutral-200 bg-neutral-50">
        {/* Text formatting */}
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-200">
          <button
            type="button"
            onClick={() => execCommand('bold')}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Bold"
          >
            <HugeiconsIcon icon={TextBoldIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Italic"
          >
            <HugeiconsIcon icon={TextItalicIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('underline')}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Underline"
          >
            <HugeiconsIcon icon={TextUnderlineIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-200">
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h2')}
            className="rounded-lg px-2 py-1 text-sm font-medium hover:bg-neutral-200 transition-colors"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h3')}
            className="rounded-lg px-2 py-1 text-sm font-medium hover:bg-neutral-200 transition-colors"
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'h4')}
            className="rounded-lg px-2 py-1 text-sm font-medium hover:bg-neutral-200 transition-colors"
            title="Heading 4"
          >
            H4
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'p')}
            className="rounded-lg px-2 py-1 text-sm hover:bg-neutral-200 transition-colors"
            title="Paragraph"
          >
            P
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-200">
          <button
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Bullet List"
          >
            <HugeiconsIcon icon={ListViewIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Numbered List"
          >
            <HugeiconsIcon icon={ListSettingIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>

        {/* Links & Media */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={insertLink}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Insert Link"
          >
            <HugeiconsIcon icon={Link01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={insertImage}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Insert Image"
          >
            <HugeiconsIcon icon={Image01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('formatBlock', 'blockquote')}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Quote"
          >
            <HugeiconsIcon icon={QuoteDownIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 pl-2 border-l border-neutral-200">
          <button
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Align Left"
          >
            <HugeiconsIcon icon={TextAlignLeftIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="rounded-lg p-2 hover:bg-neutral-200 transition-colors"
            title="Align Center"
          >
            <HugeiconsIcon icon={TextAlignCenterIcon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[400px] p-4 focus:outline-none prose prose-sm max-w-none prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-a:text-brand prose-img:max-w-full prose-img:h-auto"
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
