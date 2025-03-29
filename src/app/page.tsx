'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [pdfSource, setPdfSource] = useState('');
  const [fileData, setFileData] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState('url'); // 'url' 或 'file'
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfSource(e.target.value || '');

    if (!e.target.files) return;
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFileData(file);
      setSourceType('file');
    } else {
      alert('请选择有效的PDF文件');
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    
    setPdfSource(e.target.value);
    setSourceType('url');
    setFileData(null);
  };

  const startReading = () => {
    if (sourceType === 'url' && pdfSource) {
      // 对URL进行编码，以便安全传递
      const encodedUrl = encodeURIComponent(pdfSource);
      router.push(`/reader?url=${encodedUrl}`);
    } else if (sourceType === 'file' && fileData) {
      // 对于文件，我们需要先将其转换为 Base64，然后存储到 sessionStorage
      const reader = new FileReader();
      reader.onload = function(e: ProgressEvent<FileReader>) {
        const base64Data = e.target?.result;
        if (!base64Data) return;
        // 将文件数据存储到 sessionStorage
        sessionStorage.setItem('pdfData', base64Data.toString());
        sessionStorage.setItem('pdfName', fileData.name);
        router.push('/reader?source=local');
      };
      reader.readAsDataURL(fileData);
    } else {
      alert('请先选择PDF文件或输入PDF链接');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <main className="p-6 bg-white rounded-lg shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-6">PDF阅读器</h1>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-2">选择文件来源</h2>
            <div className="flex space-x-4 mb-4">
              <button 
                onClick={() => setSourceType('url')}
                className={`px-4 py-2 rounded ${sourceType === 'url' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                网络链接
              </button>
              <button 
                onClick={() => setSourceType('file')}
                className={`px-4 py-2 rounded ${sourceType === 'file' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                本地文件
              </button>
            </div>
          </div>

          {sourceType === 'url' ? (
            <div>
              <label htmlFor="pdf-url" className="block text-sm font-medium text-gray-700 mb-1">
                PDF网址
              </label>
              <input
                type="url"
                id="pdf-url"
                value={pdfSource }
                onChange={handleUrlChange}
                placeholder="https://example.com/sample.pdf"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="pdf-file" className="block text-sm font-medium text-gray-700 mb-1">
                选择PDF文件
              </label>
              <input
                type="file"
                id="pdf-file"
                accept="application/pdf"
                onChange={handleFileChange}
                value={pdfSource}
                className="w-full border border-gray-300 rounded-md p-2"
              />
              {fileData && (
                <p className="mt-2 text-sm text-gray-600">已选择: {fileData.name}</p>
              )}
            </div>
          )}

          <button
            onClick={startReading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            开始阅读
          </button>
        </div>
      </main>
    </div>
  );
}