import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File, bytes: Uint8Array) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = 'application/pdf',
  multiple = false,
  label = 'Drop your PDF here',
  sublabel = 'or click to browse',
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    onFileSelect(file, new Uint8Array(buffer));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (multiple) {
      for (const file of Array.from(e.dataTransfer.files)) {
        if (file.type === 'application/pdf') {
          await handleFile(file);
        }
      }
    } else {
      const file = e.dataTransfer.files[0];
      if (file) await handleFile(file);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (multiple) {
      for (const file of Array.from(files)) {
        await handleFile(file);
      }
    } else {
      if (files[0]) await handleFile(files[0]);
    }

    e.target.value = '';
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        group cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200
        ${dragOver
          ? 'border-violet-400 bg-violet-50'
          : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'}
      `}
    >
      <div className={`
        w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors duration-200
        ${dragOver ? 'bg-violet-100' : 'bg-gray-100 group-hover:bg-violet-100'}
      `}>
        <svg
          className={`w-5 h-5 transition-colors duration-200 ${dragOver ? 'text-violet-600' : 'text-gray-400 group-hover:text-violet-600'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
      </div>
      <p className="text-gray-700 font-medium text-sm mb-1">{label}</p>
      <p className="text-xs text-gray-400">{sublabel}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

export default FileUpload;
