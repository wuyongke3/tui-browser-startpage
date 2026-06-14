import React, { useRef } from 'react';
import { useTerminalStore } from '../../store/useTerminalStore';

/**
 * 配置面板组件
 * 提供可视化的配置界面（可选，主要通过命令行配置）
 */
const ConfigPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const config = useTerminalStore((state) => state.config);
  const updateConfig = useTerminalStore((state) => state.updateConfig);

  /**
   * 处理背景图片上传
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片文件不能超过 5MB');
      return;
    }

    // 转换为 base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      updateConfig({ backgroundImage: result });
    };
    reader.readAsDataURL(file);
  };

  /**
   * 清除背景图片
   */
  const clearBackgroundImage = () => {
    updateConfig({ backgroundImage: undefined });
  };

  return (
    <div className="config-panel bg-gray-900/95 border border-green-900/50 rounded-lg p-6 backdrop-blur-sm">
      <h3 className="text-green-400 text-lg mb-4 font-bold">⚙ 系统配置</h3>
      
      <div className="space-y-4">
        {/* 背景设置 */}
        <div className="config-section">
          <label className="block text-gray-300 text-sm mb-2">背景设置</label>
          <div className="flex gap-2 items-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded border border-green-800 transition-colors text-sm"
            >
              上传图片
            </button>
            {config.backgroundImage && (
              <button
                onClick={clearBackgroundImage}
                className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-800 transition-colors text-sm"
              >
                清除图片
              </button>
            )}
          </div>
          
          {/* 背景颜色 */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-gray-400 text-sm">颜色:</span>
            <input
              type="color"
              value={config.backgroundColor}
              onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-gray-500 text-xs">{config.backgroundColor}</span>
          </div>

          {/* 背景预览 */}
          {config.backgroundImage && (
            <div className="mt-2 relative w-full h-24 rounded overflow-hidden border border-gray-700">
              <img
                src={config.backgroundImage}
                alt="背景预览"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* 光标设置 */}
        <div className="config-section border-t border-gray-800 pt-4">
          <label className="block text-gray-300 text-sm mb-2">光标设置</label>
          
          {/* 光标颜色 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400 text-sm">颜色:</span>
            <input
              type="color"
              value={config.cursorColor}
              onChange={(e) => updateConfig({ cursorColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-gray-500 text-xs">{config.cursorColor}</span>
            
            {/* 实时光标预览 */}
            <span 
              className="ml-4 px-2 py-1 rounded" 
              style={{ color: config.cursorColor }}
            >
              ▊ 示例
            </span>
          </div>

          {/* 光标样式 */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">样式:</span>
            <select
              value={config.cursorStyle}
              onChange={(e) => 
                updateConfig({ cursorStyle: e.target.value as any })
              }
              className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 text-sm focus:border-green-600 outline-none"
            >
              <option value="blink">闪烁</option>
              <option value="static">静态</option>
              <option value="underline">下划线</option>
              <option value="block">方块</option>
            </select>
          </div>
        </div>

        {/* 用户名设置 */}
        <div className="config-section border-t border-gray-800 pt-4">
          <label className="block text-gray-300 text-sm mb-2">用户名显示</label>
          <input
            type="text"
            value={useTerminalStore.getState().username}
            onChange={(e) => {
              const name = e.target.value.trim() || 'guest';
              useTerminalStore.getState().setUsername(name);
              updateConfig({ username: name });
            }}
            placeholder="输入自定义用户名"
            className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-3 py-1.5 text-sm w-full max-w-xs focus:border-green-600 outline-none"
          />
        </div>

        {/* 提示信息 */}
        <div className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-800">
          提示：也可以通过命令行输入 "config" 进入配置模式进行设置
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
