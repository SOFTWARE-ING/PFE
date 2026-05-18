import React, { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, CheckCircle, Download,
  Archive, Loader2, Move, AlertCircle, RotateCcw,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { documentsAPI } from "../../services/api";
import type { UploadResponse, FinalizeResponse } from "../../services/api";

type Step = "upload" | "position" | "done";

interface QRPosition {
  x: number;
  y: number;
  page: number;
  size: number;
}

export default function SignPage() {
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [finalizeData, setFinalizeData] = useState<FinalizeResponse | null>(null);
  const [archived, setArchived] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [signData, setSignData] = useState<{ signature_id: string; qr_code: string } | null>(null);

  const [qrPos, setQrPos] = useState<QRPosition>({ x: 50, y: 50, page: 1, size: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ mx: number; my: number; qx: number; qy: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: Upload + Sign ───────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setError("Veuillez sélectionner un fichier PDF.");
      return;
    }
    const title = file.name.replace(".pdf", "").replace(/_/g, " ");
    setLoading(true);
    setError("");
    try {
      // Step 1: Upload
      const uploadResult = await documentsAPI.upload(file, title);
      setUploadData(uploadResult);
      setOriginalFile(file);

      // Step 2: Sign automatically
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
      const token = localStorage.getItem("shield_token");
      const fd = new FormData();
      fd.append("communique_id", uploadResult.communique_id);

      const signRes = await fetch(`${API_URL}/documents/sign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `Erreur signature: ${signRes.status}`);
      }

      const signJson = await signRes.json() as { signature_id: string; qr_code: string };
      setSignData({ signature_id: signJson.signature_id, qr_code: signJson.qr_code });
      setStep("position");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  // ── Step 2: QR drag on preview ─────────────────────────────────────────

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, qx: qrPos.x, qy: qrPos.y };
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    const newX = Math.max(0, Math.min(rect.width - qrPos.size, dragStart.current.qx + dx));
    const newY = Math.max(0, Math.min(rect.height - qrPos.size, dragStart.current.qy + dy));
    setQrPos((p) => ({ ...p, x: newX, y: newY }));
  }, [isDragging, qrPos.size]);

  const onMouseUp = () => setIsDragging(false);

  // ── Step 3: Finalize (embed QR into PDF) ───────────────────────────────

  const handleFinalize = async () => {
    if (!uploadData || !signData || !originalFile || !previewRef.current) return;
    setLoading(true);
    setError("");
    try {
      const previewW = previewRef.current.offsetWidth;
      const previewH = previewRef.current.offsetHeight;
      const pdfW = 595;
      const pdfH = 842;
      const pdfX = (qrPos.x / previewW) * pdfW;
      const pdfY = pdfH - ((qrPos.y + qrPos.size) / previewH) * pdfH;
      const data = await documentsAPI.finalize(
        uploadData.communique_id,
        signData.signature_id,
        originalFile,
        pdfX,
        pdfY,
        qrPos.size
      );
      setFinalizeData(data);
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la finalisation.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Archive ────────────────────────────────────────────────────

  const handleArchive = async () => {
    if (!uploadData) return;
    setLoading(true);
    setError("");
    try {
      await documentsAPI.archive(uploadData.communique_id);
      setArchived(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'archivage.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setUploadData(null);
    setFinalizeData(null);
    setSignData(null);
    setOriginalFile(null);
    setArchived(false);
    setError("");
    setQrPos({ x: 50, y: 50, page: 1, size: 80 });
  };

  // ── Stepper ────────────────────────────────────────────────────────────

  const steps = [
    { key: "upload", label: "Téléverser" },
    { key: "position", label: "Positionner QR" },
    { key: "done", label: "Finaliser" },
  ];

  const stepIndex = step === "upload" ? 0 : step === "position" ? 1 : 2;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-army-900 dark:text-army-50">
          Signer un document
        </h1>
        <p className="text-sm text-army-500 dark:text-army-400 mt-0.5">
          Téléversez votre PDF, positionnez le QR code et téléchargez le document signé.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-2">
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                i < stepIndex
                  ? "bg-emerald-500 text-white"
                  : i === stepIndex
                  ? "bg-army-600 text-white"
                  : "bg-army-200 dark:bg-army-700 text-army-500 dark:text-army-400",
              ].join(" ")}>
                {i < stepIndex ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={[
                "text-xs font-medium hidden sm:block",
                i === stepIndex ? "text-army-600 dark:text-army-600" : "text-army-400",
              ].join(" ")}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={[
                "flex-1 h-px",
                i < stepIndex ? "bg-emerald-400" : "bg-army-200 dark:bg-army-700",
              ].join(" ")} />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && <Alert variant="error" message={error} />}

      {/* ── STEP 1: Upload ── */}
      {step === "upload" && (
        <Card padding="none">
          <div
            className={[
              "relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
              dragOver
                ? "border-army-600 bg-army-600 dark:bg-army-600/30"
                : "border-army-200 dark:border-army-700 hover:border-army-600 dark:hover:border-army-600",
            ].join(" ")}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={36} className="animate-spin text-army-600" />
                <p className="text-sm text-army-600 dark:text-army-400">
                  Téléversement et signature en cours…
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-army-600 dark:bg-army-600/40 flex items-center justify-center">
                  <Upload size={24} className="text-army-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-army-800 dark:text-army-200">
                    Glissez votre PDF ici ou cliquez pour choisir
                  </p>
                  <p className="text-xs text-army-400 dark:text-army-500 mt-1">
                    Fichiers PDF uniquement
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── STEP 2: Position QR ── */}
      {step === "position" && uploadData && (
        <div className="space-y-4">

          {/* Document info */}
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-army-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-army-800 dark:text-army-200 truncate">
                  {uploadData.titre}
                </p>
                <p className="text-xs text-army-400 font-mono mt-0.5">
                  Hash: {uploadData.hash?.slice(0, 24)}…
                </p>
              </div>
              <CheckCircle size={16} className="text-emerald-500 shrink-0 ml-auto" />
            </div>
          </Card>

          {/* QR size control */}
          <Card padding="sm">
            <div className="flex items-center gap-4">
              <span className="text-xs text-army-500 dark:text-army-400 shrink-0">Taille QR :</span>
              <input
                type="range" min={50} max={150} value={qrPos.size}
                onChange={(e) => setQrPos((p) => ({ ...p, size: Number(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-xs font-mono text-army-600 dark:text-army-300 w-10 text-right">
                {qrPos.size}px
              </span>
            </div>
          </Card>

          {/* PDF Preview with draggable QR */}
          <Card padding="none" className="overflow-hidden">
            <div className="px-4 py-3 border-b border-army-200 dark:border-army-800 flex items-center gap-2">
              <Move size={14} className="text-army-400" />
              <span className="text-xs text-army-500 dark:text-army-400">
                Glissez le QR code à l'emplacement souhaité sur le document
              </span>
            </div>
            <div
              ref={previewRef}
              className="relative bg-army-100 dark:bg-army-800 select-none"
              style={{ minHeight: 500, cursor: isDragging ? "grabbing" : "default" }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <div
                className="mx-auto bg-white dark:bg-army-900 shadow-lg"
                style={{ width: "100%", minHeight: 500, position: "relative" }}
              >
                {/* Simulated text lines */}
                <div className="p-8 space-y-3 pointer-events-none">
                  <div className="h-4 bg-army-200 dark:bg-army-700 rounded w-2/3 mx-auto" />
                  <div className="h-3 bg-army-100 dark:bg-army-800 rounded w-full" />
                  <div className="h-3 bg-army-100 dark:bg-army-800 rounded w-5/6" />
                  <div className="h-3 bg-army-100 dark:bg-army-800 rounded w-full" />
                  <div className="h-3 bg-army-100 dark:bg-army-800 rounded w-4/5" />
                  <div className="mt-4 p-3 bg-army-50 dark:bg-army-800/50 rounded border border-army-200 dark:border-army-700">
                    <p className="text-xs text-army-500 dark:text-army-400 text-center italic">
                      Aperçu du document — positionnez le QR code sur une zone vide
                    </p>
                  </div>
                  <div className="h-3 bg-army-100 dark:bg-army-800 rounded w-full mt-4" />
                  <div className="h-3 bg-army-100 dark:bg-army-800 rounded w-3/4" />
                  <div className="h-3 bg-army-100 dark:bg-army-800 rounded w-full" />
                  <div className="h-3 bg-army-100 dark:bg-army-800 rounded w-5/6" />
                </div>

                {/* Draggable QR */}
                <div
                  className="absolute border-2 border-army-600 bg-army-600 dark:bg-army-600/50 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
                  style={{ left: qrPos.x, top: qrPos.y, width: qrPos.size, height: qrPos.size }}
                  onMouseDown={onMouseDown}
                >
                  {signData?.qr_code ? (
                    <img
                      src={signData.qr_code}
                      alt="QR"
                      className="w-full h-full object-contain pointer-events-none rounded"
                    />
                  ) : (
                    <div className="text-center pointer-events-none">
                      <div className="grid grid-cols-3 gap-0.5 w-8 mx-auto mb-1">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className={["w-2 h-2 rounded-sm",
                            [0, 2, 6, 8].includes(i)
                              ? "bg-army-600 dark:bg-army-600"
                              : i === 4
                              ? "bg-army-600"
                              : "bg-army-600 dark:bg-army-600",
                          ].join(" ")} />
                        ))}
                      </div>
                      <span className="text-[8px] text-army-600 dark:text-army-600 font-bold">QR</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleReset} icon={<RotateCcw size={14} />}>
              Recommencer
            </Button>
            <Button
              onClick={() => void handleFinalize()}
              loading={loading}
              icon={<CheckCircle size={14} />}
            >
              Valider la position
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === "done" && finalizeData && (
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-army-900 dark:text-army-50">
                  Document signé avec succès !
                </h2>
                <p className="text-sm text-army-500 dark:text-army-400 mt-1">
                  Le QR code a été intégré au document PDF.
                </p>
              </div>
            </div>
          </Card>

          {/* Download */}
          <Card padding="sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={18} className="text-army-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-army-800 dark:text-army-200 truncate">
                    {uploadData?.titre}
                  </p>
                  <p className="text-xs text-army-400 dark:text-army-500 mt-0.5">
                    Document signé prêt au téléchargement
                  </p>
                </div>
              </div>
              <a
                href={documentsAPI.downloadUrl(finalizeData.communique_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button variant="secondary" size="sm" icon={<Download size={14} />}>
                  Télécharger
                </Button>
              </a>
            </div>
          </Card>

          {/* Archive prompt */}
          {!archived ? (
            <Card padding="md" className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Archiver ce document ?
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    L'archivage rend le document accessible via la recherche publique et permet aux citoyens de le télécharger.
                    Les documents non archivés restent privés.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => void handleArchive()}
                      loading={loading}
                      icon={<Archive size={13} />}
                    >
                      Oui, archiver
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleReset}>
                      Non, plus tard
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card padding="sm" className="border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-3">
                <CheckCircle size={16} className="text-emerald-500" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Document archivé — il est maintenant visible dans la recherche publique.
                </p>
              </div>
            </Card>
          )}

          {archived && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleReset} icon={<RotateCcw size={14} />}>
                Signer un autre document
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}