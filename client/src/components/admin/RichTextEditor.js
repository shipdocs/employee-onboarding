import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Toolbar,
  IconButton,
  Divider,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
  Alert
} from '@mui/material';
import { useSafeHTML } from '../../hooks/useSafeHTML';
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberListIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Code as CodeIcon,
  FormatQuote as QuoteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  FormatSize as FormatSizeIcon
} from '@mui/icons-material';

/**
 * Rich Text Editor Component
 * Provides rich text editing capabilities for training content
 */
const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Enter content...',
  readOnly = false,
  minHeight = 200,
  maxHeight = 400,
  showToolbar = true,
  allowImages = true,
  allowLinks = true
}) => {
  const editorRef = useRef(null);
  const [formatMenuAnchor, setFormatMenuAnchor] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get sanitized HTML for initial content
  const safeInitialHTML = useSafeHTML(value);

  // Initialize editor content safely
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      // Set initial content safely without causing React conflicts
      if (value && safeInitialHTML.__html) {
        // Use a temporary div to safely set content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = safeInitialHTML.__html;

        // Clear existing content and append sanitized content
        editorRef.current.innerHTML = '';
        while (tempDiv.firstChild) {
          editorRef.current.appendChild(tempDiv.firstChild);
        }
      }
      setIsInitialized(true);
    }
  }, [value, isInitialized, safeInitialHTML]);

  // Handle content changes
  const handleContentChange = () => {
    if (editorRef.current && onChange) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  // Execute formatting command
  const executeCommand = (command, value = null) => {
    if (readOnly) return;

    document.execCommand(command, false, value);
    editorRef.current.focus();
    handleContentChange();
    updateFormatState();
  };

  // Update format state based on current selection
  const updateFormatState = () => {
    const formats = [];

    if (document.queryCommandState('bold')) formats.push('bold');
    if (document.queryCommandState('italic')) formats.push('italic');
    if (document.queryCommandState('underline')) formats.push('underline');
    if (document.queryCommandState('insertUnorderedList')) formats.push('bulletList');
    if (document.queryCommandState('insertOrderedList')) formats.push('numberList');

    setSelectedFormat(formats);
  };

  // Handle selection change
  const handleSelectionChange = () => {
    updateFormatState();
  };

  // Handle key events
  const handleKeyDown = (event) => {
    if (readOnly) return;

    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          executeCommand('bold');
          break;
        case 'i':
          event.preventDefault();
          executeCommand('italic');
          break;
        case 'u':
          event.preventDefault();
          executeCommand('underline');
          break;
        case 'z':
          if (event.shiftKey) {
            event.preventDefault();
            executeCommand('redo');
          } else {
            event.preventDefault();
            executeCommand('undo');
          }
          break;
        default:
          break;
      }
    }
  };

  // Handle paste events
  const handlePaste = (event) => {
    if (readOnly) return;

    event.preventDefault();

    // Try to get HTML content first, fallback to plain text
    const htmlData = event.clipboardData.getData('text/html');
    const textData = event.clipboardData.getData('text/plain');

    if (htmlData) {
      // Use safe HTML sanitization
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlData;

      // Remove dangerous elements
      const dangerousElements = tempDiv.querySelectorAll('script, object, embed, iframe, form, input, textarea, select, button, style, link');
      dangerousElements.forEach(el => el.remove());

      // Remove dangerous attributes
      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach(el => {
        const attributes = [...el.attributes];
        attributes.forEach(attr => {
          if (attr.name.startsWith('on') || attr.name === 'style') {
            el.removeAttribute(attr.name);
          }
        });

        // Remove javascript: URLs
        if (el.href && el.href.startsWith('javascript:')) {
          el.removeAttribute('href');
        }
        if (el.src && el.src.startsWith('javascript:')) {
          el.removeAttribute('src');
        }
      });

      executeCommand('insertHTML', tempDiv.innerHTML);
    } else {
      executeCommand('insertText', textData);
    }
  };

  // Insert link
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  // Insert image
  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      executeCommand('insertImage', url);
    }
  };

  // Format text size
  const formatTextSize = (size) => {
    executeCommand('fontSize', size);
    setFormatMenuAnchor(null);
  };

  // Toolbar component
  const EditorToolbar = () => (
    <Toolbar
      variant="dense"
      sx={{
        minHeight: '48px !important',
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      {/* Undo/Redo */}
      <Tooltip title="Undo (Ctrl+Z)">
        <IconButton size="small" onClick={() => executeCommand('undo')} disabled={readOnly}>
          <UndoIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Redo (Ctrl+Shift+Z)">
        <IconButton size="small" onClick={() => executeCommand('redo')} disabled={readOnly}>
          <RedoIcon />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Text Formatting */}
      <ToggleButtonGroup
        value={selectedFormat}
        onChange={() => {}} // Handled by individual buttons
        size="small"
        disabled={readOnly}
      >
        <ToggleButton
          value="bold"
          onClick={() => executeCommand('bold')}
          selected={selectedFormat.includes('bold')}
        >
          <BoldIcon />
        </ToggleButton>
        <ToggleButton
          value="italic"
          onClick={() => executeCommand('italic')}
          selected={selectedFormat.includes('italic')}
        >
          <ItalicIcon />
        </ToggleButton>
        <ToggleButton
          value="underline"
          onClick={() => executeCommand('underline')}
          selected={selectedFormat.includes('underline')}
        >
          <UnderlineIcon />
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Text Size */}
      <Tooltip title="Text Size">
        <IconButton
          size="small"
          onClick={(e) => setFormatMenuAnchor(e.currentTarget)}
          disabled={readOnly}
        >
          <FormatSizeIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={formatMenuAnchor}
        open={Boolean(formatMenuAnchor)}
        onClose={() => setFormatMenuAnchor(null)}
      >
        <MenuItem onClick={() => formatTextSize('1')}>Small</MenuItem>
        <MenuItem onClick={() => formatTextSize('3')}>Normal</MenuItem>
        <MenuItem onClick={() => formatTextSize('4')}>Large</MenuItem>
        <MenuItem onClick={() => formatTextSize('5')}>Extra Large</MenuItem>
      </Menu>

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Lists */}
      <ToggleButtonGroup
        value={selectedFormat}
        onChange={() => {}}
        size="small"
        disabled={readOnly}
      >
        <ToggleButton
          value="bulletList"
          onClick={() => executeCommand('insertUnorderedList')}
          selected={selectedFormat.includes('bulletList')}
        >
          <BulletListIcon />
        </ToggleButton>
        <ToggleButton
          value="numberList"
          onClick={() => executeCommand('insertOrderedList')}
          selected={selectedFormat.includes('numberList')}
        >
          <NumberListIcon />
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Special Formatting */}
      <Tooltip title="Quote">
        <IconButton
          size="small"
          onClick={() => executeCommand('formatBlock', 'blockquote')}
          disabled={readOnly}
        >
          <QuoteIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Code">
        <IconButton
          size="small"
          onClick={() => executeCommand('formatBlock', 'pre')}
          disabled={readOnly}
        >
          <CodeIcon />
        </IconButton>
      </Tooltip>

      {allowLinks && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Tooltip title="Insert Link">
            <IconButton size="small" onClick={insertLink} disabled={readOnly}>
              <LinkIcon />
            </IconButton>
          </Tooltip>
        </>
      )}

      {allowImages && (
        <Tooltip title="Insert Image">
          <IconButton size="small" onClick={insertImage} disabled={readOnly}>
            <ImageIcon />
          </IconButton>
        </Tooltip>
      )}
    </Toolbar>
  );

  return (
    <Paper elevation={1} sx={{ border: 1, borderColor: 'divider' }}>
      {showToolbar && <EditorToolbar />}

      <Box
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning={true}
        onInput={handleContentChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        sx={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          overflow: 'auto',
          p: 2,
          outline: 'none',
          '&:focus': {
            bgcolor: readOnly ? 'inherit' : 'background.paper'
          },
          '& blockquote': {
            borderLeft: 4,
            borderColor: 'primary.main',
            pl: 2,
            ml: 0,
            fontStyle: 'italic',
            color: 'text.secondary'
          },
          '& pre': {
            bgcolor: 'grey.100',
            p: 1,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            overflow: 'auto'
          },
          '& img': {
            maxWidth: '100%',
            height: 'auto'
          },
          '& a': {
            color: 'primary.main',
            textDecoration: 'underline'
          }
        }}
      >
        {!value && !readOnly && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              position: 'absolute',
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            {placeholder}
          </Typography>
        )}
      </Box>

      {readOnly && (
        <Alert severity="info" sx={{ m: 1 }}>
          This content is read-only
        </Alert>
      )}
    </Paper>
  );
};

export default RichTextEditor;
