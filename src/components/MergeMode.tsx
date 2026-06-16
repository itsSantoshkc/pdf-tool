import React, { useState, useRef } from 'react';
import { renderPageToDataUrl, mergePdfs, getPageCount } from '../pdfUtils';

interface PdfFile {
  id: string;
  name: string;
  bytes: Uint8Array;
  thumbnail: string;
  pageCount: number;
}

interface MergeModeProps {
  pdfBytes: Uint8Array | null;
  fileName: string;
  onMergeToMain: (files: { bytes: Uint8Array; fileName: string }[]) => Promise<void>;
}

const MergeMode: React.FC<MergeModeProps> = ({ pdfBytes, fileName, onMergeToMain }) => {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (fileList: FileList | File[]) => {
    setRendering(true);
    for (const file of Array.from(fileList)) {
      if (file.type !== 'application/pdf') continue;
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const thumbnail = await renderPageToDataUrl(bytes, 1, 0.4);
        const pageCount = await getPageCount(bytes);
        setFiles((prev) => [
          ...prev,
          { id: crypto.randomUUID(), name: file.name, bytes, thumbnail, pageCount },
        ]);
      } catch {
        alert(`Failed to read ${file.name}`);
      }
    }
    setRendering(false);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await addFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleMergeAndDownload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const allFiles = pdfBytes
        ? [{ bytes: pdfBytes, fileName }, ...files.map((f) => ({ bytes: f.bytes, fileName: f.name }))]
        : files.map((f) => ({ bytes: f.bytes, fileName: f.name }));
      const outputName = pdfBytes
        ? `${fileName.replace(/\.pdf$/i, '')}_merged.pdf`
        : 'merged.pdf';
      await mergePdfs(allFiles, outputName);
    } catch {
      alert('Failed to merge PDFs');
    }
    setLoading(false);
  };

  const handleMergeToMain = async () => {
    if (files.length === 0) return;
    setMerging(true);
    try {
      const additional = files.map((f) => ({ bytes: f.bytes, fileName: f.name }));
      await onMergeToMain(additional);
      setFiles([]);
    } catch {
      alert('Failed to merge into main document');
    }
    setMerging(false);
  };

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          group cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
          ${dragOver
            ? 'border-violet-400 bg-violet-50'
            : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'}
        `}
      >
        <div className={`
          w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 transition-colors duration-200
          ${dragOver ? 'bg-violet-100' : 'bg-gray-100 group-hover:bg-violet-100'}
        `}>
          <svg className={`w-5 h-5 transition-colors duration-200 ${dragOver ? 'text-violet-600' : 'text-gray-400 group-hover:text-violet-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium text-sm mb-1">Drop PDFs to merge</p>
        <p className="text-xs text-gray-400">{pdfBytes ? 'Add more files to merge with the main document' : 'Add two or more files'}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      {rendering && (
        <div className="flex items-center justify-center py-6">
          <div className="relative">
            <div className="w-8 h-8 border-4 border-gray-200 rounded-full" />
            <div className="absolute top-0 left-0 w-8 h-8 border-4 border-transparent border-t-violet-500 rounded-full animate-spin" />
          </div>
          <span className="ml-3 text-sm text-gray-500">Processing...</span>
        </div>
      )}

      {files.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">{files.length}</span> file{files.length > 1 ? 's' : ''} &middot;{' '}
              <span className="font-medium text-gray-900">{totalPages}</span> pages
            </p>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group"
              >
                <div className="w-12 h-14 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                  <img src={file.thumbnail} alt="" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{file.pageCount} pages</p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveFile(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md disabled:opacity-30 transition-colors"
                    title="Move up"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveFile(index, 1)}
                    disabled={index === files.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md disabled:opacity-30 transition-colors"
                    title="Move down"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Two action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleMergeAndDownload}
              disabled={loading || files.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {loading ? 'Merging...' : 'Merge & Download'}
            </button>
            {pdfBytes && (
              <button
                onClick={handleMergeToMain}
                disabled={merging || files.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {merging ? 'Merging...' : 'Merge to Main'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MergeMode;
