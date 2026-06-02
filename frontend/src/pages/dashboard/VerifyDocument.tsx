// pages/dashboard/VerifyDocument.tsx — v2
// Upload unique : le backend détecte automatiquement le QR code

import React, { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck, ShieldX, ShieldAlert, Upload, CheckCircle,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, RotateCcw,
  Info, Eye, EyeOff, ArrowRight, FileText, QrCode,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Anomalie {
  type: "substitution" | "omission" | "ajout";
  label: string;
  position: number;
  original: string;
  scanned: string;
  contexte: string;
  gravite: "haute" | "faible";
}
interface Diff {
  similarite_pct: number;
  chars_total: number;
  chars_identiques: number;
  chars_modifies: number;
  nb_anomalies: number;
  anomalies: Anomalie[];
}
interface Niveau {
  execute: boolean;
  valide: boolean;
  detail: string;
  etapes?: Record<string, boolean>;
  similarite_hash?: number | null;
  diff?: Diff;
  ocr_info?: { zone_qr_masquee: boolean; chars_extraits: number };
}
interface VerifyResult {
  document_info: {
    titre: string; date_signature: string; algorithme: string;
    signe_par: string; institution: string; fonction: string;
    qr_detecte: boolean; qr_position: [number,number,number,number] | null;
  };
  niveau1: Niveau;
  niveau2: Niveau;
  niveau3: Niveau;
  verdict: {
    code: string; label: string;
    couleur: "vert"|"orange"|"rouge"|"gris";
    detail: string; confiance: number;
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function callVerify(file: File): Promise<VerifyResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/verify/document`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `Erreur HTTP ${res.status}`);
  }
  return res.json() as Promise<VerifyResult>;
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

const VerdictBanner: React.FC<{ verdict: VerifyResult["verdict"] }> = ({ verdict }) => {
  const s = {
    vert:   { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-800 dark:text-emerald-200", bar: "bg-emerald-500", icon: <ShieldCheck size={30} className="text-emerald-500" /> },
    orange: { bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-300 dark:border-amber-700",     text: "text-amber-800 dark:text-amber-200",   bar: "bg-amber-500",   icon: <ShieldAlert size={30} className="text-amber-500" /> },
    rouge:  { bg: "bg-red-50 dark:bg-red-950/30",         border: "border-red-300 dark:border-red-700",         text: "text-red-800 dark:text-red-200",       bar: "bg-red-500",     icon: <ShieldX size={30} className="text-red-500" /> },
    gris:   { bg: "bg-gray-50 dark:bg-dark-700",          border: "border-gray-300 dark:border-dark-500",       text: "text-gray-700 dark:text-dark-200",     bar: "bg-gray-400",    icon: <ShieldAlert size={30} className="text-gray-400" /> },
  }[verdict.couleur];

  return (
    <div className={`rounded-2xl border-2 p-5 ${s.bg} ${s.border}`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">{s.icon}</div>
        <div className="flex-1">
          <p className={`text-lg font-bold ${s.text}`}>{verdict.label}</p>
          <p className={`text-sm mt-1 ${s.text} opacity-80`}>{verdict.detail}</p>
        </div>
        {verdict.confiance > 0 && (
          <div className="shrink-0 text-center">
            <div className={`text-3xl font-black ${s.text}`}>{verdict.confiance}%</div>
            <div className={`text-xs ${s.text} opacity-60`}>confiance</div>
          </div>
        )}
      </div>
      {verdict.confiance > 0 && (
        <div className="mt-4 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${s.bar}`} style={{ width: `${verdict.confiance}%` }} />
        </div>
      )}
    </div>
  );
};

const DocumentInfoCard: React.FC<{ info: VerifyResult["document_info"] }> = ({ info }) => (
  <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5">
    <div className="flex items-center gap-2 mb-3">
      <FileText size={15} className="text-army-600 dark:text-army-400" />
      <h3 className="text-sm font-bold text-gray-700 dark:text-dark-200 uppercase tracking-wide">Informations du document</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      {[
        { label: "Titre",            value: info.titre },
        { label: "Signé par",        value: info.signe_par },
        { label: "Institution",      value: info.institution },
        { label: "Fonction",         value: info.fonction },
        { label: "Date de signature",value: info.date_signature ? new Date(info.date_signature).toLocaleString("fr-FR", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "" },
        { label: "Algorithme",       value: info.algorithme },
      ].filter(r => r.value).map(row => (
        <div key={row.label}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">{row.label}</p>
          <p className="font-medium text-gray-800 dark:text-dark-100 truncate">{row.value}</p>
        </div>
      ))}
    </div>
    {/* Badge QR détecté */}
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-600 flex items-center gap-2">
      <QrCode size={13} className="text-emerald-500" />
      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
        QR code détecté automatiquement
        {info.qr_position && ` (position x:${info.qr_position[0]}, y:${info.qr_position[1]})`}
      </span>
    </div>
  </div>
);

const NiveauCard: React.FC<{ numero:1|2|3; label:string; niveau:Niveau; defaultOpen?:boolean }> = ({ numero, label, niveau, defaultOpen=false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  if (!niveau.execute) return (
    <div className="rounded-xl border border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-800 p-4 opacity-40">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-dark-600 flex items-center justify-center text-xs font-bold text-gray-500">{numero}</span>
        <span className="text-sm font-medium text-gray-500 dark:text-dark-400">{label} — Non exécuté</span>
      </div>
    </div>
  );

  const borderColor = niveau.valide ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800";
  const bgColor     = niveau.valide ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "bg-red-50/50 dark:bg-red-950/10";

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${niveau.valide ? "bg-emerald-500" : "bg-red-500"}`}>{numero}</span>
        <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-dark-100">{label}</span>
        {niveau.valide ? <CheckCircle size={16} className="text-emerald-500 shrink-0" /> : <XCircle size={16} className="text-red-500 shrink-0" />}
        {open ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-current/10 pt-3">
          <p className="text-sm text-gray-700 dark:text-dark-200">{niveau.detail}</p>

          {/* Étapes niveau 1 */}
          {niveau.etapes && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(niveau.etapes).map(([k, v]) => (
                <span key={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${v ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}>
                  {v ? <CheckCircle size={10} /> : <XCircle size={10} />}
                  {k.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}

          {/* OCR info niveau 2 */}
          {niveau.ocr_info && (
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-dark-400">
              <span className={`inline-flex items-center gap-1 ${niveau.ocr_info.zone_qr_masquee ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
                <QrCode size={11} />
                Zone QR {niveau.ocr_info.zone_qr_masquee ? "masquée ✓" : "non masquée"}
              </span>
              <span>{niveau.ocr_info.chars_extraits.toLocaleString()} caractères extraits</span>
            </div>
          )}

          {/* Diff niveau 3 */}
          {niveau.diff && (() => {
            const diff = niveau.diff!;
            const displayed = showAll ? diff.anomalies : diff.anomalies.slice(0, 5);
            const typeColor: Record<string,string> = {
              substitution: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-700",
              omission:     "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300 border-red-200 dark:border-red-700",
              ajout:        "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-700",
            };
            const typeIcon: Record<string,string> = { substitution: "🔄", omission: "➖", ajout: "➕" };
            return (
              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label:"Similarité",    value:`${diff.similarite_pct}%`, color: diff.similarite_pct>=98?"text-emerald-600":diff.similarite_pct>=90?"text-amber-600":"text-red-600" },
                    { label:"Chars OK",      value:diff.chars_identiques.toLocaleString(), color:"text-emerald-600" },
                    { label:"Anomalies",     value:diff.nb_anomalies.toString(), color:diff.nb_anomalies===0?"text-emerald-600":"text-red-600" },
                  ].map(s => (
                    <div key={s.label} className="bg-white dark:bg-dark-800 rounded-xl p-2 border border-gray-100 dark:border-dark-600">
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-gray-500 dark:text-dark-400">{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Barre */}
                <div className="h-2.5 rounded-full bg-gray-200 dark:bg-dark-600 overflow-hidden">
                  <div className={`h-full rounded-full ${diff.similarite_pct>=98?"bg-emerald-500":diff.similarite_pct>=90?"bg-amber-500":"bg-red-500"}`} style={{width:`${diff.similarite_pct}%`}} />
                </div>
                {/* Anomalies */}
                {diff.anomalies.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">Détail des anomalies</p>
                    {displayed.map((a, i) => (
                      <div key={i} className={`rounded-xl border p-3 text-xs ${typeColor[a.type]}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-semibold">{typeIcon[a.type]} {a.label}</span>
                          <div className="flex gap-1 shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.gravite==="haute"?"bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200":"bg-gray-200 text-gray-700 dark:bg-dark-600 dark:text-dark-300"}`}>
                              {a.gravite==="haute"?"⚠ Grave":"Mineur"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/10 dark:bg-white/10">pos.{a.position}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {a.original && <div className="bg-red-50 dark:bg-red-950/20 rounded p-1.5"><div className="text-[10px] text-red-600 dark:text-red-400 font-semibold mb-0.5">Original</div><code className="font-mono break-all">{a.original}</code></div>}
                          {a.scanned  && <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-1.5"><div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mb-0.5">Scanné</div><code className="font-mono break-all">{a.scanned}</code></div>}
                        </div>
                        {a.contexte && (
                          <div className="mt-2 bg-black/5 dark:bg-white/5 rounded p-1.5">
                            <div className="text-[10px] text-gray-500 dark:text-dark-400 mb-0.5">Contexte</div>
                            <code className="font-mono text-gray-700 dark:text-dark-200 break-all">{a.contexte}</code>
                          </div>
                        )}
                      </div>
                    ))}
                    {diff.anomalies.length > 5 && (
                      <button onClick={() => setShowAll(!showAll)} className="w-full py-2 rounded-xl border border-gray-200 dark:border-dark-500 text-xs font-medium text-gray-600 dark:text-dark-300 hover:bg-gray-50 dark:hover:bg-dark-700 transition flex items-center justify-center gap-1">
                        {showAll ? <><EyeOff size={12}/>Réduire</> : <><Eye size={12}/>Voir toutes les {diff.anomalies.length} anomalies</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────

type Step = "input" | "loading" | "result";

const VerifyDocument: React.FC = () => {
  const [step, setStep]       = useState<Step>("input");
  const [file, setFile]       = useState<File | null>(null);
  const [result, setResult]   = useState<VerifyResult | null>(null);
  const [error, setError]     = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.tiff,.bmp";

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleVerify = async () => {
    if (!file) { setError("Veuillez sélectionner un document."); return; }
    setError("");
    setStep("loading");
    setLoadMsg("Détection du QR code dans le document…");

    const msgs = [
      "Détection du QR code dans le document…",
      "Décodage des métadonnées de signature…",
      "Extraction OCR (zone QR masquée)…",
      "Vérification cryptographique RSA-PSS…",
      "Analyse comparative du contenu…",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = Math.min(i + 1, msgs.length - 1);
      setLoadMsg(msgs[i]);
    }, 1200);

    try {
      const res = await callVerify(file);
      clearInterval(interval);
      setResult(res);
      setStep("result");
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Erreur lors de la vérification.");
      setStep("input");
    }
  };

  const handleReset = () => {
    setStep("input"); setResult(null); setError(""); setFile(null);
  };

  // ── INPUT ──────────────────────────────────────────────────────────────────
  if (step === "input") return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-army-600 to-army-800 shadow-lg mb-4">
          <ShieldCheck size={26} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vérifier un document signé</h1>
        <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
          Uploadez le document — le QR code est détecté automatiquement.
        </p>
      </div>

      {/* Explication 3 niveaux */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
          <Info size={15} />Comment ça fonctionne ?
        </div>
        {[
          { n:1, text:"Détection automatique du QR code + décodage de la signature" },
          { n:2, text:"OCR du texte (zone QR masquée) + comparaison du hash" },
          { n:3, text:"Si besoin : diff caractère par caractère avec score de similarité" },
        ].map(({ n, text }) => (
          <div key={n} className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300 pl-1">
            <ArrowRight size={11} className="mt-0.5 shrink-0" />
            <span><strong>Niveau {n}</strong> — {text}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* Zone de drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragOver   ? "border-army-500 bg-army-50 dark:bg-army-950/20 scale-[1.02]" :
          file       ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" :
                       "border-gray-200 dark:border-dark-500 hover:border-army-400 hover:bg-gray-50 dark:hover:bg-dark-700/50"
        }`}
      >
        <input ref={fileRef} type="file" className="hidden" accept={ACCEPTED}
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />

        {file ? (
          <>
            <CheckCircle size={36} className="text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">{file.name}</p>
            <p className="text-xs text-gray-400 dark:text-dark-400 mt-1">{(file.size/1024).toFixed(1)} Ko — Cliquez pour changer</p>
          </>
        ) : (
          <>
            <Upload size={36} className="text-gray-300 dark:text-dark-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-600 dark:text-dark-300">Glissez le document ici</p>
            <p className="text-sm text-gray-400 dark:text-dark-500 mt-1">ou cliquez pour sélectionner</p>
            <p className="text-xs text-gray-300 dark:text-dark-600 mt-2">PDF, PNG, JPG, TIFF acceptés</p>
          </>
        )}
      </div>

      {file && (
        <button onClick={() => setFile(null)} className="text-xs text-red-500 hover:underline flex items-center gap-1 mx-auto">
          <XCircle size={12} />Retirer le fichier
        </button>
      )}

      <button onClick={handleVerify} disabled={!file}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-army-600 to-army-700 text-white font-bold text-base hover:from-army-700 hover:to-army-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2">
        <ShieldCheck size={18} />Vérifier l'authenticité
      </button>
    </div>
  );

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (step === "loading") return (
    <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-64 gap-5">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-army-100 dark:border-dark-600" />
        <div className="absolute inset-0 rounded-full border-4 border-army-600 border-t-transparent animate-spin" />
        <ShieldCheck size={20} className="absolute inset-0 m-auto text-army-600" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-800 dark:text-dark-100">Analyse en cours…</p>
        <p className="text-sm text-army-600 dark:text-army-400 mt-1 transition-all">{loadMsg}</p>
        <p className="text-xs text-gray-400 dark:text-dark-500 mt-2">{file?.name}</p>
      </div>
    </div>
  );

  // ── RÉSULTAT ───────────────────────────────────────────────────────────────
  if (step === "result" && result) return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck size={20} className="text-army-600" />Résultat
        </h1>
        <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-dark-500 text-sm font-medium text-gray-600 dark:text-dark-300 hover:bg-gray-50 dark:hover:bg-dark-700 transition">
          <RotateCcw size={13} />Nouveau
        </button>
      </div>

      <VerdictBanner verdict={result.verdict} />
      <DocumentInfoCard info={result.document_info} />

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-dark-400">Détail par niveau</h2>
        <NiveauCard numero={1} label="Niveau 1 — Vérification cryptographique RSA-PSS" niveau={result.niveau1} defaultOpen />
        <NiveauCard numero={2} label="Niveau 2 — Comparaison hash (OCR sans QR)" niveau={result.niveau2} defaultOpen={result.niveau2.execute && !result.niveau2.valide} />
        <NiveauCard numero={3} label="Niveau 3 — Analyse textuelle fine (diff caractère par caractère)" niveau={result.niveau3} defaultOpen={result.niveau3.execute} />
      </div>

      <div className="bg-gray-50 dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-600 p-4 text-xs text-gray-500 dark:text-dark-400">
        <p className="font-semibold mb-1">ℹ️ Note sur la vérification</p>
        <p>Ce système utilise la cryptographie RSA-PSS SHA-256. Une vérification de Niveau 1 valide garantit que l'agent officiel a bien signé ce document. Le Niveau 3 peut présenter des faux positifs si le scan est de mauvaise qualité — dans ce cas, consultez le document original sur SHIELD.</p>
      </div>

      <button onClick={handleReset} className="w-full py-3 rounded-2xl border-2 border-army-200 dark:border-army-800 text-army-700 dark:text-army-400 font-semibold text-sm hover:bg-army-50 dark:hover:bg-army-950/20 transition flex items-center justify-center gap-2">
        <RotateCcw size={15} />Vérifier un autre document
      </button>
    </div>
  );

  return null;
};

export default VerifyDocument;
