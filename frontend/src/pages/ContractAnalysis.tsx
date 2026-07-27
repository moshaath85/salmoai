import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { client } from '@/lib/sdk';
import { toast } from 'sonner';
import {
  FileSearch,
  Loader2,
  LogIn,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Download,
  QrCode,
  Upload,
  FileText,
  X,
  ScanText,
  Eye,
  ZoomIn,
  Image,
  Sparkles,
  Brain,
  Shield,
  Scale,
} from 'lucide-react';
import {
  generateCoverPage,
  wrapReportHtml,
  scoreRingSvg,
  scoreColor,
  riskBadgeHtml,
} from '@/lib/reportStyles';
import * as pdfjsLib from 'pdfjs-dist';

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
      const isDns =
        err?.message?.includes?.('dns') ||
        err?.message?.includes?.('balancer') ||
        err?.message?.includes?.('timeout');
      if (!isDns || i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

type ContractSummary = {
  contract_type?: string;
  salary?: string;
  duration?: string;
  probation?: string;
  leave?: string;
  termination_clause?: string;
  penalties_clause?: string;
  non_compete?: string;
};

type LegalAnalysisItem = {
  clause?: string;
  compliant?: boolean;
  risk_level?: string;
  explanation?: string;
};

type IssueItem = {
  issue?: string;
  severity?: string;
  article?: string;
  recommendation?: string;
};

type DeductionItem = {
  reason?: string;
  points?: number;
  category?: string;
};

type Assessment = {
  overall_rating?: string;
  risk_points?: string[];
  recommendations?: string[];
  should_sign?: boolean;
  should_sign_note?: string;
};

type ReportInfo = {
  report_id?: string;
  date?: string;
  title?: string;
  legal_notice?: string;
};

type ContractAnalysisResult = {
  type: string;
  score?: number;
  score_label?: string;
  risk_level?: string;
  deductions?: DeductionItem[];
  summary?: ContractSummary;
  legal_analysis?: LegalAnalysisItem[];
  issues?: IssueItem[];
  assessment?: Assessment;
  report?: ReportInfo;
  disclaimer?: string;
};

const SUMMARY_LABELS: Record<string, string> = {
  contract_type: 'نوع العقد',
  salary: 'الراتب',
  duration: 'مدة العقد',
  probation: 'فترة التجربة',
  leave: 'الإجازات',
  termination_clause: 'شرط الإنهاء',
  penalties_clause: 'شرط الجزاءات',
  non_compete: 'شرط عدم المنافسة',
};

function getScoreColor(score: number): string {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#F59E0B';
  if (score >= 60) return '#f97316';
  return '#F43F5E';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'ممتاز';
  if (score >= 75) return 'جيد مع ملاحظات';
  if (score >= 60) return 'متوسط';
  return 'خطر';
}

function ScoreRing({ score }: { score: number }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

function RiskLevelBadge({ level }: { level?: string }) {
  if (!level) return null;
  const lower = level.toLowerCase();
  if (lower.includes('منخفض') || lower.includes('low')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="h-4 w-4" />
        مخاطر منخفضة
      </span>
    );
  }
  if (lower.includes('متوسط') || lower.includes('medium')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400 border border-amber-500/20">
        <AlertTriangle className="h-4 w-4" />
        مخاطر متوسطة
      </span>
    );
  }
  if (lower.includes('عالي') || lower.includes('high')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-sm font-medium text-rose-400 border border-rose-500/20">
        <XCircle className="h-4 w-4" />
        مخاطر عالية
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">{level}</span>;
}

function RiskBadge({ level }: { level?: string }) {
  if (!level) return null;
  const lower = level.toLowerCase();
  if (lower.includes('منخفض') || lower.includes('low')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        منخفض
      </span>
    );
  }
  if (lower.includes('متوسط') || lower.includes('medium')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        متوسط
      </span>
    );
  }
  if (lower.includes('مرتفع') || lower.includes('عالي') || lower.includes('high')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400">
        <XCircle className="h-3 w-3" />
        مرتفع
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{level}</span>;
}

function RatingBadge({ rating }: { rating?: string }) {
  if (!rating) return null;
  if (rating.includes('سليم')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        {rating}
      </span>
    );
  }
  if (rating.includes('ملاحظات')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        {rating}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-sm font-medium text-rose-400">
      <XCircle className="h-4 w-4" />
      {rating}
    </span>
  );
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-right transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-base font-semibold text-foreground">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

export default function ContractAnalysis() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [contractText, setContractText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContractAnalysisResult | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [ocrActive, setOcrActive] = useState(false);
  const [ocrPage, setOcrPage] = useState(0);
  const [ocrTotalPages, setOcrTotalPages] = useState(0);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [fullSizePage, setFullSizePage] = useState<string | null>(null);
  const [forceOcr, setForceOcr] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [extractionElapsed, setExtractionElapsed] = useState(0);
  const [autoAnalyzeAfterExtraction, setAutoAnalyzeAfterExtraction] = useState(false);

  const hasDisconnectedArabic = (text: string): boolean => {
    const arabicLetters = text.match(/[\u0600-\u06FF]/g) || [];
    if (arabicLetters.length < 10) return false;
    const words = text.trim().split(/\s+/).filter(w => /[\u0600-\u06FF]/.test(w));
    if (words.length === 0) return false;
    const avgWordLen = arabicLetters.length / words.length;
    return avgWordLen < 2.2;
  };

  const renderPageToImage = async (page: any, scale = 2.0): Promise<string> => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
  };

  const extractPdfTextViaOcr = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      useSystemFonts: true,
      standardFontDataUrl: '/standard_fonts/',
    }).promise;

    setOcrTotalPages(pdf.numPages);
    const pageImages: string[] = [];
    const thumbs: string[] = [];

    // Render all pages to images (client-side) with progress indication
    for (let i = 1; i <= pdf.numPages; i++) {
      setOcrPage(i);
      const page = await pdf.getPage(i);
      const imageDataUri = await renderPageToImage(page);
      pageImages.push(imageDataUri);

      try {
        const thumbDataUri = await renderPageToImage(page, 1.0);
        thumbs.push(thumbDataUri);
      } catch {
        thumbs.push('');
      }
    }

    setPageThumbnails(thumbs);

    // Send all pages to backend OCR API in a single batch call
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/ocr/extract-text',
        method: 'POST',
        data: {
          pages: pageImages.map((img, i) => ({ page_number: i + 1, image_data: img })),
          language: 'ar',
          enhance_quality: true,
        },
      });

      const fullText: string = (response as any)?.full_text || '';
      const pageTextsResult: string[] = (response as any)?.page_texts || [];

      // Set page texts from backend response
      const pTexts: string[] = [];
      for (let i = 0; i < pdf.numPages; i++) {
        pTexts.push(pageTextsResult[i]?.trim() || '');
      }
      setPageTexts(pTexts);

      return fullText;
    } catch (err: any) {
      console.error('Backend OCR failed:', err);
      const errMsg = err?.data?.detail || err?.response?.data?.detail || err?.message || '';
      if (
        errMsg.includes('insufficient') ||
        errMsg.includes('balance') ||
        errMsg.includes('top up') ||
        errMsg.includes('رصيد') ||
        err?.status === 402 ||
        err?.response?.status === 402
      ) {
        const balanceErr = new Error('AI_BALANCE_INSUFFICIENT');
        balanceErr.cause = err;
        throw balanceErr;
      }
      throw err;
    }
  };

  const isBalanceError = (err: any): boolean => {
    const errMsg = err?.data?.detail || err?.response?.data?.detail || err?.message || '';
    return (
      errMsg.includes('insufficient') ||
      errMsg.includes('balance') ||
      errMsg.includes('top up') ||
      errMsg.includes('رصيد') ||
      err?.message === 'AI_BALANCE_INSUFFICIENT' ||
      err?.status === 402 ||
      err?.response?.status === 402
    );
  };

  const BALANCE_ERROR_MSG = 'رصيد الذكاء الاصطناعي غير كافٍ لإتمام العملية. يرجى الذهاب إلى الإعدادات لشحن الرصيد والمحاولة مرة أخرى.';

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      useSystemFonts: true,
      standardFontDataUrl: '/standard_fonts/',
    }).promise;
    const pages: string[] = [];
    const thumbs: string[] = [];
    const pTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      try {
        const thumbDataUri = await renderPageToImage(page, 1.0);
        thumbs.push(thumbDataUri);
      } catch {
        thumbs.push('');
      }

      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      const lineMap = new Map<number, { x: number; str: string; width: number }[]>();
      const Y_TOLERANCE = 3;

      for (const item of items) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5] / Y_TOLERANCE) * Y_TOLERANCE;
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push({
          x: item.transform[4],
          str: item.str,
          width: item.width || 0,
        });
      }

      const sortedLines = Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0]);

      const pageText = sortedLines
        .map(([, lineItems]) => {
          lineItems.sort((a, b) => a.x - b.x);

          const hasArabic = lineItems.some(it =>
            /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(it.str)
          );

          if (hasArabic) {
            const reversed = [...lineItems].reverse();
            const SPACE_THRESHOLD = 6;
            let result = '';
            for (let j = 0; j < reversed.length; j++) {
              const curr = reversed[j];
              if (j === 0) {
                result = curr.str;
              } else {
                const prev = reversed[j - 1];
                const prevEnd = prev.x + prev.width;
                const gap = Math.abs(curr.x - prevEnd);
                if (gap > SPACE_THRESHOLD || prev.width === 0) {
                  result += ' ' + curr.str;
                } else {
                  result += curr.str;
                }
              }
            }
            return result;
          } else {
            return lineItems.map(it => it.str).join(' ');
          }
        })
        .join('\n');

      const normalizedPageText = pageText.normalize('NFC');
      pages.push(normalizedPageText);
      pTexts.push(normalizedPageText);
    }
    setPageThumbnails(thumbs);
    setPageTexts(pTexts);
    return pages.join('\n\n');
  };

  const extractPdfViaBackend = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const dataUri = `data:application/pdf;base64,${base64}`;

    const apiPromise = client.apiCall.invoke({
      url: '/api/v1/ocr/analyze-pdf-contract',
      method: 'POST',
      data: { pdf_data_uri: dataUri, language: 'ar' },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 120000)
    );

    const response = await Promise.race([apiPromise, timeoutPromise]);

    const fullText = (response as any)?.full_text || '';

    if (!fullText.trim()) {
      throw new Error('EMPTY_RESULT');
    }

    return fullText;
  };

  const generateThumbnailsOnly = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        useSystemFonts: true,
        standardFontDataUrl: '/standard_fonts/',
      }).promise;

      const thumbs: string[] = [];
      const emptyTexts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        try {
          const thumbDataUri = await renderPageToImage(page, 0.8);
          thumbs.push(thumbDataUri);
        } catch {
          thumbs.push('');
        }
        emptyTexts.push('');
        // Update progressively
        setPageThumbnails([...thumbs]);
      }
      setPageTexts(emptyTexts);
    } catch (err) {
      console.warn('Thumbnail generation failed:', err);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('يرجى اختيار ملف PDF فقط');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن يكون أقل من 20 ميجابايت');
      return;
    }

    setPdfFile(file);
    setPdfExtracting(true);
    setOcrActive(false);
    setOcrPage(0);
    setOcrTotalPages(0);
    setContractText('');

    try {
      if (forceOcr) {
        setOcrActive(true);
        toast.info('جاري استخدام تقنية OCR لاستخراج النص العربي...');
        try {
          const ocrText = await extractPdfTextViaOcr(file);
          if (ocrText.trim()) {
            setAutoAnalyzeAfterExtraction(true);
            setContractText(ocrText);
            toast.success(`تم استخراج النص بالتعرف البصري (OCR) من ${file.name} بنجاح`);
          } else {
            toast.error('لم يتم العثور على نص في الملف حتى مع استخدام OCR. تأكد أن الملف يحتوي على نص مقروء.');
            setPdfFile(null);
          }
        } catch (ocrErr: any) {
          if (isBalanceError(ocrErr)) {
            toast.error(BALANCE_ERROR_MSG, { duration: 8000 });
            try {
              const fallbackText = await extractPdfText(file);
              if (fallbackText.trim().length >= 50) {
                setContractText(fallbackText);
                toast.warning('تم استخدام الاستخراج العادي بدلاً من OCR بسبب نقص الرصيد. الحروف العربية قد تكون غير متصلة.');
              } else {
                setPdfFile(null);
              }
            } catch {
              setPdfFile(null);
            }
          } else {
            throw ocrErr;
          }
        }
        return;
      }

      // PRIMARY: Try OCR first
      setOcrActive(true);
      try {
        toast.info('جاري استخراج النص بتقنية OCR...');
        const ocrText = await extractPdfTextViaOcr(file);
        if (ocrText.trim().length >= 50) {
          setAutoAnalyzeAfterExtraction(true);
          setContractText(ocrText);
          toast.success(`تم استخراج النص بتقنية OCR من ${file.name} بنجاح`);
          generateThumbnailsOnly(file);
          return;
        }
        // OCR returned insufficient text, fall through
      } catch (ocrErr: any) {
        if (isBalanceError(ocrErr)) {
          toast.error(BALANCE_ERROR_MSG, { duration: 8000 });
        }
        // Fall through to AI backend
      }

      // SECONDARY: Try AI backend extraction
      setOcrActive(false);
      try {
        toast.info('جاري المحاولة عبر الذكاء الاصطناعي...');
        const backendText = await extractPdfViaBackend(file);
        if (backendText.trim().length >= 50) {
          setAutoAnalyzeAfterExtraction(true);
          setContractText(backendText);
          toast.success(`تم استخراج النص من ${file.name} بنجاح عبر الذكاء الاصطناعي`);
          generateThumbnailsOnly(file);
          return;
        }
      } catch (backendErr: any) {
        if (isBalanceError(backendErr)) {
          toast.error(BALANCE_ERROR_MSG, { duration: 8000 });
        } else if (backendErr?.message === 'TIMEOUT') {
          toast.warning('استغرق الاستخراج وقتاً طويلاً، جاري المحاولة بطريقة بديلة...');
        }
      }

      // FINAL FALLBACK: Client-side extraction
      const text = await extractPdfText(file);

      const MIN_TEXT_LENGTH = 50;
      if (text.trim().length >= MIN_TEXT_LENGTH) {
        if (hasDisconnectedArabic(text)) {
          // OCR was already attempted above, just warn about disconnected Arabic
          setAutoAnalyzeAfterExtraction(true);
          setContractText(text);
          toast.warning('النص المستخرج قد يحتوي على حروف عربية غير متصلة. تم استخدام الاستخراج المحلي.');
        } else {
          setAutoAnalyzeAfterExtraction(true);
          setContractText(text);
          toast.success(`تم استخراج النص من ${file.name} بنجاح`);
        }
      } else {
        // Both OCR and AI backend were already attempted and failed
        toast.error('لم يتم العثور على نص كافٍ في الملف. تأكد أن الملف يحتوي على نص مقروء.');
        setPdfFile(null);
      }
    } catch (err: any) {
      if (isBalanceError(err)) {
        toast.error(BALANCE_ERROR_MSG, { duration: 8000 });
      } else {
        toast.error('فشل في قراءة ملف PDF. تأكد أن الملف غير محمي أو تالف.');
      }
      setPdfFile(null);
    } finally {
      setPdfExtracting(false);
      setOcrActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (loading || pdfExtracting) return;
    const files = Array.from(e.dataTransfer.files);
    const droppedPdf = files.find(f => f.type === 'application/pdf');
    if (droppedPdf) {
      if (droppedPdf.size > 20 * 1024 * 1024) {
        toast.error('حجم الملف يجب أن يكون أقل من 20 ميجابايت');
        return;
      }
      setPdfFile(droppedPdf);
      setPdfExtracting(true);
      setOcrActive(false);
      setOcrPage(0);
      setOcrTotalPages(0);
      setContractText('');
      try {
        // PRIMARY: Try OCR first
        setOcrActive(true);
        try {
          toast.info('جاري استخراج النص بتقنية OCR...');
          const ocrText = await extractPdfTextViaOcr(droppedPdf);
          if (ocrText.trim().length >= 50) {
            setAutoAnalyzeAfterExtraction(true);
            setContractText(ocrText);
            toast.success(`تم استخراج النص بتقنية OCR بنجاح`);
            generateThumbnailsOnly(droppedPdf);
            return;
          }
          // OCR returned insufficient text, fall through
        } catch (ocrErr: any) {
          if (isBalanceError(ocrErr)) {
            toast.error(BALANCE_ERROR_MSG, { duration: 8000 });
          }
          // Fall through to AI backend
        }

        // SECONDARY: Try AI backend extraction
        setOcrActive(false);
        try {
          toast.info('جاري المحاولة عبر الذكاء الاصطناعي...');
          const backendText = await extractPdfViaBackend(droppedPdf);
          if (backendText.trim().length >= 50) {
            setAutoAnalyzeAfterExtraction(true);
            setContractText(backendText);
            toast.success(`تم استخراج النص بنجاح عبر الذكاء الاصطناعي`);
            generateThumbnailsOnly(droppedPdf);
            return;
          }
        } catch (backendErr: any) {
          if (isBalanceError(backendErr)) {
            toast.error(BALANCE_ERROR_MSG, { duration: 8000 });
          } else if (backendErr?.message === 'TIMEOUT') {
            toast.warning('استغرق الاستخراج وقتاً طويلاً، جاري المحاولة بطريقة بديلة...');
          }
        }

        // FINAL FALLBACK: Client-side extraction
        const text = await extractPdfText(droppedPdf);
        const MIN_TEXT_LENGTH = 50;
        if (text.trim().length >= MIN_TEXT_LENGTH) {
          if (hasDisconnectedArabic(text)) {
            // OCR was already attempted, just warn about disconnected Arabic
            setAutoAnalyzeAfterExtraction(true);
            setContractText(text);
            toast.warning('النص المستخرج قد يحتوي على حروف عربية غير متصلة.');
          } else {
            setAutoAnalyzeAfterExtraction(true);
            setContractText(text);
            toast.success(`تم استخراج النص من ${droppedPdf.name} بنجاح`);
          }
        } else {
          // Both OCR and AI backend were already attempted and failed
          toast.error('لم يتم العثور على نص كافٍ في الملف');
          setPdfFile(null);
        }
      } catch (err: any) {
        if (isBalanceError(err)) {
          toast.error(BALANCE_ERROR_MSG, { duration: 8000 });
        } else {
          toast.error('فشل في قراءة ملف PDF');
        }
        setPdfFile(null);
      } finally {
        setPdfExtracting(false);
        setOcrActive(false);
      }
    } else {
      toast.error('يرجى رفع ملف PDF فقط');
    }
  };

  const clearPdf = () => {
    setPdfFile(null);
    setContractText('');
    setOcrActive(false);
    setOcrPage(0);
    setOcrTotalPages(0);
    setPageThumbnails([]);
    setPageTexts([]);
    setSelectedPageIndex(null);
    setShowPreviewPanel(false);
    setFullSizePage(null);
    setForceOcr(false);
  };

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

  // Timer for extraction elapsed time
  useEffect(() => {
    if (!pdfExtracting) {
      setExtractionElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setExtractionElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [pdfExtracting]);

  // Timer for analysis elapsed time
  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  // Auto-analyze after extraction completes
  useEffect(() => {
    if (autoAnalyzeAfterExtraction && contractText.trim().length >= 50 && !loading && !pdfExtracting) {
      setAutoAnalyzeAfterExtraction(false);
      const timer = setTimeout(() => {
        analyze();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyzeAfterExtraction, contractText, loading, pdfExtracting]);

  const analyze = async () => {
    if (!contractText.trim() || loading) return;

    // Validate minimum text length before calling API
    if (contractText.trim().length < 50) {
      toast.error('نص العقد قصير جداً. يرجى التأكد من رفع العقد كاملاً أو لصق النص بالكامل (50 حرف على الأقل).');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await withRetry(() =>
        client.apiCall.invoke({
          url: '/api/v1/salmo/analyze-contract',
          method: 'POST',
          data: { contract_text: contractText },
        })
      );

      // Robust response parsing — handle various response shapes from apiCall.invoke
      const rawRes = res as any;
      let analysis = rawRes?.analysis || rawRes?.data?.analysis || rawRes?.data?.data?.analysis;

      // If analysis is a JSON string, parse it
      if (typeof analysis === 'string') {
        try {
          analysis = JSON.parse(analysis);
        } catch {
          // If it's not valid JSON string, wrap in a basic structure
          analysis = {
            type: 'contract_analysis',
            score: 0,
            score_label: 'غير متاح',
            risk_level: 'غير محدد',
            deductions: [],
            summary: {},
            legal_analysis: [],
            issues: [{ issue: 'تعذر تحليل الرد', severity: 'متوسط', article: '-', recommendation: 'يرجى إعادة المحاولة' }],
            assessment: { overall_rating: 'غير محدد', risk_points: [], recommendations: ['إعادة المحاولة'], should_sign: false, should_sign_note: '' },
            disclaimer: 'هذه الأداة للمساعدة وليست استشارة قانونية رسمية',
          };
        }
      }

      // If analysis is still null/undefined, show error
      if (!analysis || typeof analysis !== 'object') {
        toast.error('لم يتم الحصول على نتيجة صالحة من الخادم. يرجى المحاولة مرة أخرى.');
        return;
      }

      // Check if it's an error/unavailable response from backend
      if (analysis.error_type === 'balance') {
        toast.error(BALANCE_ERROR_MSG, { duration: 8000 });
      } else if (analysis.error_type === 'service') {
        toast.warning('خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة مرة أخرى بعد قليل.', { duration: 6000 });
      }

      setResult(analysis as ContractAnalysisResult);
    } catch (err: any) {
      if (isBalanceError(err)) {
        toast.error(BALANCE_ERROR_MSG, { duration: 8000 });
      } else {
        const isDns =
          err?.message?.includes?.('dns') ||
          err?.message?.includes?.('balancer') ||
          err?.message?.includes?.('timeout');
        const isServerError = err?.status === 500 || err?.response?.status === 500;
        const is502 = err?.status === 502 || err?.response?.status === 502;

        let detail: string;
        if (isDns) {
          detail = 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.';
        } else if (is502) {
          detail = 'لم يتم الحصول على رد من الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.';
        } else if (isServerError) {
          detail = 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى بعد قليل.';
        } else {
          detail = err?.data?.detail || err?.response?.data?.detail || err?.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
        }
        toast.error(detail, { duration: 6000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadContractReport = () => {
    if (!result) return;

    const score = result.score ?? 0;
    const color = scoreColor(score);
    const reportId = result.report?.report_id || '—';
    const reportDate = result.report?.date || new Date().toLocaleDateString('ar-SA');

    const coverPage = generateCoverPage({
      title: 'تقرير تحليل العقد',
      subtitle: result.report?.title || 'تحليل شامل لعقد العمل وفق نظام العمل السعودي',
      reportId,
      date: reportDate,
    });

    const shouldSign = result.assessment?.should_sign;
    const shouldSignIcon = shouldSign ? '✅' : '⚠️';
    const shouldSignText = shouldSign ? 'يمكن التوقيع على العقد' : 'يُنصح بعدم التوقيع قبل المراجعة';
    const shouldSignBg = shouldSign ? '#ecfdf5' : '#fef2f2';
    const shouldSignFg = shouldSign ? '#065f46' : '#991b1b';
    const shouldSignBorder = shouldSign ? '#a7f3d0' : '#fecaca';

    let bodyContent = `
      <div class="report-section-title"><span class="section-icon">📊</span> نتيجة التقييم</div>
      <div class="report-grid-2">
        <div class="report-card" style="text-align:center;">
          <div class="report-score-container">
            ${scoreRingSvg(score, 140)}
            <div class="report-score-label" style="color:${color}">${result.score_label || getScoreLabel(score)}</div>
            <div class="report-score-sublabel">تقييم العقد</div>
          </div>
        </div>
        <div class="report-card">
          <ul class="report-kv-list">
            <li class="report-kv-row">
              <span class="report-kv-label">مستوى المخاطر</span>
              <span class="report-kv-value">${riskBadgeHtml(result.risk_level || '—')}</span>
            </li>
            ${result.assessment?.overall_rating ? `<li class="report-kv-row">
              <span class="report-kv-label">التقييم العام</span>
              <span class="report-kv-value">${result.assessment.overall_rating}</span>
            </li>` : ''}
          </ul>
          ${shouldSign !== undefined ? `
          <div style="margin-top:16px;padding:14px 18px;border-radius:12px;background:${shouldSignBg};border:1px solid ${shouldSignBorder};color:${shouldSignFg};">
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;">${shouldSignIcon} ${shouldSignText}</div>
            ${result.assessment?.should_sign_note ? `<div style="font-size:0.82rem;opacity:0.85;margin-top:6px;">${result.assessment.should_sign_note}</div>` : ''}
          </div>` : ''}
        </div>
      </div>`;

    if (result.deductions && result.deductions.length > 0) {
      const severityColor = (cat?: string) => {
        if (!cat) return '#666';
        if (cat.includes('عالي')) return '#ef4444';
        if (cat.includes('متوسط')) return '#f59e0b';
        return '#22c55e';
      };

      const deductionRows = result.deductions.map(d => `
        <tr>
          <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${severityColor(d.category)};margin-left:8px;vertical-align:middle;"></span>${d.reason || '—'}</td>
          <td style="text-align:center;">${d.category || '—'}</td>
          <td style="text-align:center;font-weight:700;color:#ef4444;">${d.points ?? '—'}</td>
        </tr>`).join('');

      bodyContent += `
        <div class="report-section-title"><span class="section-icon">📉</span> تفاصيل الخصومات</div>
        <table class="report-table">
          <thead><tr><th>السبب</th><th style="text-align:center;">التصنيف</th><th style="text-align:center;">النقاط</th></tr></thead>
          <tbody>${deductionRows}</tbody>
          <tfoot><tr><td colspan="2">النتيجة النهائية</td><td style="text-align:center;color:${color};font-size:1.1rem;">${score} / 100</td></tr></tfoot>
        </table>`;
    }

    if (result.summary) {
      const summaryEntries = Object.entries(result.summary).filter(([, v]) => v);
      if (summaryEntries.length > 0) {
        const summaryRows = summaryEntries.map(([key, value]) => `
          <li class="report-kv-row">
            <span class="report-kv-label">${SUMMARY_LABELS[key] || key}</span>
            <span class="report-kv-value">${value}</span>
          </li>`).join('');

        bodyContent += `
          <div class="report-section-title"><span class="section-icon">📋</span> ملخص العقد</div>
          <div class="report-card">
            <ul class="report-kv-list">${summaryRows}</ul>
          </div>`;
      }
    }

    if (result.legal_analysis && result.legal_analysis.length > 0) {
      const legalCards = result.legal_analysis.map(item => {
        const complianceIcon = item.compliant === true ? '✅' : item.compliant === false ? '❌' : '';
        const complianceText = item.compliant === true ? 'متوافق' : item.compliant === false ? 'غير متوافق' : '';
        const complianceColor = item.compliant === true ? '#065f46' : item.compliant === false ? '#991b1b' : '#666';
        const cardClass = item.compliant === true ? 'report-card report-card-success' : item.compliant === false ? 'report-card report-card-danger' : 'report-card';

        return `
          <div class="${cardClass}">
            <div class="report-card-header">
              <span class="report-card-title">${item.clause || '—'}</span>
              <div style="display:flex;align-items:center;gap:10px;">
                ${complianceText ? `<span style="font-size:0.8rem;color:${complianceColor};font-weight:600;">${complianceIcon} ${complianceText}</span>` : ''}
                ${item.risk_level ? riskBadgeHtml(item.risk_level) : ''}
              </div>
            </div>
            ${item.explanation ? `<p style="font-size:0.85rem;color:#555;line-height:1.8;">${item.explanation}</p>` : ''}
          </div>`;
      }).join('');

      bodyContent += `
        <div class="report-section-title"><span class="section-icon">⚖️</span> التحليل القانوني</div>
        ${legalCards}`;
    }

    if (result.issues && result.issues.length > 0) {
      const issueCards = result.issues.map(item => `
        <div class="report-card report-card-accent">
          <div class="report-card-header">
            <span class="report-card-title">${item.issue || '—'}</span>
            ${item.severity ? riskBadgeHtml(item.severity) : ''}
          </div>
          ${item.article ? `<p style="font-size:0.78rem;color:#999;margin-bottom:6px;">المادة: ${item.article}</p>` : ''}
          ${item.recommendation ? `<div class="report-highlight report-highlight-tip"><span class="report-highlight-icon">💡</span><span>${item.recommendation}</span></div>` : ''}
        </div>`).join('');

      bodyContent += `
        <div class="report-section-title"><span class="section-icon">🔍</span> المشاكل المكتشفة</div>
        ${issueCards}`;
    }

    if (result.assessment) {
      let assessmentContent = '';

      if (result.assessment.risk_points && result.assessment.risk_points.length > 0) {
        const riskItems = result.assessment.risk_points.map(rp => `<li>${rp}</li>`).join('');
        assessmentContent += `
          <div style="margin-bottom:18px;">
            <h3 class="report-subsection-title">⚠️ نقاط المخاطر</h3>
            <ul class="report-list report-list-danger">${riskItems}</ul>
          </div>`;
      }

      if (result.assessment.recommendations && result.assessment.recommendations.length > 0) {
        const recItems = result.assessment.recommendations.map(rec => `<li>${rec}</li>`).join('');
        assessmentContent += `
          <div>
            <h3 class="report-subsection-title">✅ التوصيات</h3>
            <ul class="report-list report-list-success">${recItems}</ul>
          </div>`;
      }

      if (assessmentContent) {
        bodyContent += `
          <div class="report-section-title"><span class="section-icon">📝</span> التقييم النهائي</div>
          <div class="report-card">${assessmentContent}</div>`;
      }
    }

    if (result.disclaimer) {
      bodyContent += `
        <hr class="report-divider" />
        <div class="report-highlight report-highlight-info">
          <span class="report-highlight-icon">ℹ️</span>
          <span>${result.disclaimer}</span>
        </div>`;
    }

    const fullHtml = wrapReportHtml({
      title: 'تقرير تحليل العقد',
      bodyContent,
      coverPage,
      printBtnText: 'طباعة / حفظ PDF',
    });

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير-تحليل-العقد-${reportId}-${reportDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!authChecked) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">جاري التحقق...</span>
        </div>
      </div>
    );
  }

  if (authError && !user) {
    return (
      <div dir="rtl" className="min-h-screen bg-background font-[Cairo,Inter,sans-serif]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تعذر الاتصال بالخادم</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            حدث خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.
          </p>
          <Button
            onClick={checkAuth}
            className="mt-6 bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-600 hover:to-violet-600 border-0"
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen bg-background font-[Cairo,Inter,sans-serif]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20">
            <FileSearch className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">سجّل الدخول لتحليل العقد</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            لتحليل عقد العمل الخاص بك، سجّل الدخول مجاناً.
          </p>
          <Button
            onClick={() => client.auth.toLogin()}
            className="mt-6 bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-600 hover:to-violet-600 border-0"
          >
            <LogIn className="ml-2 h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background font-[Cairo,Inter,sans-serif]">
      <Navbar />

      <div className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
          {/* Hero Header */}
          <div className="mb-8 text-center animate-fade-in">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20 ai-pulse">
              <FileSearch className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold md:text-4xl gradient-text">تحليل عقود العمل</h1>
            <p className="mt-3 text-sm text-muted-foreground md:text-base max-w-2xl mx-auto">
              ارفع ملف PDF أو الصق نص العقد وسيقوم الذكاء الاصطناعي بتحليله وتقييمه واكتشاف المخالفات بناءً على نظام العمل السعودي
            </p>
          </div>

          {/* Upload & Input Area */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 animate-slide-up">
            {/* Drag & Drop Zone */}
            {!pdfFile && !contractText && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('contract-pdf-input')?.click()}
                className={`relative mb-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition-all duration-300 ${
                  isDragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-border bg-muted/50 hover:border-primary/50 hover:bg-muted'
                }`}
              >
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
                  isDragOver ? 'bg-primary/10 text-primary scale-110' : 'bg-muted text-muted-foreground'
                }`}>
                  <Upload className="h-7 w-7" />
                </div>
                <span className={`text-sm font-medium ${isDragOver ? 'text-primary' : 'text-foreground'}`}>
                  {isDragOver ? 'أفلت الملف هنا' : 'اسحب ملف PDF هنا أو اضغط للاختيار'}
                </span>
                <span className="mt-1.5 text-xs text-muted-foreground/60">
                  يدعم الملفات الممسوحة ضوئياً بالتعرف البصري OCR — حتى 20 ميجابايت
                </span>
                <input
                  id="contract-pdf-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  disabled={loading || pdfExtracting}
                />
              </div>
            )}

            {/* Controls bar */}
            <div className="mb-3 flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground">
                نص عقد العمل
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForceOcr(!forceOcr)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    forceOcr
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20'
                      : 'border-border bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                  disabled={loading || pdfExtracting}
                >
                  <ScanText className="h-3.5 w-3.5" />
                  {forceOcr ? 'OCR مفعّل' : 'فرض OCR'}
                </button>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10">
                  <Upload className="h-3.5 w-3.5" />
                  رفع PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    disabled={loading || pdfExtracting}
                  />
                </label>
              </div>
            </div>

            {forceOcr && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-400/20 px-3 py-2 text-xs text-cyan-700 dark:text-cyan-300">
                <ScanText className="h-3.5 w-3.5 shrink-0" />
                سيتم استخدام التعرف البصري (OCR) لاستخراج النص العربي بشكل متصل ودقيق.
              </div>
            )}

            {/* PDF file indicator */}
            {pdfFile && (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/50 border border-border px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{pdfFile.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(pdfFile.size / 1024).toFixed(0)} KB
                      {pdfExtracting && !ocrActive && ' · جاري الاستخراج...'}
                      {pdfExtracting && ocrActive && ` · OCR صفحة ${ocrPage}/${ocrTotalPages}...`}
                      {!pdfExtracting && contractText && ' · تم الاستخراج ✓'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearPdf}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  disabled={loading || pdfExtracting}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Page Preview Panel */}
            {pdfFile && pageThumbnails.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                    className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    معاينة الصفحات ({pageThumbnails.length})
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showPreviewPanel ? 'rotate-180' : ''}`} />
                  </button>
                  {selectedPageIndex !== null && (
                    <button
                      onClick={() => setSelectedPageIndex(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      عرض الكل
                    </button>
                  )}
                </div>

                {showPreviewPanel && (
                  <div className="rounded-xl border border-border bg-muted/50 overflow-hidden">
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 p-3">
                      {pageThumbnails.map((thumb, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedPageIndex(selectedPageIndex === idx ? null : idx)}
                          className={`group relative flex flex-col items-center rounded-lg border-2 overflow-hidden transition-all ${
                            selectedPageIndex === idx
                              ? 'border-primary shadow-md shadow-primary/20'
                              : 'border-transparent hover:border-border'
                          }`}
                        >
                          <div className="relative w-full aspect-[3/4] bg-muted/50 overflow-hidden">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={`صفحة ${idx + 1}`}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-muted-foreground/60">
                                <Image className="h-6 w-6" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                              <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <span className={`text-[10px] py-1 font-medium ${
                            selectedPageIndex === idx ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>

                    {selectedPageIndex !== null && pageThumbnails[selectedPageIndex] && (
                      <div className="border-t border-border bg-muted/50 p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-shrink-0 flex flex-col items-center">
                            <div className="relative rounded-lg border border-border overflow-hidden bg-muted/50 cursor-zoom-in"
                              onClick={() => setFullSizePage(pageThumbnails[selectedPageIndex])}
                            >
                              <img
                                src={pageThumbnails[selectedPageIndex]}
                                alt={`صفحة ${selectedPageIndex + 1}`}
                                className="max-w-[280px] max-h-[380px] object-contain"
                              />
                              <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white">
                                <ZoomIn className="h-3 w-3" />
                                تكبير
                              </div>
                            </div>
                            <span className="mt-2 text-xs font-medium text-foreground/80">
                              صفحة {selectedPageIndex + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <ScanText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">
                                النص المستخرج — صفحة {selectedPageIndex + 1}
                              </span>
                              {pageTexts[selectedPageIndex] && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                  ✓ {pageTexts[selectedPageIndex].length} حرف
                                </span>
                              )}
                              {!pageTexts[selectedPageIndex]?.trim() && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                  لا يوجد نص
                                </span>
                              )}
                            </div>
                            <div className="rounded-lg border border-border bg-muted/50 p-3 max-h-[300px] overflow-y-auto">
                              <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap" dir="rtl">
                                {pageTexts[selectedPageIndex]?.trim() || 'لم يتم استخراج نص من هذه الصفحة'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Full-size page modal */}
            {fullSizePage && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={() => setFullSizePage(null)}
              >
                <div
                  className="relative max-w-4xl max-h-[90vh] overflow-auto rounded-xl bg-card border border-border shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setFullSizePage(null)}
                    className="absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <img
                    src={fullSizePage}
                    alt="صفحة مكبرة"
                    className="w-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Extracting overlay with progress */}
            {pdfExtracting && !ocrActive && (
              <div className="mb-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/20 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">جاري استخراج النص من الملف...</span>
                </div>
                {(() => {
                  const estimatedTotal = pdfFile && pdfFile.size > 2 * 1024 * 1024 ? 30 : pdfFile && pdfFile.size > 500 * 1024 ? 20 : 12;
                  const rawProgress = (extractionElapsed / estimatedTotal) * 100;
                  const progress = rawProgress <= 90 ? rawProgress : 90 + (10 * (1 - Math.exp(-(rawProgress - 90) / 30)));
                  const remainingSeconds = Math.max(estimatedTotal - extractionElapsed, 0);
                  const displayRemaining = extractionElapsed >= estimatedTotal
                    ? 'جاري الإنهاء...'
                    : `متبقي ~${remainingSeconds} ثانية`;
                  return (
                    <>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-amber-100 dark:bg-amber-500/20 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700 ease-out ${extractionElapsed >= estimatedTotal ? 'animate-pulse' : ''}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400/80">
                        <span>{extractionElapsed} ثانية مضت</span>
                        <span className={extractionElapsed >= estimatedTotal ? 'animate-pulse' : ''}>{displayRemaining}</span>
                      </div>
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400/70">
                        {extractionElapsed < 5 && 'جاري قراءة محتوى الملف...'}
                        {extractionElapsed >= 5 && extractionElapsed < 12 && 'جاري تحليل النص عبر الذكاء الاصطناعي...'}
                        {extractionElapsed >= 12 && extractionElapsed < 20 && 'جاري معالجة الصفحات واستخراج البنود...'}
                        {extractionElapsed >= 20 && extractionElapsed < 30 && '⏳ الملف كبير، يرجى الانتظار قليلاً...'}
                        {extractionElapsed >= 30 && 'جاري معالجة الملف عبر الذكاء الاصطناعي، قد يستغرق وقتاً أطول للملفات الكبيرة...'}
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            {/* OCR progress overlay */}
            {pdfExtracting && ocrActive && (
              <div className="mb-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-400/20 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <ScanText className="h-4 w-4 animate-pulse" />
                  <span className="font-medium">التعرف البصري على النص (OCR)</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-blue-100 dark:bg-blue-500/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${ocrTotalPages > 0 ? (ocrPage / ocrTotalPages) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
                    {ocrPage} / {ocrTotalPages}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400/80">
                  جاري تحليل الصفحة {ocrPage} من {ocrTotalPages} باستخدام الذكاء الاصطناعي...
                </p>
              </div>
            )}

            <Textarea
              value={contractText}
              onChange={(e) => {
                setContractText(e.target.value);
                if (pdfFile && e.target.value !== contractText) {
                  setPdfFile(null);
                }
              }}
              placeholder="الصق نص عقد العمل هنا... أو ارفع ملف PDF"
              className="min-h-[200px] resize-y text-sm placeholder:text-muted-foreground/60"
              disabled={loading || pdfExtracting}
            />
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground/60">
                هذه الأداة للمساعدة وليست استشارة قانونية رسمية
              </p>
              <Button
                onClick={analyze}
                disabled={loading || !contractText.trim() || pdfExtracting}
                className="bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-600 hover:to-violet-600 border-0 shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <Sparkles className="ml-2 h-4 w-4" />
                    تحليل العقد
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="mt-8 flex flex-col items-center gap-4 text-center animate-fade-in">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center ai-pulse">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <p className="text-sm font-medium text-foreground/90">جاري تحليل العقد عبر الذكاء الاصطناعي...</p>

              {/* Progress bar with estimated remaining time */}
              {(() => {
                const estimatedTotal = contractText.length > 5000 ? 45 : contractText.length > 2000 ? 35 : 25;
                const progress = Math.min((elapsedSeconds / estimatedTotal) * 100, 95);
                const remainingSeconds = Math.max(estimatedTotal - elapsedSeconds, 0);
                const displayRemaining = elapsedSeconds >= estimatedTotal
                  ? 'يكتمل قريباً...'
                  : `متبقي ~${remainingSeconds} ثانية`;
                return (
                  <div className="w-full max-w-md space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{elapsedSeconds} ثانية مضت</span>
                      <span>{displayRemaining}</span>
                    </div>
                    <div className="relative h-3 w-full rounded-full bg-muted/50 overflow-hidden border border-border">
                      <div
                        className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-blue-500 to-violet-500 transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                      <div
                        className="absolute inset-y-0 right-0 rounded-full bg-white/20 animate-pulse"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                      {elapsedSeconds < 10 && 'جاري قراءة بنود العقد...'}
                      {elapsedSeconds >= 10 && elapsedSeconds < 20 && 'جاري مقارنة البنود مع نظام العمل السعودي...'}
                      {elapsedSeconds >= 20 && elapsedSeconds < 35 && 'جاري إعداد التقييم القانوني...'}
                      {elapsedSeconds >= 35 && elapsedSeconds < 50 && 'جاري إنهاء التقرير النهائي...'}
                      {elapsedSeconds >= 50 && '⏳ التحليل يستغرق وقتاً أطول من المعتاد، يرجى الانتظار...'}
                    </p>
                  </div>
                );
              })()}

              {/* Step indicators */}
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 w-full max-w-lg">
                {[
                  { label: 'استخراج البيانات', threshold: 3 },
                  { label: 'التقييم الرقمي', threshold: 10 },
                  { label: 'التحليل القانوني', threshold: 20 },
                  { label: 'التقييم النهائي', threshold: 30 },
                ].map((step, i) => {
                  const isActive = elapsedSeconds >= step.threshold;
                  return (
                    <div key={i} className={`bg-card border rounded-xl shadow-sm px-3 py-2.5 text-center transition-all duration-500 ${
                      isActive ? 'border-primary/50 text-primary scale-[1.02]' : 'border-border text-muted-foreground'
                    }`}>
                      <div className="flex items-center justify-center gap-1.5">
                        {isActive ? (
                          <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                        )}
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="mt-8 flex flex-col gap-6 animate-slide-up">
              {/* Report Header Card */}
              {result.report && (
                <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Salmo Solutions</h2>
                      <p className="text-sm text-muted-foreground">{result.report.title || 'Contract Analysis Report'}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground/60">Report ID</p>
                      <p className="text-sm font-mono font-semibold text-foreground">{result.report.report_id || '—'}</p>
                      <p className="mt-1 text-xs text-muted-foreground/60">{result.report.date || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Score + Risk Level */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Score Card */}
                <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col items-center gap-4 p-6">
                  <ScoreRing score={result.score ?? 0} />
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">
                      {result.score_label || getScoreLabel(result.score ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">تقييم العقد</p>
                  </div>
                </div>

                {/* Risk Level + Quick Info */}
                <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">مستوى المخاطر</span>
                    <RiskLevelBadge level={result.risk_level} />
                  </div>

                  {result.assessment?.should_sign !== undefined && (
                    <div
                      className={`rounded-xl p-4 ${
                        result.assessment.should_sign
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-rose-500/10 border border-rose-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result.assessment.should_sign ? (
                          <ShieldCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
                        )}
                        <span className="font-semibold text-foreground">
                          {result.assessment.should_sign ? 'يمكن التوقيع على العقد' : 'يُنصح بعدم التوقيع قبل المراجعة'}
                        </span>
                      </div>
                      {result.assessment.should_sign_note && (
                        <p className="mt-2 text-sm text-muted-foreground">{result.assessment.should_sign_note}</p>
                      )}
                    </div>
                  )}

                  {result.assessment?.overall_rating && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">التقييم العام</span>
                      <RatingBadge rating={result.assessment.overall_rating} />
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
                    <QrCode className="h-5 w-5 text-muted-foreground/60" />
                    <span className="text-[11px] text-muted-foreground/60">يمكن التحقق من التقرير عبر QR Code</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              {result.deductions && result.deductions.length > 0 && (
                <CollapsibleSection
                  title="تفاصيل الخصومات"
                  icon={<Scale className="h-5 w-5 text-primary" />}
                >
                  <div className="divide-y divide-border">
                    {result.deductions.map((d, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              d.category === 'عالي'
                                ? 'bg-rose-500'
                                : d.category === 'متوسط'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span className="text-sm text-foreground/80">{d.reason}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground/60">{d.category}</span>
                          <span className="text-sm font-semibold text-rose-500 dark:text-rose-400">
                            {d.points}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-5 py-3 bg-muted/50">
                      <span className="text-sm font-bold text-foreground">النتيجة النهائية</span>
                      <span className="text-lg font-bold" style={{ color: getScoreColor(result.score ?? 0) }}>
                        {result.score ?? 0} / 100
                      </span>
                    </div>
                  </div>
                </CollapsibleSection>
              )}

              {/* Contract Summary */}
              {result.summary && (
                <CollapsibleSection
                  title="ملخص العقد"
                  icon={<FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
                >
                  <div className="grid gap-0 divide-y divide-border">
                    {Object.entries(result.summary).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <div key={key} className="flex items-center justify-between px-5 py-3">
                          <span className="text-sm text-muted-foreground">
                            {SUMMARY_LABELS[key] || key}
                          </span>
                          <span className="text-sm font-medium text-foreground">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              )}

              {/* Legal Analysis */}
              {result.legal_analysis && result.legal_analysis.length > 0 && (
                <CollapsibleSection
                  title="التحليل القانوني"
                  icon={<Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
                >
                  <div className="divide-y divide-border">
                    {result.legal_analysis.map((item, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{item.clause}</span>
                          <div className="flex items-center gap-2">
                            {item.compliant !== undefined && (
                              <span
                                className={`text-xs ${
                                  item.compliant ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {item.compliant ? '✓ متوافق' : '✗ غير متوافق'}
                              </span>
                            )}
                            <RiskBadge level={item.risk_level} />
                          </div>
                        </div>
                        {item.explanation && (
                          <p className="text-sm leading-relaxed text-muted-foreground">{item.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Issues */}
              {result.issues && result.issues.length > 0 && (
                <CollapsibleSection
                  title="المشاكل المكتشفة"
                  icon={<AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />}
                >
                  <div className="divide-y divide-border">
                    {result.issues.map((item, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{item.issue}</span>
                          <RiskBadge level={item.severity} />
                        </div>
                        {item.article && (
                          <p className="mb-1 text-xs text-muted-foreground/60">المادة: {item.article}</p>
                        )}
                        {item.recommendation && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            💡 {item.recommendation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Risk Points & Recommendations */}
              {result.assessment && (
                <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                  <h2 className="mb-4 text-lg font-bold text-foreground">التقييم النهائي</h2>

                  {result.assessment.risk_points && result.assessment.risk_points.length > 0 && (
                    <div className="mb-4">
                      <h3 className="mb-2 text-sm font-semibold text-rose-500 dark:text-rose-400">⚠️ نقاط المخاطر</h3>
                      <ul className="space-y-1.5">
                        {result.assessment.risk_points.map((rp, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500 dark:bg-rose-400" />
                            {rp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.assessment.recommendations && result.assessment.recommendations.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">✅ التوصيات</h3>
                      <ul className="space-y-1.5">
                        {result.assessment.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Print / Download Button */}
              <div className="flex justify-center print:hidden">
                <Button
                  onClick={downloadContractReport}
                  variant="outline"
                  className="gap-2 border-border text-foreground hover:bg-muted"
                >
                  <Download className="h-4 w-4" />
                  تحميل التقرير
                </Button>
              </div>

              {/* Disclaimer */}
              <div className="rounded-xl bg-muted/50 border border-border px-5 py-3 text-center text-xs text-muted-foreground/60">
                {result.disclaimer || 'هذه الأداة للمساعدة وليست استشارة قانونية رسمية'}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}