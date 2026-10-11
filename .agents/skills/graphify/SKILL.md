---
name: graphify
description: Gunakan skill ini ketika user meminta pemetaan arsitektur kode, visualisasi dependensi modul, grafik alur data, atau diagram sistem dalam format grafis Mermaid.
---

# Graphify - Codebase Knowledge Graph & Diagram Workflow

Skill ini memandu pembuatan diagram relasi struktural (Abstract Syntax Tree / Arsitektur) dari modul, komponen, dan alur aplikasi.

## Langkah Pelaksanaan:

1. **Analisis Struktur & Titik Masuk (Entry Points)**:
   - Identifikasi file utama (misal: `index.html`, modul root, service/API helper).
   - Telusuri relasi `import`, file `script`, atau dependensi modular.

2. **Petakan Alur Interaksi**:
   - Sumber input (UI / Form).
   - Pemrosesan data & validasi (Controller / Logic module).
   - Penyimpanan data (LocalStorage, Database, atau API Backend).

3. **Format Output Visual Menggunakan Mermaid**:
   - Selalu sertakan blok kode ```mermaid dengan tipe diagram yang relevan:
     - **Flowchart (`graph TD` atau `graph LR`)**: Untuk alur proses atau pembagian modul.
     - **Sequence Diagram (`sequenceDiagram`)**: Untuk interaksi antar peran/komponen dari waktu ke waktu.
     - **Class / State Diagram**: Untuk siklus hidup data (misal: status pendaftaran SPMB: Draft -> Terverifikasi -> Lulus).

4. **Contoh Format**:
   ```mermaid
   graph TD
       A[User Form Input] --> B[Validation Logic]
       B -->|Valid| C[Storage / API]
       B -->|Invalid| D[Show Toast Error]
   ```
