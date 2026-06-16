import React, { useState, useEffect } from 'react';
import { renderPageToDataUrl, getPageCount, extractPages } from '../pdfUtils';

interface SplitModeProps {
  pdfBytes: Uint8Array | null;
  fileName: string;
}

const SplitMode: React.FC<SplitModeProps> = ({ pdfBytes, fileName }) => {
  const [numPages, setNumPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!pdfBytes) return;

    let cancelled = false;

    const load = async () => {
      setRendering(true);
      setSelected(new Set());
      const count = await getPageCount(pdfBytes);

      const thumbs: string[] = [];
      for (let i = 1; i <= count; i++) {
        const url = await renderPageToDataUrl(pdfBytes, i, 0.4);
        thumbs.push(url);
      }

      if (!cancelled) {
        setNumPages(count);
        setThumbnails(thumbs);
        setRendering(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pdfBytes]);

  const togglePage = (pageNum: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(Array.from({ length: numPages }, (_, i) => i + 1)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleExtract = async () => {
    if (!pdfBytes || selected.size === 0) return;
    setLoading(true);
    try {
      await extractPages(pdfBytes, fileName, Array.from(selected).sort((a, b) => a - b));
    } catch {
      alert('Failed to extract pages');
    }
    setLoading(false);
  };

  if (!pdfBytes) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-400">Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">{numPages}</span> pages found
        </p>
        <div className="flex gap-2">
          <button onClick={selectAll} className="text-xs text-violet-600 hover:text-violet-700 font-medium">Select all</button>
          <span className="text-gray-300">|</span>
          <button onClick={deselectAll} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Deselect all</button>
        </div>
      </div>

      {rendering ? (
        <div className="flex items-center justify-center py-12">
          <div className="relative">
            <div className="w-8 h-8 border-4 border-gray-200 rounded-full" />
            <div className="absolute top-0 left-0 w-8 h-8 border-4 border-transparent border-t-violet-500 rounded-full animate-spin" />
          </div>
          <span className="ml-3 text-sm text-gray-500">Rendering pages...</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {thumbnails.map((thumb, i) => {
            const pageNum = i + 1;
            const isSelected = selected.has(pageNum);
            return (
              <button
                key={pageNum}
                onClick={() => togglePage(pageNum)}
                className={`
                  relative group rounded-xl overflow-hidden border-2 transition-all duration-150
                  ${isSelected
                    ? 'border-violet-500 ring-2 ring-violet-200 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
                `}
              >
                <img src={thumb} alt={`Page ${pageNum}`} className="w-full h-auto block" />
                <div className={`
                  absolute inset-0 transition-opacity duration-150
                  ${isSelected ? 'bg-violet-500/10' : 'bg-transparent group-hover:bg-black/5'}
                `} />
                <div className={`
                  absolute bottom-1.5 left-1.5 text-xs font-medium px-1.5 py-0.5 rounded-md
                  ${isSelected
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/90 text-gray-700 shadow-sm'}
                `}>
                  {pageNum}
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl border border-violet-100">
          <span className="text-sm text-violet-700 font-medium">
            {selected.size} page{selected.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleExtract}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Extracting...' : 'Download Selected'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SplitMode;
