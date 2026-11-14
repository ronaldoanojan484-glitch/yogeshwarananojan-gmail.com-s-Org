import React from 'react';
import {
  EXCEL_100_SHORTCUTS,
  EXCEL_36_COMMANDS,
  EXCEL_57_FUNCTIONS,
  EXCEL_TEMPLATES,
  PPT_100_SHORTCUTS,
  PPT_31_COMMANDS,
  PPT_TEMPLATES,
  WORD_100_SHORTCUTS,
  WORD_44_COMMANDS,
  type BookEntryRow,
} from '../data/bookData';

interface BookPageCardProps {
  pageNumber: number;
  watermarkLines: [string, string, string];
}

function getPageSlice(arr: BookEntryRow[], idx: number, totalPages: number) {
  const base = Math.floor(arr.length / totalPages);
  const rem = arr.length % totalPages;
  const start = idx * base + Math.min(idx, rem);
  const count = base + (idx < rem ? 1 : 0);
  return { start, items: arr.slice(start, start + count) };
}

const ListCards: React.FC<{
  title: string;
  arr: BookEntryRow[];
  idx: number;
  totalPages: number;
  prefix?: string;
}> = ({ title, arr, idx, totalPages, prefix = '' }) => {
  const { start, items } = getPageSlice(arr, idx, totalPages);
  return (
    <div>
      <h2 className="text-[17px] font-bold text-[#b45309] border-b-2 border-[#f59e0b] pb-1 mb-2.5">
        {title}
      </h2>
      {items.map((row, i) => (
        <div
          key={`${prefix}${start + i}`}
          className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg px-2.5 py-2 mb-2 text-[12.5px]"
        >
          <div className="inline-block bg-[#111827] text-[#fef08a] font-mono-code text-[12px] font-bold px-2 py-0.5 rounded mb-1">
            {prefix}
            {String(start + i + 1).padStart(3, '0')} &nbsp; {row[0]}
          </div>
          <div>
            <b>What it does:</b> {row[1]}
          </div>
          <div className="text-[#475569]">
            <b>Use it when:</b> {row[2]}
          </div>
        </div>
      ))}
    </div>
  );
};

export const BookPageCard: React.FC<BookPageCardProps> = ({ pageNumber, watermarkLines }) => {
  const isCover = pageNumber === 1;

  const renderContent = () => {
    const p = pageNumber;

    if (p === 1) {
      return (
        <div className="border-2 border-[#ebd394] p-6 h-full flex flex-col justify-between rounded-lg">
          <div>
            <p className="text-xs tracking-[3px] text-[#d4ad5d] font-extrabold mt-2.5">
              A A C &nbsp; R O Y A L &nbsp; A R T &nbsp; C R E A T I O N
            </p>
            <h1 className="font-royal text-[32px] text-white mt-6 mb-1.5 leading-tight">
              PC MASTER KIT
              <br />
              <span className="text-[#f7e4b2]">2026</span>
            </h1>
            <p className="text-sm tracking-[2px] text-[#d4ad5d] font-extrabold">
              M A S T E R &nbsp; E D I T I O N
            </p>
            <p className="text-base text-white mt-3.5 font-bold">
              Word • Excel • PowerPoint
            </p>
          </div>
          <div className="my-5">
            <p className="text-[13px] text-[#ded4bf] leading-relaxed">
              300 Shortcuts • 57 Functions • 111 Commands • 59 Templates Bundle
            </p>
            <div className="w-16 h-0.5 bg-[#d4ad5d] mx-auto my-3.5" />
            <p className="text-[13px] text-[#f7e4b2] italic">
              Self-study book crafted for vertical mobile reading
            </p>
            <p className="text-xs text-[#a39886] mt-2">
              English | WhatsApp: 0750274368
            </p>
          </div>
          <p className="text-[11px] text-[#d4ad5d] tracking-[2px] font-bold">
            AAC ROYAL ART CREATION
          </p>
        </div>
      );
    }

    if (p === 2) {
      return (
        <div>
          <h2 className="text-[21px] font-bold text-black border-b-[3px] border-[#d4ad5d] pb-1 mb-2.5">
            How to Use This Book
          </h2>
          <p className="mb-3">
            This is one master book for Computer, Word, Excel and PowerPoint. Made for vertical
            phone reading: <b>one idea per card, big text, zero wide tables</b>.
          </p>
          <h3 className="text-[15px] font-bold my-2.5">Every card tells you 3 things</h3>
          <div className="bg-[#111827] text-[#fef08a] font-mono-code text-sm font-extrabold px-2.5 py-1.5 rounded-md my-2">
            001 Ctrl + S
          </div>
          <p>
            <b>What it does:</b> Saves your file.
          </p>
          <p className="mb-2.5">
            <b>Use it when:</b> You finish a paragraph or calculation.
          </p>
          <h3 className="text-[15px] font-bold mb-1.5">Your 6-Level Learning Path</h3>
          <table className="w-full border-collapse my-2.5 text-[12.5px]">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                <th className="p-1.5 text-left">Level</th>
                <th className="p-1.5 text-left">Where</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">1 Foundation</td>
                <td className="p-1.5">Part 1: Computer Basics (P.5–10)</td>
              </tr>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">2 Practical basics</td>
                <td className="p-1.5">Word, Excel, PowerPoint guides</td>
              </tr>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">3 Practice alone</td>
                <td className="p-1.5">Commands &amp; Template walkthroughs</td>
              </tr>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">4 Speed mastery</td>
                <td className="p-1.5">300 shortcuts &amp; 57 Excel functions</td>
              </tr>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">5 Real Projects</td>
                <td className="p-1.5">Part 7: Projects 1–6 (P.110–116)</td>
              </tr>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">6 Check yourself</td>
                <td className="p-1.5">15 Exam Q&amp;A &amp; Answers (P.119–121)</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (p === 3) {
      return (
        <div>
          <h2 className="text-[21px] font-bold text-black border-b-[3px] border-[#d4ad5d] pb-1 mb-3">
            What is Inside
          </h2>
          <table className="w-full border-collapse my-2.5 text-[12.5px]">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                <th className="p-1.5 text-left">Part</th>
                <th className="p-1.5 text-left">Contents</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">Part 1</td>
                <td className="p-1.5">Computer &amp; Windows Basics (P.5–10)</td>
              </tr>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">Part 2 (Word)</td>
                <td className="p-1.5">Lessons, 100 Shortcuts, 44 Commands, Templates (P.11–38)</td>
              </tr>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">Part 3 (Excel)</td>
                <td className="p-1.5">Lessons, 100 Shortcuts, 57 Functions, 36 Commands (P.39–82)</td>
              </tr>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">Part 4 (PPT)</td>
                <td className="p-1.5">Lessons, 100 Shortcuts, 31 Commands, Templates (P.83–104)</td>
              </tr>
              <tr className="border-b border-[#e2e8f0]">
                <td className="p-1.5 font-bold">Parts 5–7</td>
                <td className="p-1.5">Safety, AI Prompts, Services, Projects, Glossary, Q&amp;A (P.105–122)</td>
              </tr>
            </tbody>
          </table>
          <div className="bg-[#fefce8] border border-[#eab308] p-3 mt-4 rounded-md text-[12.5px] text-[#333]">
            <h4 className="font-bold text-[#854d0e] mb-1.5">Please Note</h4>
            <p>• Self-study companion book. Shortcuts are written for Windows PCs.</p>
            <p>• On Mac computers, substitute <b>Cmd</b> for Ctrl and <b>Option</b> for Alt.</p>
            <p>• Includes 59 downloadable/copyable Word, Excel &amp; PowerPoint templates in the Reader tabs.</p>
            <p>• Licensed for original buyer&apos;s personal/business use only.</p>
          </div>
        </div>
      );
    }

    if (p === 4) {
      const toc: [string, string][] = [
        ['Part 1: Computer Basics & Windows', '5–10'],
        ['Part 2: Microsoft Word Guide', '11–13'],
        ['Word: 100 Shortcuts & 44 Commands', '14–33'],
        ['Word: 8 Template Walkthroughs', '34–38'],
        ['Part 3: Microsoft Excel Basics', '39–41'],
        ['Excel: 100 Shortcuts & 57 Functions', '42–66'],
        ['Excel: 36 Commands & 15 Templates', '67–82'],
        ['Part 4: Microsoft PowerPoint Guide', '83–84'],
        ['PowerPoint: 100 Shortcuts & 31 Commands', '85–102'],
        ['PowerPoint: 4 Template Walkthroughs', '103–104'],
        ['Part 5: Safe Computing & AI Prompts', '105–107'],
        ['Part 6: Start Your Freelance Services', '108–109'],
        ['Part 7: Projects 1–6 & Worksheets', '110–116'],
        ['Glossary, 15 Exam Q&A & Licence', '117–122'],
      ];
      return (
        <div>
          <h2 className="text-[21px] font-bold text-black border-b-[3px] border-[#d4ad5d] pb-1 mb-2.5">
            Table of Contents
          </h2>
          <table className="w-full border-collapse my-2.5 text-[12.5px]">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                <th className="p-1.5 text-left">Section</th>
                <th className="p-1.5 text-left w-14">Page</th>
              </tr>
            </thead>
            <tbody>
              {toc.map(([sec, pg]) => (
                <tr key={sec} className="border-b border-[#e2e8f0]">
                  <td className="p-1.5">{sec}</td>
                  <td className="p-1.5 font-bold">{pg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (p === 5) {
      return (
        <div>
          <h2 className="text-[19px] font-bold text-black bg-[#fef08a] px-2 py-1 border-b-2 border-[#b45309] mb-2.5">
            Part 1: Computer Basics
          </h2>
          <h3 className="text-[15px] font-bold text-[#b45309]">Hardware vs Software</h3>
          <p className="text-[13px] mb-2">
            Hardware is the physical parts you can touch. Software is the programs that tell hardware what to do.
          </p>
          <table className="w-full border-collapse my-2 text-[12.5px]">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                <th className="p-1.5 text-left">Component</th>
                <th className="p-1.5 text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">CPU</td><td className="p-1.5">The brain — executes calculations &amp; logic.</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">RAM</td><td className="p-1.5">Short-term memory — clears when turned off.</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">SSD / HDD</td><td className="p-1.5">Permanent storage for files and apps.</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">Monitor</td><td className="p-1.5">Displays visual output.</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">OS (Windows)</td><td className="p-1.5">Manages hardware, files, and programs.</td></tr>
            </tbody>
          </table>
          <h3 className="text-[15px] font-bold text-[#b45309] mt-3">Switch On &amp; Off Safely</h3>
          <ol className="list-decimal pl-5 text-[13px] leading-relaxed">
            <li>Press the power button once and wait for desktop.</li>
            <li>Save all open Word/Excel work before leaving.</li>
            <li>Click <b>Start &gt; Power &gt; Shut down</b>.</li>
            <li>Never pull the wall plug while Windows is running.</li>
          </ol>
        </div>
      );
    }

    if (p === 6) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Files, Folders &amp; Extensions</h2>
          <p className="text-[13px] mb-2.5">
            Keep work organized in named folders (e.g., <code>Documents/2026_Work/</code>) instead of saving everything on the Desktop.
          </p>
          <table className="w-full border-collapse my-2 text-[12.5px]">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                <th className="p-1.5 text-left">Extension</th>
                <th className="p-1.5 text-left">Program / Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">.docx</td><td className="p-1.5">Microsoft Word editable document</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">.xlsx</td><td className="p-1.5">Microsoft Excel spreadsheet workbook</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">.pptx</td><td className="p-1.5">Microsoft PowerPoint slide deck</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">.pdf</td><td className="p-1.5">Portable read-only document for sharing/printing</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">.jpg / .png</td><td className="p-1.5">Compressed image / transparent logo image</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">.zip</td><td className="p-1.5">Compressed folder bundling many files</td></tr>
            </tbody>
          </table>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mt-2.5 text-[12.5px]">
            <b>Pro Tip:</b> Always send CVs and Invoices to clients as <b>.pdf</b> so fonts and margins never shift on their phone!
          </div>
        </div>
      );
    }

    if (p === 7) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Keyboard &amp; Mouse Mastery</h2>
          <table className="w-full border-collapse my-2 text-[12.5px]">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                <th className="p-1.5 text-left">Key / Click</th>
                <th className="p-1.5 text-left">Function</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">Left Click</td><td className="p-1.5">Select item; Double-click opens folder/file</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">Right Click</td><td className="p-1.5">Opens options menu (Copy, Rename, Properties)</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">Ctrl + Key</td><td className="p-1.5">Runs shortcut command without lifting hands</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">Shift + Key</td><td className="p-1.5">Types capital letters or extends text selection</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">Backspace vs Delete</td><td className="p-1.5">Backspace erases left; Delete erases right</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">Tab Key</td><td className="p-1.5">Jumps to next form field or indents text</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">PrtSc / Win+Shift+S</td><td className="p-1.5">Captures screen snippet to clipboard</td></tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (p === 8) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Desktop, Taskbar &amp; File Explorer</h2>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. Taskbar:</b> Pin Word, Excel, PowerPoint and Browser to the bottom bar for 1-click launch.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. File Explorer (Win + E):</b> Left side shows Quick Access &amp; Drives (C:, D:). Save personal work on D: if available.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. Recycle Bin:</b> Deleted files stay here temporarily. Right-click &gt; Restore brings them back.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Safe USB Removal:</b> Always click Taskbar USB icon &gt; <b>Eject</b> before pulling out a pen drive to prevent file corruption.</div>
        </div>
      );
    }

    if (p === 9 || p === 10) {
      const sc: BookEntryRow[] =
        p === 9
          ? [
              ['001 Ctrl + C / X / V', 'Copy / Cut / Paste selected file or text', 'Duplicating or moving anything'],
              ['002 Ctrl + Z / Y', 'Undo / Redo last action', 'Fixing accidental file moves or deletes'],
              ['003 Alt + Tab', 'Switch rapidly between open apps', 'Copying data from Browser into Word'],
              ['004 Win + D', 'Minimize all windows & show Desktop', 'Need an icon on the desktop quickly'],
              ['005 Win + E', 'Open Windows File Explorer', 'Locating saved PDFs or Downloads'],
              ['006 Win + L', 'Lock your computer screen instantly', 'Stepping away from your desk'],
            ]
          : [
              ['007 Win + Shift + S', 'Open Snipping Tool screenshot box', 'Capturing part of screen for slides'],
              ['008 Win + V', 'Open Clipboard History (last 25 copies)', 'Pasting multiple copied items in order'],
              ['009 Ctrl + Shift + Esc', 'Open Task Manager directly', 'Closing a frozen/stuck program'],
              ['010 F2', 'Rename selected file or folder', 'Giving clean names like CV_2026.pdf'],
              ['011 Win + Left / Right', 'Snap window to half-screen side-by-side', 'Comparing Excel sheet beside Word'],
              ['012 Win + . (Period)', 'Open Emoji & Symbols panel', 'Adding icons (✔, 📌) in WhatsApp/docs'],
            ];
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">
            12 Essential Windows Shortcuts ({p === 9 ? '1–6' : '7–12'})
          </h2>
          {sc.map((s) => (
            <div key={s[0]} className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]">
              <div className="inline-block bg-[#111827] text-[#fef08a] font-mono-code text-[12px] font-bold px-2 py-0.5 rounded mb-1">{s[0]}</div>
              <div><b>What it does:</b> {s[1]}</div>
              <div className="text-[#475569]"><b>Use it when:</b> {s[2]}</div>
            </div>
          ))}
        </div>
      );
    }

    if (p === 11) {
      return (
        <div>
          <h2 className="text-[19px] font-bold text-black bg-[#fef08a] px-2 py-1 border-b-2 border-[#b45309] mb-2.5">
            Part 2: Microsoft Word Guide
          </h2>
          <h3 className="text-[15px] font-bold text-[#b45309] mb-2">Interface &amp; Page Setup</h3>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. The Ribbon:</b> Tabs at the top (Home, Insert, Design, Layout) hold grouped tools.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. Paper Size (A4):</b> Always set <b>Layout &gt; Size &gt; A4</b> first so printed pages match Sri Lankan standard paper.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. Margins:</b> Use <b>Normal (1 inch)</b> for letters, or <b>Narrow (0.5 inch)</b> to fit a CV neatly onto 1 page.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Recommended Fonts:</b> Use clean readable fonts like <b>Calibri, Arial, Segoe UI, or Georgia</b> at 11–12 pt for body text.</div>
        </div>
      );
    }

    if (p === 12) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Word: Formatting, Styles &amp; Lists</h2>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. Headings Hierarchy:</b> Use <b>Heading 1</b> for main titles and <b>Heading 2</b> for subtopics instead of manually bolding everything.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. Paragraph Spacing:</b> Never press Enter 3 times to make space. Use <b>Layout &gt; Spacing After (6–10 pt)</b>.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. Alignment Rules:</b> Left-align CVs &amp; lists; Justify (Ctrl+J) formal letters &amp; books; Center titles only.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Format Painter:</b> Highlight a styled heading, click <b>Format Painter</b> (or Ctrl+Shift+C), and brush over another heading to copy its exact look.</div>
        </div>
      );
    }

    if (p === 13) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Word: Tables, Images &amp; PDF Export</h2>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. Clean Tables:</b> Use <b>Insert &gt; Table</b> to align CV columns or invoice prices neatly. Hide borders (<i>No Border</i>) for invisible CV alignment!</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. Moving Photos Freely:</b> Click an inserted image &gt; <b>Wrap Text &gt; In Front of Text</b> (or Square) so it moves smoothly anywhere.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. Headers &amp; Footers:</b> Double-click the top or bottom margin to add Company Name, Phone, and Page Numbers once across all pages.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Save Final Copy as PDF:</b> Press <b>F12</b> &gt; Save as type: <b>PDF</b>. Always keep both the editable <code>.docx</code> and shareable <code>.pdf</code>.</div>
        </div>
      );
    }

    if (p >= 14 && p <= 27) {
      return <ListCards title={`Word Shortcuts (Page ${p - 13} of 14)`} arr={WORD_100_SHORTCUTS} idx={p - 14} totalPages={14} prefix="W-" />;
    }

    if (p >= 28 && p <= 33) {
      return <ListCards title={`Word Commands (Page ${p - 27} of 6)`} arr={WORD_44_COMMANDS} idx={p - 28} totalPages={6} prefix="CMD-" />;
    }

    if (p >= 34 && p <= 38) {
      const idx = p - 34;
      const guides = [
        ['Template 01 & 02: CV & Resume', 'Keep CVs 1–2 pages max. Put newest education/job first. Export to PDF before sending via WhatsApp/Email.', "Open 'Word (20 Templates)' tab > 01 Professional CV"],
        ['Template 03 & 04: Job Cover & Formal Letters', 'Address the manager directly if known. Keep letters to 3 short paragraphs: Purpose, Context, Action.', "Open 'Word (20 Templates)' tab > 03 Job Application Letter"],
        ['Template 05 & 06: Business Proposal & Minutes', 'Proposals state scope, price & timeline clearly. Minutes record decisions and assign owners + due dates.', "Open 'Word (20 Templates)' tab > 05 Business Proposal"],
        ['Template 07 & 08: Business Plan & Project Proposal', 'Break budgets into Equipment, Inventory, and Operations so lenders or clients trust your numbers.', "Open 'Word (20 Templates)' tab > 07 Business Plan"],
        ['Templates 09–20: Invoices, Quotes & Reports', 'Use Invoice/Quotation templates with itemized tables. Double-check totals and bank details before exporting PDF.', "Open 'Word (20 Templates)' tab > 09 Official Invoice"],
      ];
      const g = guides[idx];
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Word Templates Walkthrough ({idx + 1}/5)</h2>
          <div className="bg-[#111827] text-[#fef08a] font-mono-code text-sm font-extrabold px-2.5 py-1.5 rounded-md my-2">{g[0]}</div>
          <p className="text-[13px] my-2.5 leading-relaxed">{g[1]}</p>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 text-[12.5px]">
            <b>How to Use:</b>
            <br />1. Switch to <b>Word (20 Templates)</b> tab above.
            <br />2. Select the template and tap <b>1-Click Copy</b>.
            <br />3. Paste into MS Word, edit text inside <code>[brackets]</code>, and save as PDF!
          </div>
          <p className="text-xs text-[#475569] mt-2"><b>Location:</b> {g[2]}</p>
        </div>
      );
    }

    if (p === 39) {
      return (
        <div>
          <h2 className="text-[19px] font-bold text-black bg-[#fef08a] px-2 py-1 border-b-2 border-[#b45309] mb-2.5">
            Part 3: Microsoft Excel Basics
          </h2>
          <h3 className="text-[15px] font-bold text-[#b45309]">Core Concepts</h3>
          <ul className="list-disc pl-5 text-[13px] leading-relaxed mb-2.5">
            <li>Workbook = the <code>.xlsx</code> file. Worksheet = a bottom tab.</li>
            <li>Columns are letters (A, B, C); Rows are numbers (1, 2, 3).</li>
            <li>Every formula MUST begin with <b>=</b> (equals sign).</li>
          </ul>
          <h3 className="text-[15px] font-bold text-[#b45309]">Core Formulas (Data in A2:A6: 120, 80, 150, 95, 55)</h3>
          <table className="w-full border-collapse my-2 text-[12.5px]">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                <th className="p-1.5 text-left">Formula</th>
                <th className="p-1.5 text-left">Result</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5">=SUM(A2:A6)</td><td className="p-1.5 font-bold">500</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5">=AVERAGE(A2:A6)</td><td className="p-1.5 font-bold">100</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5">=MAX(A2:A6) / MIN</td><td className="p-1.5 font-bold">150 / 55</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5">=COUNTIF(A2:A6,&quot;&gt;90&quot;)</td><td className="p-1.5 font-bold">3</td></tr>
            </tbody>
          </table>
          <p className="text-[12.5px] mt-2"><b>IF Rule:</b> <code>=IF(B2&gt;=50,&quot;Pass&quot;,&quot;Fail&quot;)</code> → 62 gives Pass, 45 gives Fail.</p>
        </div>
      );
    }

    if (p === 40) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Excel: Cell References &amp; Autofill</h2>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. Relative Reference (A1):</b> Changes automatically when dragged down (A1 → A2 → A3).</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. Absolute Reference ($A$1):</b> Locked with <code>$</code> (press <b>F4</b>). Use for fixed Tax/Discount cells so dragging formulas never breaks!</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. Fill Handle (+):</b> Drag the tiny green square at the bottom-right corner of a cell to auto-fill Jan/Feb/Mar, dates, or formulas.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Fixing ### Error:</b> <code>###</code> simply means the column is too narrow! Double-click the column header border to AutoFit width.</div>
        </div>
      );
    }

    if (p === 41) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Excel: Sorting, Filtering &amp; Printing</h2>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. Sort &amp; Filter (Ctrl+Shift+L):</b> Click any header row and turn on Filter to view only unpaid invoices or sort highest-to-lowest sales.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. Freeze Panes:</b> Select cell A2 &gt; <b>View &gt; Freeze Panes &gt; Freeze Top Row</b> so headers never disappear when scrolling.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. Quick Charts (Alt+F1):</b> Highlight Category + Sales columns and press <b>Alt+F1</b> for an instant chart.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Fit to 1 Page Print:</b> Go to <b>Page Layout &gt; Width: 1 Page</b> so wide tables never split awkwardly across two sheets.</div>
        </div>
      );
    }

    if (p >= 42 && p <= 54) {
      return <ListCards title={`Excel Shortcuts (Page ${p - 41} of 13)`} arr={EXCEL_100_SHORTCUTS} idx={p - 42} totalPages={13} prefix="E-" />;
    }

    if (p >= 55 && p <= 66) {
      return <ListCards title={`Excel Functions Guide (Page ${p - 54} of 12)`} arr={EXCEL_57_FUNCTIONS} idx={p - 55} totalPages={12} prefix="FN-" />;
    }

    if (p >= 67 && p <= 71) {
      return <ListCards title={`Excel Commands (Page ${p - 66} of 5)`} arr={EXCEL_36_COMMANDS} idx={p - 67} totalPages={5} prefix="XCMD-" />;
    }

    if (p >= 72 && p <= 82) {
      const idx = p - 72;
      const pair = idx < 4 ? [EXCEL_TEMPLATES[idx * 2], EXCEL_TEMPLATES[idx * 2 + 1]] : [EXCEL_TEMPLATES[idx + 4]];
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Excel Templates Formula Guide ({idx + 1}/11)</h2>
          {pair.filter(Boolean).map((tpl) => (
            <div key={tpl.id} className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2.5 text-[12.5px]">
              <div className="inline-block bg-[#111827] text-[#fef08a] font-mono-code text-[12px] font-bold px-2 py-0.5 rounded mb-1">{tpl.title}</div>
              <p className="my-1"><b>Purpose:</b> {tpl.desc}</p>
              <pre className="bg-[#0f172a] text-[#e2e8f0] p-2 rounded text-[11px] whitespace-pre-wrap font-mono-code">{tpl.text}</pre>
            </div>
          ))}
          <p className="text-xs text-[#475569] mt-2">Copy any template directly from the <b>Excel (20 Templates)</b> tab above into Excel or Google Sheets.</p>
        </div>
      );
    }

    if (p === 83) {
      return (
        <div>
          <h2 className="text-[19px] font-bold text-black bg-[#fef08a] px-2 py-1 border-b-2 border-[#b45309] mb-2.5">
            Part 4: Microsoft PowerPoint
          </h2>
          <h3 className="text-[15px] font-bold text-[#b45309]">Plan First (Golden Rules)</h3>
          <ul className="list-disc pl-5 text-[13px] leading-relaxed mb-2.5">
            <li>Write your main message in one clear sentence.</li>
            <li>One idea per slide — short bullet phrases, never long paragraphs.</li>
            <li>Keep body text at least <b>24 pt</b> for readability.</li>
            <li>Stick to 2–3 colors (e.g., Navy #0A1F44 + Gold + White).</li>
          </ul>
          <h3 className="text-[15px] font-bold text-[#b45309]">7-Slide Winning Structure</h3>
          <table className="w-full border-collapse my-2 text-[12.5px]">
            <thead><tr className="bg-[#1e293b] text-white"><th className="p-1.5 text-left">Slide</th><th className="p-1.5 text-left">Content</th></tr></thead>
            <tbody>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">1</td><td className="p-1.5">Title, Subtitle &amp; Presenter Name</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">2</td><td className="p-1.5">Agenda or Core Problem</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">3–5</td><td className="p-1.5">One main solution / data point per slide</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">6</td><td className="p-1.5">Key Summary &amp; Pricing / Next Steps</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">7</td><td className="p-1.5">Contact Details &amp; Q&amp;A</td></tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (p === 84) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">PowerPoint: Design, Master &amp; Presenting</h2>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. 16:9 Widescreen:</b> Always check <b>Design &gt; Slide Size &gt; Widescreen (16:9)</b> so slides fill modern laptops and TVs without black sidebars.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. Slide Master (Alt+W, M):</b> Place your logo and footer once in Slide Master — it automatically appears cleanly on every slide.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. Morph &amp; Fade:</b> Use subtle <b>Fade</b> or <b>Morph</b> transitions. Avoid spinning/bouncing text in professional presentations.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Live Keyboard Control:</b> Press <b>F5</b> to start, <b>B</b> to pause on a black screen while talking, and <b>Esc</b> to exit.</div>
        </div>
      );
    }

    if (p >= 85 && p <= 97) {
      return <ListCards title={`PowerPoint Shortcuts (Page ${p - 84} of 13)`} arr={PPT_100_SHORTCUTS} idx={p - 85} totalPages={13} prefix="P-" />;
    }

    if (p >= 98 && p <= 102) {
      return <ListCards title={`PowerPoint Commands (Page ${p - 97} of 5)`} arr={PPT_31_COMMANDS} idx={p - 98} totalPages={5} prefix="PCMD-" />;
    }

    if (p === 103 || p === 104) {
      const pair = p === 103 ? [PPT_TEMPLATES[0], PPT_TEMPLATES[1]] : [PPT_TEMPLATES[6], PPT_TEMPLATES[9]];
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">PowerPoint Templates Guide ({p === 103 ? '1/2' : '2/2'})</h2>
          {pair.map((tpl) => (
            <div key={tpl.id} className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2.5 text-[12.5px]">
              <div className="inline-block bg-[#111827] text-[#fef08a] font-mono-code text-[12px] font-bold px-2 py-0.5 rounded mb-1">{tpl.title}</div>
              <p className="my-1">{tpl.desc}</p>
              <pre className="bg-[#0f172a] text-[#e2e8f0] p-2 rounded text-[11px] whitespace-pre-wrap font-mono-code">{tpl.text}</pre>
            </div>
          ))}
          <p className="text-xs text-[#475569]">All 19 slide outlines are ready to copy in the <b>PowerPoint (19 Decks)</b> tab.</p>
        </div>
      );
    }

    if (p === 105) {
      return (
        <div>
          <h2 className="text-[19px] font-bold text-black bg-[#fef08a] px-2 py-1 border-b-2 border-[#b45309] mb-2.5">
            Part 5: Safe Computing &amp; Security
          </h2>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. Strong Passwords:</b> Never reuse the same password. Use 12+ characters mixing Letters, Numbers, and Symbols (e.g., <code>Hatton#Kit2026!</code>).</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. Spot Phishing Scams:</b> Never click suspicious bank/prize SMS links or share OTPs. Verify sender domain names carefully.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. 3-2-1 Backup Rule:</b> Keep important CVs, invoices, and photos in 2 places (PC + Google Drive or USB drive) so hardware failure never destroys your work.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Windows Defender:</b> Keep Windows Security &amp; Updates turned ON; avoid cracked <code>.exe</code> software which often hides malware.</div>
        </div>
      );
    }

    if (p === 106) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">AI Tools &amp; Smart Prompt Formula</h2>
          <p className="text-[13px] mb-2.5">Use AI assistants to draft letters, fix Excel formulas, and outline slides in seconds using the <b>R-T-C-F Formula</b>:</p>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>R — Role:</b> &quot;Act as an experienced HR Manager / Excel Trainer.&quot;</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>T — Task:</b> &quot;Write a 3-paragraph job application / Give me an Excel IF formula.&quot;</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>C — Context:</b> &quot;Applying for Accounts Clerk in Sri Lanka; marks are in B2:D2.&quot;</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>F — Format:</b> &quot;Keep it under 150 words, formal tone, ready to paste in Word.&quot;</div>
        </div>
      );
    }

    if (p === 107) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Ready-to-Use AI Prompts (Copy &amp; Use)</h2>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. Fix Grammar:</b><br /><i>&quot;Proofread this formal letter, fix grammar mistakes, and keep the tone polite and concise: [Paste text]&quot;</i></div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. Build Excel Formula:</b><br /><i>&quot;Write an Excel formula where if cell D2 is below 15 it shows &apos;REORDER&apos;, otherwise &apos;OK&apos;.&quot;</i></div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. Summarize Study Notes:</b><br /><i>&quot;Turn these lecture notes into 10 short bullet points and 5 quiz questions with answers: [Paste notes]&quot;</i></div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Slide Outline:</b><br /><i>&quot;Create a 6-slide PowerPoint outline for a small bakery business launch with short bullet points.&quot;</i></div>
        </div>
      );
    }

    if (p === 108) {
      return (
        <div>
          <h2 className="text-[19px] font-bold text-black bg-[#fef08a] px-2 py-1 border-b-2 border-[#b45309] mb-2.5">
            Part 6: Start Your Digital Services
          </h2>
          <p className="text-[13px] mb-2.5">Turn your PC Master Kit skills into real income by offering local &amp; online office services:</p>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>1. Professional CV &amp; Resume Typing:</b> Use Templates 01 &amp; 02, customize layout, deliver clean PDF on WhatsApp.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>2. Business Invoices &amp; Excel Trackers:</b> Build automated monthly expense/stock sheets for local shops using SUM/IF formulas.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>3. Student Assignments &amp; PPT Decks:</b> Format clean A4 Word reports with Cover Page + TOC, and 16:9 presentation slides.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]"><b>4. Formal Letters &amp; Translations:</b> Draft bank, leave, and visa request letters quickly.</div>
        </div>
      );
    }

    if (p === 109) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Pricing, Workflow &amp; Client Delivery</h2>
          <table className="w-full border-collapse my-2 text-[12.5px]">
            <thead><tr className="bg-[#1e293b] text-white"><th className="p-1.5 text-left">Step</th><th className="p-1.5 text-left">Best Practice</th></tr></thead>
            <tbody>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">1. Collect Info</td><td className="p-1.5">Get clear details &amp; spelling via WhatsApp voice/text.</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">2. Quote Price</td><td className="p-1.5">Share clear price + delivery time before starting.</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">3. Send Preview</td><td className="p-1.5">Send screenshot/watermarked draft for spelling check.</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">4. Confirm Payment</td><td className="p-1.5">Verify bank transfer / cash receipt.</td></tr>
              <tr className="border-b border-[#e2e8f0]"><td className="p-1.5 font-bold">5. Final Handover</td><td className="p-1.5">Send final high-res PDF + editable file cleanly.</td></tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (p >= 110 && p <= 115) {
      const projIdx = p - 110;
      const projects = [
        ['Project 1: 1-Page Executive CV (MS Word)', 'Open Word > Set A4 + Narrow margins (0.5"). Paste Template 01, bold headings (Ctrl+B), add clean divider lines, save as CV_YourName.pdf (F12).'],
        ['Project 2: Formal Business Invoice (Word + PDF)', 'Insert a 4-column table (Item, Qty, Price, Total). Align numbers right (Ctrl+R), bold Grand Total, add bank transfer details at footer, export PDF.'],
        ['Project 3: Monthly Budget & Savings Sheet (Excel)', 'Enter Income in B2 and Expenses in C2:C6. Calculate Total Expense =SUM(C2:C6), Balance =B2-C7, Status =IF(C8>0,"SURPLUS","DEFICIT").'],
        ['Project 4: Student Gradebook & Pass/Fail (Excel)', 'Enter 5 students marks. Use =SUM, =AVERAGE, and =IF(Avg>=75,"A",IF(Avg>=50,"PASS","FAIL")). Apply Conditional Formatting red for FAIL.'],
        ['Project 5: Stock Reorder Alert System (Excel)', 'Track Stock In & Stock Out. Balance =B2-C2. Alert formula =IF(D2<15,"REORDER","OK"). Turn on Ctrl+Shift+L Filter to show only REORDER items.'],
        ['Project 6: 6-Slide Business Pitch Deck (PowerPoint)', 'Set 16:9 slide size. Use Navy & Gold palette, 24pt+ text, Slide Master logo, Alt+F1 chart from Excel, and rehearse with F5 Presenter View.'],
      ];
      const pr = projects[projIdx];
      return (
        <div>
          <h2 className="text-[19px] font-bold text-black bg-[#fef08a] px-2 py-1 border-b-2 border-[#b45309] mb-2.5">
            Part 7: Hands-On {pr[0].split(':')[0]}
          </h2>
          <div className="bg-[#111827] text-[#fef08a] font-mono-code text-sm font-extrabold px-2.5 py-1.5 rounded-md my-2">{pr[0]}</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mt-2.5 mb-2 text-[12.5px]"><b>Step-by-Step Task:</b><br />{pr[1]}</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 text-[12.5px]">
            <b>Completion Check:</b>
            <br />✔ Zero spelling errors (F7)
            <br />✔ Clean margins &amp; consistent fonts
            <br />✔ Tested print preview (Ctrl+P) &amp; saved backup copy
          </div>
        </div>
      );
    }

    if (p === 116) {
      return (
        <div>
          <h2 className="text-lg font-bold text-[#b45309] mb-2.5">Practical Speed Worksheet Checklist</h2>
          <p className="text-[13px] mb-2.5">Time yourself on these 6 daily office drills until you can finish each under 2 minutes without using the mouse:</p>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]">☐ Copy 3 items and paste using <b>Win + V</b> clipboard history.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]">☐ Format a messy Word draft: <b>Ctrl+A &gt; Ctrl+Space &gt; Ctrl+J</b>, then save PDF with <b>F12</b>.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]">☐ Sum a 50-row Excel column in 1 second with <b>Alt + =</b>.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]">☐ Convert an Excel range into a filterable Table with <b>Ctrl + T</b>.</div>
          <div className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]">☐ Duplicate a styled PowerPoint card cleanly with <b>Ctrl + Shift + Drag</b>.</div>
        </div>
      );
    }

    if (p === 117 || p === 118) {
      const g1: [string, string][] = [
        ['CPU / RAM', 'Processor (brain) / Temporary working memory'],
        ['Ribbon', 'Top toolbar in Word, Excel & PowerPoint'],
        ['PDF', 'Fixed-layout document format for sharing & print'],
        ['Cell / Range', 'Single box (B3) / Group of cells (B3:B10)'],
        ['Formula vs Function', 'User expression (=A1+B1) vs built-in tool (=SUM)'],
        ['Absolute Ref ($A$1)', 'Locked cell address that stays fixed when copied'],
      ];
      const g2: [string, string][] = [
        ['Conditional Format', 'Auto-coloring cells based on value rules'],
        ['PivotTable', 'Interactive tool summarizing large tables quickly'],
        ['Slide Master', 'Top-level template controlling fonts/logo on all slides'],
        ['Morph Transition', 'Smooth motion animation between two slides'],
        ['Phishing', 'Fake scam emails/links trying to steal passwords/OTP'],
        ['Cloud Backup', 'Saving files online (OneDrive/Google Drive) safely'],
      ];
      const list = p === 117 ? g1 : g2;
      return (
        <div>
          <h2 className="text-[19px] font-bold text-[#b45309] border-b-2 border-[#f59e0b] pb-1 mb-2.5">
            Glossary ({p === 117 ? 'Part A' : 'Part B'})
          </h2>
          <table className="w-full border-collapse my-2 text-[12.5px]">
            <thead><tr className="bg-[#1e293b] text-white"><th className="p-1.5 text-left">Term</th><th className="p-1.5 text-left">Simple Meaning</th></tr></thead>
            <tbody>
              {list.map((it) => (
                <tr key={it[0]} className="border-b border-[#e2e8f0]">
                  <td className="p-1.5 font-bold">{it[0]}</td>
                  <td className="p-1.5">{it[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (p >= 119 && p <= 121) {
      const sets: Record<number, [string, string][]> = {
        119: [
          ['1. Which shortcut saves a Word/Excel file immediately?', 'Ctrl + S (and F12 opens Save As)'],
          ['2. What does Ctrl + Shift + V do in Word/Browser?', 'Pastes plain text without messy formatting'],
          ['3. Which key cycles UPPERCASE / lowercase / Title Case?', 'Shift + F3'],
          ['4. How do you insert a manual Page Break in Word?', 'Ctrl + Enter'],
          ['5. Which symbol must EVERY Excel formula start with?', '= (Equals sign)'],
        ],
        120: [
          ['6. What is the fastest shortcut to AutoSum an Excel column?', 'Alt + ='],
          ['7. Why does Excel show "###" inside a number cell?', 'The column is too narrow to display the value'],
          ['8. Which symbol locks a cell reference (like $B$1) in Excel?', '$ (Dollar sign — press F4)'],
          ['9. Write an IF formula to show PASS if A1 >= 50, else FAIL.', '=IF(A1>=50,"PASS","FAIL")'],
          ['10. Which function counts cells matching a condition?', '=COUNTIF(range, criteria)'],
        ],
        121: [
          ['11. Which key starts a PowerPoint Show from Slide 1?', 'F5 (Shift + F5 starts from current slide)'],
          ['12. What key turns the screen black during a live talk?', "B (or Period '.')"],
          ['13. What shortcut duplicates a slide or object in PowerPoint?', 'Ctrl + D'],
          ['14. Why should you export CVs & Invoices to .pdf?', 'To lock fonts, tables, and margins on all devices'],
          ['15. Which shortcut opens Windows Snipping Tool?', 'Win + Shift + S'],
        ],
      };
      return (
        <div>
          <h2 className="text-[19px] font-bold text-black bg-[#fef08a] px-2 py-1 border-b-2 border-[#b45309] mb-2.5">
            Practice Exam Q&amp;A ({p - 118}/3)
          </h2>
          {sets[p].map((q) => (
            <div key={q[0]} className="border border-[#e4e4e7] bg-[#f8fafc] rounded-lg p-2.5 mb-2 text-[12.5px]">
              <div className="font-bold text-[#0f172a] mb-1">{q[0]}</div>
              <div className="text-[#047857] font-bold">✔ Answer: {q[1]}</div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-xl font-bold text-black border-b-[3px] border-[#d4ad5d] pb-1 mb-3">
          Licence and Contact
        </h2>
        <p className="mb-3 text-[13px] leading-relaxed">
          <b>PC MASTER KIT 2026 – Master Edition.</b> Published by <b>AAC Royal Art Creation</b>.
          Licensed strictly for the original buyer&apos;s personal or business use only.
        </p>
        <div className="bg-[#fee2e2] border border-[#ef4444] p-3 rounded-md text-xs text-[#991b1b] mb-4">
          Do not resell, share or republish. Self-study book: no certificate. Microsoft, Windows,
          Word, Excel and PowerPoint are trademarks of their respective owners.
        </div>
        <div className="bg-[#f4f4f5] border border-[#e4e4e7] rounded-lg p-3.5 text-center">
          <p className="text-xs text-[#71717a]">Official Support &amp; Activations</p>
          <p className="text-base font-extrabold text-black mt-1">WhatsApp: 0750274368</p>
          <p className="text-xs text-[#b45309] font-bold mt-0.5">Hatton, Sri Lanka</p>
        </div>
      </div>
    );
  };

  return (
    <div
      id={`book-card-${pageNumber}`}
      data-page={pageNumber}
      className={`w-full min-h-[700px] sm:min-h-[740px] rounded-xl relative overflow-hidden p-5 sm:p-6 flex flex-col justify-between text-[14px] leading-relaxed select-none ${
        isCover
          ? 'bg-gradient-to-br from-[#0d0b08] to-[#1f170b] text-[#f5eedc] border-[3px] border-[#d4ad5d] shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-center'
          : 'bg-white text-[#18181b] shadow-[0_18px_45px_rgba(0,0,0,0.85)]'
      }`}
    >
      {/* Forensic Dynamic Watermark Overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-20 flex flex-wrap items-center justify-around content-around opacity-15 -rotate-[22deg] scale-110 text-[#b45309] font-extrabold text-[11px] font-mono-code p-3"
      >
        <span>{watermarkLines[0]}</span>
        <span>{watermarkLines[1]}</span>
        <span>{watermarkLines[2]}</span>
      </div>

      {!isCover && (
        <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-bold border-b border-[#e4e4e7] pb-1.5 mb-3">
          PC MASTER KIT 2026 – MASTER EDITION
        </div>
      )}

      <div className="flex-1">{renderContent()}</div>

      <div
        className={`text-[11px] flex justify-between items-center border-t pt-2 mt-3.5 font-bold ${
          isCover ? 'border-[#382c18] text-[#d4ad5d]' : 'border-[#e4e4e7] text-[#a1a1aa]'
        }`}
      >
        <span>Page {pageNumber}</span>
        <span>AAC ROYAL ART CREATION</span>
      </div>
    </div>
  );
};
