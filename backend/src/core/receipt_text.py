"""Text extraction from uploaded receipts (PDF or image) for text-only LLMs."""

import io

import pytesseract
from fastapi import HTTPException, status
from PIL import Image
from pypdf import PdfReader

class ReceiptTextExtractor():
    """Extracts the raw text of a receipt file so a text-only model can structure it.

    PDFs are parsed with `pypdf` (embedded text layer only); images are OCRed with
    Tesseract (`spa+eng`). File type and size are validated before any parsing so
    callers can reject bad uploads cheaply, before hitting the database or the AI
    provider."""

    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
    ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
    OCR_LANGUAGE = "spa+eng"

    def validate(self, file_bytes: bytes, filename: str | None):
        """Reject empty uploads, unsupported extensions and oversized files with a 422."""
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The uploaded file is empty",
            )
        extension = self._extension(filename)
        if extension not in self.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unsupported receipt format '{extension}'. "
                       f"Allowed: {sorted(self.ALLOWED_EXTENSIONS)}",
            )
        if len(file_bytes) > self.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"The receipt exceeds the maximum size of "
                       f"{self.MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB",
            )

    def extract(self, file_bytes: bytes, filename: str | None) -> str:
        """Return the plain text content of the receipt.

        PDFs must carry an embedded text layer — scanned-only PDFs are rejected
        with a 422 since rasterizing them would need extra system dependencies.
        Image OCR requires the `tesseract` binary; when it is missing the error
        surfaces as a 503 so deployments without OCR fail loudly."""
        self.validate(file_bytes, filename)
        extension = self._extension(filename)
        try:
            if extension == ".pdf":
                return self._extract_from_pdf(file_bytes)
            return self._extract_from_image(file_bytes)
        except HTTPException:
            raise
        except pytesseract.TesseractNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OCR engine (tesseract) is not available on this deployment",
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Could not read the receipt: {exc}",
            )

    @staticmethod
    def _extension(filename: str | None) -> str:
        """Return the lowercased extension of `filename` ('' when absent)."""
        if not filename or "." not in filename:
            return ""
        return "." + filename.rsplit(".", 1)[1].lower()

    def _extract_from_pdf(self, file_bytes: bytes) -> str:
        """Extract the concatenated text of every page; 422 when the PDF has no text layer."""
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages_text).strip()
        if not text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The PDF has no extractable text layer (scanned document?). "
                       "Upload an image or a text-based PDF instead",
            )
        return text

    def _extract_from_image(self, file_bytes: bytes) -> str:
        """OCR the image with Tesseract (spa+eng) and return the stripped text."""
        image = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(image, lang=self.OCR_LANGUAGE).strip()