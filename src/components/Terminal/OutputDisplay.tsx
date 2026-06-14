/**
 * ============================================
 * 可插拔终端 - 输出显示组件
 * ============================================
 */
import React, { useRef, useEffect } from 'react';
import type { ITerminalOutput } from '../../lib/types';

interface OutputDisplayProps {
  outputs: ITerminalOutput[];
  endRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * 输出显示区域组件
 * 显示命令执行结果和历史记录
 */
const OutputDisplay: React.FC<OutputDisplayProps> = ({ outputs, endRef }) => {
  /**
   * 根据类型获取样式类名
   */
  const getTypeClassName = (type: string): string => {
    switch (type) {
      case 'input': return 'text-cyan-400';
      case 'error': return 'text-red-500';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  /**
   * 格式化输出内容（保留换行）
   */
  const formatContent = (content: string): string[] => {
    return content.split('\n');
  };

  return (
    <div className="output-display flex-1 overflow-y-auto px-4 py-2 space-y-1 font-mono text-sm">
      {outputs.map((output) => (
        <div
          key={output.id}
          className={`output-line ${getTypeClassName(output.type)} whitespace-pre-wrap break-all`}
        >
          {formatContent(output.content).map((line, index) => (
            <React.Fragment key={`${output.id}-${index}`}>
              {index > 0 && <br />}
              {/* 用户输入显示提示符 */}
              {index === 0 && output.type === 'input' && (
                <span className="text-green-400 mr-2">
                  {/* 提示符由父组件处理 */}
                </span>
              )}
              {line}
            </React.Fragment>
          ))}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default OutputDisplay;
