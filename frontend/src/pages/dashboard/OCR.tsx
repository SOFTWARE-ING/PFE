import React, { useState, useRef } from "react";
import {
  ScanText,
  Upload,
  FileText,
  Copy,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { ocrAPI } from "../../services/api";
import type { OCRResponse } from "../../types";

const ALLOWED = ["pdf", "docx", "png", "jpg", "jpeg"];

export default function OCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const validateFile = (f: File): string => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED.includes(ext)) {
      return `Format non supporté (.${ext}). Formats acceptés : ${ALLOWED.join(", ")}`;
    }
    if (f.size > 20 * 1024 * 1024) {
      return "Le fichier ne doit pas dépasser 20 Mo.";
    }
    return "";
  };

  const pickFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
    } else {
      setError("");
      setFile(f);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) pickFile(dropped);
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await ocrAPI.extract(file);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'extraction");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.extracted_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-army-900 dark:text-army-50">
          Extraction OCR
        </h1>
        <p className="text-sm text-army-500 dark:text-army-400 mt-0.5">
          Extrayez le texte de vos documents pour indexation et recherche
        </p>
      </div>

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-150 p-10 text-center",
          dragging
            ? "border-army-600 bg-army-600 dark:bg-army-600/30"
            : "border-army-200 dark:border-army-800 hover:border-army-600 dark:hover:border-army-600 hover:bg-army-50 dark:hover:bg-army-900/50 bg-white dark:bg-army-900",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
          }}
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText
              size={24}
              className="text-army-600 dark:text-army-600 shrink-0"
            />
            <div className="text-left">
              <p className="text-sm font-medium text-army-800 dark:text-army-200">
                {file.name}
              </p>
              <p className="text-xs text-army-400 dark:text-army-500">
                {(file.size / 1024).toFixed(1)} Ko
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="ml-2 p-1 rounded-md hover:bg-army-200 dark:hover:bg-army-700 text-army-400 hover:text-army-600 dark:hover:text-army-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload
              size={32}
              className="mx-auto text-army-300 dark:text-army-700 mb-3"
            />
            <p className="text-sm font-medium text-army-600 dark:text-army-400">
              Glissez-déposez un fichier ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-army-400 dark:text-army-600 mt-1">
              PDF, DOCX, PNG, JPG, JPEG · Max 20 Mo
            </p>
          </>
        )}
      </div>

      {error && <Alert variant="error" message={error} />}

      {file && !result && (
        <Button
          onClick={() => void handleExtract()}
          loading={loading}
          icon={<ScanText size={16} />}
          className="w-full"
        >
          {loading ? "Extraction en cours…" : "Extraire le texte"}
        </Button>
      )}

      {/* Result */}
      {result && (
        <Card padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-army-200 dark:border-army-800">
            <div className="flex items-center gap-2">
              <ScanText
                size={16}
                className="text-army-600 dark:text-army-600"
              />
              <span className="text-sm font-semibold text-army-800 dark:text-army-200">
                Texte extrait — {result.filname}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                onClick={() => void handleCopy()}
              >
                {copied ? "Copié !" : "Copier"}
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                Nouveau fichier
              </Button>
            </div>
          </div>
          <div className="p-5">
            <pre className="text-xs text-army-700 dark:text-army-300 whitespace-pre-wrap leading-relaxed font-mono max-h-96 overflow-y-auto">
              {result.extracted_text || "(Aucun texte extrait)"}
            </pre>
          </div>
          <div className="px-5 py-3 border-t border-army-100 dark:border-army-800 bg-army-50 dark:bg-army-800/40 rounded-b-xl">
            <p className="text-[11px] text-army-400 dark:text-army-500">
              {result.extracted_text.length} caractères extraits ·{" "}
              {result.message}
            </p>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card padding="sm">
        <div className="flex items-start gap-3">
          <Loader2
            size={16}
            className="text-army-600 dark:text-army-600 mt-0.5 shrink-0"
          />
          <p className="text-xs text-army-500 dark:text-army-400 leading-relaxed">
            Le texte extrait peut être utilisé pour l'indexation et la
            recherche. Les documents PDF et images utilisent Tesseract OCR ;
            les fichiers DOCX sont traités en natif. Assurez-vous que les
            images soient lisibles pour de meilleurs résultats.
          </p>
        </div>
      </Card>
    </div>
  );
}
