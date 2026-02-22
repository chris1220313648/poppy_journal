---
name: personal-site-builder
description: Build or update a personal website/portfolio from user-provided materials, including Word/PDF book notes, film reviews, and travel photos/videos. Use when asked to create a personal site, add sections like film reviews or book notes, or incorporate media and documents into a website.
---

# Personal Site Builder

## Goal
Create or update a personal website using the user's existing documents and media, then present a clean, responsive site structure with clear sections.

## Inputs to collect
- Required: preferred language (default to the user's language), site title/name, short bio
- Content sources: Word/PDF files with book notes or film reviews, travel photos/videos
- Optional: color/style preferences, typography preferences, social links, contact email

## Workflow
1. Confirm scope: new site or add/replace specific sections and items.
2. Inventory assets: list provided files and what each contains.
3. Extract content from Word/PDFs; summarize into web-ready entries.
4. Organize content into sections:
   - Home (intro + identity list)
   - Films
   - Books
   - Travel (photos/videos)
   - Photography
   - Outdoor
   - Contact (if provided)
5. Build a responsive static site (HTML/CSS/JS) unless another framework is requested.
6. Ensure media is optimized for web and referenced with relative paths.
7. Provide a simple, maintainable structure and note how to add future entries.

## Content extraction rules
- Preserve titles, dates, and author attributions when available.
- Rewrite long paragraphs into short web-friendly summaries; keep the user's voice.
- Add brief captions for media and include alt text for images.
- If a document is ambiguous or lacks metadata, ask a single clarifying question.

## Output expectations
- Use a clear folder structure (e.g., `site/`, `site/assets/`).
- Provide a single homepage with a card grid for items, plus detail pages per item.
- Each item detail uses a two-column layout: left image gallery, right notes.
- Use a minimal, editorial visual style with airy spacing and a cool gray palette.
- Prefer fonts: Poppins (Latin) and Source Han Sans CN Light (Chinese).
- Keep styling clean and readable; ensure mobile layout works well with a photo-forward look.
- Include placeholders where info is missing (clearly marked).

## Quality checks
- All links and media paths are valid and relative.
- Typography is consistent; headings are properly nested.
- The homepage immediately communicates who the person is and what they share.
