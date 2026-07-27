"""
OCR API Router — endpoints for text extraction and document analysis.
Enhanced with direct PDF analysis and confidence-scored resume extraction.
"""

import logging

from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from schemas.auth import UserResponse
from schemas.ocr import (
    ContractOCRRequest,
    ContractOCRResponse,
    OCRExtractRequest,
    OCRExtractResponse,
    PdfContractAnalysisRequest,
    PdfContractAnalysisResponse,
    PdfResumeAnalysisRequest,
    PdfResumeAnalysisResponse,
    ResumeOCRRequest,
    ResumeOCRResponse,
    StructuredExtractRequest,
    StructuredExtractResponse,
)
from services.ocr_service import OCRService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])


@router.post("/extract-text", response_model=OCRExtractResponse)
async def extract_text(
    request: OCRExtractRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Extract raw text from uploaded document pages using AI-powered OCR."""
    logger.info(f"OCR extract-text request: {len(request.pages)} pages, language={request.language}")

    if not request.pages:
        raise HTTPException(status_code=400, detail="No pages provided for OCR processing.")

    if len(request.pages) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 pages allowed per request.")

    try:
        service = OCRService()
        pages_data = [{"page_number": p.page_number, "image_data": p.image_data} for p in request.pages]
        result = await service.extract_text_from_pages(
            pages=pages_data,
            language=request.language,
            enhance=request.enhance_quality,
        )

        return OCRExtractResponse(
            full_text=result["full_text"],
            page_texts=result["page_texts"],
            confidence=result["confidence"],
            pages_processed=result["pages_processed"],
        )
    except Exception as e:
        logger.error(f"OCR extract-text failed: {e}")
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")


@router.post("/analyze-contract", response_model=ContractOCRResponse)
async def analyze_contract(
    request: ContractOCRRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Full contract OCR + AI compliance analysis pipeline."""
    logger.info(f"OCR analyze-contract request: {len(request.pages)} pages")

    if not request.pages:
        raise HTTPException(status_code=400, detail="No pages provided for contract analysis.")

    try:
        service = OCRService()
        pages_data = [{"page_number": p.page_number, "image_data": p.image_data} for p in request.pages]

        # Step 1: Extract text via OCR
        ocr_result = await service.extract_text_from_pages(
            pages=pages_data,
            language=request.language,
            enhance=True,
        )

        full_text = ocr_result["full_text"]
        if not full_text.strip():
            raise HTTPException(status_code=422, detail="Could not extract any text from the contract images.")

        # Step 2: Analyze contract
        analysis = await service.analyze_contract_text(full_text)

        return ContractOCRResponse(
            full_text=full_text,
            analysis=analysis,
            confidence=ocr_result["confidence"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR analyze-contract failed: {e}")
        raise HTTPException(status_code=500, detail=f"Contract analysis failed: {str(e)}")


@router.post("/analyze-resume", response_model=ResumeOCRResponse)
async def analyze_resume(
    request: ResumeOCRRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Full resume OCR + AI extraction pipeline."""
    logger.info(f"OCR analyze-resume request: {len(request.pages)} pages")

    if not request.pages:
        raise HTTPException(status_code=400, detail="No pages provided for resume analysis.")

    try:
        service = OCRService()
        pages_data = [{"page_number": p.page_number, "image_data": p.image_data} for p in request.pages]

        # Step 1: Extract text via OCR
        ocr_result = await service.extract_text_from_pages(
            pages=pages_data,
            language=request.language,
            enhance=True,
        )

        full_text = ocr_result["full_text"]
        if not full_text.strip():
            raise HTTPException(status_code=422, detail="Could not extract any text from the resume images.")

        # Step 2: Extract structured resume data
        extracted_info = await service.analyze_resume_text(full_text)

        return ResumeOCRResponse(
            full_text=full_text,
            extracted_info=extracted_info,
            confidence=ocr_result["confidence"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR analyze-resume failed: {e}")
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {str(e)}")


@router.post("/analyze-pdf-resume", response_model=PdfResumeAnalysisResponse)
async def analyze_pdf_resume(
    request: PdfResumeAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Analyze a resume PDF directly using the analyzepdf capability.
    Better for low-quality scanned PDFs. Extracts text, corrects OCR errors,
    then performs structured resume analysis with per-field confidence scores.
    """
    logger.info(f"OCR analyze-pdf-resume request, language={request.language}")

    if not request.pdf_data_uri:
        raise HTTPException(status_code=400, detail="No PDF data provided.")

    if not request.pdf_data_uri.startswith("data:"):
        raise HTTPException(status_code=400, detail="PDF must be a base64 data URI (data:application/pdf;base64,...).")

    try:
        service = OCRService()

        # Step 1: Extract text directly from PDF using analyzepdf
        pdf_result = await service.analyze_pdf_direct(
            pdf_data_uri=request.pdf_data_uri,
            instruction=(
                "Extract ALL text from this resume/CV document completely and accurately. "
                "Preserve the original structure including sections, bullet points, and formatting. "
                "For Arabic text, maintain right-to-left order. "
                "For tables (skills, experience), format them clearly. "
                "Output only the extracted text."
            ),
        )

        full_text = pdf_result.get("full_text", "")

        if not full_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract any text from the PDF. The file may be empty or image-only.",
            )

        # Step 2: Correct OCR errors in the extracted text
        corrected_text = await service.correct_ocr_errors(full_text, language=request.language)

        # Step 3: Extract structured resume data with confidence scores
        extraction_result = await service.extract_resume_with_confidence(
            text=corrected_text,
            job_description=request.job_description,
        )

        # Build confidence scores dict
        confidence_scores = extraction_result.get("confidence_scores", {})
        overall_confidence = confidence_scores.get("overall", pdf_result.get("confidence", 0.7))

        return PdfResumeAnalysisResponse(
            full_text=corrected_text,
            analysis=extraction_result,
            confidence=overall_confidence,
            confidence_scores=confidence_scores,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR analyze-pdf-resume failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF resume analysis failed: {str(e)}")


@router.post("/analyze-pdf-contract", response_model=PdfContractAnalysisResponse)
async def analyze_pdf_contract(
    request: PdfContractAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Extract text from a contract PDF directly using the analyzepdf capability.
    Better for Arabic contracts where client-side PDF.js produces disconnected letters.
    """
    logger.info(f"OCR analyze-pdf-contract request, language={request.language}")

    if not request.pdf_data_uri:
        raise HTTPException(status_code=400, detail="No PDF data provided.")

    if not request.pdf_data_uri.startswith("data:"):
        raise HTTPException(status_code=400, detail="PDF must be a base64 data URI (data:application/pdf;base64,...).")

    try:
        service = OCRService()

        # Step 1: Extract text directly from PDF using analyzepdf
        pdf_result = await service.analyze_pdf_direct(
            pdf_data_uri=request.pdf_data_uri,
            instruction=(
                "Extract ALL text from this employment contract document completely and accurately. "
                "Preserve the original structure including sections, clauses, numbered articles, and formatting. "
                "For Arabic text, maintain right-to-left order and ensure letters are properly connected. "
                "For tables (salary details, benefits), format them clearly. "
                "Output only the extracted text."
            ),
        )

        full_text = pdf_result.get("full_text", "")

        if not full_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract any text from the PDF. The file may be empty or image-only.",
            )

        # Step 2: Correct OCR errors in the extracted text
        corrected_text = await service.correct_ocr_errors(full_text, language=request.language)

        confidence = pdf_result.get("confidence", 0.7)

        return PdfContractAnalysisResponse(
            full_text=corrected_text,
            confidence=confidence,
            method=pdf_result.get("method", "analyze_pdf"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR analyze-pdf-contract failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF contract extraction failed: {str(e)}")


@router.post("/extract-structured", response_model=StructuredExtractResponse)
async def extract_structured(
    request: StructuredExtractRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Extract structured data (names, dates, emails, etc.) from text."""
    logger.info(f"OCR extract-structured request: types={request.extract_types}")

    if not request.text.strip():
        raise HTTPException(status_code=400, detail="No text provided for structured extraction.")

    try:
        service = OCRService()
        result = await service.extract_structured_data(
            text=request.text,
            extract_types=request.extract_types,
        )

        return StructuredExtractResponse(
            extractions=result["extractions"],
            confidence=result["confidence"],
        )
    except Exception as e:
        logger.error(f"OCR extract-structured failed: {e}")
        raise HTTPException(status_code=500, detail=f"Structured extraction failed: {str(e)}")