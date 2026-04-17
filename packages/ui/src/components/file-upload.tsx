import * as React from "react";
import { Upload, X, File as FileIcon } from "lucide-react";
import { cn } from "../lib/cn";

export interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void;
  onFileRemove?: (file: File) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
  files?: File[];
}

export function FileUpload({
  onFilesSelected,
  onFileRemove,
  accept,
  multiple = false,
  maxSizeMB,
  disabled = false,
  className,
  label = "Arrastra archivos aquí o haz click",
  description,
  files: externalFiles,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [internalFiles, setInternalFiles] = React.useState<File[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const files = externalFiles ?? internalFiles;

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    let arr = Array.from(list);
    if (maxSizeMB) {
      arr = arr.filter((f) => f.size <= maxSizeMB * 1024 * 1024);
    }
    if (!multiple) arr = arr.slice(0, 1);
    if (!externalFiles) setInternalFiles(arr);
    onFilesSelected?.(arr);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (f: File) => {
    if (!externalFiles) {
      setInternalFiles((prev) => prev.filter((x) => x !== f));
    }
    onFileRemove?.(f);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200",
          isDragging
            ? "border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)]"
            : "border-[hsl(var(--color-border))] bg-slate-50 hover:border-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-primary)/0.03)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="h-14 w-14 rounded-full bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center">
          <Upload className="h-6 w-6 text-[hsl(var(--color-primary))]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">{label}</p>
          {description && (
            <p className="text-xs text-[hsl(var(--color-muted))] mt-1">
              {description}
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3"
            >
              <FileIcon className="h-4 w-4 text-[hsl(var(--color-muted))] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-[hsl(var(--color-muted))]">
                  {(f.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(f)}
                className="p-1 rounded-full hover:bg-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
