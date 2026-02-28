import React, { useRef, useCallback, useState, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { Play, Loader2 } from 'lucide-react';

/* ───── shell ───── */
const Wrap = styled.div`
  display:flex;flex-direction:column;border-radius:var(--radius-lg);overflow:hidden;
  border:1px solid var(--glass-border);background:var(--bg-elevated);
  height:100%;
`;

/* ── toolbar ── */
const Toolbar = styled.div`
  display:flex;justify-content:space-between;align-items:center;
  padding:6px 14px;flex-shrink:0;
  background:var(--bg-card);border-bottom:1px solid var(--glass-border);
`;
const ToolLeft = styled.div`display:flex;align-items:center;gap:10px;`;
const FileName = styled.span`font-size:11.5px;color:var(--text-tertiary);font-family:var(--font-mono);`;
const CursorInfo = styled.span`font-size:10.5px;color:var(--text-tertiary);opacity:.6;`;

const RunBtn = styled.button<{$running?:boolean}>`
  display:inline-flex;align-items:center;gap:6px;
  padding:5px 16px;border-radius:var(--radius-sm);font-size:12px;font-weight:600;
  transition:all var(--transition-base);
  ${p=>p.$running?css`
    background:rgba(0,230,118,0.12);color:var(--accent-green);cursor:wait;
  `:css`
    background:var(--accent-green);color:#000;
    &:hover{box-shadow:0 4px 14px rgba(0,230,118,0.25);transform:translateY(-1px);}
    &:active{transform:scale(.97);}
  `}
`;

/* ── body ── */
const Body = styled.div`
  display:flex;flex:1;min-height:0;overflow:auto;
`;

const LineNumbers = styled.div`
  padding:10px 0;min-width:44px;text-align:right;user-select:none;flex-shrink:0;
  background:rgba(0,0,0,0.15);border-right:1px solid var(--glass-border);
  font-family:var(--font-mono);font-size:12.5px;line-height:1.65;color:var(--text-tertiary);
`;
const LineNum = styled.div<{$active?:boolean;$highlighted?:boolean}>`
  padding:0 10px 0 6px;
  color:${p=>p.$active?'var(--accent-green)':p.$highlighted?'var(--accent-cyan)':'var(--text-tertiary)'};
  background:${p=>p.$active?'rgba(0,230,118,0.05)':'transparent'};
  font-weight:${p=>p.$active?'700':'400'};
`;

const TextArea = styled.textarea`
  flex:1;padding:10px 14px;background:transparent;border:none;outline:none;
  color:var(--text-primary);font-family:var(--font-mono);font-size:12.5px;
  line-height:1.65;resize:none;tab-size:4;white-space:pre;overflow-wrap:normal;
  &::placeholder{color:var(--text-tertiary);opacity:.4;}
`;

/* ── footer ── */
const Footer = styled.div`
  display:flex;justify-content:space-between;align-items:center;
  padding:5px 14px;flex-shrink:0;
  background:var(--bg-card);border-top:1px solid var(--glass-border);
  font-size:10.5px;color:var(--text-tertiary);
`;
const CharCount = styled.span<{$warn?:boolean}>`
  color:${p=>p.$warn?'var(--accent-red)':'inherit'};
`;

/* ───── component ───── */
interface CodeEditorProps {
  value:string;
  onChange:(c:string)=>void;
  onRun?:(c:string)=>void;
  isRunning?:boolean;
  highlightedLines?:number[];
  activeLine?:number;
  language?:string;
  maxLines?:number;
  readOnly?:boolean;
}

const CodeEditor:React.FC<CodeEditorProps> = ({
  value, onChange, onRun, isRunning=false,
  highlightedLines=[], activeLine,
  language='python', maxLines=15000, readOnly=false,
}) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lnRef = useRef<HTMLDivElement>(null);
  const [curLine, setCurLine] = useState(1);
  const [curCol, setCurCol] = useState(1);

  const lines = useMemo(()=>value.split('\n'),[value]);
  const hlSet = useMemo(()=>new Set(highlightedLines),[highlightedLines]);

  const syncScroll = useCallback(()=>{
    if(taRef.current&&lnRef.current) lnRef.current.scrollTop=taRef.current.scrollTop;
  },[]);

  const trackCursor = useCallback(()=>{
    if(!taRef.current) return;
    const pos=taRef.current.selectionStart;
    const before=value.slice(0,pos);
    setCurLine((before.match(/\n/g)||[]).length+1);
    const nl=before.lastIndexOf('\n');
    setCurCol(pos-(nl===-1?0:nl+1)+1);
  },[value]);

  const handleKey = useCallback((e:React.KeyboardEvent<HTMLTextAreaElement>)=>{
    if(e.key==='Tab'){
      e.preventDefault();
      const ta=taRef.current!;
      const s=ta.selectionStart, end=ta.selectionEnd;
      const nv=value.slice(0,s)+'    '+value.slice(end);
      onChange(nv);
      requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=s+4;});
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&onRun){ e.preventDefault(); onRun(value); }
  },[value,onChange,onRun]);

  return(
    <Wrap>
      <Toolbar>
        <ToolLeft>
          <FileName>script.py</FileName>
          <CursorInfo>Ln {curLine}, Col {curCol}</CursorInfo>
        </ToolLeft>
        {onRun&&(
          <RunBtn $running={isRunning} onClick={()=>onRun(value)} disabled={isRunning}>
            {isRunning?<><Loader2 size={12} style={{animation:'spin .8s linear infinite'}}/>Running…</>:<><Play size={12} strokeWidth={2.5}/>Run</>}
          </RunBtn>
        )}
      </Toolbar>

      <Body>
        <LineNumbers ref={lnRef}>
          {lines.map((_,i)=>(
            <LineNum key={i} $active={activeLine===i+1} $highlighted={hlSet.has(i+1)}>{i+1}</LineNum>
          ))}
        </LineNumbers>
        <TextArea
          ref={taRef} value={value} onChange={e=>onChange(e.target.value)}
          onScroll={syncScroll} onSelect={trackCursor} onKeyDown={handleKey}
          readOnly={readOnly} spellCheck={false} autoCorrect="off" autoCapitalize="off"
          placeholder="# Paste or write your Python code here…"
        />
      </Body>

      <Footer>
        <span>{language}</span>
        <span>{lines.length.toLocaleString()} lines · <CharCount $warn={value.length>500000}>{value.length.toLocaleString()} chars</CharCount></span>
      </Footer>
    </Wrap>
  );
};

export default CodeEditor;
