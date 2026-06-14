/**
 * ============================================
 * 终端进度条组件 - 显示命令执行进度
 * ============================================
 */
import React from 'react';

interface ProgressBarProps {
  /** 进度值 0-100 */
  value: number;
  /** 进度描述文字 */
  message?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, message }) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const isComplete = clampedValue >= 100;

  return (
    <div className="my-2 font-mono text-xs select-none">
      {/* 进度条容器 */}
      <div className="flex items-center gap-3">
        <span className="text-green-400 flex-shrink-0">[</span>

        {/* 进度条轨道 */}
        <div
          className="relative h-4 w-48 bg-gray-800 rounded-sm overflow-hidden"
          style={{ border: '1px solid #1a3a1a' }}
        >
          {/* 进度填充 */}
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${clampedValue}%`,
              background: isComplete
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #059669, #10b981)',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)',
            }}
          >
            {/* 进度条内动画条纹 */}
            {!isComplete && (
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 16px)',
                }}
              />
            )}
          </div>
        </div>

        <span className="text-green-400 flex-shrink-0">]</span>

        {/* 百分比文字 */}
        <span className="text-green-400 w-10 text-right">
          {clampedValue}%
        </span>
      </div>

      {/* 状态消息 */}
      {message && (
        <div className="mt-1 ml-6 text-gray-400">
          {message}
        </div>
      )}

      {/* 完成提示 */}
      {isComplete && (
        <div className="mt-1 ml-6 text-emerald-400 animate-pulse">
          ✓ 完成
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
