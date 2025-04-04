'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// 设置 PDF.js 工作器路径
// 在实际项目中，需要在 public 目录下放置 PDF.js 工作器文件
// 或者使用 CDN 版本
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();


// 定义组件属性接口
interface PDFViewerProps {
  pdfUrl?: string;
  defaultScale?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfUrl = '/Purpose-Profit-2.pdf', // 默认PDF路径，实际使用时应替换
  defaultScale = 1.0
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(defaultScale);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showTextMenu, setShowTextMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  
  // 添加连续滚动相关状态
  const [continuousMode, setContinuousMode] = useState<boolean>(true);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  
  // 新增：添加结果面板相关状态
  const [translatedText, setTranslatedText] = useState<string>('');
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [grammarAnalysis, setGrammarAnalysis] = useState<string>('');
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [showResultPanel, setShowResultPanel] = useState<boolean>(false);
  const [activePanelType, setActivePanelType] = useState<'translate' | 'ai' | 'grammar' | 'none'>('none');

// 调试用：在全局对象上添加一个可以在控制台调用的函数
if (typeof window !== 'undefined') {
  (window as any).testSelection = () => {
    setSelectedText('测试文本');
    setMenuPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setShowTextMenu(true);
    console.log('测试菜单已显示');
  };
}
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 文档加载成功处理函数
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
    setNumPages(numPages);
    setLoading(false);
    // 初始化页面引用数组
    pageRefs.current = Array(numPages).fill(null);
  };

  // 文档加载失败处理函数
  const onDocumentLoadError = (error: Error): void => {
    console.error('PDF加载失败:', error);
    setError(error);
    setLoading(false);
  };

  // 页面导航函数
  const goToNextPage = (): void => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
      
      // 在连续模式下滚动到下一页
      if (continuousMode && pageRefs.current[pageNumber]) {
        pageRefs.current[pageNumber]?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const goToPrevPage = (): void => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
      
      // 在连续模式下滚动到上一页
      if (continuousMode && pageRefs.current[pageNumber - 2]) {
        pageRefs.current[pageNumber - 2]?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const goToPage = (page: number): void => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
      
      // 在连续模式下滚动到指定页
      if (continuousMode && pageRefs.current[page - 1]) {
        pageRefs.current[page - 1]?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // 缩放控制
  const zoomIn = (): void => {
    setScale(prevScale => prevScale + 0.1);
  };

  const zoomOut = (): void => {
    setScale(prevScale => prevScale > 0.2 ? prevScale - 0.1 : prevScale);
  };

  const resetZoom = (): void => {
    setScale(defaultScale);
  };
  
  // 处理文本选择事件
  const handleTextSelection = (): void => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString();
      setSelectedText(text);
      
      // 获取选中文本的位置以显示菜单
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // 计算相对于视窗的绝对位置
      // 这样可以避免相对于容器定位导致的问题
      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + window.scrollY + 10 // 添加一些偏移，避免遮挡选中的文本
      });
      
      // 确保先设置位置，再显示菜单
      setTimeout(() => {
        setShowTextMenu(true);
        // 重置结果面板
        setShowResultPanel(false);
        setActivePanelType('none');
      }, 0);
      
      console.log("文本已选中:", text, "位置:", { x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY });
    } else {
      setSelectedText('');
      setShowTextMenu(false);
    }
  };
  
  // 复制选中文本
  const copySelectedText = (): void => {
    navigator.clipboard.writeText(selectedText)
      .then(() => {
        // 显示复制成功提示
        alert('文本已复制到剪贴板');
        setShowTextMenu(false);
      })
      .catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请重试');
      });
  };
  
  // 搜索选中文本
  const searchSelectedText = (): void => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedText)}`, '_blank');
    setShowTextMenu(false);
  };
  
  // 高亮选中文本（此处为示例，实际高亮功能需要更复杂的实现）
  const highlightSelectedText = (): void => {
    alert(`已高亮文本: "${selectedText}"`);
    // 这里可以实现更复杂的高亮逻辑
    setShowTextMenu(false);
  };

  // 新增：翻译选中文本
  const translateText = (): void => {
    // 这里实现调用翻译API的逻辑
    // 模拟API调用
    console.log("执行翻译:", selectedText);
    setTranslatedText(`翻译结果: ${selectedText}`);
    setActivePanelType('translate');
    setShowResultPanel(true);
    setShowTextMenu(false);
  };

  // 新增：AI讲解选中文本
  const explainTextWithAI = (): void => {
    // 这里实现调用AI解释API的逻辑
    // 模拟API调用
    setAiExplanation(`AI讲解: 这段文本"${selectedText}"的意思是...`);
    setActivePanelType('ai');
    setShowResultPanel(true);
    setShowTextMenu(false);
  };

  // 新增：语法分析选中文本
  const analyzeGrammar = (): void => {
    // 这里实现调用语法分析API的逻辑
    // 模拟API调用
    setGrammarAnalysis(`语法分析: 这段文本"${selectedText}"的语法结构是...`);
    setActivePanelType('grammar');
    setShowResultPanel(true);
    setShowTextMenu(false);
  };

  // 新增：收藏生词
  const saveWord = (): void => {
    setSavedWords(prevWords => {
      if (!prevWords.includes(selectedText)) {
        return [...prevWords, selectedText];
      }
      return prevWords;
    });
    alert(`已收藏: "${selectedText}"`);
    setShowTextMenu(false);
  };

  // 切换连续滚动模式
  const toggleContinuousMode = (): void => {
    setContinuousMode(prev => !prev);
  };
  
  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      // 不检查containerRef，而是直接判断点击的目标是否是菜单本身或其子元素
      const menuElement = document.querySelector('.text-selection-menu');
      if (showTextMenu && menuElement && !menuElement.contains(event.target as Node)) {
        setShowTextMenu(false);
      }
    };
    
    // 先移除再添加，避免重复添加
    document.removeEventListener('mousedown', handleClickOutside);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTextMenu]);

  // 处理连续滚动模式下的滚动事件
  useEffect(() => {
    if (!continuousMode || loading || !pdfContainerRef.current) return;

    const handleScroll = (): void => {
      if (!pdfContainerRef.current) return;
      
      // 获取容器滚动位置和尺寸
      const containerTop = pdfContainerRef.current.scrollTop;
      const containerHeight = pdfContainerRef.current.clientHeight;
      const containerBottom = containerTop + containerHeight;
      
      // 查找当前可见的页面
      const visible: number[] = [];
      
      pageRefs.current.forEach((pageRef, index) => {
        if (!pageRef) return;
        
        const pageRect = pageRef.getBoundingClientRect();
        const containerRect = pdfContainerRef.current!.getBoundingClientRect();
        
        // 计算页面相对于容器的位置
        const pageTop = pageRect.top - containerRect.top + pdfContainerRef.current!.scrollTop;
        const pageBottom = pageTop + pageRect.height;
        
        // 检查页面是否可见
        const isVisible = 
          (pageTop < containerBottom && pageBottom > containerTop) ||
          (pageTop < containerTop && pageBottom > containerTop);
        
        if (isVisible) {
          visible.push(index + 1);
        }
      });
      
      if (visible.length > 0) {
        // 更新可见页面
        setVisiblePages(visible);
        
        // 更新当前页码为最靠近视口中心的页面
        const containerCenter = containerTop + containerHeight / 2;
        let closestPage = 1;
        let minDistance = Infinity;
        
        pageRefs.current.forEach((pageRef, index) => {
          if (!pageRef) return;
          
          const pageRect = pageRef.getBoundingClientRect();
          const containerRect = pdfContainerRef.current!.getBoundingClientRect();
          const pageTop = pageRect.top - containerRect.top + pdfContainerRef.current!.scrollTop;
          const pageCenter = pageTop + pageRect.height / 2;
          const distance = Math.abs(pageCenter - containerCenter);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestPage = index + 1;
          }
        });
        
        if (closestPage !== pageNumber) {
          setPageNumber(closestPage);
        }
      }
    };
    
    const container = pdfContainerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [continuousMode, loading, numPages, pageNumber]);

  // 加载状态组件
  const LoadingComponent = () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      <span className="ml-3">加载中...</span>
    </div>
  );

  // 错误状态组件
  const ErrorComponent = () => (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">加载出错! </strong>
      <span className="block sm:inline">{error?.message || '无法加载PDF文件'}</span>
    </div>
  );

  // 修改：文本选择菜单组件 - 添加新功能按钮
  const TextSelectionMenu = () => (
    <div 
      className="text-selection-menu fixed bg-white shadow-lg rounded-md border border-gray-200 py-2 px-2 z-50 flex flex-row flex-wrap"
      style={{ 
        left: `${menuPosition.x}px`, 
        top: `${menuPosition.y}px`,
        transform: 'translateX(-50%)',
        maxWidth: '95vw'
      }}
    >
      <button 
        onClick={copySelectedText}
        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md mx-1"
      >
        复制
      </button>
      <button 
        onClick={translateText}
        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md mx-1"
      >
        翻译
      </button>
      <button 
        onClick={explainTextWithAI}
        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md mx-1"
      >
        AI讲解
      </button>
      <button 
        onClick={analyzeGrammar}
        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md mx-1"
      >
        语法分析
      </button>
      <button 
        onClick={saveWord}
        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md mx-1"
      >
        生词收藏
      </button>
      <button 
        onClick={searchSelectedText}
        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md mx-1"
      >
        搜索
      </button>
      <button 
        onClick={highlightSelectedText}
        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md mx-1"
      >
        高亮
      </button>
    </div>
  );

  // 新增：结果面板组件
  const ResultPanel = () => (
    <div className="fixed bg-white shadow-lg rounded-md border border-gray-200 p-4 z-50 w-full max-w-md max-h-64 overflow-auto"
      style={{ 
        left: `${menuPosition.x}px`, 
        top: `${menuPosition.y + 10}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg">
          {activePanelType === 'translate' ? '翻译结果' : 
           activePanelType === 'ai' ? 'AI讲解' : 
           activePanelType === 'grammar' ? '语法分析' : ''}
        </h3>
        <button 
          onClick={() => setShowResultPanel(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="mt-2">
        {activePanelType === 'translate' && translatedText}
        {activePanelType === 'ai' && aiExplanation}
        {activePanelType === 'grammar' && grammarAnalysis}
      </div>
    </div>
  );

  // 渲染单个页面的组件
  const renderPage = (pageIndex: number) => (
    <div 
      key={`page_${pageIndex}`} 
      ref={ref => pageRefs.current[pageIndex - 1] = ref}
      className="mb-4"
    >
      <Page
        pageNumber={pageIndex}
        scale={scale}
        renderTextLayer={true}
        renderAnnotationLayer={true}
        loading={<LoadingComponent />}
        className="shadow-lg"
      />
      {continuousMode && (
        <div className="text-center text-sm text-gray-500 mt-2">
          第 {pageIndex} 页
        </div>
      )}
    </div>
  );

  // 固定工具栏样式
  const fixedToolbarStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #d1d5db',
    padding: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  };

  // 内容区域样式（考虑工具栏高度）
  const contentStyle: React.CSSProperties = {
    marginTop: '80px', // 工具栏的大致高度
    flexGrow: 1,
    height: 'calc(100vh - 160px)', // 减去工具栏和底部导航的高度
    overflow: 'auto'
  };

  return (
    <div 
      className="flex flex-col h-full w-full border border-gray-300 rounded-lg overflow-hidden shadow-lg"
      ref={containerRef}
      style={{ position: 'relative', height: '100vh' }}
    >
      {/* 工具栏 - 使用内联样式固定位置 */}
      <div 
        className="flex flex-wrap justify-between items-center"
        style={fixedToolbarStyle}
      >
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors disabled:bg-gray-400"
            aria-label="上一页"
          >
            上一页
          </button>
          <span className="px-3 py-2 bg-white rounded border border-gray-300">
            {pageNumber} / {numPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors disabled:bg-gray-400"
            aria-label="下一页"
          >
            下一页
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={zoomOut} 
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
            aria-label="缩小"
          >
            -
          </button>
          <span className="px-2 py-1 bg-white rounded border border-gray-300 min-w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button 
            onClick={zoomIn} 
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
            aria-label="放大"
          >
            +
          </button>
          <button 
            onClick={resetZoom} 
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded ml-2 transition-colors"
            aria-label="重置缩放"
          >
            重置
          </button>
          <button 
            onClick={toggleContinuousMode} 
            className={`ml-4 px-3 py-1 rounded transition-colors ${
              continuousMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
            }`}
            aria-label="切换连续滚动模式"
            disabled={loading}
          >
            {continuousMode ? '单页模式' : '连续滚动'}
          </button>
        </div>
      </div>

      {/* PDF查看区域 - 使用内联样式调整位置 */}
      <div 
        className="bg-gray-200 p-4 flex justify-center relative"
        ref={pdfContainerRef}
        style={contentStyle}
      >
        <div className="pdf-container">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<LoadingComponent />}
            error={<ErrorComponent />}
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
          >
            {loading ? (
              <LoadingComponent />
            ) : continuousMode ? (
              // 连续滚动模式：渲染所有页面
              Array.from(
                new Array(numPages),
                (_, index) => renderPage(index + 1)
              )
            ) : (
              // 单页模式：只渲染当前页
              renderPage(pageNumber)
            )}
          </Document>
        </div>
        
        {/* 文本选择菜单 */}
        {showTextMenu && <TextSelectionMenu />}
        
        {/* 结果面板 */}
        {showResultPanel && <ResultPanel />}
      </div>

      {/* 页码导航 - 底部固定 */}
      <div 
        className="bg-gray-100 p-4 border-t border-gray-300"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: '#f3f4f6',
        }}
      >
        <div className="flex justify-center items-center">
          <span className="mr-2">跳转到页码:</span>
          <input
            type="number"
            min="1"
            max={numPages}
            value={pageNumber}
            onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
            className="border rounded px-2 py-1 w-16 text-center"
            aria-label="页码输入"
          />
          <span className="mx-2">共 {numPages} 页</span>
        </div>
        
        {/* 显示当前选中的文本 */}
        {selectedText && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm max-h-20 overflow-auto">
            <strong>选中文本:</strong> {selectedText}
          </div>
        )}
        
        {/* 新增：显示收藏的生词列表 */}
        {savedWords.length > 0 && (
          <div className="mt-3">
            <div className="font-medium mb-1">收藏的生词:</div>
            <div className="flex flex-wrap gap-2">
              {savedWords.map((word, index) => (
                <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;