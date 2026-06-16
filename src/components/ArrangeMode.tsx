import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { renderPageToDataUrl, renderPageToCanvas, getPageCount, rearrangeAndSave } from '../pdfUtils';

interface PageItem {
  id: string;
  pageNumber: number;
  thumbnail: string;
}

interface SortablePageProps {
  item: PageItem;
  index: number;
  previewPageNum: number | null;
  onPreview: (pageNum: number) => void;
  onClosePreview: () => void;
  onDelete: (id: string) => void;
}

const SortablePage: React.FC<SortablePageProps> = ({
  item,
  index,
  previewPageNum,
  onPreview,
  onClosePreview,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto' as const,
    opacity: isDragging ? 0.8 : 1,
  };

  const isPreviewing = previewPageNum === item.pageNumber;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className={`
          relative rounded-xl overflow-hidden border-2 transition-all duration-150 bg-white touch-none select-none
          ${isDragging
            ? 'border-violet-500 shadow-2xl scale-105 cursor-grabbing'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-grab'}
        `}
      >
        <img src={item.thumbnail} alt={`Page ${item.pageNumber}`} className="w-full h-auto block pointer-events-none" />

        {/* Page number badge */}
        <div className="absolute bottom-1.5 left-1.5 text-xs font-medium bg-white/90 text-gray-700 px-1.5 py-0.5 rounded-md shadow-sm pointer-events-none">
          {index + 1}
        </div>

        {/* Action buttons */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (isPreviewing) onClosePreview(); else onPreview(item.pageNumber);
            }}
            className={`
              w-7 h-7 rounded-lg flex items-center justify-center
              ${isPreviewing
                ? 'bg-violet-600 text-white'
                : 'bg-white/90 text-gray-600 hover:bg-violet-600 hover:text-white shadow-sm'}
            `}
            title={isPreviewing ? 'Close preview' : 'Full preview'}
          >
            {isPreviewing ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            )}
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/90 text-gray-600 hover:bg-red-500 hover:text-white shadow-sm transition-colors"
            title="Delete page"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ArrangeModeProps {
  pdfBytes: Uint8Array | null;
  fileName: string;
}

const ArrangeMode: React.FC<ArrangeModeProps> = ({ pdfBytes, fileName }) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [previewPageNum, setPreviewPageNum] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } })
  );

  useEffect(() => {
    if (!pdfBytes) return;

    let cancelled = false;

    const load = async () => {
      setRendering(true);
      setPreviewPageNum(null);
      const count = await getPageCount(pdfBytes);
      const items: PageItem[] = [];

      for (let i = 1; i <= count; i++) {
        const thumbnail = await renderPageToDataUrl(pdfBytes, i, 0.4);
        items.push({ id: `page-${i}`, pageNumber: i, thumbnail });
      }

      if (!cancelled) {
        setPages(items);
        setRendering(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [pdfBytes]);

  useEffect(() => {
    if (!pdfBytes || previewPageNum === null) return;

    const container = document.getElementById('preview-full-container');
    if (!container) return;

    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-auto block rounded-xl border border-gray-200';
    container.appendChild(canvas);

    renderPageToCanvas(pdfBytes, previewPageNum, canvas, 1.5);
  }, [pdfBytes, previewPageNum]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPages((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleDelete = (id: string) => {
    setPages((items) => items.filter((p) => p.id !== id));
    if (previewPageNum !== null) {
      setPreviewPageNum(null);
    }
  };

  const handleSave = async () => {
    if (!pdfBytes) return;
    setLoading(true);
    try {
      const newOrder = pages.map((p) => p.pageNumber);
      await rearrangeAndSave(pdfBytes, fileName, newOrder);
    } catch {
      alert('Failed to save rearranged PDF');
    }
    setLoading(false);
  };

  const resetOrder = () => {
    setPages((items) =>
      [...items].sort((a, b) => a.pageNumber - b.pageNumber)
    );
    setPreviewPageNum(null);
  };

  return (
    <div className="space-y-5">
      {!pdfBytes ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">Upload a PDF to get started</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">{pages.length}</span> pages &middot; drag to reorder
            </p>
            <button
              onClick={resetOrder}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Reset order
            </button>
          </div>

          {rendering ? (
            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <div className="w-8 h-8 border-4 border-gray-200 rounded-full" />
                <div className="absolute top-0 left-0 w-8 h-8 border-4 border-transparent border-t-violet-500 rounded-full animate-spin" />
              </div>
              <span className="ml-3 text-sm text-gray-500">Loading pages...</span>
            </div>
          ) : (
            <div className="flex gap-5">
              {/* Thumbnail grid */}
              <div className="flex-1">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {pages.map((item, index) => (
                        <SortablePage
                          key={item.id}
                          item={item}
                          index={index}
                          previewPageNum={previewPageNum}
                          onPreview={setPreviewPageNum}
                          onClosePreview={() => setPreviewPageNum(null)}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              {/* Full page preview panel */}
              {previewPageNum !== null && (
                <div className="hidden lg:block w-80 flex-shrink-0">
                  <div className="sticky top-24">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">Page {previewPageNum}</p>
                      <button
                        onClick={() => setPreviewPageNum(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                    <div
                      id="preview-full-container"
                      className="bg-gray-50 rounded-xl p-2 border border-gray-200 max-h-[500px] overflow-y-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {loading ? 'Saving...' : 'Download Rearranged PDF'}
          </button>
        </>
      )}
    </div>
  );
};

export default ArrangeMode;
