import type { ConverterPageId } from '../types/conversion';

// Susunan tampilan tiap halaman converter. Hanya data penyajian: fitur, status, dan keterbatasan
// tetap berasal dari conversion-definitions.ts. Konversi `unsupported` tidak dimasukkan ke grup
// (ditampilkan sebagai catatan "Tidak didukung").

export interface PageGroup {
  title: string;
  hint?: string;
  ids: string[];
}

export interface PageExplainer {
  title: string;
  items: { label: string; text: string }[];
}

export interface PageLayout {
  icon: string;
  title: string;
  intro: string;
  notes: string[];
  explainer?: PageExplainer;
  groups: PageGroup[];
}

export const PAGE_LAYOUTS: Record<ConverterPageId, PageLayout> = {
  pdf: {
    icon: '📕',
    title: 'PDF Converter',
    intro: 'Ubah PDF ke format lain, buat PDF dari format lain, atau gabung dan pisah halaman PDF.',
    notes: ['PDF ke TXT, PDF ke Word (teks), dan PDF ke PowerPoint (gambar halaman) berjalan lokal dengan kehilangan tata letak. PDF ke JPG/PNG dan SVG ke PDF belum. Gabung, pisah, dan buat PDF memakai tool yang sudah ada.'],
    groups: [
      { title: 'PDF ke format lain', ids: ['pdf-to-jpg', 'pdf-to-png', 'pdf-to-txt', 'pdf-to-docx', 'pdf-to-xlsx', 'pdf-to-pptx'] },
      { title: 'Format lain ke PDF', ids: ['image-to-pdf', 'txt-to-pdf', 'html-to-pdf', 'svg-to-pdf'] },
      { title: 'Pengolahan PDF', ids: ['pdf-merge', 'pdf-split'] },
    ],
  },
  word: {
    icon: '📘',
    title: 'Word Converter',
    intro: 'Baca isi dokumen Word (DOCX) atau buat dokumen Word dari teks dan HTML.',
    notes: [
      'DOCX ke TXT, DOCX ke HTML, DOCX ke PDF, TXT ke DOCX, dan HTML ke DOCX sudah berfungsi (Batch 5). PDF ke Word adalah rekonstruksi teks, bukan tata letak Word.',
      'Hanya format DOCX. File .doc lama ditolak. Konversi berjalan di perangkat, bukan lewat dialog cetak.',
    ],
    groups: [
      { title: 'Word ke format lain', ids: ['docx-to-txt', 'docx-to-html', 'docx-to-pdf'] },
      { title: 'Format lain ke Word', ids: ['txt-to-docx', 'html-to-docx', 'pdf-to-docx'] },
    ],
  },
  excel: {
    icon: '📗',
    title: 'Excel Converter',
    intro: 'Ubah lembar kerja Excel (XLSX) dan data tabel seperti CSV, JSON, dan tabel HTML.',
    notes: ['XLSX↔CSV/JSON/HTML dan XLSX→PDF sudah berfungsi (Batch 2). PDF→Excel hanya heuristik text-layer, bukan tabel bergaris dan bukan OCR.'],
    groups: [
      { title: 'Excel ke format lain', ids: ['xlsx-to-csv', 'xlsx-to-json', 'xlsx-to-html', 'xlsx-to-pdf'] },
      { title: 'Format lain ke Excel', ids: ['csv-to-xlsx', 'json-to-xlsx', 'html-table-to-xlsx', 'pdf-to-xlsx'] },
    ],
  },
  powerpoint: {
    icon: '📙',
    title: 'PowerPoint Converter',
    intro: 'Ambil teks dan media dari presentasi PPTX, atau buat presentasi dari PDF dan gambar.',
    notes: ['PPTX ke TXT, daftar media, dan Slide Viewer (teks + gambar) sudah berfungsi (Batch 6A/6B).', 'PPTX ke PDF hanya rekonstruksi teks, bukan render visual slide.', 'Pratinjau bukan tampilan identik PowerPoint. Animasi, chart, SmartArt, dan font khusus tidak didukung.'],
    explainer: {
      title: 'Slide berbasis gambar vs slide yang dapat diedit',
      items: [
        { label: 'Berbasis gambar', text: 'Setiap halaman menjadi satu gambar di slide. Tampilannya mirip aslinya, tetapi teks dan objek tidak bisa diedit.' },
        { label: 'Dapat diedit', text: 'Teks dan objek asli direkonstruksi sebagai elemen slide. Hasilnya perkiraan dan belum dijanjikan untuk konversi dari PDF.' },
      ],
    },
    groups: [
      { title: 'PowerPoint ke format lain', ids: ['pptx-to-txt', 'pptx-media', 'pptx-to-pdf'] },
      { title: 'Format lain ke PowerPoint', ids: ['pdf-to-pptx', 'image-to-pptx'] },
    ],
  },
  ocr: {
    icon: '🔍',
    title: 'OCR & Document Scanner',
    intro: 'Ekstrak teks dari foto atau dokumen hasil pindai, lalu simpan sebagai TXT atau DOCX.',
    notes: ['Model bahasa OCR perlu diunduh sekali agar bisa dipakai offline. Belum ada model yang terpasang.'],
    groups: [
      { title: 'Ekstraksi teks (OCR)', ids: ['ocr-image', 'ocr-pdf'] },
      { title: 'Ekspor hasil OCR', ids: ['ocr-export-txt', 'ocr-export-docx'] },
    ],
  },
};
