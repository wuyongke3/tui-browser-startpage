import React from 'react';
import type { QuickLink } from '../../types';

/**
 * 快速连接卡片组件
 * 显示单个快速连接的信息
 */
interface QuickLinkCardProps {
  link: QuickLink;
  onOpen?: (url: string) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean; // 是否显示删除按钮
}

const QuickLinkCard: React.FC<QuickLinkCardProps> = ({
  link,
  onOpen,
  onDelete,
  showDelete = false,
}) => {
  /**
   * 处理点击打开链接
   */
  const handleClick = () => {
    if (onOpen) {
      onOpen(link.url);
    } else {
      window.open(link.url, '_blank');
    }
  };

  /**
   * 处理删除按钮点击
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发打开操作
    if (onDelete && window.confirm(`确定要删除 "${link.name}" 吗？`)) {
      onDelete(link.id);
    }
  };

  /**
   * 处理键盘事件（无障碍支持）
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`quick-link-card group relative flex flex-col items-center p-4 rounded-lg 
                  bg-gray-900/80 border border-gray-800 hover:border-green-600/60 
                  transition-all duration-200 cursor-pointer
                  ${showDelete ? 'pr-10' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`访问 ${link.name}`}
    >
      {/* 网站图标 */}
      <div className="w-12 h-12 mb-2 flex items-center justify-center">
        {link.icon ? (
          <img
            src={link.icon}
            alt={`${link.name} 图标`}
            className="w-10 h-10 rounded"
            onError={(e) => {
              // 图片加载失败时显示默认图标
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          /* 默认图标：首字母 */
          <div className="w-10 h-10 rounded bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white font-bold text-lg">
            {link.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* 网站名称 */}
      <div className="text-sm text-gray-300 font-medium text-center truncate w-full px-1">
        {link.name}
      </div>

      {/* URL（悬停时显示） */}
      <div className="text-xs text-gray-500 truncate w-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {link.url.replace(/^https?:\/\//, '')}
      </div>

      {/* 删除按钮（仅在需要时显示） */}
      {showDelete && onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 w-5 h-5 rounded bg-red-900/80 hover:bg-red-700 
                     text-red-300 text-xs flex items-center justify-center opacity-0 
                     group-hover:opacity-100 transition-opacity"
          aria-label={`删除 ${link.name}`}
          title="删除"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default QuickLinkCard;
