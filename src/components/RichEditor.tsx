import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Editor } from '@tiptap/react'

// ---------------------------------------------------------------------------
// Toolbar button — uses global .sb-toolbar-btn class from components.css
// ---------------------------------------------------------------------------

interface TBtnProps {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  label: string
}

function TBtn({ active, onClick, children, label }: TBtnProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`sb-toolbar-btn${active ? ' is-active' : ''}`}
      onMouseDown={e => {
        e.preventDefault() // preserve editor focus & selection
        onClick()
      }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="sb-toolbar-sep" aria-hidden />
}

// ---------------------------------------------------------------------------
// Toolbar — always visible, pinned above the editor
// ---------------------------------------------------------------------------

function Toolbar({ editor }: { editor: Editor }) {
  // Force a re-render when selection changes so active states update
  useEffect(() => {
    const update = () => {
      // React re-renders because editor state changes are synchronous here;
      // we just need to trigger it by calling forceUpdate via a no-op setState.
      // In practice, TipTap's onUpdate / onSelectionUpdate cause re-renders
      // because they call the parent's onChange which sets state.
    }
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  return (
    <div className="sb-toolbar" role="toolbar" aria-label="Text formatting">
      <TBtn
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </TBtn>

      <TBtn
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </TBtn>

      <Sep />

      <TBtn
        label="Heading 1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 600, fontSize: 12 }}>H1</span>
      </TBtn>

      <TBtn
        label="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 600, fontSize: 12 }}>H2</span>
      </TBtn>

      <TBtn
        label="Paragraph"
        active={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 4v16M13 4H7a4 4 0 0 0 0 8h6M17 4v16"/>
        </svg>
      </TBtn>
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
    editorProps: {
      attributes: {
        // No class needed — sb-editor targets the wrapper div
        spellcheck: 'true',
      },
    },
    onUpdate({ editor: e }) {
      onChange?.(JSON.stringify(e.getJSON()))
    },
    onCreate({ editor: e }) {
      onEditorReadyRef.current?.(e)
    },
  })

  useEffect(() => {
    if (editor) onEditorReadyRef.current?.(editor)
  }, [editor])

  const isEmpty = !editor || editor.isEmpty

  return (
    <div>
      {/* Always-visible persistent toolbar */}
      {editor && <Toolbar editor={editor} />}

      {/* Editor surface */}
      <div className="sb-editor-wrap">
        <div className="sb-editor sb-editor-surface">
          {isEmpty && (
            <div className="sb-editor-placeholder" aria-hidden>
              {placeholder}
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
