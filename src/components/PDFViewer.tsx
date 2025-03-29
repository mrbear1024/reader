'use client';

import React, { useState } from 'react';
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

  // 文档加载成功处理函数
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
    setNumPages(numPages);
    setLoading(false);
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
    }
  };

  const goToPrevPage = (): void => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToPage = (page: number): void => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
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

  return (
    <div className="flex flex-col h-full w-full border border-gray-300 rounded-lg overflow-hidden shadow-lg">
      {/* 工具栏 */}
      <div className="bg-gray-100 p-4 flex flex-wrap justify-between items-center border-b border-gray-300">
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
        </div>
      </div>

      {/* PDF查看区域 */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4 flex justify-center">
        <div className="pdf-container">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<LoadingComponent />}
            error={<ErrorComponent />}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<LoadingComponent />}
              className="shadow-lg"
            />
          </Document>
        </div>
      </div>

      {/* 页码导航 */}
      <div className="bg-gray-100 p-4 border-t border-gray-300">
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
      </div>
    </div>
  );
};

export default PDFViewer;