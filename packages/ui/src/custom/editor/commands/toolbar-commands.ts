import AlighJustify from '@lucide/svelte/icons/align-justify';
import AlignCenter from '@lucide/svelte/icons/align-center';
import AlignLeft from '@lucide/svelte/icons/align-left';
import AlignRight from '@lucide/svelte/icons/align-right';
import Audio from '@lucide/svelte/icons/audio-lines';
import Bold from '@lucide/svelte/icons/bold';
import Code from '@lucide/svelte/icons/code';
import type { EdraToolBarCommands } from './types';
import Heading1 from '@lucide/svelte/icons/heading-1';
import Heading2 from '@lucide/svelte/icons/heading-2';
import Heading3 from '@lucide/svelte/icons/heading-3';
import Heading4 from '@lucide/svelte/icons/heading-4';
import IFrame from '@lucide/svelte/icons/code-xml';
import Image from '@lucide/svelte/icons/image';
import Italic from '@lucide/svelte/icons/italic';
import Link from '@lucide/svelte/icons/link-2';
import List from '@lucide/svelte/icons/list';
import ListChecks from '@lucide/svelte/icons/list-checks';
import ListOrdered from '@lucide/svelte/icons/list-ordered';
import Quote from '@lucide/svelte/icons/quote';
import Redo from '@lucide/svelte/icons/redo-2';
import StrikeThrough from '@lucide/svelte/icons/strikethrough';
import Subscript from '@lucide/svelte/icons/subscript';
import Superscript from '@lucide/svelte/icons/superscript';
import Table from '@lucide/svelte/icons/table';
import Underline from '@lucide/svelte/icons/underline';
import Undo from '@lucide/svelte/icons/undo-2';
import Video from '@lucide/svelte/icons/video';
import Radical from '@lucide/svelte/icons/radical';
import SquareRadical from '@lucide/svelte/icons/square-radical';
import { isTextSelection } from '@tiptap/core';
import Pilcrow from '@lucide/svelte/icons/pilcrow';
import { isMac } from '../utils';
import { uiLabels } from '../../../tools';

const commands: Record<string, EdraToolBarCommands[]> = {
  'undo-redo': [
    {
      icon: Undo,
      name: 'undo',
      get tooltip() {
        return uiLabels.editor_undo;
      },
      shortCut: `${isMac ? '⌘' : 'Ctrl+'}Z`,
      onClick: (editor) => {
        editor.chain().focus().undo().run();
      },
      clickable: (editor) => {
        return editor.can().undo();
      }
    },
    {
      icon: Redo,
      name: 'redo',
      get tooltip() {
        return uiLabels.editor_redo;
      },
      shortCut: `${isMac ? '⌘' : 'Ctrl+'}Y`,
      onClick: (editor) => {
        editor.chain().focus().redo().run();
      },
      clickable: (editor) => {
        return editor.can().redo();
      }
    }
  ],
  headings: [
    {
      icon: Heading1,
      name: 'h1',
      get tooltip() {
        return uiLabels.editor_heading_1;
      },
      shortCut: `${isMac ? '⌘⌥' : 'Ctrl+Alt+'}1`,
      onClick: (editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).setHeading({ level: 1 }).run();
      },
      clickable: (editor) => {
        return editor.can().toggleHeading({ level: 1 });
      },
      isActive: (editor) => {
        return editor.isActive('heading', { level: 1 });
      }
    },
    {
      icon: Heading2,
      name: 'h2',
      get tooltip() {
        return uiLabels.editor_heading_2;
      },
      shortCut: `${isMac ? '⌘⌥' : 'Ctrl+Alt+'}2`,
      onClick: (editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).setHeading({ level: 2 }).run();
      },
      clickable: (editor) => {
        return editor.can().toggleHeading({ level: 2 });
      },
      isActive: (editor) => {
        return editor.isActive('heading', { level: 2 });
      }
    },
    {
      icon: Heading3,
      name: 'h3',
      get tooltip() {
        return uiLabels.editor_heading_3;
      },
      shortCut: `${isMac ? '⌘⌥' : 'Ctrl+Alt+'}3`,
      onClick: (editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).setHeading({ level: 3 }).run();
      },
      clickable: (editor) => {
        return editor.can().toggleHeading({ level: 3 });
      },
      isActive: (editor) => {
        return editor.isActive('heading', { level: 3 });
      }
    },
    {
      icon: Heading4,
      name: 'h4',
      get tooltip() {
        return uiLabels.editor_heading_4;
      },
      shortCut: `${isMac ? '⌘⌥' : 'Ctrl+Alt+'}4`,
      onClick: (editor) => {
        editor.chain().focus().toggleHeading({ level: 4 }).run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).setHeading({ level: 4 }).run();
      },
      clickable: (editor) => {
        return editor.can().toggleHeading({ level: 4 });
      },
      isActive: (editor) => {
        return editor.isActive('heading', { level: 4 });
      }
    }
  ],
  'text-formatting': [
    {
      icon: Link,
      name: 'link',
      get tooltip() {
        return uiLabels.editor_link;
      },
      onClick: (editor) => {
        if (editor.isActive('link')) {
          editor.chain().focus().unsetLink().run();
        } else {
          const url = window.prompt(uiLabels.editor_link_prompt);
          if (url) {
            editor.chain().focus().toggleLink({ href: url }).run();
          }
        }
      },
      isActive: (editor) => {
        return editor.isActive('link');
      }
    },
    {
      icon: Pilcrow,
      name: 'paragraph',
      get tooltip() {
        return uiLabels.editor_paragraph;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}0`,
      onClick: (editor) => {
        editor.chain().focus().setParagraph().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).setParagraph().run();
      },
      clickable: (editor) => {
        return editor.can().setParagraph();
      },
      isActive: (editor) => {
        return editor.isActive('paragraph');
      }
    },
    {
      icon: Bold,
      name: 'bold',
      get tooltip() {
        return uiLabels.editor_bold;
      },
      shortCut: `${isMac ? '⌘' : 'Ctrl+'}B`,
      onClick: (editor) => {
        editor.chain().focus().toggleBold().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).setMark('bold').run();
      },
      clickable: (editor) => {
        return editor.can().toggleBold();
      },
      isActive: (editor) => {
        return editor.isActive('bold');
      }
    },
    {
      icon: Italic,
      name: 'italic',
      get tooltip() {
        return uiLabels.editor_italic;
      },
      shortCut: `${isMac ? '⌘' : 'Ctrl+'}I`,
      onClick: (editor) => {
        editor.chain().focus().toggleItalic().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).setMark('italic').run();
      },
      clickable: (editor) => {
        return editor.can().toggleItalic();
      },
      isActive: (editor) => {
        return editor.isActive('italic');
      }
    },
    {
      icon: Underline,
      name: 'underline',
      get tooltip() {
        return uiLabels.editor_underline;
      },
      shortCut: `${isMac ? '⌘' : 'Ctrl+'}U`,
      onClick: (editor) => {
        editor.chain().focus().toggleUnderline().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).setMark('underline').run();
      },
      clickable: (editor) => {
        return editor.can().toggleUnderline();
      },
      isActive: (editor) => {
        return editor.isActive('underline');
      }
    },
    {
      icon: StrikeThrough,
      name: 'strikethrough',
      get tooltip() {
        return uiLabels.editor_strikethrough;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}S`,
      onClick: (editor) => {
        editor.chain().focus().toggleStrike().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).setMark('strike').run();
      },
      clickable: (editor) => {
        return editor.can().toggleStrike();
      },
      isActive: (editor) => {
        return editor.isActive('strike');
      }
    },
    {
      icon: Quote,
      name: 'blockQuote',
      get tooltip() {
        return uiLabels.editor_blockquote;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}B`,
      onClick: (editor) => {
        editor.chain().focus().toggleBlockquote().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).toggleBlockquote().run();
      },
      clickable: (editor) => {
        return editor.can().toggleBlockquote();
      },
      isActive: (editor) => {
        return editor.isActive('blockquote');
      }
    },
    {
      icon: Code,
      name: 'code',
      get tooltip() {
        return uiLabels.editor_inline_code;
      },
      shortCut: `${isMac ? '⌘' : 'Ctrl+'}E`,
      onClick: (editor) => {
        editor.chain().focus().toggleCode().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).toggleCodeBlock().run();
      },
      clickable: (editor) => {
        return editor.can().toggleCode();
      },
      isActive: (editor) => {
        return editor.isActive('code');
      }
    },
    {
      icon: Superscript,
      name: 'superscript',
      get tooltip() {
        return uiLabels.editor_superscript;
      },
      shortCut: `${isMac ? '⌘' : 'Ctrl+'}.`,
      onClick: (editor) => {
        editor.chain().focus().toggleSuperscript().run();
      },
      clickable: (editor) => {
        return editor.can().toggleSuperscript();
      },
      isActive: (editor) => {
        return editor.isActive('superscript');
      }
    },
    {
      icon: Subscript,
      name: 'subscript',
      get tooltip() {
        return uiLabels.editor_subscript;
      },
      shortCut: `${isMac ? '⌘' : 'Ctrl+'},`,
      onClick: (editor) => {
        editor.chain().focus().toggleSubscript().run();
      },
      clickable: (editor) => {
        return editor.can().toggleSubscript();
      },
      isActive: (editor) => {
        return editor.isActive('subscript');
      }
    }
  ],
  alignment: [
    {
      icon: AlignLeft,
      name: 'align-left',
      get tooltip() {
        return uiLabels.editor_align_left;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}L`,
      onClick: (editor) => {
        editor.chain().focus().toggleTextAlign('left').run();
      },
      clickable: (editor) => {
        return editor.can().toggleTextAlign('left');
      },
      isActive: (editor) => editor.isActive({ textAlign: 'left' })
    },
    {
      icon: AlignCenter,
      name: 'align-center',
      get tooltip() {
        return uiLabels.editor_align_center;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}E`,
      onClick: (editor) => {
        editor.chain().focus().toggleTextAlign('center').run();
      },
      clickable: (editor) => {
        return editor.can().toggleTextAlign('center');
      },
      isActive: (editor) => editor.isActive({ textAlign: 'center' })
    },
    {
      icon: AlignRight,
      name: 'align-right',
      get tooltip() {
        return uiLabels.editor_align_right;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}R`,
      onClick: (editor) => {
        editor.chain().focus().toggleTextAlign('right').run();
      },
      clickable: (editor) => {
        return editor.can().toggleTextAlign('right');
      },
      isActive: (editor) => editor.isActive({ textAlign: 'right' })
    },
    {
      icon: AlighJustify,
      name: 'align-justify',
      get tooltip() {
        return uiLabels.editor_align_justify;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}J`,
      onClick: (editor) => {
        editor.chain().focus().toggleTextAlign('justify').run();
      },
      clickable: (editor) => {
        return editor.can().toggleTextAlign('justify');
      },
      isActive: (editor) => editor.isActive({ textAlign: 'justify' })
    }
  ],
  lists: [
    {
      icon: List,
      name: 'bulletList',
      get tooltip() {
        return uiLabels.editor_bullet_list;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}8`,
      onClick: (editor) => {
        editor.chain().focus().toggleBulletList().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).toggleBulletList().run();
      },
      isActive: (editor) => editor.isActive('bulletList')
    },
    {
      icon: ListOrdered,
      name: 'orderedList',
      get tooltip() {
        return uiLabels.editor_ordered_list;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}7`,
      onClick: (editor) => {
        editor.chain().focus().toggleOrderedList().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).toggleOrderedList().run();
      },
      clickable: (editor) => {
        return editor.can().toggleOrderedList();
      },
      isActive: (editor) => {
        return editor.isActive('orderedList');
      }
    },
    {
      icon: ListChecks,
      name: 'taskList',
      get tooltip() {
        return uiLabels.editor_task_list;
      },
      shortCut: `${isMac ? '⌘⇧' : 'Ctrl+Shift+'}9`,
      onClick: (editor) => {
        editor.chain().focus().toggleTaskList().run();
      },
      turnInto: (editor, pos) => {
        editor.chain().setNodeSelection(pos).toggleTaskList().run();
      },
      clickable: (editor) => {
        return editor.can().toggleTaskList();
      },
      isActive: (editor) => {
        return editor.isActive('taskList');
      }
    }
  ],
  media: [
    {
      icon: Image,
      name: 'image-placeholder',
      get tooltip() {
        return uiLabels.editor_image;
      },
      onClick: (editor) => {
        editor.chain().focus().insertImagePlaceholder().run();
      },
      isActive: (editor) => editor.isActive('image-placeholder')
    },
    {
      icon: Video,
      name: 'video-placeholder',
      get tooltip() {
        return uiLabels.editor_video;
      },
      onClick: (editor) => {
        editor.chain().focus().insertVideoPlaceholder().run();
      },
      isActive: (editor) => editor.isActive('video-placeholder')
    },
    {
      icon: Audio,
      name: 'audio-placeholder',
      get tooltip() {
        return uiLabels.editor_audio;
      },
      onClick: (editor) => {
        editor.chain().focus().insertAudioPlaceholder().run();
      },
      isActive: (editor) => editor.isActive('audio-placeholder')
    },
    {
      icon: IFrame,
      name: 'iframe-placeholder',
      get tooltip() {
        return uiLabels.editor_iframe;
      },
      onClick: (editor) => {
        editor.chain().focus().insertIFramePlaceholder().run();
      },
      isActive: (editor) => editor.isActive('iframe-placeholder')
    }
  ],
  table: [
    {
      icon: Table,
      name: 'table',
      get tooltip() {
        return uiLabels.editor_table;
      },
      onClick: (editor) => {
        if (editor.isActive('table')) {
          const del = confirm(uiLabels.editor_table_delete_confirm);
          if (del) {
            editor.chain().focus().deleteTable().run();
            return;
          }
        }
        editor.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: false }).run();
      },
      isActive: (editor) => editor.isActive('table')
    }
  ],
  math: [
    {
      icon: Radical,
      name: 'mathematics',
      get tooltip() {
        return uiLabels.editor_inline_math;
      },
      onClick: (editor) => {
        let latex = 'a^2 + b^2 = c^2';
        const chain = editor.chain().focus();
        if (isTextSelection(editor.view.state.selection)) {
          const { from, to } = editor.view.state.selection;
          latex = editor.view.state.doc.textBetween(from, to);
          chain.deleteRange({ from, to });
        }
        chain.insertInlineMath({ latex }).run();
      },
      isActive: (editor) => editor.isActive('inlineMath')
    },
    {
      icon: SquareRadical,
      name: 'mathematics',
      get tooltip() {
        return uiLabels.editor_block_math;
      },
      onClick: (editor) => {
        const latex = 'a^2 + b^2 = c^2';
        editor.chain().focus().insertBlockMath({ latex }).run();
      },
      isActive: (editor) => editor.isActive('blockMath')
    }
  ]
};

export default commands;
