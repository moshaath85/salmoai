"""
Request and response models for the OCR module.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class OCRPageInput(BaseModel):
    """Single page input for OCR processing."""

    page_number: int = Field(..., description="Page number (1-based).")
    image_data: str = Field(..., description="Base64 data URI of the page image.")


class OCRExtractRequest(BaseModel):
    """Request to extract text from document pages via OCR."""

    pages: List[OCRPageInput] = Field(..., description="List of page images to process.")
    language: str = Field(default="ar", description="Primary language for OCR (default: Arabic).")
    enhance_quality: bool = Field(default=True, description="Whether to retry with enhanced prompt on low-quality results.")


class OCRExtractResponse(BaseModel):
    """Response containing extracted text from OCR."""

    full_text: str = Field(..., description="Combined text from all pages.")
    page_texts: List[str] = Field(..., description="Text extracted from each page individually.")
    confidence: float = Field(..., description="Estimated confidence score (0.0 to 1.0).")
    pages_processed: int = Field(..., description="Number of pages successfully processed.")


class ContractOCRRequest(BaseModel):
    """Request for contract OCR and analysis pipeline."""

    pages: List[OCRPageInput] = Field(..., description="List of contract page images.")
    language: str = Field(default="ar", description="Primary language (default: Arabic).")


class ContractOCRResponse(BaseModel):
    """Response from contract OCR and analysis."""

    full_text: str = Field(..., description="Full extracted text from the contract.")
    analysis: dict = Field(default_factory=dict, description="AI-generated contract analysis.")
    confidence: float = Field(..., description="OCR confidence score (0.0 to 1.0).")


class ResumeOCRRequest(BaseModel):
    """Request for resume OCR and extraction pipeline."""

    pages: List[OCRPageInput] = Field(..., description="List of resume page images.")
    language: str = Field(default="ar", description="Primary language (default: Arabic).")


class ResumeOCRResponse(BaseModel):
    """Response from resume OCR and extraction."""

    full_text: str = Field(..., description="Full extracted text from the resume.")
    extracted_info: dict = Field(default_factory=dict, description="Structured resume information.")
    confidence: float = Field(..., description="OCR confidence score (0.0 to 1.0).")


class StructuredExtractRequest(BaseModel):
    """Request to extract structured data from text."""

    text: str = Field(..., description="Text to extract structured data from.")
    extract_types: List[str] = Field(
        default=["names", "emails", "phones", "dates", "companies", "salaries"],
        description="Types of data to extract.",
    )


class StructuredExtractResponse(BaseModel):
    """Response containing structured data extractions."""

    extractions: dict = Field(default_factory=dict, description="Extracted data organized by type.")
    confidence: float = Field(..., description="Extraction confidence score (0.0 to 1.0).")


class PdfResumeAnalysisRequest(BaseModel):
    """Request for direct PDF resume analysis using analyzepdf capability."""

    pdf_data_uri: str = Field(..., description="Base64 PDF data URI (data:application/pdf;base64,...).")
    job_description: str = Field(default="", description="Optional job description for matching analysis.")
    language: str = Field(default="ar", description="Primary language (default: Arabic).")


class PdfResumeAnalysisResponse(BaseModel):
    """Response from PDF resume analysis pipeline."""

    full_text: str = Field(..., description="Full extracted text from the PDF resume.")
    analysis: dict = Field(default_factory=dict, description="Structured resume analysis with confidence scores.")
    confidence: float = Field(..., description="Overall confidence score (0.0 to 1.0).")
    confidence_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Per-field confidence scores (0.0 to 1.0) for each extracted data point.",
    )


class PdfContractAnalysisRequest(BaseModel):
    """Request for direct PDF contract text extraction using analyzepdf capability."""

    pdf_data_uri: str = Field(..., description="Base64 PDF data URI (data:application/pdf;base64,...).")
    language: str = Field(default="ar", description="Primary language (default: Arabic).")


class PdfContractAnalysisResponse(BaseModel):
    """Response from PDF contract text extraction."""

    full_text: str = Field(..., description="Full extracted text from the PDF contract.")
    confidence: float = Field(..., description="Overall confidence score (0.0 to 1.0).")
    method: str = Field(default="analyze_pdf", description="Extraction method used.")