import { useState, useMemo } from 'react';
import { Search, Printer, ArrowLeft, X, GraduationCap, FileText, Download } from 'lucide-react';
import { cn } from '../utils/cn';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel, VerticalAlign, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

// ─── Roman numeral → integer for sorting ─────────────────────────────────────
const SEM_ORDER = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
function semSortKey(semNo) {
  const u = (semNo || '').trim().toUpperCase();
  if (SEM_ORDER[u]) return SEM_ORDER[u];
  const n = parseInt(u, 10);
  return isNaN(n) ? 99 : n;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FAIL_GRADES = new Set(['F', 'FF', 'I', 'W', 'AB']);
const isFail = (g) => FAIL_GRADES.has((g || '').trim().toUpperCase());

function gradeColor(g) {
  if (!g || g === '-' || g === '—') return 'text-slate-400';
  return isFail(g) ? 'text-rose-600 font-bold' : 'text-slate-800 font-semibold';
}

// ─── Document Generation Logic ────────────────────────────────────────────────
const generateTranscriptDocx = async (student) => {
  const attempts = [...(student.attempts || [])].sort(
    (a, b) => semSortKey(a.semNo) - semSortKey(b.semNo)
  );

  const lastAttempt = attempts[attempts.length - 1];
  const firstAttempt = attempts[0];
  const cgpa = lastAttempt?.cgpa || null;
  const classLabel = lastAttempt?.classification || '';

  const college = 'Lok Jagruti Kendra University.';
  const programme = student.branch || 'MASTER OF SCIENCE (INFORMATION TECHNOLOGY) INTEGRATED';
  const admYear = firstAttempt?.period?.match(/\d{4}/)?.[0] || '';
  const compYear = lastAttempt?.period?.match(/\d{4}/)?.[0] || '';
  const yearString = `${admYear}${compYear && admYear !== compYear ? ` / ${compYear}` : ''}`;

  const createCell = (text, bold = false, align = AlignmentType.LEFT, widthPercent = null, colSpan = 1, isLastRow = false) => {
    return new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: text || '—', bold, size: 20 })], alignment: align, keepNext: !isLastRow })],
      width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
      columnSpan: colSpan,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    });
  };

  const studentInfoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          createCell("NAME OF STUDENT:", true, AlignmentType.LEFT, 20, 1, false),
          createCell((student.name || '').toUpperCase(), false, AlignmentType.LEFT, 30, 1, false),
          createCell("ENROLLMENT NO.:", true, AlignmentType.LEFT, 20, 1, false),
          createCell(student.enrollmentNo || '', true, AlignmentType.LEFT, 30, 1, false),
        ]
      }),
      new TableRow({
        cantSplit: true,
        children: [
          createCell("NAME OF SCHOOL:", true, AlignmentType.LEFT, null, 1, false),
          createCell(college, false, AlignmentType.LEFT, null, 1, false),
          createCell("MEDIUM OF INSTRUCTION:", true, AlignmentType.LEFT, null, 1, false),
          createCell("ENGLISH", false, AlignmentType.LEFT, null, 1, false),
        ]
      }),
      new TableRow({
        cantSplit: true,
        children: [
          createCell("PROGRAMME:", true, AlignmentType.LEFT, null, 1, true),
          createCell(programme.toUpperCase(), false, AlignmentType.LEFT, null, 1, true),
          createCell("YEAR OF ADMISSION / COMPLETION:", true, AlignmentType.LEFT, null, 1, true),
          createCell(yearString, false, AlignmentType.LEFT, null, 1, true),
        ]
      })
    ]
  });

  const childrenContent = [];

  // Load Logo
  let logoBuffer = null;
  try {
    const resp = await fetch('/logo.png');
    if (resp.ok) {
      logoBuffer = await resp.arrayBuffer();
    }
  } catch (e) {
    console.error("Could not load logo", e);
  }

  // Header Elements
  if (logoBuffer) {
    childrenContent.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 350, height: 80 }
          })
        ]
      })
    );
  }

  childrenContent.push(
    new Paragraph({
      children: [
        new TextRun({ text: college, bold: true, size: 28 }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "AHMEDABAD - 382210, INDIA (ESTABLISHED BY GUJARAT ACT NO. 19 OF 2019)", size: 18, bold: true }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Academic Transcript", size: 24, smallCaps: true, color: "555555" }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    studentInfoTable,
    new Paragraph({ spacing: { after: 300 } })
  );

  // Semesters
  attempts.forEach((attempt) => {
    const semLabel = attempt.semNo || `Sem ${attempt.attemptNo}`;
    
    // Semester Row and Subjects Header Row combined into one table
    const subjectsRows = [
      new TableRow({
        cantSplit: true,
        children: [
          createCell(`SEMESTER: ${semLabel}`, true, AlignmentType.LEFT, 20, 1, false),
          createCell(`SEAT NO.: ${attempt.seatNo || '—'}`, true, AlignmentType.LEFT, 45, 1, false),
          createCell(`CREDIT EARNED: ${attempt.earnedCredits || '—'}`, true, AlignmentType.LEFT, 12, 1, false),
          createCell(`SPI:  ${attempt.spi || '—'}`, true, AlignmentType.LEFT, 11, 1, false),
          createCell(`GRADE POINT: ${attempt.gradePoints != null ? attempt.gradePoints : '—'}`, true, AlignmentType.LEFT, 12, 1, false),
        ]
      }),
      new TableRow({
        cantSplit: true,
        children: [
          createCell("Course Code", true, AlignmentType.CENTER, 20, 1, false),
          createCell("Course Title", true, AlignmentType.CENTER, 45, 1, false),
          createCell("Theory Credit", true, AlignmentType.CENTER, 12, 1, false),
          createCell("Theory Grade", true, AlignmentType.CENTER, 11, 1, false),
          createCell("Practical\nCredit & Grade", true, AlignmentType.CENTER, 12, 1, false),
        ]
      })
    ];

    const subjectsCount = (attempt.subjects || []).length;
    (attempt.subjects || []).forEach((sub, i) => {
      const isFailed = isFail(sub.subGrade);
      let pracGrade = '-';
      if (sub.vivaCredits != null && sub.vivaCredits > 0) {
        pracGrade = `${sub.vivaCredits} / ${sub.vivaGrade || '-'}`;
      }
      
      const isLastRow = (i === subjectsCount - 1);

      subjectsRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            createCell(sub.code, false, AlignmentType.CENTER, null, 1, isLastRow),
            createCell(sub.name || '—', false, AlignmentType.LEFT, null, 1, isLastRow),
            createCell(sub.credits ? sub.credits.toString() : '-', false, AlignmentType.CENTER, null, 1, isLastRow),
            createCell(sub.subGrade || '-', isFailed, AlignmentType.CENTER, null, 1, isLastRow),
            createCell(pracGrade, false, AlignmentType.CENTER, null, 1, isLastRow)
          ]
        })
      );
    });

    const subjectsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: subjectsRows,
    });

    childrenContent.push(subjectsTable, new Paragraph({ spacing: { after: 300 } }));
  });

  // Final Certification & Signatures
  if (cgpa) {
    childrenContent.push(
      new Paragraph({
        children: [
          new TextRun({ text: `THIS IS TO CERTIFY THAT ${(student.name || '').toUpperCase()} HAS CLEARED HIS/HER ${programme.toUpperCase()} WITH CGPA OF `, bold: true, size: 20 }),
          new TextRun({ text: cgpa, bold: true, size: 20 }),
          new TextRun({ text: classLabel ? ` (CLASS: ${classLabel.toUpperCase()}).` : '.', bold: true, size: 20 }),
        ],
        spacing: { before: 200, after: 600 },
        alignment: AlignmentType.JUSTIFIED
      })
    );
  } else {
    childrenContent.push(new Paragraph({ spacing: { before: 200, after: 600 } }));
  }

  // Signature Block
  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "____________________________________", size: 20 })] }), new Paragraph({ children: [new TextRun({ text: "VERIFIED BY (NAME & SIGNATURE)", size: 18 })] })],
            verticalAlign: VerticalAlign.BOTTOM,
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "____________________________________", size: 20 })], alignment: AlignmentType.RIGHT }), new Paragraph({ children: [new TextRun({ text: "DIRECTOR'S SIGNATURE", size: 18 })], alignment: AlignmentType.RIGHT })],
            verticalAlign: VerticalAlign.BOTTOM,
          })
        ]
      })
    ]
  });

  childrenContent.push(sigTable);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Aptos",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: childrenContent,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Transcript_${student.enrollmentNo || student.name || 'document'}.docx`);
};

// ─── Transcript On-Screen Preview ───────────────────────────────────────────
function TranscriptPreview({ student }) {
  const attempts = [...(student.attempts || [])].sort(
    (a, b) => semSortKey(a.semNo) - semSortKey(b.semNo)
  );

  const lastAttempt = attempts[attempts.length - 1];
  const firstAttempt = attempts[0];
  const cgpa = lastAttempt?.cgpa || null;
  const classLabel = lastAttempt?.classification || '';

  const college = 'Lok Jagruti Kendra University.';
  const programme = student.branch || 'MASTER OF SCIENCE (INFORMATION TECHNOLOGY) INTEGRATED';

  const admYear = firstAttempt?.period?.match(/\d{4}/)?.[0] || '';
  const compYear = lastAttempt?.period?.match(/\d{4}/)?.[0] || '';

  return (
    <div className="w-full bg-white text-slate-800 text-[12px] md:text-[13px] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden border border-slate-200">
      <div className="p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-slate-800/10 pb-6">
          <div className="flex justify-center mb-4">
             <img src="/logo.png" alt="University Logo" className="h-16 w-16 object-contain" onError={(e) => e.target.style.display = 'none'} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{college}</h2>
          <p className="text-xs font-bold text-slate-600 mt-1">AHMEDABAD - 382210, INDIA (ESTABLISHED BY GUJARAT ACT NO. 19 OF 2019)</p>
          <p className="text-sm font-medium text-slate-500 mt-3 uppercase tracking-[0.2em]">Academic Transcript</p>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-10 bg-slate-50 p-6 rounded-lg border border-slate-100">
          <div className="col-span-1 md:col-span-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Programme</p>
            <p className="font-bold text-slate-800 uppercase">{programme}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Name of Student</p>
            <p className="font-bold text-slate-800 uppercase">{student.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Enrollment No.</p>
            <p className="font-bold text-slate-800 font-mono">{student.enrollmentNo || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Medium of Instruction</p>
            <p className="font-semibold text-slate-800">ENGLISH</p>
          </div>
          <div>
             <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Year of Admission / Completion</p>
             <p className="font-semibold text-slate-800">{admYear}{compYear && admYear !== compYear ? ` / ${compYear}` : ''}</p>
          </div>
        </div>

        {/* Semesters */}
        {attempts.map((attempt, idx) => (
          <div key={idx} className="mb-8 overflow-hidden rounded-lg border border-slate-200">
            {/* Sem Header */}
            <div className="bg-slate-100/80 px-4 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">SEMESTER: {attempt.semNo || `Sem ${attempt.attemptNo}`}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                 <span className="text-slate-600">SEAT NO: <span className="font-bold text-slate-900">{attempt.seatNo || '—'}</span></span>
                 <span className="text-slate-600">CREDIT EARNED: <span className="font-bold text-slate-900">{attempt.earnedCredits || '—'}</span></span>
                 <span className="text-slate-600">SPI: <span className="font-bold text-slate-900">{attempt.spi || '—'}</span></span>
                 <span className="text-slate-600">GRADE POINT: <span className="font-bold text-slate-900">{attempt.gradePoints != null ? attempt.gradePoints : '—'}</span></span>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3 w-1/6">Course Code</th>
                  <th className="px-4 py-3 w-2/6">Course Title</th>
                  <th className="px-4 py-3 text-center w-1/6">Theory Credit</th>
                  <th className="px-4 py-3 text-center w-1/6">Theory Grade</th>
                  <th className="px-4 py-3 text-center w-1/6">Practical<br/>Credit & Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempt.subjects?.map((sub, i) => (
                  <tr key={i} className={cn("hover:bg-slate-50 transition-colors", isFail(sub.subGrade) ? 'bg-rose-50/50' : '')}>
                    <td className="px-4 py-2.5 font-mono text-slate-500 text-xs">{sub.code}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{sub.name || '—'}</td>
                    <td className="px-4 py-2.5 text-center font-semibold text-slate-600">
                      {sub.credits || '-'}
                    </td>
                    <td className={cn('px-4 py-2.5 text-center', gradeColor(sub.subGrade))}>
                      {sub.subGrade || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center font-medium text-slate-600">
                      {sub.vivaCredits != null && sub.vivaCredits > 0
                        ? <span className={gradeColor(sub.vivaGrade)}>{sub.vivaCredits} / {sub.vivaGrade || '-'}</span>
                        : <span className="text-slate-400">-</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Final certification */}
        {cgpa && (
          <div className="mt-12 bg-emerald-50/50 border border-emerald-100 p-6 rounded-lg text-center">
            <p className="font-semibold text-slate-800 leading-relaxed uppercase tracking-wide">
              THIS IS TO CERTIFY THAT <span className="font-bold text-emerald-800">{student.name}</span> HAS CLEARED HIS/HER {programme} WITH CGPA OF{' '}
              <span className="font-black text-emerald-700 text-lg mx-1">{cgpa}</span>
              {classLabel ? ` (CLASS: ${classLabel.toUpperCase()})` : ''}.
            </p>
          </div>
        )}

        {/* Signatures placeholder */}
        <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between px-8">
           <div className="text-center">
             <div className="w-48 border-b-2 border-slate-300 mb-2"></div>
             <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Verified By</p>
           </div>
           <div className="text-center">
             <div className="w-48 border-b-2 border-slate-300 mb-2"></div>
             <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Director's Signature</p>
           </div>
        </div>

      </div>
    </div>
  );
}

// ─── Search + Transcript Screen ───────────────────────────────────────────────
export default function TranscriptScreen({ students = [], onBack }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sort attempts by semNo for display
  const sortedAttempts = (s) =>
    [...(s.attempts || [])].sort((a, b) => semSortKey(a.semNo) - semSortKey(b.semNo));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      String(s.enrollmentNo || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [query, students]);

  const handleDownloadDocx = async () => {
    if (!selected) return;
    setIsGenerating(true);
    try {
      await generateTranscriptDocx(selected);
    } catch (error) {
      console.error("Error generating DOCX:", error);
      alert("Failed to generate DOCX file.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 font-medium bg-slate-100/50 hover:bg-slate-100 px-3 py-2 rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> 
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-600/10 p-1.5 rounded-md">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-bold tracking-tight text-slate-800 text-lg">Transcript Generator</span>
            </div>
          </div>
          
          {selected && (
            <button
              onClick={handleDownloadDocx}
              disabled={isGenerating}
              className="group flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg focus:ring-4 focus:ring-slate-900/10"
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
              )}
              {isGenerating ? 'Generating...' : 'Download .docx'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Search View */}
        {!selected && (
          <div className="max-w-xl mx-auto mt-4">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100/50">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-3">Generate Transcript</h1>
              <p className="text-slate-500 text-base">Search by student name or enrollment number to preview and export their transcript.</p>
            </div>

            {/* Interactive Search Bar */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                 <Search className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type name or enrollment no..."
                className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl text-base shadow-[0_2px_15px_rgb(0,0,0,0.04)] focus:shadow-[0_4px_25px_rgb(59,130,246,0.12)] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 outline-none transition-all"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results List */}
            {results.length > 0 && (
              <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden transform transition-all">
                {results.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelected(s); setQuery(''); }}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-blue-50/50 active:bg-blue-50 transition-colors border-b border-slate-100 last:border-0 text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                      {(s.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        <span className="font-mono text-slate-400">{s.enrollmentNo}</span>
                        {(() => {
                          const sorted = sortedAttempts(s);
                          const first  = sorted[0]?.semNo;
                          const last   = sorted[sorted.length - 1]?.semNo;
                          if (!first) return null;
                          return <span className="ml-2">· Sem {first}{last && last !== first ? ` → ${last}` : ''}</span>;
                        })()}
                      </p>
                    </div>
                    <span className={cn(
                      'ml-auto text-xs font-bold px-2.5 py-1 rounded-full shrink-0',
                      s.totalActiveBacklogs === 0 ? 'bg-emerald-100/80 text-emerald-700' : 'bg-rose-100/80 text-rose-700'
                    )}>
                      {s.totalActiveBacklogs === 0 ? 'Clear' : `${s.totalActiveBacklogs} Backlogs`}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {query.trim() && results.length === 0 && (
              <div className="mt-8 text-center px-4 py-8 bg-white border border-slate-200 border-dashed rounded-2xl">
                <p className="text-slate-500 text-sm font-medium">No student found matching <span className="text-slate-800 font-bold">"{query}"</span></p>
                <p className="text-slate-400 text-xs mt-1">Please try searching by a different name or enrollment number.</p>
              </div>
            )}
          </div>
        )}

        {/* Transcript Preview Area */}
        {selected && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
                    {(selected.name || '?')[0].toUpperCase()}
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{selected.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="font-mono text-slate-400">{selected.enrollmentNo}</span>
                      <span>·</span>
                      {(() => {
                        const sorted = sortedAttempts(selected);
                        const first  = sorted[0]?.semNo;
                        const last   = sorted[sorted.length - 1]?.semNo;
                        return <span>Sem {first}{last && last !== first ? ` → ${last}` : ''} ({sorted.length} Semesters)</span>;
                      })()}
                    </div>
                 </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium py-2 px-3 border border-slate-200 hover:border-slate-300 rounded-lg bg-white transition-all shadow-sm"
              >
                <Search className="w-4 h-4" /> New Search
              </button>
            </div>

            {/* The Document Visualizer */}
            <div className="relative">
               {/* Document Glow / Accent */}
               <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-xl opacity-50 rounded-[2rem] -z-10 pointer-events-none"></div>
               
               {/* Transcirpt UI Container */}
               <TranscriptPreview student={selected} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
