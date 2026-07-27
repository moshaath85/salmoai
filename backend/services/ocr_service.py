"""
OCR Service — uses AI vision models for Arabic text extraction and structured data parsing.
Enhanced with direct PDF analysis, OCR error correction, and confidence-scored resume extraction.
"""

import json
import logging
from typing import List, Optional

from schemas.aihub import AnalyzePdfRequest, ChatMessage, GenTxtRequest
from services.aihub import AIHubService

logger = logging.getLogger(__name__)

OCR_MODEL = "gemini-2.5-pro"

OCR_SYSTEM_PROMPT = """You are an advanced OCR system specialized in Arabic and English text extraction.
Your task is to accurately extract ALL text from the provided image.

Rules:
- Extract every piece of text visible in the image, preserving the original structure and layout.
- Maintain paragraph breaks and line spacing.
- For Arabic text, preserve right-to-left reading order.
- For multi-column layouts, process columns separately (right column first for Arabic documents).
- If the image contains tables, format them clearly using | separators for columns and --- for row dividers.
- For mixed Arabic/English text, maintain the correct reading direction for each segment.
- Handle complex layouts: headers, footers, sidebars, watermarks, stamps, and overlaid text.
- If text is partially obscured or unclear, indicate with [unclear] but still attempt extraction.
- Preserve numbering, bullet points, and list formatting.
- For dates, preserve the original format (Hijri or Gregorian).
- Do NOT add any commentary, headers, or explanations — output ONLY the extracted text.
- If the image contains no text, respond with [NO_TEXT_FOUND].
"""

OCR_ENHANCED_PROMPT = """You are an advanced OCR system specialized in Arabic and English text extraction.
The previous extraction attempt yielded very little text. Please look more carefully at the image.

Rules:
- Look for ALL text including headers, footers, watermarks, stamps, handwritten notes.
- Check for text in tables, sidebars, margins, and overlaid elements.
- For Arabic text, read right-to-left carefully. Check for diacritics (tashkeel).
- For multi-column layouts, process each column separately.
- Extract numbers, dates, signatures labels, and any visible characters.
- Handle low-quality scans: adjust for blur, fading, skew, and noise.
- For tables, reconstruct the structure even if borders are faint.
- If truly no text exists, respond with [NO_TEXT_FOUND].
- Output ONLY the extracted text, no commentary.
"""

CONTRACT_ANALYSIS_PROMPT = """You are a Saudi labor law expert analyzing an employment contract.
Analyze the following contract text and provide a comprehensive analysis in Arabic.

Provide your analysis as a JSON object with these fields:
{
  "contract_type": "نوع العقد",
  "parties": {"employer": "صاحب العمل", "employee": "الموظف"},
  "duration": "مدة العقد",
  "salary": "الراتب والبدلات",
  "working_hours": "ساعات العمل",
  "leave_entitlements": "الإجازات",
  "termination_clauses": "شروط إنهاء العقد",
  "compliance_issues": ["قائمة بالمخالفات المحتملة لنظام العمل السعودي"],
  "recommendations": ["توصيات لتحسين العقد"],
  "risk_level": "low/medium/high",
  "summary": "ملخص شامل للعقد"
}

Contract text:
"""

RESUME_EXTRACTION_PROMPT = """You are an expert resume parser. Extract structured information from the following resume text.
Support both Arabic and English content. Handle complex resume formats including multi-column layouts, tables, and mixed languages.

Provide your extraction as a JSON object with these fields:
{
  "personal_info": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "nationality": ""
  },
  "objective": "",
  "education": [{"institution": "", "degree": "", "field": "", "year": ""}],
  "experience": [{"company": "", "title": "", "duration": "", "responsibilities": []}],
  "skills": {"technical": [], "languages": [], "soft_skills": []},
  "certifications": [],
  "references": []
}

Resume text:
"""

RESUME_WITH_CONFIDENCE_PROMPT = """You are an expert resume parser with confidence estimation capabilities.
Extract structured information from the following resume text AND provide a confidence score (0.0 to 1.0) for each extracted field.

Confidence scoring guidelines:
- 1.0: Information is explicitly and clearly stated in the text
- 0.8-0.9: Information is clearly present but may have minor ambiguity
- 0.6-0.7: Information is partially present or inferred from context
- 0.4-0.5: Information is vaguely mentioned or requires significant inference
- 0.1-0.3: Information is barely present, highly uncertain
- 0.0: Information is not found in the text at all

For job matching (when job description is provided):
- Compare skills using weighted matching: exact match (1.0), related skill (0.5), transferable skill (0.3)
- Evaluate experience relevance: same industry (1.0), related industry (0.7), different industry (0.3)
- Consider education fit: exact match (1.0), related field (0.7), unrelated (0.3)

Handle complex resume formats:
- Multi-column layouts: extract from all columns
- Tables: parse tabular data correctly
- Mixed Arabic/English: handle bilingual content
- Non-standard sections: map to standard categories

Provide your extraction as a JSON object:
{
  "personal_info": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "nationality": ""
  },
  "objective": "",
  "education": [{"institution": "", "degree": "", "field": "", "year": ""}],
  "experience": [{"company": "", "title": "", "duration": "", "responsibilities": []}],
  "skills": {"technical": [], "languages": [], "soft_skills": []},
  "certifications": [],
  "total_experience_years": 0,
  "confidence_scores": {
    "name": 0.0,
    "email": 0.0,
    "phone": 0.0,
    "location": 0.0,
    "nationality": 0.0,
    "objective": 0.0,
    "education": 0.0,
    "experience": 0.0,
    "technical_skills": 0.0,
    "languages": 0.0,
    "certifications": 0.0,
    "overall": 0.0
  },
  "job_match": {
    "match_percentage": 0,
    "matching_skills": [],
    "missing_skills": [],
    "experience_relevance": 0.0,
    "education_fit": 0.0,
    "weighted_score": 0.0
  }
}
"""

OCR_ERROR_CORRECTION_PROMPT = """You are an OCR post-processing specialist for Arabic and English text.
The following text was extracted via OCR and may contain errors typical of OCR systems.

Your task is to correct OCR errors while preserving the original meaning and structure.

Common OCR errors to fix:
- Arabic character confusion: ب/ت/ث/ن/ي, ح/خ/ج, د/ذ, ر/ز, س/ش, ص/ض, ط/ظ, ع/غ, ف/ق, ك/ل
- Diacritics (tashkeel) errors or missing diacritics
- Number/letter confusion (e.g., 0/O, 1/l/I, 5/S)
- Merged or split words
- Missing spaces or extra spaces
- Punctuation errors
- Common Arabic OCR mistakes: ة/ه confusion, ا/أ/إ/آ confusion, ى/ي confusion
- English text within Arabic: maintain correct spelling
- Phone numbers and emails: ensure correct format
- Dates: preserve original format but fix obvious digit errors

Rules:
- Do NOT change the meaning or add information
- Do NOT rephrase or summarize
- Only fix clear OCR errors
- Preserve the original structure and formatting
- If uncertain about a correction, leave the original text
- Output ONLY the corrected text, no commentary or explanations

Primary language: {language}

Text to correct:
"""

STRUCTURED_EXTRACT_PROMPT = """You are a data extraction specialist. Extract the following types of structured data from the provided text.
Support both Arabic and English content.

Extract types requested: {extract_types}

Provide your extraction as a JSON object where each key is an extract type and the value is a list of found items.
Example format:
{{
  "names": ["محمد أحمد", "فاطمة علي"],
  "emails": ["user@example.com"],
  "phones": ["+966501234567"],
  "dates": ["2024-01-15", "1445/07/03"],
  "companies": ["شركة الرياض"],
  "salaries": ["15000 SAR"],
  "skills": ["Python", "إدارة المشاريع"]
}}

Text to analyze:
"""


class OCRService:
    """Service for OCR text extraction and structured data parsing using AI vision."""

    def __init__(self):
        self.ai_service = AIHubService()

    async def extract_text_from_pages(
        self,
        pages: List[dict],
        language: str = "ar",
        enhance: bool = True,
    ) -> dict:
        """
        Extract text from page images using AI vision OCR.

        Args:
            pages: List of page dicts with 'page_number' and 'image_data' (base64 data URI).
            language: Primary language hint.
            enhance: Whether to retry with enhanced prompt on low-quality results.

        Returns:
            Dict with full_text, page_texts, confidence, pages_processed.
        """
        page_texts: List[str] = []
        total_confidence = 0.0
        pages_processed = 0

        for page in pages:
            image_data = page.get("image_data", "")
            page_number = page.get("page_number", 0)

            if not image_data:
                logger.warning(f"Page {page_number}: empty image data, skipping.")
                page_texts.append("")
                continue

            try:
                text = await self._extract_single_page(image_data, language)

                # Check if result is low quality and retry if enhance is enabled
                if enhance and self._is_low_quality(text, image_data):
                    logger.info(f"Page {page_number}: low quality result, retrying with enhanced prompt.")
                    enhanced_text = await self._extract_single_page_enhanced(image_data, language)
                    if len(enhanced_text) > len(text):
                        text = enhanced_text

                page_texts.append(text)
                pages_processed += 1

                # Estimate confidence based on text quality
                page_confidence = self._estimate_confidence(text)
                total_confidence += page_confidence

            except Exception as e:
                logger.error(f"Page {page_number}: OCR extraction failed: {e}")
                page_texts.append("")

        avg_confidence = total_confidence / max(pages_processed, 1)
        full_text = "\n\n---\n\n".join(
            f"[صفحة {i + 1}]\n{text}" for i, text in enumerate(page_texts) if text
        )

        return {
            "full_text": full_text,
            "page_texts": page_texts,
            "confidence": round(avg_confidence, 2),
            "pages_processed": pages_processed,
        }

    async def analyze_pdf_direct(self, pdf_data_uri: str, instruction: str = "") -> dict:
        """
        Extract text from a PDF using the AIHub analyze_pdf capability.
        Better for low-quality scanned PDFs compared to image-based OCR.

        Args:
            pdf_data_uri: Base64 PDF data URI (data:application/pdf;base64,...).
            instruction: Extraction instruction for the PDF analyzer.

        Returns:
            Dict with full_text, confidence, and metadata.
        """
        if not instruction:
            instruction = (
                "Extract ALL text from this PDF document completely and accurately. "
                "Preserve the original structure, formatting, paragraph breaks, and reading order. "
                "For Arabic text, maintain right-to-left order. "
                "For tables, format them clearly. "
                "Output only the extracted text without commentary."
            )

        try:
            request = AnalyzePdfRequest(
                pdf=pdf_data_uri,
                instruction=instruction,
                mode="extract",
                page_start=1,
            )

            response = await self.ai_service.analyze_pdf(request)
            extracted_text = response.result or ""

            # Estimate confidence based on extraction quality
            confidence = self._estimate_confidence(extracted_text)

            # Boost confidence for PDF analysis (generally more reliable than image OCR)
            confidence = min(1.0, confidence + 0.1)

            return {
                "full_text": extracted_text,
                "confidence": round(confidence, 2),
                "method": "analyze_pdf",
                "pages_analyzed": response.page_end if response.page_end else response.page_start,
            }

        except Exception as e:
            logger.error(f"PDF direct analysis failed: {e}")
            return {
                "full_text": "",
                "confidence": 0.0,
                "method": "analyze_pdf",
                "error": str(e),
            }

    async def correct_ocr_errors(self, text: str, language: str = "ar") -> str:
        """
        Use AI to correct common OCR errors in extracted text.

        Args:
            text: Raw OCR-extracted text with potential errors.
            language: Primary language of the text.

        Returns:
            Corrected text string.
        """
        if not text or len(text.strip()) < 10:
            return text

        lang_name = "Arabic" if language == "ar" else language
        prompt = OCR_ERROR_CORRECTION_PROMPT.format(language=lang_name) + text[:8000]

        request = GenTxtRequest(
            messages=[
                ChatMessage(
                    role="system",
                    content="You are an OCR error correction specialist. Output only the corrected text.",
                ),
                ChatMessage(role="user", content=prompt),
            ],
            model=OCR_MODEL,
            temperature=0.1,
            max_tokens=8192,
        )

        try:
            response = await self.ai_service.gentxt(request)
            corrected = response.content.strip()

            # Sanity check: corrected text should be similar length to original
            # If it's drastically different, return original
            if corrected and 0.5 <= len(corrected) / max(len(text), 1) <= 2.0:
                return corrected
            else:
                logger.warning(
                    f"OCR correction produced drastically different length "
                    f"(original: {len(text)}, corrected: {len(corrected)}). Using original."
                )
                return text

        except Exception as e:
            logger.error(f"OCR error correction failed: {e}")
            return text

    async def extract_resume_with_confidence(self, text: str, job_description: str = "") -> dict:
        """
        Extract structured resume data with per-field confidence scores.

        Args:
            text: Resume text to analyze.
            job_description: Optional job description for matching analysis.

        Returns:
            Dict with extracted info, confidence scores, and optional job match.
        """
        if not text or not text.strip():
            return {
                "personal_info": {},
                "education": [],
                "experience": [],
                "skills": {},
                "certifications": [],
                "confidence_scores": {
                    "name": 0.0, "email": 0.0, "phone": 0.0,
                    "location": 0.0, "nationality": 0.0, "objective": 0.0,
                    "education": 0.0, "experience": 0.0, "technical_skills": 0.0,
                    "languages": 0.0, "certifications": 0.0, "overall": 0.0,
                },
                "job_match": None,
            }

        prompt = RESUME_WITH_CONFIDENCE_PROMPT

        user_content = f"Resume text:\n{text[:8000]}"
        if job_description and job_description.strip():
            user_content += f"\n\nJob Description:\n{job_description.strip()[:3000]}"
        else:
            user_content += "\n\nNo job description provided. Skip job_match section (set all to null/0)."

        request = GenTxtRequest(
            messages=[
                ChatMessage(
                    role="system",
                    content=(
                        "You are an expert resume parser with confidence estimation. "
                        "Always respond with valid JSON only. "
                        "Handle both Arabic and English resumes, including complex multi-column layouts."
                    ),
                ),
                ChatMessage(role="user", content=prompt + "\n\n" + user_content),
            ],
            model=OCR_MODEL,
            temperature=0.1,
            max_tokens=4096,
        )

        try:
            response = await self.ai_service.gentxt(request)
            result = self._parse_json_response(response.content)

            # Ensure confidence_scores exists
            if "confidence_scores" not in result:
                result["confidence_scores"] = self._compute_fallback_confidence(result)

            return result

        except Exception as e:
            logger.error(f"Resume extraction with confidence failed: {e}")
            return {
                "personal_info": {},
                "education": [],
                "experience": [],
                "skills": {},
                "certifications": [],
                "confidence_scores": {
                    "name": 0.0, "email": 0.0, "phone": 0.0,
                    "location": 0.0, "nationality": 0.0, "objective": 0.0,
                    "education": 0.0, "experience": 0.0, "technical_skills": 0.0,
                    "languages": 0.0, "certifications": 0.0, "overall": 0.0,
                },
                "job_match": None,
                "error": str(e),
            }

    async def extract_structured_data(self, text: str, extract_types: List[str]) -> dict:
        """
        Extract structured data from text using AI.

        Args:
            text: Input text to analyze.
            extract_types: Types of data to extract.

        Returns:
            Dict with extractions and confidence.
        """
        types_str = ", ".join(extract_types)
        prompt = STRUCTURED_EXTRACT_PROMPT.format(extract_types=types_str) + text

        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content="You are a precise data extraction assistant. Always respond with valid JSON only."),
                ChatMessage(role="user", content=prompt),
            ],
            model=OCR_MODEL,
            temperature=0.1,
            max_tokens=4096,
        )

        try:
            response = await self.ai_service.gentxt(request)
            extractions = self._parse_json_response(response.content)
            confidence = self._estimate_extraction_confidence(extractions, extract_types)
            return {"extractions": extractions, "confidence": confidence}
        except Exception as e:
            logger.error(f"Structured extraction failed: {e}")
            return {"extractions": {t: [] for t in extract_types}, "confidence": 0.0}

    async def analyze_contract_text(self, full_text: str) -> dict:
        """
        Analyze contract text for compliance and key information.

        Args:
            full_text: Full extracted contract text.

        Returns:
            Analysis dict with contract details and compliance info.
        """
        prompt = CONTRACT_ANALYSIS_PROMPT + full_text

        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content="You are a Saudi labor law expert. Always respond with valid JSON only."),
                ChatMessage(role="user", content=prompt),
            ],
            model=OCR_MODEL,
            temperature=0.2,
            max_tokens=4096,
        )

        try:
            response = await self.ai_service.gentxt(request)
            analysis = self._parse_json_response(response.content)
            return analysis
        except Exception as e:
            logger.error(f"Contract analysis failed: {e}")
            return {"error": str(e), "summary": "فشل تحليل العقد"}

    async def analyze_resume_text(self, full_text: str) -> dict:
        """
        Extract structured information from resume text.

        Args:
            full_text: Full extracted resume text.

        Returns:
            Structured resume data dict.
        """
        prompt = RESUME_EXTRACTION_PROMPT + full_text

        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content="You are an expert resume parser. Always respond with valid JSON only."),
                ChatMessage(role="user", content=prompt),
            ],
            model=OCR_MODEL,
            temperature=0.1,
            max_tokens=4096,
        )

        try:
            response = await self.ai_service.gentxt(request)
            extracted_info = self._parse_json_response(response.content)
            return extracted_info
        except Exception as e:
            logger.error(f"Resume analysis failed: {e}")
            return {"error": str(e), "personal_info": {}, "experience": [], "skills": {}}

    async def _extract_single_page(self, image_data: str, language: str) -> str:
        """Extract text from a single page image."""
        lang_hint = "Arabic" if language == "ar" else language
        system_content = OCR_SYSTEM_PROMPT + f"\nPrimary language: {lang_hint}"

        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content=system_content),
                ChatMessage(
                    role="user",
                    content=[
                        {"type": "text", "text": f"Extract all text from this image. Primary language: {lang_hint}"},
                        {"type": "image_url", "image_url": {"url": image_data}},
                    ],
                ),
            ],
            model=OCR_MODEL,
            temperature=0.0,
            max_tokens=8192,
        )

        response = await self.ai_service.gentxt(request)
        text = response.content.strip()

        if text == "[NO_TEXT_FOUND]":
            return ""

        return text

    async def _extract_single_page_enhanced(self, image_data: str, language: str) -> str:
        """Retry extraction with enhanced prompt for better results."""
        lang_hint = "Arabic" if language == "ar" else language

        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content=OCR_ENHANCED_PROMPT + f"\nPrimary language: {lang_hint}"),
                ChatMessage(
                    role="user",
                    content=[
                        {"type": "text", "text": f"Look very carefully and extract ALL text from this image. Language: {lang_hint}"},
                        {"type": "image_url", "image_url": {"url": image_data}},
                    ],
                ),
            ],
            model=OCR_MODEL,
            temperature=0.0,
            max_tokens=8192,
        )

        response = await self.ai_service.gentxt(request)
        text = response.content.strip()

        if text == "[NO_TEXT_FOUND]":
            return ""

        return text

    @staticmethod
    def _is_low_quality(text: str, image_data: str) -> bool:
        """Check if OCR result seems too short for the image size."""
        if not text or text == "[NO_TEXT_FOUND]":
            return True

        # If image data is substantial but extracted text is very short
        image_size = len(image_data)
        text_length = len(text)

        # Heuristic: a full page image (>50KB base64) should yield at least 50 chars
        if image_size > 50000 and text_length < 50:
            return True

        return False

    @staticmethod
    def _estimate_confidence(text: str) -> float:
        """Estimate OCR confidence based on text characteristics."""
        if not text:
            return 0.0

        text_length = len(text)
        unclear_count = text.count("[unclear]")

        # Base confidence from text length
        if text_length > 500:
            confidence = 0.9
        elif text_length > 200:
            confidence = 0.8
        elif text_length > 50:
            confidence = 0.7
        else:
            confidence = 0.5

        # Reduce confidence for unclear markers
        if unclear_count > 0:
            confidence -= min(0.3, unclear_count * 0.05)

        return max(0.1, min(1.0, confidence))

    @staticmethod
    def _estimate_extraction_confidence(extractions: dict, extract_types: List[str]) -> float:
        """Estimate confidence of structured extraction."""
        if not extractions:
            return 0.0

        found_types = 0
        total_items = 0

        for t in extract_types:
            items = extractions.get(t, [])
            if items:
                found_types += 1
                total_items += len(items) if isinstance(items, list) else 1

        type_coverage = found_types / max(len(extract_types), 1)
        item_score = min(1.0, total_items / 5.0)

        return round((type_coverage * 0.6 + item_score * 0.4), 2)

    @staticmethod
    def _compute_fallback_confidence(result: dict) -> dict:
        """Compute fallback confidence scores when AI doesn't provide them."""
        scores = {}
        personal = result.get("personal_info", {})

        scores["name"] = 0.9 if personal.get("name") and personal["name"] != "غير محدد" else 0.0
        scores["email"] = 0.95 if personal.get("email") and "@" in str(personal.get("email", "")) else 0.0
        scores["phone"] = 0.9 if personal.get("phone") and len(str(personal.get("phone", ""))) > 6 else 0.0
        scores["location"] = 0.7 if personal.get("location") and personal["location"] != "غير محدد" else 0.0
        scores["nationality"] = 0.7 if personal.get("nationality") and personal["nationality"] != "غير محدد" else 0.0
        scores["objective"] = 0.8 if result.get("objective") else 0.0
        scores["education"] = 0.85 if result.get("education") and len(result["education"]) > 0 else 0.0
        scores["experience"] = 0.85 if result.get("experience") and len(result["experience"]) > 0 else 0.0

        skills = result.get("skills", {})
        scores["technical_skills"] = 0.8 if skills.get("technical") and len(skills["technical"]) > 0 else 0.0
        scores["languages"] = 0.8 if skills.get("languages") and len(skills["languages"]) > 0 else 0.0
        scores["certifications"] = 0.8 if result.get("certifications") and len(result["certifications"]) > 0 else 0.0

        # Overall is average of non-zero scores
        non_zero = [v for v in scores.values() if v > 0]
        scores["overall"] = round(sum(non_zero) / max(len(non_zero), 1), 2) if non_zero else 0.0

        return scores

    @staticmethod
    def _parse_json_response(content: str) -> dict:
        """Parse JSON from AI response, handling markdown code blocks."""
        text = content.strip()

        # Remove markdown code block wrapper if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json or ```)
            lines = lines[1:]
            # Remove last line (```)
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON object in the text
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(text[start : end + 1])
                except json.JSONDecodeError:
                    pass

            logger.warning(f"Failed to parse JSON response: {text[:200]}")
            return {}