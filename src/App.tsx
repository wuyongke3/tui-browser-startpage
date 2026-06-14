import React, { useRef } from 'react';
import Terminal from './components/Terminal/Terminal';
import type { TerminalHandle, ITerminalAPI } from './lib/types';
import { exampleCommandsPlugin } from './plugins/ExamplePlugin';
import './index.css';

/**
 * 主应用组件
 * 演示可插拔终端的使用方式
 */
function App() {
  const terminalRef = useRef<TerminalHandle>(null);

  /**
   * 终端就绪回调 - 获取 API 引用后可以执行高级操作
   */
  const handleReady = (api: ITerminalAPI) => {
    console.log('✅ 终端就绪，API:', api);

    // 示例：监听命令执行事件
    api.on('command:execute', (command: string) => {
      console.log(`[App] 命令执行: ${command}`);
    });

    // 示例：监听配置变化
    api.on('config:change', (config) => {
      console.log('[App] 配置已更新:', config);
    });
  };

  /**
   * 命令执行回调
   */
  const handleCommandExecute = (command: string, args: string[]) => {
    console.log(`[App] 用户执行了命令: ${command}`, args);
  };

  return (
    <main className="w-full h-screen overflow-hidden">
      {/* 
        使用可插拔终端组件
        
        支持的属性:
        - username: 自定义用户名
        - theme: 自定义主题配置
        - plugins: 要注册的插件列表
        - commands: 要注册的自定义命令
        - initialLinks: 初始快速链接
        - showHeader/showFooter: 是否显示头部/底部栏
        - onReady: 就绪回调（获取 API 引用）
        - onCommandExecute: 命令执行回调
        - onOutputChange: 输出变化回调
      */}
      {/* 注册示例插件 */}
      <Terminal
        ref={terminalRef}
        username="guest"
        plugins={[exampleCommandsPlugin]}
        onReady={handleReady}
        onCommandExecute={handleCommandExecute}
        showHeader={true}
        showFooter={true}
      />
    </main>
  );
}

export default App;
