// CodeUploadOverlay — Modal for uploading code files or pasting code
// Supports drag-and-drop, file picker, and clipboard paste

import React, { useState, useCallback, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCode, Clipboard, X, AlertCircle, CheckCircle } from 'lucide-react';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

/* Overlay */
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
`;

const Modal = styled(motion.div)`
  width: 520px;
  max-width: 92vw;
  max-height: 80vh;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-elevated);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--glass-border);
`;
const ModalTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
`;
const CloseBtn = styled.button`
  width: 28px; height: 28px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  &:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
`;

const ModalBody = styled.div`
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

/* Drop zone */
const DropZone = styled.div<{ $active?: boolean; $hasFile?: boolean }>`
  border: 2px dashed ${p => p.$active ? 'var(--accent-green)' : p.$hasFile ? 'rgba(0,230,118,0.3)' : 'var(--glass-border)'};
  border-radius: var(--radius-lg);
  padding: 32px 20px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
  background: ${p => p.$active ? 'rgba(0,230,118,0.04)' : p.$hasFile ? 'rgba(0,230,118,0.02)' : 'transparent'};

  &:hover {
    border-color: rgba(0,230,118,0.4);
    background: rgba(0,230,118,0.03);
  }
`;

const DropIcon = styled.div<{ $active?: boolean }>`
  width: 48px; height: 48px;
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  background: ${p => p.$active ? 'var(--accent-green-dim)' : 'var(--bg-card)'};
  color: ${p => p.$active ? 'var(--accent-green)' : 'var(--text-tertiary)'};
  transition: all var(--transition-base);
`;

const DropTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
`;
const DropSub = styled.div`
  font-size: 12px;
  color: var(--text-tertiary);
`;

/* Divider */
const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-tertiary);
  font-size: 11px;
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--glass-border);
  }
`;

/* Paste area */
const PasteArea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: rgba(0,0,0,0.2);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  resize: vertical;
  transition: border-color var(--transition-fast);

  &:focus {
    border-color: rgba(0,230,118,0.3);
  }
  &::placeholder {
    color: var(--text-tertiary);
    opacity: 0.5;
  }
`;

/* File info */
const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: rgba(0,230,118,0.04);
  border: 1px solid rgba(0,230,118,0.15);
`;
const FileInfoText = styled.div`
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-green);
`;
const FileInfoSize = styled.span`
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 400;
`;

/* Buttons */
const BtnRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--glass-border);
`;
const Btn = styled.button<{ $primary?: boolean }>`
  padding: 8px 20px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  transition: all var(--transition-fast);

  ${p => p.$primary ? css`
    background: var(--accent-green);
    color: #000;
    &:hover { background: #00f080; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  ` : css`
    color: var(--text-secondary);
    &:hover { background: rgba(255,255,255,0.06); }
  `}
`;

/* Error */
const ErrorMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: rgba(255,82,82,0.08);
  border: 1px solid rgba(255,82,82,0.15);
  font-size: 12px;
  color: var(--accent-red);
`;

interface CodeUploadOverlayProps {
  open: boolean;
  onClose: () => void;
  onLoad: (code: string) => void;
}

const CodeUploadOverlay: React.FC<CodeUploadOverlayProps> = ({ open, onClose, onLoad }) => {
  const [dragActive, setDragActive] = useState(false);
  const [pasteCode, setPasteCode] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileCode, setFileCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setPasteCode('');
    setFileName(null);
    setFileCode(null);
    setError(null);
    setDragActive(false);
  }, []);

  const readFile = useCallback((file: File) => {
    setError(null);
    if (file.size > 500_000) {
      setError('File is too large (max 500KB)');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && !['py', 'txt', 'python'].includes(ext)) {
      setError('Only Python (.py) files are supported');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileName(file.name);
      setFileCode(text);
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }, [readFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }, [readFile]);

  const handleSubmit = useCallback(() => {
    const code = fileCode || pasteCode.trim();
    if (!code) {
      setError('Please provide some code');
      return;
    }
    onLoad(code);
    resetState();
    onClose();
  }, [fileCode, pasteCode, onLoad, onClose, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  return (
    <AnimatePresence>
      {open && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
        >
          <Modal
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle>
                <Upload size={16} style={{ color: 'var(--accent-green)' }} />
                Load Code
              </ModalTitle>
              <CloseBtn onClick={handleClose}>
                <X size={16} />
              </CloseBtn>
            </ModalHeader>

            <ModalBody>
              {/* Drag & drop zone */}
              <input
                ref={inputRef}
                type="file"
                accept=".py,.txt,.python"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
              <DropZone
                $active={dragActive}
                $hasFile={!!fileCode}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <DropIcon $active={dragActive || !!fileCode}>
                  {fileCode ? <CheckCircle size={22} /> : <Upload size={22} />}
                </DropIcon>
                {fileCode ? (
                  <>
                    <DropTitle>File loaded</DropTitle>
                    <DropSub>Click to choose a different file</DropSub>
                  </>
                ) : (
                  <>
                    <DropTitle>Drag & drop a Python file</DropTitle>
                    <DropSub>or click to browse (.py files, max 500KB)</DropSub>
                  </>
                )}
              </DropZone>

              {fileName && fileCode && (
                <FileInfo>
                  <FileCode size={16} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                  <FileInfoText>{fileName} <FileInfoSize>({fileCode.length.toLocaleString()} chars)</FileInfoSize></FileInfoText>
                </FileInfo>
              )}

              <Divider>or paste code</Divider>

              <PasteArea
                value={pasteCode}
                onChange={e => { setPasteCode(e.target.value); setFileCode(null); setFileName(null); }}
                placeholder="# Paste your Python code here..."
                spellCheck={false}
              />

              {error && (
                <ErrorMsg>
                  <AlertCircle size={13} />
                  {error}
                </ErrorMsg>
              )}
            </ModalBody>

            <BtnRow>
              <Btn onClick={handleClose}>Cancel</Btn>
              <Btn $primary onClick={handleSubmit} disabled={!fileCode && !pasteCode.trim()}>
                Load & Visualize
              </Btn>
            </BtnRow>
          </Modal>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

export default CodeUploadOverlay;
