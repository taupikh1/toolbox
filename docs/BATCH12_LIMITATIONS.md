# Batch 12 Limitations

- PDF→DOCX tidak mempertahankan layout/tabel/gambar.
- PDF→PPTX adalah image-based, bukan editable text boxes.
- PPTX→PDF hanya teks, media tidak dirender, animasi hilang.
- URL→PDF tidak dapat diimplementasikan tanpa backend atau proxy (CORS).
- Structural validation OOXML belum diuji dengan aplikasi Office eksternal.
