import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Editor } from '@tiptap/react'

// ---------------------------------------------------------------------------
// CSS injected once into the document head
// ---------------------------------------------------------------------------

const EDITOR_CSS = `
.scriberry-editor .ProseMirror {
  outline: none;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 17px;
  line-height: 1.85;
  color: #e8e3d5;
  min-height: 240px;
  word-break: break-word;
}
.scriberry-editor .ProseMirror h1 {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.25;
  color: #f2ede4;
  margin: 1.4em 0 0.4em;
  letter-spacing: -0.3px;
}
.scriberry-editor .ProseMirror h2 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
  color: #ebe6dc;
  margin: 1.1em 0 0.35em;
  letter-spacing: -0.2px;
}
.scriberry-editor .ProseMirror p {
  margin: 0 0 0.75em;
}
.scriberry-editor .ProseMirror p:last-child {
  margin-bottom: 0;
}
.scriberry-editor .ProseMirror strong {
  color: #f0ece4;
  font-weight: 700;
}
.scriberry-editor .ProseMirror em {
  color: #d4c8b4;
  font-style: italic;
}
.scriberry-editor .ProseMirror > *:first-child {
  margin-top: 0;
}
.scriberry-editor-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 17px;
  line-height: 1.85;
  color: #3a3632;
  user-select: none;
}
`

let cssInjected = false
function injectCss() {
  if (cssInjected) return
  cssInjected = true
  const el = document.createElement('style')
  el.textContent = EDITOR_CSS
  document.head.appendChild(el)
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

interface ToolbarBtnProps {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  title: string
}

function ToolbarBtn({ active, onClick, children, title }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => {
        e.preventDefault() // keep editor focus / selection
        onClick()
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 30,
        border: 'none',
        borderRadius: 6,
        background: active ? 'rgba(201,169,110,0.18)' : 'transparent',
        color: active ? '#c9a96e' : '#a09890',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 16,
        background: 'rgba(255,255,255,0.1)',
        margin: '0 2px',
        flexShrink: 0,
      }}
    />
  )
}

function FormatButtons({ editor }: { editor: Editor }) {
  return (
    <>
      <ToolbarBtn
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarBtn>
      <ToolbarBtn
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>I</em>
      </ToolbarBtn>
      <ToolbarDivider />
      <ToolbarBtn
        title="Heading 1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarBtn>
      <ToolbarBtn
        title="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarBtn>
      <ToolbarBtn
        title="Paragraph"
        active={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        ¶
      </ToolbarBtn>
    </>
  )
}

// ---------------------------------------------------------------------------
// Bubble toolbar — positioned via viewport coords, shown on text selection
// ---------------------------------------------------------------------------

function BubbleToolbar({
  editor,
  style,
}: {
  editor: Editor
  style: React.CSSProperties
}) {
  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 6px',
        background: '#1c1a18',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
      }}
    >
      <FormatButtons editor={editor} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RichEditorProps {
  initialContent?: string | null
  onChange?: (json: string) => void
  onEditorReady?: (editor: Editor) => void
  placeholder?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RichEditor({
  initialContent,
  onChange,
  onEditorReady,
  placeholder = 'Write anything…',
}: RichEditorProps) {
  const onEditorReadyRef = useRef(onEditorReady)
  onEditorReadyRef.current = onEditorReady

  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null)
  // Track current editor instance for event listeners
  const editorInstanceRef = useRef<Editor | null>(null)

  useEffect(() => {
    injectCss()
  }, [])

  const parsedInitial = (() => {
    if (!initialContent) return undefined
    try {
      return JSON.parse(initialContent)
    } catch {
      return initialContent
    }
  })()

  const editor = useEditor({
    extensions: [StarterKit],
    content: parsedInitial,
    editorProps: { attributes: { class: 'scriberry-editor-inner' } },
    onUpdate({ editor: e }) {
      onChange?.(JSON.stringify(e.getJSON()))
    },
    onCreate({ editor: e }) {
      onEditorReadyRef.current?.(e)
      editorInstanceRef.current = e
    },
  })

  useEffect(() => {
    if (editor) {
      onEditorReadyRef.current?.(editor)
      editorInstanceRef.current = editor
    }
  }, [editor])

  // ---- Selection tracking for bubble toolbar ----
  useEffect(() => {
    if (!editor) return

    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection
      if (from === to) {
        setBubblePos(null)
        return
      }
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) {
        setBubblePos(null)
        return
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      if (rect.width === 0) {
        setBubblePos(null)
        return
      }
      // Position above the selection centre; clamped to viewport
      const left = Math.max(80, Math.min(window.innerWidth - 80, rect.left + rect.width / 2))
      const top = Math.max(8, rect.top - 48)
      setBubblePos({ top, left })
    }

    editor.on('selectionUpdate', onSelectionUpdate)
    editor.on('blur', () => setBubblePos(null))

    return () => {
      editor.off('selectionUpdate', onSelectionUpdate)
      editor.off('blur', () => setBubblePos(null))
    }
  }, [editor])

  const isEmpty = !editor || editor.isEmpty

  return (
    <>
      {/* Desktop bubble toolbar — fixed, appears above selection */}
      {editor && bubblePos && (
        <div
          className="scriberry-bubble-hide-mobile"
          style={{ position: 'fixed', top: bubblePos.top, left: bubblePos.left, zIndex: 200 }}
        >
          <BubbleToolbar editor={editor} style={{}} />
        </div>
      )}

      {/* Editor surface */}
      <div className="scriberry-editor" style={{ position: 'relative' }}>
        {isEmpty && (
          <div className="scriberry-editor-placeholder" aria-hidden>
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Mobile pinned bottom toolbar */}
      {editor && (
        <div
          className="scriberry-mobile-toolbar"
          style={{
            display: 'none',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '8px 12px',
            paddingBottom: 'env(safe-area-inset-bottom, 8px)',
            background: 'rgba(18,16,14,0.95)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <FormatButtons editor={editor} />
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .scriberry-mobile-toolbar { display: flex !important; }
          .scriberry-bubble-hide-mobile { display: none !important; }
        }
      `}</style>
    </>
  )
}
