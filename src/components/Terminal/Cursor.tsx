/**
 * ============================================
 * 可插拔终端 - 光标组件（支持主题配置）
 * ============================================
 */
import React from 'react';
import type { ITerminalAPI } from '../../lib/types';

interface CursorProps {
  engineRef: React.RefObject<ITerminalAPI | null>;
}

const Cursor: React.FC<CursorProps> = ({ engineRef }) => {
  // 从引擎获取配置
  const config = engineRef.current?.getConfig();
  
  // 默认配置 - 使用 block 粗光标
  const cursorColor = config?.cursorColor || '#00ff00';
  const cursorStyle = config?.cursorStyle || 'block';

  /**
   * 根据配置生成光标样式
   */
  const getCursorStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      color: cursorColor,
      display: 'inline-block',
      transition: 'all 0.1s ease',
    };

    switch (cursorStyle) {
      case 'blink':
        return { ...base, animation: 'cursorBlink 1s step-end infinite' };
      
      case 'static':
        return base;
      
      case 'underline':
        return {
          ...base,
          borderBottom: `2px solid ${cursorColor}`,
          width: '8px',
          height: '0',
          verticalAlign: 'baseline',
        };
      
      case 'block':
        return {
          ...base,
          backgroundColor: cursorColor,
          color: cursorColor === '#000000' ? '#fff' : '#000',
          width: '8px',
          height: '1.2em',
          display: 'inline-block',
          animation: 'cursorBlink 1s step-end infinite',
          verticalAlign: 'text-bottom',
        };
      
      default:
        return base;
    }
  };

  return (
    <span className="terminal-cursor" style={getCursorStyle()}>
      {cursorStyle !== 'underline' && cursorStyle !== 'block' ? '▊' : ''}
    </span>
  );
};

export default Cursor;
