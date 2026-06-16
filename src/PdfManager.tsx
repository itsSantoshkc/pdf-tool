import React, { useState, useRef } from 'react';
import SplitMode from './components/SplitMode';
import MergeMode from './components/MergeMode';
import ArrangeMode from './components/ArrangeMode';
import { mergePdfsToBytes } from './pdfUtils';

type Tab = 'split' | 'merge' | 'arrange';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'split',
    label: 'Split',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: 'merge',
    label: 'Merge',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    id: 'arrange',
    label: 'Arrange',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
];

const PdfManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('split');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(buffer));
    setFileName(file.name);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type !== 'application/pdf') return;
    const buffer = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(buffer));
    setFileName(file.name);
  };

  const removeFile = () => {
    setPdfBytes(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMergeToMain = async (additionalFiles: { bytes: Uint8Array; fileName: string }[]) => {
    if (!pdfBytes) return;
    const allFiles = [
      { bytes: pdfBytes, fileName },
      ...additionalFiles,
    ];
    const mergedBytes = await mergePdfsToBytes(allFiles);
    setPdfBytes(mergedBytes);
    setFileName('merged.pdf');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">PDF Tools</h2>
              <p className="text-sm text-gray-500">Split, merge, and rearrange your PDFs</p>
            </div>
          </div>

          {/* Upload area - shows when no PDF loaded */}
          {!pdfBytes && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                group cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 mb-6
                ${dragOver
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'}
              `}
            >
              <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors duration-200
                ${dragOver ? 'bg-violet-100' : 'bg-gray-100 group-hover:bg-violet-100'}
              `}>
                <svg className={`w-5 h-5 transition-colors duration-200 ${dragOver ? 'text-violet-600' : 'text-gray-400 group-hover:text-violet-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium text-sm mb-1">Drop your PDF here</p>
              <p className="text-xs text-gray-400">or click to browse</p>
            </div>
          )}

          {/* File info bar - shows when PDF loaded */}
          {pdfBytes && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                <p className="text-xs text-gray-500">PDF Document</p>
              </div>
              <button
                onClick={removeFile}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'split' && (
            <SplitMode pdfBytes={pdfBytes} fileName={fileName} />
          )}
          {activeTab === 'merge' && (
            <MergeMode
              pdfBytes={pdfBytes}
              fileName={fileName}
              onMergeToMain={handleMergeToMain}
            />
          )}
          {activeTab === 'arrange' && (
            <ArrangeMode pdfBytes={pdfBytes} fileName={fileName} />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default PdfManager;
