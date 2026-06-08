import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FileText, CheckCircle, Download,
  Archive, Loader2, Move, AlertCircle, RotateCcw,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { documentsAPI } from "../../services/api";

// ── pdf.js chargé depuis CDN ──────────────────────────────────────────────────
declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PDFDocumentProxy> };
      GlobalWorkerOptions: { workerSrc: string };
    };
  }
}
interface PDFDocumentProxy {
  getPage: (n: number) => Promise<PDFPageProxy>;
}
interface PDFPageProxy {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: ReturnType<PDFPageProxy["getViewport"]> }) => { promise: Promise<void> };
}

function loadPdfJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "upload" | "position" | "done";

interface UploadResponse  { communique_id: string; titre: string; hash?: string; }
interface FinalizeResponse { communique_id: string; }
interface QRPosition       { x: number; y: number; page: number; size: number; }

// ─── Composant principal ──────────────────────────────────────────────────────

export default function SignPage() {
  const [step, setStep]         = useState<Step>("upload");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [uploadData, setUploadData]     = useState<UploadResponse | null>(null);
  const [finalizeData, setFinalizeData] = useState<FinalizeResponse | null>(null);
  const [archived, setArchived]         = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [signData, setSignData]         = useState<{ signature_id: string; qr_code: string } | null>(null);

  const [qrPos, setQrPos]       = useState<QRPosition>({ x: 50, y: 50, page: 1, size: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [renderScale, setRenderScale] = useState(1);

  const previewRef  = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const dragStart   = useRef<{ mx: number; my: number; qx: number; qy: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfDocRef   = useRef<PDFDocumentProxy | null>(null);

  // ── Rendu PDF sur canvas ────────────────────────────────────────────────────

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    const page = await pdfDocRef.current.getPage(pageNum);
    const containerW = previewRef.current?.offsetWidth ?? 700;
    const viewport0  = page.getViewport({ scale: 1 });
    const scale      = containerW / viewport0.width;
    setRenderScale(scale);
    const viewport   = page.getViewport({ scale });
    const canvas     = canvasRef.current;
    canvas.width     = viewport.width;
    canvas.height    = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    await page.render({ canvasContext: ctx, viewport }).promise;
    setPdfReady(true);
  }, []);

  useEffect(() => {
    if (step === "position" && pdfDocRef.current) {
      void renderPage(qrPos.page);
    }
  }, [qrPos.page, step, renderPage]);

  // ── Step 1 : Upload + Sign ──────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Veuillez sélectionner un fichier PDF.");
      return;
    }
    const title = file.name.replace(/\.pdf$/i, "").replace(/_/g, " ");
    setLoading(true);
    setError("");
    try {
      // Charger pdf.js + lire le fichier en parallèle
      const [, arrayBuffer] = await Promise.all([
        loadPdfJs(),
        file.arrayBuffer(),
      ]);

      // Charger le document PDF pour l'aperçu
      const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = pdfDoc;
      setTotalPages(1); // sera mis à jour ci-dessous

      // Récupérer le nombre de pages
      const docProxy = pdfDoc as unknown as { numPages: number };
      setTotalPages(docProxy.numPages ?? 1);

      // Upload
      const uploadResult = await documentsAPI.upload(file, title);
      setUploadData(uploadResult);
      setOriginalFile(file);

      // Sign automatiquement
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
      const token   = localStorage.getItem("shield_token");
      const fd      = new FormData();
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

  // ── Drag du QR sur le canvas ────────────────────────────────────────────────

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, qx: qrPos.x, qy: qrPos.y };
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx   = e.clientX - dragStart.current.mx;
    const dy   = e.clientY - dragStart.current.my;
    const newX = Math.max(0, Math.min(rect.width  - qrPos.size, dragStart.current.qx + dx));
    const newY = Math.max(0, Math.min(rect.height - qrPos.size, dragStart.current.qy + dy));
    setQrPos((p) => ({ ...p, x: newX, y: newY }));
  }, [isDragging, qrPos.size]);

  const onMouseUp = () => setIsDragging(false);

  // Touch support (mobile)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setIsDragging(true);
    dragStart.current = { mx: t.clientX, my: t.clientY, qx: qrPos.x, qy: qrPos.y };
  };

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !dragStart.current || !canvasRef.current) return;
    e.preventDefault();
    const t    = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const dx   = t.clientX - dragStart.current.mx;
    const dy   = t.clientY - dragStart.current.my;
    const newX = Math.max(0, Math.min(rect.width  - qrPos.size, dragStart.current.qx + dx));
    const newY = Math.max(0, Math.min(rect.height - qrPos.size, dragStart.current.qy + dy));
    setQrPos((p) => ({ ...p, x: newX, y: newY }));
  }, [isDragging, qrPos.size]);

  // ── Step 3 : Finaliser ──────────────────────────────────────────────────────

  const handleFinalize = async () => {
    if (!uploadData || !signData || !originalFile || !canvasRef.current) return;
    setLoading(true);
    setError("");
    try {
      // Coordonnées canvas → coordonnées PDF réelles
      const canvasW = canvasRef.current.width;
      const canvasH = canvasRef.current.height;
      const pdfW    = canvasW  / renderScale;
      const pdfH    = canvasH  / renderScale;
      const pdfX    = (qrPos.x / canvasRef.current.getBoundingClientRect().width)  * pdfW;
      const pdfY    = pdfH - ((qrPos.y + qrPos.size) / canvasRef.current.getBoundingClientRect().height) * pdfH;
      const pdfSize = (qrPos.size / canvasRef.current.getBoundingClientRect().width) * pdfW;

      const data = await documentsAPI.finalize(
        uploadData.communique_id,
        signData.signature_id,
        originalFile,
        pdfX,
        pdfY,
        pdfSize,
      );
      setFinalizeData(data);
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la finalisation.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4 : Archiver ───────────────────────────────────────────────────────

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
    setPdfReady(false);
    pdfDocRef.current = null;
    setQrPos({ x: 50, y: 50, page: 1, size: 80 });
  };

  // ── Stepper ─────────────────────────────────────────────────────────────────

  const steps     = [
    { key: "upload",   label: "Téléverser"    },
    { key: "position", label: "Positionner QR" },
    { key: "done",     label: "Finaliser"      },
  ];
  const stepIndex = step === "upload" ? 0 : step === "position" ? 1 : 2;

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-100">
          Signer un document
        </h1>
        <p className="text-sm text-gray-500 dark:text-dark-400 mt-0.5">
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
                  : "bg-gray-200 dark:bg-dark-600 text-gray-500 dark:text-dark-400",
              ].join(" ")}>
                {i < stepIndex ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={[
                "text-xs font-medium hidden sm:block",
                i === stepIndex
                  ? "text-army-600 dark:text-army-400"
                  : "text-gray-400 dark:text-dark-400",
              ].join(" ")}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={[
                "flex-1 h-px",
                i < stepIndex ? "bg-emerald-400" : "bg-gray-200 dark:bg-dark-600",
              ].join(" ")} />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && <Alert variant="error" message={error} />}

      {/* ── STEP 1 : Upload ── */}
      {step === "upload" && (
        <Card padding="none">
          <div
            className={[
              "relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
              dragOver
                ? "border-army-500 bg-army-50 dark:bg-army-950/20"
                : "border-gray-200 dark:border-dark-500 hover:border-army-500 dark:hover:border-army-500",
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
                <div className="w-14 h-14 rounded-full bg-army-50 dark:bg-dark-700 flex items-center justify-center">
                  <Upload size={24} className="text-army-600 dark:text-army-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                    Glissez votre PDF ici ou cliquez pour choisir
                  </p>
                  <p className="text-xs text-gray-400 dark:text-dark-400 mt-1">
                    Fichiers PDF uniquement
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── STEP 2 : Positionner QR sur le vrai PDF ── */}
      {step === "position" && uploadData && (
        <div className="space-y-4">

          {/* Info document */}
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-army-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-dark-100 truncate">
                  {uploadData.titre}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Hash: {uploadData.hash?.slice(0, 24)}…
                </p>
              </div>
              <CheckCircle size={16} className="text-emerald-500 shrink-0 ml-auto" />
            </div>
          </Card>

          {/* Contrôles */}
          <Card padding="sm">
            <div className="flex flex-wrap items-center gap-4">
              {/* Taille QR */}
              <div className="flex items-center gap-3 flex-1 min-w-48">
                <span className="text-xs text-gray-500 dark:text-dark-400 shrink-0">
                  Taille QR :
                </span>
                <input
                  type="range" min={40} max={160} value={qrPos.size}
                  onChange={(e) => setQrPos((p) => ({ ...p, size: Number(e.target.value) }))}
                  className="flex-1 accent-army-600"
                />
                <span className="text-xs font-mono text-army-600 dark:text-army-300 w-10 text-right">
                  {qrPos.size}px
                </span>
              </div>
              {/* Page selector */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-dark-400">Page :</span>
                  <select
                    value={qrPos.page}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      setQrPos((q) => ({ ...q, page: p }));
                      setPdfReady(false);
                    }}
                    className="text-xs rounded-lg border border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-700 text-gray-800 dark:text-dark-100 px-2 py-1"
                  >
                    {Array.from({ length: totalPages }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Page {i + 1}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </Card>

          {/* Instruction */}
          <div className="flex items-center gap-2 px-1">
            <Move size={14} className="text-army-500 shrink-0" />
            <p className="text-xs text-gray-500 dark:text-dark-400">
              Glissez le QR code directement sur le document pour le positionner
            </p>
          </div>

          {/* Zone PDF réel + QR draggable */}
          <Card padding="none" className="overflow-hidden">
            <div
              ref={previewRef}
              className="relative select-none overflow-auto bg-gray-100 dark:bg-dark-900"
              style={{ cursor: isDragging ? "grabbing" : "default", maxHeight: "70vh" }}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {/* Canvas PDF — rendu réel */}
              <div className="relative inline-block w-full">
                {!pdfReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-dark-800 z-10">
                    <Loader2 size={28} className="animate-spin text-army-600" />
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="block w-full shadow-lg"
                  style={{ display: pdfReady ? "block" : "none" }}
                />

                {/* QR draggable positionné par-dessus le canvas */}
                {pdfReady && signData?.qr_code && (
                  <div
                    className="absolute border-2 border-army-600 rounded-lg shadow-xl overflow-hidden cursor-grab active:cursor-grabbing"
                    style={{
                      left:   qrPos.x,
                      top:    qrPos.y,
                      width:  qrPos.size,
                      height: qrPos.size,
                      zIndex: 20,
                    }}
                    onMouseDown={onMouseDown}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={() => setIsDragging(false)}
                  >
                    <img
                      src={signData.qr_code}
                      alt="QR Code signature"
                      className="w-full h-full object-contain pointer-events-none bg-white"
                      draggable={false}
                    />
                    {/* Indicateur de drag */}
                    <div className="absolute inset-0 bg-army-600/10 flex items-end justify-end p-1 pointer-events-none">
                      <Move size={10} className="text-army-600 opacity-70" />
                    </div>
                  </div>
                )}
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

      {/* ── STEP 3 : Done ── */}
      {step === "done" && finalizeData && (
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-dark-100">
                  Document signé avec succès !
                </h2>
                <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                  Le QR code a été intégré au document PDF.
                </p>
              </div>
            </div>
          </Card>

          {/* Téléchargement */}
          <Card padding="sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={18} className="text-army-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-100 truncate">
                    {uploadData?.titre}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-dark-400 mt-0.5">
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

          {/* Archivage */}
          {!archived ? (
            <Card padding="md" className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Archiver ce document ?
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    L'archivage rend le document accessible via la recherche publique
                    et permet aux citoyens de le télécharger. Les documents non archivés restent privés.
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