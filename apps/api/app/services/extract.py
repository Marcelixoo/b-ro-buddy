"""
Text extraction: PDF text first, OCR fallback for images/scanned PDFs.
"""

from pathlib import Path

from PIL import Image
from PyPDF2 import PdfReader

try:
    import pytesseract

    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

# Optional: pdf2image for PDF → images → OCR
try:
    from pdf2image import convert_from_path

    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False


def extract_text_from_pdf(file_path: Path) -> tuple[str, str]:
    """
    Extract text from PDF. Returns (text, method).
    If no text found and OCR available, falls back to OCR.
    """
    reader = PdfReader(file_path)
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text and text.strip():
            parts.append(text.strip())
    text = "\n\n".join(parts) if parts else ""

    if text.strip():
        return text.strip(), "pdf"

    if PDF2IMAGE_AVAILABLE and TESSERACT_AVAILABLE:
        images = convert_from_path(file_path, dpi=200)
        ocr_parts = []
        for img in images:
            ocr_parts.append(pytesseract.image_to_string(img, lang="deu+eng"))
        text = "\n\n".join(p.strip() for p in ocr_parts if p.strip())
        if text.strip():
            return text.strip(), "ocr"

    return text or "(No text extracted)", "pdf"


def extract_text_from_image(file_path: Path) -> tuple[str, str]:
    """Extract text from image using OCR."""
    if not TESSERACT_AVAILABLE:
        return "(OCR not available: install pytesseract and Tesseract)", "none"
    img = Image.open(file_path)
    text = pytesseract.image_to_string(img, lang="deu+eng")
    return (text.strip() or "(No text extracted)"), "ocr"


def extract_text(file_path: Path, mimetype: str) -> tuple[str, str]:
    """
    Dispatch by mimetype. Returns (text, extraction_method).
    """
    mt = (mimetype or "").lower()
    if "pdf" in mt:
        return extract_text_from_pdf(file_path)
    if mt.startswith("image/"):
        return extract_text_from_image(file_path)
    return "(Unsupported file type)", "none"
