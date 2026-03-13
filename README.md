# Student Backlog Tracker

A focused, lightweight single-page web application for visualizing student backlogs from Excel-based university result sheets.

## Overview
The university currently maintains student result data in flat, denormalized Excel sheets. This application allows an Admin or HOD to upload the Excel result sheet and instantly view a clean, interactive, and printable backlog report for any individual student, covering their current academic status and full backlog history across all semesters.

## Tech Stack
- **UI Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS 3
- **Excel Parsing**: SheetJS (xlsx)
- **Deployment**: Static site deployment (runs fully in the browser)

## Core Features (MVP)
1. **Excel File Upload**: Drag-and-drop or file browser upload for `.xlsx` files. Data is parsed entirely in the browser.
2. **Student Search**: Instant search by student name or enrollment number.
3. **Student Profile Card**: Displays basic student info with a prominent PASS / BACKLOG / DETAINED status badge.
4. **Subject Marks Table**: Shows Theory, Mid-Sem, Viva marks, and Grades for each subject.
5. **Backlog History Panel**: Lists every backlog subject historically.
6. **SPI / CPI Summary**: Tracks semester-wise performance.
7. **Print / Export PDF**: Print-ready layout via the browser's print dialog.

## Architecture & Data Flow
This is a standard client-side only React Web Application. There is **no backend server and no database** required for the MVP.
- **Privacy First**: Data never leaves the browser. 
- **Parsing logic**: SheetJS reads the ArrayBuffer, converts to JSON, normalizes the rows by grouping subject columns, flags backlogs based on grades/marks, and stores the processed mapping in React state.

## Setup Instructions
*(Project initialization in progress)*