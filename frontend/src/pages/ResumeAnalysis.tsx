import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { client } from '@/lib/sdk';
import { toast } from 'sonner';
import {
  Users,
  Loader2,
  LogIn,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  FileText,
  X,
  Briefcase,
  Trophy,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  Star,
  Trash2,
  Download,
  Sparkles,
  Brain,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import {
  generateCoverPage,
  wrapReportHtml,
  scoreRingSvg,
  scoreColor as reportScoreColor,
  scoreLabel as reportScoreLabel,
  progressBarHtml,
  generateFooter,
  SALMO_BRAND,
} from '@/lib/reportStyles';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const errMsg = err?.data?.detail || err?.response?.data?.detail || err?.message || '';
      const isBalance = errMsg.includes('insufficient') || errMsg.includes('balance') || errMsg.includes('top up') || errMsg.includes('رصيد') || err?.status === 402 || err?.response?.status === 402;
      if (isBalance) throw err;
      const isDns = err?.message?.includes?.('dns') || err?.message?.includes?.('balancer') || err?.message?.includes?.('timeout');
      if (!isDns || i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

type ExtractedInfo = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  highest_education?: string;
  total_experience_years?: number;
  top_skills?: string[];
  languages?: string[];
  certifications?: string[];
  latest_job_title?: string;
  latest_company?: string;
};

type DeductionItem = {
  reason?: string;
  points?: number;
  category?: string;
};

type MatchAnalysis = {
  match_percentage?: number;
  matching_skills?: string[];
  missing_skills?: string[];
  education_fit?: string;
  experience_fit?: string;
};

type Recommendations = {
  recommend_interview?: boolean;
  priority?: string;
  interview_questions?: string[];
  skills_to_test?: string[];
};

type CandidateResult = {
  type: string;
  candidate_name?: string;
  score?: number;
  score_label?: string;
  rank?: number;
  extracted_info?: ExtractedInfo;
  deductions?: DeductionItem[];
  match_analysis?: MatchAnalysis;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: Recommendations;
  disclaimer?: string;
  confidence_scores?: Record<string, number>;
  overall_confidence?: number;
};

type BatchResult = {
  type: string;
  summary: {
    total_resumes: number;
    score_distribution: {
      excellent: number;
      good: number;
      average: number;
      weak: number;
    };
    recommended_for_interview: number;
    top_candidate: string;
    top_score: number;
  };
  candidates: CandidateResult[];
  disclaimer?: string;
};

type UploadedFile = {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'extracting' | 'ready' | 'error';
  text: string;
  error?: string;
  progress?: number;
  isPdf?: boolean;
};

function ConfidenceBadge({ confidence, label }: { confidence: number; label?: string }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
    : pct >= 60 ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
    : 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {label && <span>{label}:</span>}
      {pct}%
    </span>
  );
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#F59E0B';
  if (score >= 60) return '#f97316';
  return '#F43F5E';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'ممتاز';
  if (score >= 75) return 'جيد';
  if (score >= 60) return 'متوسط';
  return 'ضعيف';
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-200 dark:text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-right transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-200 dark:border-white/10 p-4">{children}</div>}
    </div>
  );
}

export default function ResumeAnalysis() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ done: number; total: number; currentFile: string } | null>(null);

  const extractingCount = uploadedFiles.filter(f => f.status === 'extracting').length;

  const checkAuth = async () => {
    setAuthChecked(false);
    setAuthError(false);
    try {
      const res = await withRetry(() => client.auth.me());
      setUser(res?.data || null);
    } catch {
      setUser(null);
      setAuthError(true);
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const extractPdfText = async (file: File, onProgress?: (pct: number) => void): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(5);
    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        useSystemFonts: true,
        standardFontDataUrl: '/standard_fonts/',
      }).promise;
    } catch (pdfErr: any) {
      try {
        const text = await file.text();
        if (text && text.trim().length > 20) {
          onProgress?.(100);
          return text;
        }
      } catch { /* ignore */ }
      throw new Error(`فشل في قراءة ملف PDF: ${pdfErr?.message || 'ملف تالف أو غير مدعوم'}`);
    }

    const totalPages = pdf.numPages;
    const pages: string[] = [];
    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        const lineMap = new Map<number, { x: number; str: string; width: number }[]>();
        const Y_TOLERANCE = 3;
        for (const item of items) {
          if (!item.str || !item.str.trim()) continue;
          const y = Math.round(item.transform[5] / Y_TOLERANCE) * Y_TOLERANCE;
          if (!lineMap.has(y)) lineMap.set(y, []);
          lineMap.get(y)!.push({ x: item.transform[4], str: item.str, width: item.width || 0 });
        }
        const sortedLines = Array.from(lineMap.entries()).sort((a, b) => b[0] - a[0]);
        const pageText = sortedLines
          .map(([, lineItems]) => {
            lineItems.sort((a, b) => a.x - b.x);
            const hasArabic = lineItems.some(it =>
              /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(it.str)
            );
            if (hasArabic) {
              const reversed = [...lineItems].reverse();
              const SPACE_THRESHOLD = 6;
              let res = '';
              for (let j = 0; j < reversed.length; j++) {
                const curr = reversed[j];
                if (j === 0) {
                  res = curr.str;
                } else {
                  const prev = reversed[j - 1];
                  const prevEnd = prev.x + prev.width;
                  const gap = Math.abs(curr.x - prevEnd);
                  res += gap > SPACE_THRESHOLD || prev.width === 0 ? ' ' + curr.str : curr.str;
                }
              }
              return res;
            }
            return lineItems.map(it => it.str).join(' ');
          })
          .join('\n');
        pages.push(pageText.normalize('NFC'));
      } catch (pageErr: any) {
        console.warn(`Failed to extract page ${i}:`, pageErr);
      }
      onProgress?.(Math.round(5 + (i / totalPages) * 90));
    }

    if (pages.length === 0 || pages.join('').trim().length < 20) {
      // Scanned PDF — fallback to backend OCR
      onProgress?.(50);
      const pageImages: { page_number: number; image_data: string }[] = [];
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imageDataUri = canvas.toDataURL('image/png');
        pageImages.push({ page_number: i, image_data: imageDataUri });
        onProgress?.(50 + Math.round((i / totalPages) * 40));
      }
      const ocrResponse = await client.apiCall.invoke({
        url: '/api/v1/ocr/extract-text',
        method: 'POST',
        data: { pages: pageImages, language: 'ar', enhance_quality: true },
      });
      const ocrText: string = (ocrResponse as any)?.full_text || '';
      if (!ocrText.trim()) {
        throw new Error('لم يتم العثور على نص في ملف PDF — حتى بعد المسح الضوئي');
      }
      onProgress?.(100);
      return ocrText;
    }
    onProgress?.(100);
    return pages.join('\n\n');
  };

  const extractDocxText = async (file: File, onProgress?: (pct: number) => void): Promise<string> => {
    onProgress?.(10);
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(40);
    const res = await mammoth.extractRawText({ arrayBuffer });
    onProgress?.(90);
    const text = res.value || '';
    if (!text.trim()) throw new Error('لم يتم العثور على نص في ملف Word');
    onProgress?.(100);
    return text;
  };

  const extractTextFile = async (file: File, onProgress?: (pct: number) => void): Promise<string> => {
    onProgress?.(30);
    const text = await file.text();
    onProgress?.(100);
    return text;
  };

  const extractFileText = async (file: File, onProgress?: (pct: number) => void): Promise<string> => {
    const name = file.name.toLowerCase();
    const type = file.type || '';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return extractPdfText(file, onProgress);
    if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) return extractDocxText(file, onProgress);
    if (type === 'application/msword' || name.endsWith('.doc')) {
      try { return await extractDocxText(file, onProgress); } catch { throw new Error('صيغة .doc القديمة غير مدعومة — يرجى تحويل الملف إلى .docx أو PDF'); }
    }
    return extractTextFile(file, onProgress);
  };

  const analyzePdfDirect = async (file: File, jobDescriptionText: string): Promise<CandidateResult | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);
      const dataUri = `data:application/pdf;base64,${base64}`;

      const res = await withRetry(() =>
        client.apiCall.invoke({
          url: '/api/v1/ocr/analyze-pdf-resume',
          method: 'POST',
          data: { pdf_data_uri: dataUri, job_description: jobDescriptionText.trim().slice(0, 3000) },
        })
      );

      const response = res as any;
      // The endpoint returns { full_text, analysis, confidence, confidence_scores }
      const analysis = response?.analysis || response?.data?.analysis;
      const confidence = response?.confidence || response?.data?.confidence;
      const confidenceScores = response?.confidence_scores || response?.data?.confidence_scores;

      if (analysis) {
        const candidate: CandidateResult = {
          ...analysis,
          type: analysis.type || 'resume_analysis',
          overall_confidence: confidence,
          confidence_scores: confidenceScores,
        };
        return candidate;
      }
      return null;
    } catch (err: any) {
      console.warn('Direct PDF analysis failed:', err?.message);
      return null;
    }
  };

  const processFiles = async (fileList: File[]) => {
    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isSupportedType =
        ['pdf', 'txt', 'docx', 'doc'].includes(ext || '') ||
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword' ||
        file.type.startsWith('text/');
      if (!isSupportedType) { toast.error(`نوع ملف غير مدعوم: ${file.name}`); continue; }
      if (file.size > 20 * 1024 * 1024) { toast.error(`حجم الملف كبير جداً: ${file.name}`); continue; }
      const isPdf = ext === 'pdf' || file.type === 'application/pdf';
      newFiles.push({ id: `${Date.now()}-${i}`, file, name: file.name, status: 'pending', text: '', isPdf });
    }
    if (newFiles.length === 0) return;

    setUploadedFiles(prev => {
      if (prev.length + newFiles.length > 100) { toast.error('الحد الأقصى 100 سيرة ذاتية'); return prev; }
      return [...prev, ...newFiles.map(f => ({ ...f, status: 'extracting' as const }))];
    });

    for (const nf of newFiles) {
      try {
        const text = await extractFileText(nf.file, (pct: number) => {
          setUploadedFiles(prev => prev.map(f => f.id === nf.id ? { ...f, progress: pct } : f));
        });
        setUploadedFiles(prev => prev.map(f =>
          f.id === nf.id
            ? { ...f, status: text.trim() ? 'ready' as const : 'error' as const, text, progress: 100, error: text.trim() ? undefined : 'لم يتم العثور على نص' }
            : f
        ));
      } catch (err: any) {
        setUploadedFiles(prev => prev.map(f =>
          f.id === nf.id ? { ...f, status: 'error' as const, error: err?.message || 'فشل في قراءة الملف' } : f
        ));
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (loading || extractingCount > 0) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await processFiles(files);
  };

  const removeFile = (id: string) => { setUploadedFiles(prev => prev.filter(f => f.id !== id)); };
  const clearAll = () => { setUploadedFiles([]); setResult(null); setExpandedCandidate(null); };

  const analyze = async () => {
    const readyFiles = uploadedFiles.filter(f => f.status === 'ready' && f.text.trim());
    if (readyFiles.length === 0) { toast.error('يرجى رفع سيرة ذاتية واحدة على الأقل'); return; }

    setLoading(true);
    setResult(null);
    setExpandedCandidate(null);
    setAnalysisProgress({ done: 0, total: readyFiles.length, currentFile: readyFiles[0]?.name || '' });

    const candidates: CandidateResult[] = [];
    const errors: string[] = [];
    let balanceError = false;
    const CONCURRENCY = 3;

    const analyzeOne = async (f: { name: string; text: string; file?: File; isPdf?: boolean }, index: number) => {
      try {
        // If text is very short and it's a PDF, try direct PDF analysis via backend OCR
        const textTooShort = f.text.trim().length < 100;
        const textGarbled = f.text.trim().length > 0 && f.text.trim().length < 200 && /[^\u0020-\u007F\u0600-\u06FF\u0750-\u077F\s.,!?()0-9@+\-/]/.test(f.text.slice(0, 100));

        if ((textTooShort || textGarbled) && f.isPdf && f.file) {
          const directResult = await analyzePdfDirect(f.file, jobDescription);
          if (directResult) {
            if (!directResult.candidate_name) directResult.candidate_name = f.name;
            return { index, result: directResult, error: undefined };
          }
        }

        const truncatedText = f.text.length > 8000 ? f.text.slice(0, 8000) + '\n\n[... تم اقتطاع النص]' : f.text;
        const res = await withRetry(() =>
          client.apiCall.invoke({
            url: '/api/v1/salmo/analyze-single-resume',
            method: 'POST',
            data: { name: f.name, text: truncatedText, job_description: jobDescription.trim().slice(0, 3000) },
          })
        );
        // client.apiCall.invoke returns parsed JSON directly (no .data wrapper)
        const candidate = (res as any)?.data ? (res as any).data as CandidateResult : res as CandidateResult;
        if (!candidate.type) candidate.type = 'resume_analysis';
        if (!candidate.candidate_name) candidate.candidate_name = f.name;
        return { index, result: candidate, error: undefined };
      } catch (err: any) {
        const errMsg = err?.data?.detail || err?.response?.data?.detail || err?.message || '';
        const isBalance = errMsg.includes('insufficient') || errMsg.includes('balance') || errMsg.includes('top up') || errMsg.includes('رصيد') || err?.status === 402 || err?.response?.status === 402;
        return { index, result: null, error: isBalance ? 'BALANCE' : (errMsg || 'خطأ غير معروف') };
      }
    };

    try {
      for (let batchStart = 0; batchStart < readyFiles.length && !balanceError; batchStart += CONCURRENCY) {
        const batchEnd = Math.min(batchStart + CONCURRENCY, readyFiles.length);
        const batchFiles = readyFiles.slice(batchStart, batchEnd);
        setAnalysisProgress(prev => prev ? { ...prev, currentFile: batchFiles.map(f => f.name).join('، ') } : prev);

        const promises = batchFiles.map((f, i) => analyzeOne({ name: f.name, text: f.text, file: f.file, isPdf: f.isPdf }, batchStart + i));
        const results = await Promise.all(promises);

        for (const r of results) {
          if (r.error === 'BALANCE') {
            balanceError = true;
            toast.error('رصيد الذكاء الاصطناعي غير كافٍ', { duration: 8000 });
            break;
          }
          if (r.result) {
            candidates.push(r.result);
          } else if (r.error) {
            errors.push(`${readyFiles[r.index]?.name}: ${r.error}`);
            candidates.push({
              type: 'resume_analysis',
              candidate_name: readyFiles[r.index]?.name || 'غير معروف',
              score: 0, score_label: 'فشل',
              extracted_info: { name: 'غير محدد' },
              deductions: [], match_analysis: { match_percentage: 0 },
              strengths: [], weaknesses: [`فشل: ${r.error}`],
              recommendations: { recommend_interview: false, priority: 'منخفضة' },
              disclaimer: '',
            });
          }
          setAnalysisProgress(prev => prev ? { ...prev, done: candidates.length + errors.length } : prev);
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        candidates.forEach((c, i) => { c.rank = i + 1; });

        const excellent = candidates.filter(c => (c.score ?? 0) >= 90).length;
        const good = candidates.filter(c => (c.score ?? 0) >= 75 && (c.score ?? 0) < 90).length;
        const average = candidates.filter(c => (c.score ?? 0) >= 60 && (c.score ?? 0) < 75).length;
        const weak = candidates.filter(c => (c.score ?? 0) < 60).length;
        const recommendInterview = candidates.filter(c => c.recommendations?.recommend_interview).length;

        setResult({
          type: 'resume_batch_analysis',
          summary: {
            total_resumes: candidates.length,
            score_distribution: { excellent, good, average, weak },
            recommended_for_interview: recommendInterview,
            top_candidate: candidates[0]?.candidate_name || 'لا يوجد',
            top_score: candidates[0]?.score ?? 0,
          },
          candidates,
          disclaimer: 'هذه الأداة للمساعدة وليست قرار توظيف نهائي',
        });

        if (errors.length > 0 && errors.length < readyFiles.length) {
          toast.warning(`تم تحليل ${candidates.length - errors.length} من ${readyFiles.length} بنجاح`);
        } else if (errors.length === 0) {
          toast.success(`تم تحليل ${candidates.length} سيرة ذاتية بنجاح`);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      setAnalysisProgress(null);
    }
  };

  const downloadReport = useCallback(() => {
    if (!result) return;
    const today = new Date().toISOString().slice(0, 10);
    const reportId = `RA-${Date.now().toString(36).toUpperCase()}`;

    const coverPage = generateCoverPage({
      title: 'تقرير تحليل السير الذاتية',
      subtitle: `تحليل وترتيب ${result.summary.total_resumes} سيرة ذاتية`,
      reportId,
      date: today,
      metadata: [
        { label: 'عدد المرشحين', value: String(result.summary.total_resumes) },
        { label: 'يُنصح بمقابلتهم', value: String(result.summary.recommended_for_interview) },
      ],
    });

    const summaryHtml = `
      <div class="report-section-title"><span class="section-icon">📊</span> ملخص التحليل</div>
      <div class="report-summary-grid report-summary-grid-4">
        <div class="report-summary-item"><div class="report-summary-item-value">${result.summary.total_resumes}</div><div class="report-summary-item-label">إجمالي السير</div></div>
        <div class="report-summary-item" style="background:#ecfdf5;border-color:#a7f3d0"><div class="report-summary-item-value" style="color:${SALMO_BRAND.colors.emerald}">${result.summary.recommended_for_interview}</div><div class="report-summary-item-label">يُنصح بمقابلتهم</div></div>
        <div class="report-summary-item" style="background:#fffbeb;border-color:#fde68a"><div class="report-summary-item-value" style="color:${SALMO_BRAND.colors.gold}">${result.summary.score_distribution.excellent + result.summary.score_distribution.good}</div><div class="report-summary-item-label">ممتاز + جيد</div></div>
        <div class="report-summary-item" style="background:#fef2f2;border-color:#fecaca"><div class="report-summary-item-value" style="color:${SALMO_BRAND.colors.danger}">${result.summary.score_distribution.weak}</div><div class="report-summary-item-label">ضعيف</div></div>
      </div>`;

    const candidatesHtml = result.candidates.map((c, i) => {
      const score = c.score ?? 0;
      const color = reportScoreColor(score);
      const label = c.score_label || reportScoreLabel(score);
      return `
        <div class="report-card" style="margin-top:20px;page-break-inside:avoid">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid ${SALMO_BRAND.colors.border}">
            <div style="width:32px;height:32px;border-radius:8px;background:${i === 0 ? SALMO_BRAND.colors.gold : '#6b7280'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">${i + 1}</div>
            <div style="flex:1"><div style="font-weight:700;font-size:1rem">${c.candidate_name || `مرشح ${i + 1}`}</div></div>
            <div>${scoreRingSvg(score, 80)}<div style="text-align:center;font-size:0.75rem;color:${color}">${label}</div></div>
          </div>
          ${c.strengths?.length ? `<div style="margin-top:10px"><strong style="color:${SALMO_BRAND.colors.emerald}">نقاط القوة:</strong><ul style="margin-top:4px;padding-right:20px">${c.strengths.map(s => `<li style="font-size:0.85rem">${s}</li>`).join('')}</ul></div>` : ''}
          ${c.weaknesses?.length ? `<div style="margin-top:10px"><strong style="color:${SALMO_BRAND.colors.danger}">نقاط الضعف:</strong><ul style="margin-top:4px;padding-right:20px">${c.weaknesses.map(w => `<li style="font-size:0.85rem">${w}</li>`).join('')}</ul></div>` : ''}
          ${c.recommendations?.recommend_interview !== undefined ? `<div style="margin-top:10px;padding:10px;border-radius:8px;background:${c.recommendations.recommend_interview ? '#ecfdf5' : '#fef2f2'};font-size:0.85rem">${c.recommendations.recommend_interview ? '✅ يُنصح بالمقابلة' : '❌ لا يُنصح بالمقابلة'}</div>` : ''}
        </div>`;
    }).join('');

    const bodyContent = `${summaryHtml}
      <div class="report-section-title"><span class="section-icon">👥</span> تفاصيل المرشحين</div>
      ${candidatesHtml}
      <hr class="report-divider" style="margin-top:32px"/>
      ${generateFooter(result.disclaimer || '')}`;

    const html = wrapReportHtml({ title: 'تقرير تحليل السير الذاتية', bodyContent, coverPage, printBtnText: '🖨️ طباعة / حفظ PDF' });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير-السير-الذاتية-${today}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  // Auth states
  if (!authChecked) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gradient-to-br dark:from-[#0A1628] dark:to-[#1a0533]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 dark:text-blue-400" />
          <span className="text-slate-600 dark:text-slate-300">جاري التحقق...</span>
        </div>
      </div>
    );
  }

  if (authError && !user) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-[#0A1628] dark:to-[#1a0533] font-[Cairo,sans-serif]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">تعذر الاتصال بالخادم</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.</p>
          <Button onClick={checkAuth} className="mt-6 bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-600 hover:to-violet-600 border-0">
            <RefreshCw className="ml-2 h-4 w-4" /> إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-[#0A1628] dark:to-[#1a0533] font-[Cairo,sans-serif]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">سجّل الدخول لتحليل السير الذاتية</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">لتحليل السير الذاتية وترتيب المرشحين، سجّل الدخول مجاناً.</p>
          <Button onClick={() => client.auth.toLogin()} className="mt-6 bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-600 hover:to-violet-600 border-0">
            <LogIn className="ml-2 h-4 w-4" /> تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  const readyCount = uploadedFiles.filter(f => f.status === 'ready').length;
  const errorCount = uploadedFiles.filter(f => f.status === 'error').length;

  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-[#0A1628] dark:to-[#1a0533] font-[Cairo,sans-serif]">
      <Navbar />

      <div className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
          {/* Hero Header */}
          <div className="mb-8 text-center animate-fade-in">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20 ai-pulse">
              <Users className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold md:text-4xl gradient-text">تحليل السير الذاتية</h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 md:text-base max-w-2xl mx-auto">
              ارفع السير الذاتية وسيقوم الذكاء الاصطناعي بتحليلها وتقييمها وترتيب المرشحين حسب الأفضلية
            </p>
          </div>

          {/* Upload Area */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm dark:shadow-none animate-slide-up">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !loading && !extractingCount && document.getElementById('resume-file-input')?.click()}
              className={`relative mb-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-all duration-300 ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5 hover:border-blue-400/50 hover:bg-blue-50/50 dark:hover:bg-white/10'
              }`}
            >
              <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
                isDragOver ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400 scale-110' : 'bg-slate-100 dark:bg-white/10 text-slate-400'
              }`}>
                <Upload className="h-7 w-7" />
              </div>
              <span className={`text-sm font-medium ${isDragOver ? 'text-blue-600 dark:text-blue-300' : 'text-slate-700 dark:text-white'}`}>
                {isDragOver ? 'أفلت الملفات هنا' : 'اسحب ملفات السير الذاتية هنا أو اضغط للاختيار'}
              </span>
              <span className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                PDF, DOCX, TXT — حتى 100 ملف — 20 ميجابايت لكل ملف
              </span>
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading || extractingCount > 0}
              />
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-800 dark:text-white">
                    الملفات المرفوعة ({uploadedFiles.length})
                    {readyCount > 0 && <span className="text-emerald-600 dark:text-emerald-400 mr-2">• {readyCount} جاهز</span>}
                    {errorCount > 0 && <span className="text-rose-500 dark:text-rose-400 mr-2">• {errorCount} خطأ</span>}
                    {extractingCount > 0 && <span className="text-blue-500 dark:text-blue-400 mr-2">• {extractingCount} قيد المعالجة</span>}
                  </span>
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                    disabled={loading}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> مسح الكل
                  </button>
                </div>

                <div className="max-h-[240px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3">
                  {uploadedFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg bg-white dark:bg-white/5 px-3 py-2 border border-slate-100 dark:border-transparent">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        f.status === 'ready' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        f.status === 'error' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                        'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}>
                        {f.status === 'ready' ? <CheckCircle2 className="h-4 w-4" /> :
                         f.status === 'error' ? <XCircle className="h-4 w-4" /> :
                         <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{f.name}</p>
                        <div className="flex items-center gap-2">
                          {f.status === 'extracting' && f.progress !== undefined && (
                            <div className="flex-1 h-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden max-w-[120px]">
                              <div className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all" style={{ width: `${f.progress}%` }} />
                            </div>
                          )}
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {f.status === 'ready' ? `${(f.text.length / 1000).toFixed(1)}K حرف` :
                             f.status === 'error' ? f.error :
                             f.progress !== undefined ? `${f.progress}%` : 'جاري...'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(f.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white transition-colors"
                        disabled={loading}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Job Description */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-800 dark:text-white">
                الوصف الوظيفي <span className="text-slate-400 dark:text-slate-500">(اختياري — لتقييم المطابقة)</span>
              </label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="الصق الوصف الوظيفي هنا لتقييم مدى مطابقة المرشحين..."
                className="min-h-[100px] resize-y rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/20"
                disabled={loading}
              />
            </div>

            {/* Analyze Button */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                هذه الأداة للمساعدة وليست قرار توظيف نهائي
              </p>
              <Button
                onClick={analyze}
                disabled={loading || readyCount === 0 || extractingCount > 0}
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-600 hover:to-violet-600 border-0 shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري التحليل...</>
                ) : (
                  <><Sparkles className="ml-2 h-4 w-4" /> تحليل {readyCount > 1 ? `${readyCount} سير ذاتية` : 'السيرة الذاتية'}</>
                )}
              </Button>
            </div>
          </div>

          {/* Analysis Progress */}
          {loading && analysisProgress && (
            <div className="mt-8 animate-fade-in">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center ai-pulse">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">جاري تحليل السير الذاتية...</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{analysisProgress.currentFile}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${analysisProgress.total > 0 ? (analysisProgress.done / analysisProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-300 whitespace-nowrap">
                    {analysisProgress.done} / {analysisProgress.total}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="mt-8 flex flex-col gap-6 animate-slide-up">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 flex flex-col items-center gap-1 p-4 shadow-sm dark:shadow-none">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{result.summary.total_resumes}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">إجمالي السير</span>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 flex flex-col items-center gap-1 p-4 shadow-sm dark:shadow-none">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.summary.recommended_for_interview}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">يُنصح بمقابلتهم</span>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 flex flex-col items-center gap-1 p-4 shadow-sm dark:shadow-none">
                  <span className="text-2xl font-bold text-amber-500 dark:text-amber-400">{result.summary.score_distribution.excellent + result.summary.score_distribution.good}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">ممتاز + جيد</span>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 flex flex-col items-center gap-1 p-4 shadow-sm dark:shadow-none">
                  <span className="text-2xl font-bold text-rose-500 dark:text-rose-400">{result.summary.score_distribution.weak}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">ضعيف</span>
                </div>
              </div>

              {/* Top Candidate */}
              {result.summary.top_candidate && result.summary.top_candidate !== 'لا يوجد' && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-white/5 p-5 flex items-center gap-4 shadow-sm dark:shadow-none">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">أفضل مرشح</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{result.summary.top_candidate}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-amber-500 dark:text-amber-400">{result.summary.top_score}</span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">/100</p>
                  </div>
                </div>
              )}

              {/* Candidates List */}
              <div className="space-y-4">
                {result.candidates.map((candidate, idx) => {
                  const isExpanded = expandedCandidate === idx;
                  const score = candidate.score ?? 0;
                  const color = getScoreColor(score);

                  return (
                    <div key={idx} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden shadow-sm dark:shadow-none">
                      {/* Candidate Header */}
                      <button
                        onClick={() => setExpandedCandidate(isExpanded ? null : idx)}
                        className="flex w-full items-center gap-4 p-5 text-right transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${
                          idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-500' : 'bg-slate-300 dark:bg-white/10'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{candidate.candidate_name || `مرشح ${idx + 1}`}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {candidate.extracted_info?.latest_job_title || ''}
                            {candidate.extracted_info?.latest_company ? ` — ${candidate.extracted_info.latest_company}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {candidate.recommendations?.recommend_interview !== undefined && (
                            <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              candidate.recommendations.recommend_interview
                                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                            }`}>
                              {candidate.recommendations.recommend_interview ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                              {candidate.recommendations.recommend_interview ? 'مقابلة' : 'لا'}
                            </span>
                          )}
                          <ScoreRing score={score} size={50} />
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 dark:border-white/10 p-5 space-y-4 animate-fade-in">
                          {/* Overall Confidence */}
                          {candidate.overall_confidence != null && (
                            <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-2">
                              <Brain className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">دقة التحليل:</span>
                              <ConfidenceBadge confidence={candidate.overall_confidence} />
                            </div>
                          )}

                          {/* Extracted Info */}
                          {candidate.extracted_info && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {candidate.extracted_info.name && candidate.extracted_info.name !== 'غير محدد' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 dark:text-slate-500">الاسم:</span>
                                  <span className="text-slate-800 dark:text-white">{candidate.extracted_info.name}</span>
                                  {candidate.confidence_scores?.name != null && <ConfidenceBadge confidence={candidate.confidence_scores.name} />}
                                </div>
                              )}
                              {candidate.extracted_info.email && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 dark:text-slate-500">البريد:</span>
                                  <span className="text-slate-800 dark:text-white">{candidate.extracted_info.email}</span>
                                  {candidate.confidence_scores?.email != null && <ConfidenceBadge confidence={candidate.confidence_scores.email} />}
                                </div>
                              )}
                              {candidate.extracted_info.phone && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 dark:text-slate-500">الهاتف:</span>
                                  <span className="text-slate-800 dark:text-white">{candidate.extracted_info.phone}</span>
                                  {candidate.confidence_scores?.phone != null && <ConfidenceBadge confidence={candidate.confidence_scores.phone} />}
                                </div>
                              )}
                              {candidate.extracted_info.location && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 dark:text-slate-500">الموقع:</span>
                                  <span className="text-slate-800 dark:text-white">{candidate.extracted_info.location}</span>
                                  {candidate.confidence_scores?.location != null && <ConfidenceBadge confidence={candidate.confidence_scores.location} />}
                                </div>
                              )}
                              {candidate.extracted_info.highest_education && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 dark:text-slate-500">المؤهل:</span>
                                  <span className="text-slate-800 dark:text-white">{candidate.extracted_info.highest_education}</span>
                                  {candidate.confidence_scores?.education != null && <ConfidenceBadge confidence={candidate.confidence_scores.education} />}
                                </div>
                              )}
                              {candidate.extracted_info.total_experience_years != null && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 dark:text-slate-500">الخبرة:</span>
                                  <span className="text-slate-800 dark:text-white">{candidate.extracted_info.total_experience_years} سنة</span>
                                  {candidate.confidence_scores?.experience != null && <ConfidenceBadge confidence={candidate.confidence_scores.experience} />}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Skills */}
                          {candidate.extracted_info?.top_skills && candidate.extracted_info.top_skills.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">المهارات</p>
                              <div className="flex flex-wrap gap-1.5">
                                {candidate.extracted_info.top_skills.map((skill, si) => (
                                  <span key={si} className="rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-2.5 py-0.5 text-xs text-blue-700 dark:text-blue-300">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Match Analysis */}
                          {candidate.match_analysis?.match_percentage != null && (
                            <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-800 dark:text-white">مطابقة الوظيفة</span>
                                <span className="text-sm font-bold" style={{ color: getScoreColor(candidate.match_analysis.match_percentage) }}>
                                  {candidate.match_analysis.match_percentage}%
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${candidate.match_analysis.match_percentage}%`,
                                    backgroundColor: getScoreColor(candidate.match_analysis.match_percentage),
                                  }}
                                />
                              </div>
                              {candidate.match_analysis.matching_skills && candidate.match_analysis.matching_skills.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">مهارات متطابقة:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {candidate.match_analysis.matching_skills.map((s, i) => (
                                      <span key={i} className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {candidate.match_analysis.missing_skills && candidate.match_analysis.missing_skills.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-rose-600 dark:text-rose-400 mb-1">مهارات مفقودة:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {candidate.match_analysis.missing_skills.map((s, i) => (
                                      <span key={i} className="rounded-full bg-rose-100 dark:bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-700 dark:text-rose-300">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Strengths & Weaknesses */}
                          <div className="grid gap-3 md:grid-cols-2">
                            {candidate.strengths && candidate.strengths.length > 0 && (
                              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 p-3">
                                <p className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ نقاط القوة</p>
                                <ul className="space-y-1">
                                  {candidate.strengths.map((s, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {candidate.weaknesses && candidate.weaknesses.length > 0 && (
                              <div className="rounded-xl bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 p-3">
                                <p className="mb-2 text-xs font-semibold text-rose-600 dark:text-rose-400">✗ نقاط الضعف</p>
                                <ul className="space-y-1">
                                  {candidate.weaknesses.map((w, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-500 dark:bg-rose-400" />
                                      {w}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Recommendations */}
                          {candidate.recommendations && (
                            <div className={`rounded-xl p-4 ${
                              candidate.recommendations.recommend_interview
                                ? 'bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                {candidate.recommendations.recommend_interview
                                  ? <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  : <UserX className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {candidate.recommendations.recommend_interview ? 'يُنصح بالمقابلة' : 'لا يُنصح بالمقابلة'}
                                </span>
                              </div>
                              {candidate.recommendations.interview_questions && candidate.recommendations.interview_questions.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">أسئلة مقترحة:</p>
                                  <ol className="space-y-1 pr-4 list-decimal list-inside">
                                    {candidate.recommendations.interview_questions.map((q, i) => (
                                      <li key={i} className="text-xs text-slate-700 dark:text-slate-300">{q}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Deductions */}
                          {candidate.deductions && candidate.deductions.length > 0 && (
                            <CollapsibleSection
                              title="تفاصيل الخصومات"
                              icon={<AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />}
                            >
                              <div className="space-y-2">
                                {candidate.deductions.map((d, i) => (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-700 dark:text-slate-300">{d.reason}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400 dark:text-slate-500">{d.category}</span>
                                      <span className="font-semibold text-rose-500 dark:text-rose-400">-{d.points}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleSection>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Download Report */}
              <div className="flex justify-center">
                <Button
                  onClick={downloadReport}
                  variant="outline"
                  className="gap-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                  تحميل التقرير
                </Button>
              </div>

              {/* Disclaimer */}
              <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-5 py-3 text-center text-xs text-slate-500 dark:text-slate-500">
                {result.disclaimer || 'هذه الأداة للمساعدة وليست قرار توظيف نهائي'}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}