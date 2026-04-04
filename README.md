# Student Backlog Tracking System (BLTS)

A client-side web application for visualizing and tracking student backlogs from university result sheets. Designed for faculty, HODs, and academic administrators.

## Overview

Universities maintain student result data in flat Excel/CSV sheets. This tool lets you upload multiple result files across exam attempts and instantly get:

- **Interactive dashboards** with KPIs, charts, and quick actions
- **Filterable student directory** searchable by name, enrollment, branch, status, and SPI range
- **Detailed student reports** with a full academic journey timeline, subject-wise backlog tracker, and performance history
- **Provisional marksheets** generated per semester, print-ready in A4 format
- **Excel exports** — full result tabulation, backlog summaries, and master reports

All processing happens in the browser. **No data is sent to any server.**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 (Vite) |
| Routing | React Router v7 (HashRouter) |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Excel Parsing | SheetJS (xlsx) |
| Excel Export | ExcelJS |
| Fonts | Inter, IBM Plex Mono (Google Fonts) |

## Features

### File Upload
- Multi-file drag-and-drop upload
- Supports `.xlsx`, `.xls`, and `.csv` files
- Auto-detects file roles: **Official Result (OR)**, **Pass Markfeed**, **Fail Markfeed**
- Chronologically sorts attempts and merges student data across files

### Dashboard
- KPI cards: total students, clear, backlog, detained, average SPI
- Status distribution pie chart and backlog bar chart
- Quick-action navigation tiles with live counts
- Full data export (Excel with Result Tabulation + Backlog Summary + Stats)

### Student Directory
- Real-time search by name or enrollment number
- Filters: student status, backlog type (External/Internal/Pra-Viva), branch, semester, SPI range
- Dynamic filter counts that update as you drill down
- Print and Excel export of the current filtered view

### Student Report (Academic Journey)
- Profile header with metadata, status badge, and summary pills
- Expandable accordion cards for each exam attempt
- Subject marks grid with grade highlighting and backlog indicators
- Provisional marksheet download button per attempt
- Cross-attempt subject history tracker table
- Source file audit panel

### Provisional Marksheet
- Professional A4-format HTML marksheet
- Includes student info, subject-wise marks, grades, SPI, and result
- Opens in a new window for printing

### Data Persistence
- Parsed student data is cached in `sessionStorage`
- Surviving page refresh — no need to re-upload files within the same browser session
- URL-based student reports (`#/report/:enrollmentNo`) — bookmarkable and shareable

## Architecture

```
Browser Only — Zero Backend — Zero Database
```

```
Upload Files  →  fileParser.js  →  studentBuilder.js  →  React State + sessionStorage
                  (read + role        (assemble              ↓
                   detection)          students)       Dashboard / Search / Report
                                                              ↓
                                                      exportUtils.js / masterExport.js
                                                      (Excel, CSV, Marksheet)
```

### Project Structure

```
BLTS/src/
├── main.jsx                          # App entry point (HashRouter)
├── App.jsx                           # Routes + state management + session persistence
├── index.css                         # Global styles, Tailwind directives, print styles
│
├── components/
│   ├── UploadScreen.jsx              # Multi-file drag-and-drop upload
│   ├── DashboardScreen.jsx           # KPI dashboard with charts and quick actions
│   ├── EnhancedSearchScreen.jsx      # Filterable student directory table
│   ├── ui/
│   │   └── StatusBadge.jsx           # Reusable status badge component
│   └── JourneyReport/
│       ├── JourneyReport.jsx         # Student report page (main container)
│       ├── AttemptCard.jsx           # Expandable accordion per exam attempt
│       ├── SubjectGrid.jsx           # Subject marks table inside accordion
│       ├── BacklogTracker.jsx        # Cross-attempt subject history table
│       ├── FileAuditPanel.jsx        # Source file audit accordion
│       └── shared.jsx                # Shared UI primitives (GradeBox, ResultChip, etc.)
│
├── services/
│   ├── fileParser.js                 # File reading, role detection, subject extraction
│   └── studentBuilder.js             # Multi-file student assembly pipeline
│
└── utils/
    ├── cn.js                         # Shared Tailwind class merge utility (cn)
    ├── exportUtils.js                # Excel/CSV export + Provisional Marksheet generator
    └── masterExport.js               # Master tabulation export (Dashboard)
```

## Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/Aayush14Shah/BackLogTrackingSystem.git
cd BackLogTrackingSystem/BLTS

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

The output will be in the `dist/` directory — a fully static site that can be hosted anywhere (GitHub Pages, Netlify, Vercel, etc.).

## Usage

1. **Upload files**: Drag and drop your OR, Pass Markfeed, and Fail Markfeed files (CSV or XLSX).
2. **View Dashboard**: See overall batch statistics and quick-action buttons.
3. **Search Students**: Use the student directory to filter and find specific students.
4. **View Reports**: Click on any student to see their full academic journey.
5. **Download Marksheets**: Click the "Marksheet" button on any exam attempt to generate a printable provisional marksheet.
6. **Export Data**: Use the export buttons to download Excel reports.

## Privacy

This application runs entirely in the browser. **No student data is uploaded to, stored on, or transmitted to any external server.** All file parsing, data processing, and report generation happens locally on your machine.

## License

This project is for academic and institutional use.