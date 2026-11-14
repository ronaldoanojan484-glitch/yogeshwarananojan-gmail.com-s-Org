import React, { useEffect, useRef, useState } from 'react';
import {
  CHAPTERS,
  EXCEL_TEMPLATES,
  PPT_TEMPLATES,
  WORD_TEMPLATES,
  buildAll59TemplatesString,
} from '../data/bookData';
import type { AppSettings, CustomerSession, ReaderCategory } from '../types';
import { BookPageCard } from './BookPageCard';

interface ReaderViewProps {
  activeCustomer: CustomerSession | null;
  previewMode: boolean;
  settings: AppSettings;
  initialCategory?: ReaderCategory;
  initialTemplateIdx?: number;
  initialPage?: number;
  onExit: () => void;
  onGoOrder: () => void;
  onGoAuth: () => void;
  onLockedPrompt: () => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

const BOOK_BATCH_SIZE = 15;
const PREVIEW_TEMPLATE_LIMIT = 2;

export const ReaderView: React.FC<ReaderViewProps> = ({
  activeCustomer,
  previewMode,
  settings,
  initialCategory = 'book',
  initialTemplateIdx = 0,
  initialPage = 1,
  onExit,
  onGoOrder,
  onGoAuth,
  onLockedPrompt,
  onToast,
}) => {
  const isBookActive = !previewMode && activeCustomer?.status === 'Approved';
  const maxPage = isBookActive ? 122 : 5;

  const [category, setCategory] = useState<ReaderCategory>(initialCategory);
  const [currentPage, setCurrentPage] = useState<number>(Math.min(initialPage, maxPage));
  const [renderedUpTo, setRenderedUpTo] = useState<number>(
    Math.min(maxPage, Math.max(BOOK_BATCH_SIZE, initialPage + 5))
  );
  const [selectedTplIdx, setSelectedTplIdx] = useState<number>(initialTemplateIdx);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const safeIdx =
      !isBookActive && initialTemplateIdx >= PREVIEW_TEMPLATE_LIMIT ? 0 : initialTemplateIdx;
    setSelectedTplIdx(safeIdx);
  }, [initialTemplateIdx, isBookActive]);

  useEffect(() => {
    const safePage = Math.max(1, Math.min(maxPage, initialPage));
    setCurrentPage(safePage);
    setRenderedUpTo(Math.min(maxPage, Math.max(isBookActive ? BOOK_BATCH_SIZE : 5, safePage + 5)));
    if (safePage > 1 && initialCategory === 'book') {
      requestAnimationFrame(() => {
        const el = document.getElementById(`book-card-${safePage}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [initialPage, initialCategory, maxPage, isBookActive]);

  // Lazy-load next batch of vertical book cards
  useEffect(() => {
    if (!isBookActive || category !== 'book' || renderedUpTo >= maxPage) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderedUpTo((prev) => Math.min(maxPage, prev + BOOK_BATCH_SIZE));
        }
      },
      { rootMargin: '600px' }
    );

    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [isBookActive, category, renderedUpTo, maxPage]);

  // Track visible page while scrolling
  useEffect(() => {
    if (category !== 'book') return;
    const cards = document.querySelectorAll<HTMLElement>('[data-page]');
    if (!cards.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pg = Number(entry.target.getAttribute('data-page'));
            if (pg) setCurrentPage(pg);
          }
        });
      },
      { threshold: 0.35 }
    );

    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [category, renderedUpTo]);

  const watermarkLines: [string, string, string] = isBookActive && activeCustomer
    ? [
        `${activeCustomer.name.toUpperCase()} • ${activeCustomer.phone}`,
        activeCustomer.paymentRef,
        'BOOK ACTIVE • LICENSED COPY',
      ]
    : ['5-PAGE FREE PREVIEW', 'PC MASTER KIT 2026', 'ACTIVATE FULL 122 PAGES'];

  const handleCategorySwitch = (cat: ReaderCategory) => {
    setCategory(cat);
    setSelectedTplIdx(0);
  };

  const jumpToPage = (target: number) => {
    if (!isBookActive && target > 5) {
      onLockedPrompt();
      return;
    }
    const p = Math.max(1, Math.min(maxPage, target || 1));
    if (p > renderedUpTo) {
      setRenderedUpTo(Math.min(maxPage, p + 5));
    }
    setCurrentPage(p);
    setTimeout(() => {
      const card = document.getElementById(`book-card-${p}`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const copyText = async (text: string, msg = 'Template content copied to clipboard!') => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        onToast(msg, 'success');
        return;
      }
    } catch {
      // Fallback below
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      onToast(msg, 'success');
    } catch {
      onToast('Copy failed. Please copy manually.', 'error');
    }
    document.body.removeChild(ta);
  };

  const downloadTxt = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast(`Downloaded ${filename}`, 'success');
  };

  const activeTemplates =
    category === 'word'
      ? WORD_TEMPLATES
      : category === 'excel'
        ? EXCEL_TEMPLATES
        : category === 'ppt'
          ? PPT_TEMPLATES
          : [];

  const activeTemplate = activeTemplates[selectedTplIdx] || activeTemplates[0];
  const currentChapterValue =
    CHAPTERS.filter((c) => c.p <= currentPage).slice(-1)[0]?.p ?? 1;

  return (
    <section className="max-w-[960px] mx-auto">
      {/* Reader Top Session Header */}
      <div className="flex flex-wrap justify-between items-center gap-2.5 mb-3">
        <button
          type="button"
          onClick={onExit}
          className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
        >
          ← Exit Reader
        </button>

        <div className="text-xs font-bold text-[#f7e4b2]">
          {isBookActive && activeCustomer
            ? `BOOK ACTIVE · ${activeCustomer.name} · Ref: ${activeCustomer.paymentRef}`
            : 'FREE PREVIEW MODE (Pages 1–5 • 2 Sample Templates / Category)'}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isBookActive) {
                onLockedPrompt();
                return;
              }
              if (category === 'book') {
                onToast(
                  'Book pages are protected with forensic watermark. Use Word, Excel, or PowerPoint tabs to copy templates.',
                  'info'
                );
              } else if (activeTemplate) {
                copyText(activeTemplate.text);
              }
            }}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl gold-gradient-bg text-[#171107] font-bold text-xs cursor-pointer"
          >
            {isBookActive ? 'Copy Current' : '🔒 Copy Current'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isBookActive) {
                onLockedPrompt();
                return;
              }
              copyText(buildAll59TemplatesString(), 'All 59 Templates copied to clipboard!');
            }}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-br from-[#ffd700] to-[#b8860b] text-[#171107] font-bold text-xs cursor-pointer"
          >
            Copy All 59
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isBookActive) {
                onLockedPrompt();
                return;
              }
              downloadTxt('AAC_Royal_59_Templates_Pack_2026.txt', buildAll59TemplatesString());
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#d4ad5d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
          >
            Download Pack (.txt)
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 my-3">
        {(
          [
            ['book', 'Book (Vertical Reader)'],
            ['word', 'Word (20 Templates)'],
            ['excel', 'Excel (20 Templates)'],
            ['ppt', 'PowerPoint (19 Decks)'],
          ] as [ReaderCategory, string][]
        ).map(([cat, label]) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategorySwitch(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 border transition cursor-pointer ${
              category === cat
                ? 'bg-[#352611] border-[#d4ad5d] text-[#f7e4b2]'
                : 'bg-[#15110a] border-[#382c18] text-[#c4b69b] hover:border-[#6e552d]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Book Controls */}
      {category === 'book' && (
        <div className="sticky top-[68px] z-40 mb-4 bg-[#141009] border border-[#382c18] rounded-xl px-3.5 py-2.5 flex flex-wrap justify-between items-center gap-2.5 shadow-[0_8px_25px_rgba(0,0,0,0.85)]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => jumpToPage(currentPage - 1)}
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
            >
              ◀ Prev
            </button>
            <span className="text-xs text-[#a39886]">Viewing</span>
            <input
              type="number"
              min={1}
              max={maxPage}
              value={currentPage}
              onChange={(e) => jumpToPage(parseInt(e.target.value, 10))}
              className="w-14 bg-black border border-[#382c18] text-white text-center py-1 rounded-md font-bold text-xs tabular-nums"
            />
            <span className="text-xs text-[#a39886]">
              {isBookActive ? 'of 122' : 'of 5 (Preview)'}
            </span>
            <button
              type="button"
              onClick={() => jumpToPage(currentPage + 1)}
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
            >
              Next ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currentChapterValue}
              onChange={(e) => jumpToPage(parseInt(e.target.value, 10))}
              className="bg-[#0a0907] text-[#f7e4b2] border border-[#382c18] px-2.5 py-1.5 rounded-lg text-xs font-bold max-w-[220px]"
            >
              {CHAPTERS.filter((c) => c.p <= maxPage).map((c) => (
                <option key={c.p} value={c.p}>
                  Page {c.p}: {c.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="min-h-[34px] px-2.5 py-1 rounded-lg gold-gradient-bg text-[#171107] text-xs font-bold cursor-pointer"
            >
              ⬆ Top
            </button>
          </div>
        </div>
      )}

      {/* Vertical Continuous Book Feed */}
      {category === 'book' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-[540px] mx-auto mt-3 mb-10 pb-10">
          {/* Status Banner */}
          <div
            className={`w-full px-4 py-3.5 rounded-xl text-center text-xs border ${
              isBookActive && activeCustomer
                ? 'bg-gradient-to-br from-[#064e3b] to-[#022c22] border-[#34d399] text-[#d1fae5]'
                : 'bg-gradient-to-br from-[#271d0c] to-[#120e07] border-[#d4ad5d] text-[#f7e4b2]'
            }`}
          >
            {isBookActive && activeCustomer ? (
              <>
                <b>BOOK ACTIVE:</b> Full 122-Page Book &amp; 59 Templates Unlocked for{' '}
                <b>{activeCustomer.name}</b>
              </>
            ) : (
              <>
                <b>BOOK SAMPLE PREVIEW (Pages 1–5):</b> Scroll down to view all 5 sample pages in
                mobile card layout.
              </>
            )}
          </div>

          {Array.from({ length: Math.min(renderedUpTo, maxPage) }, (_, idx) => idx + 1).map((pg) => (
            <BookPageCard key={pg} pageNumber={pg} watermarkLines={watermarkLines} />
          ))}

          {isBookActive && renderedUpTo < maxPage && (
            <div ref={sentinelRef} className="h-6 w-full text-center text-xs text-[#a39886]">
              Loading next pages...
            </div>
          )}

          {!isBookActive && (
            <div className="w-full rounded-2xl border-2 border-[#d4ad5d] bg-[#12100d] p-6 text-center shadow-2xl">
              <span className="inline-block gold-gradient-bg text-[#120e07] font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                Preview Completed (5 / 122 Pages)
              </span>
              <h3 className="font-royal text-xl text-[#f7e4b2] my-2">
                Activate Full Book &amp; 59 Templates
              </h3>
              <p className="text-xs text-[#a39886] mb-4 leading-relaxed">
                Pages 6 to 122 (300 Shortcuts, 57 Excel Functions, 111 Commands, AI Prompts,
                Projects 1–6 &amp; 15 Exam Q&amp;A + 59 Templates) unlock immediately once approved.
              </p>
              <div className="flex flex-wrap gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={onGoOrder}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl gold-gradient-bg text-[#171107] font-extrabold text-xs cursor-pointer"
                >
                  Order Now (LKR {settings.price_lkr})
                </button>
                <button
                  type="button"
                  onClick={onGoAuth}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#34d399] text-[#34d399] font-bold text-xs hover:bg-[#0f3d23]/40 cursor-pointer"
                >
                  Already Paid? Activate Book
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template Viewer */}
      {category !== 'book' && activeTemplate && (
        <div className="space-y-3 mb-6">
          {!isBookActive && (
            <div className="w-full px-4 py-3 rounded-xl text-center text-xs border bg-gradient-to-br from-[#271d0c] to-[#120e07] border-[#d4ad5d] text-[#f7e4b2]">
              <b>TEMPLATE SAMPLE PREVIEW:</b> First {PREVIEW_TEMPLATE_LIMIT} templates in each
              category are open for preview. Copy, Download &amp; remaining templates unlock upon
              payment approval (LKR {settings.price_lkr}).
            </div>
          )}

          <select
            value={selectedTplIdx}
            onChange={(e) => {
              const nextIdx = Number(e.target.value);
              if (!isBookActive && nextIdx >= PREVIEW_TEMPLATE_LIMIT) {
                onLockedPrompt();
                return;
              }
              setSelectedTplIdx(nextIdx);
            }}
            className="w-full bg-[#120f0a] border border-[#382c18] text-[#f7e4b2] px-3.5 py-2.5 rounded-xl text-sm font-bold"
          >
            {activeTemplates.map((it, idx) => {
              const lockedTpl = !isBookActive && idx >= PREVIEW_TEMPLATE_LIMIT;
              return (
                <option key={it.id} value={idx}>
                  {lockedTpl ? `🔒 ${it.title} (Locked)` : `${it.title}${!isBookActive ? ' (Free Preview)' : ''}`}
                </option>
              );
            })}
          </select>

          <div className="rounded-2xl border border-[#382c18] bg-[#12100d] p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 className="font-royal text-lg text-[#f7e4b2]">{activeTemplate.title}</h3>
              {!isBookActive && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#d4ad5d]/60 bg-[#271d0c] text-[#f7e4b2]">
                  Sample {selectedTplIdx + 1} of {PREVIEW_TEMPLATE_LIMIT}
                </span>
              )}
            </div>
            <p className="text-xs text-[#a39886] mb-3">{activeTemplate.desc}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  if (!isBookActive) {
                    onLockedPrompt();
                    return;
                  }
                  copyText(activeTemplate.text);
                }}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl gold-gradient-bg text-[#171107] font-bold text-xs cursor-pointer"
              >
                {isBookActive ? '1-Click Copy' : '🔒 1-Click Copy'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isBookActive) {
                    onLockedPrompt();
                    return;
                  }
                  downloadTxt(
                    `${activeTemplate.title.replace(/\s+/g, '_')}.txt`,
                    activeTemplate.text
                  );
                }}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#6e552d] text-[#f7e4b2] text-xs font-semibold hover:bg-[#261d0f] cursor-pointer"
              >
                {isBookActive ? 'Download .txt' : '🔒 Download .txt'}
              </button>
              {!isBookActive && (
                <button
                  type="button"
                  onClick={onGoOrder}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#34d399]/70 text-[#34d399] text-xs font-bold hover:bg-[#0f3d23]/40 cursor-pointer"
                >
                  Unlock All 59 (LKR {settings.price_lkr})
                </button>
              )}
            </div>
            <pre
              className={`bg-[#090806] border border-[#382c18] rounded-xl p-4 font-mono-code text-[13px] whitespace-pre-wrap leading-relaxed text-[#ded4bf] ${
                isBookActive ? 'select-text' : 'select-none'
              }`}
            >
              {activeTemplate.text}
            </pre>
          </div>
        </div>
      )}

      {/* Forensic Legal Notice Footer */}
      <div className="bg-[#17130b] border border-[#382c18] rounded-xl p-4 text-xs text-[#ded4bf] leading-relaxed">
        {isBookActive && activeCustomer ? (
          <>
            <b className="text-[#f7e4b2]">ANTI-COPY LICENSE NOTICE:</b>
            <br />
            Active licensed session tied to <b>{activeCustomer.name}</b> ({activeCustomer.phone})
            under <b>Payment Ref: {activeCustomer.paymentRef}</b>. {settings.legal_notice}
          </>
        ) : (
          <>
            <b className="text-[#f7e4b2]">PREVIEW MODE NOTICE:</b>
            <br />
            Showing first 5 book pages &amp; first {PREVIEW_TEMPLATE_LIMIT} sample templates per
            category (Word, Excel, PowerPoint). Full 122 pages &amp; all 59 templates unlock upon
            payment approval (LKR {settings.price_lkr}).
          </>
        )}
      </div>
    </section>
  );
};
