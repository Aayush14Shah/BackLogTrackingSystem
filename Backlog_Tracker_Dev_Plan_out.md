__Student Backlog Tracker__

*UI/UX & Development Plan*

__3 Screens__

Upload ┬╖ Search ┬╖ Report

__8 Features__

MVP scope

__React \+ Tailwind__

No backend needed

__01__

__Project Overview__

A single\-page React application\. The admin uploads an Excel result sheet, searches for any student by name or enrollment number, and immediately sees a detailed, colour\-coded backlog report ΓÇö with print support\. No backend\. No login\. No database\.

__Layer__

__Choice__

__Note__

UI

React 18 \+ Vite

Fast dev build; component\-driven

Styling

Tailwind CSS 3

Utility classes; easy responsive \+ print styles

Excel Parser

SheetJS \(xlsx\)

Reads \.xlsx in browser; no server upload

Charts

Recharts

SPI/CPI trend line; optional but low effort

PDF / Print

Browser @media print CSS

No extra library; clean A4 output

Deploy

Vercel / Netlify free tier

Static build; one command deploy

__02__

__Feature List__

All 8 MVP features\. Each has a single, clear responsibility\.

__ID__

__Feature__

__What it does__

F1

Excel Upload

Drag\-and\-drop or click to browse\. SheetJS parses the file in the browser\. Parsed data stored in React state\.

F2

Student Search

Instant search input\. Filters students by name or enrollment number on every keystroke\. Shows matched list as a dropdown\.

F3

Profile Card

Displays name, enrollment no\., branch, semester\. Large CLEAR / BACKLOG / DETAINED badge ΓÇö green / amber / red\.

F4

Academic Summary Bar

Row of stat chips: Current SPI ┬╖ CPI ┬╖ Total Backlogs ┬╖ Active Backlogs\. Colour\-coded values\.

F5

Subject Marks Table

Per\-semester table: Subject Code, Name, Credits, Theory/70, Mid\-Sem/30, Viva/50, Grade, GP\. Failing rows highlighted red; passing rows in soft green\.

F6

Backlog History Panel

Lists every failed subject ever: which semester, marks, grade, status \(Active/Cleared\)\. Grouped by semester\.

F7

Print / Export

Browser print dialog triggered by a button\. CSS print stylesheet hides nav/search; formats the report for A4\.

F8

Reset / Change File

Button to clear state and return to the upload screen for a new file\.

__03__

__Screen 1 ΓÇö Upload__

## __Layout__

- Full\-viewport centred column\. Light grey background \(\#F9FAFB\)\.
- Top: App name "Student Backlog Tracker" in bold navy, one\-line tagline below it in grey\.
- Centre: Large upload card \(white, rounded, shadow, dashed border\)\. Icon \+ primary text \+ sub\-text inside\.
- Bottom of card: Supported format note ΓÇö "Accepts \.xlsx files only"\.

## __UX Behaviour__

- __Idle state: __dashed border in mid\-grey, grey icon, grey label\.
- __Drag hover: __border turns blue, background tints light blue, icon animates upward ΓÇö gives clear drag target feedback\.
- __File selected \(click or drop\): __card shows filename \+ file size \+ a green tick icon\. A 'Load Results' button appears below\.
- __Parsing: __spinner \+ 'Reading fileΓÇª' message replaces the button\. Takes < 1 second for typical files\.
- __Error \(wrong format / corrupt\): __red border, red error message inline ΓÇö 'Could not read file\. Please check the format\.' No page reload\.
- __Success: __app transitions to the Search screen\. No full page reload ΓÇö React state update only\.

__Key UI Rules for Upload Screen__

Never show a generic file input button ΓÇö the whole card is the click/drop target\.

Error messages appear inside the card, not as browser alerts\.

No submit button until a valid file is chosen\.

__04__

__Screen 2 ΓÇö Student Search__

## __Layout__

- Persistent top bar \(white, bottom border\): app name on left, filename chip \+ 'Change File' ghost button on right\.
- Below bar: full\-width search input with magnifier icon inside, placeholder text 'Search by name or enrollment no\.'
- Below input: results list ΓÇö each row shows student name \(bold\), enrollment no\. \+ branch in grey, and a small coloured backlog\-count badge on the right\.
- If no file loaded yet: input is disabled with a helper message 'Upload a file to search'\.

## __UX Behaviour__

- __Typing: __list filters instantly \(no debounce needed ΓÇö data is in memory\)\. Shows up to 10 results; scroll for more\.
- __Backlog badge: __green '0 backlogs' or amber '2 backlogs' or red '4\+ backlogs' ΓÇö HOD sees severity before clicking\.
- __Clicking a result: __navigates to the Report screen with that student's data\. Search input value persists so user can return and pick another\.
- __Empty state: __'No students match' message with a small illustration ΓÇö never a blank white space\.
- __'Change File' button: __triggers a confirm dialog ΓÇö 'This will clear the current data\. Continue?' ΓÇö then resets to the Upload screen\.
- __Keyboard: __arrow keys move through the results list; Enter selects; Escape clears the search input\.

__Key UI Rules for Search Screen__

Search must filter on both name AND enrollment number simultaneously\.

The backlog badge is the most important glance\-able info ΓÇö always visible without clicking\.

Never show a loading spinner here ΓÇö all filtering is synchronous in\-memory\.

__05__

__Screen 3 ΓÇö Student Report__

## __Layout ΓÇö Top to Bottom__

__Zone__

__Contents__

__Height / Size__

A ΓÇö Report Bar

'ΓåÉ Back to Search' link on left\. 'Print Report' button \(blue\) on right\.

Slim, 48px

B ΓÇö Profile Card

Name \(large\), Enrollment No\., Branch, Semester\. STATUS BADGE: CLEAR \(green\) / BACKLOG n \(amber\) / DETAINED \(red\)\.

~100px

C ΓÇö Summary Chips

4 chips in a row: SPI value | CPI value | Total Backlogs | Active Backlogs\. Each chip: label \+ large number \+ colour\.

~72px

D ΓÇö Semester Tabs

One tab per semester \(Sem 1, Sem 2 ΓÇª Sem N\)\. Clicking a tab shows that semester's subject table below\.

Tab bar ~44px

E ΓÇö Subject Table

For the selected tab: Subject Code | Name | Credits | Theory/70 | Mid/30 | Viva/50 | Grade | GP\. Failing rows in red tint; passing rows in green tint\.

Scrollable

F ΓÇö Backlog History

Collapsible panel at bottom\. Title row shows total backlog count\. Expanded: table of all backlogs grouped by semester\.

Collapsible

## __UX Behaviour__

- __Status badge: __immediately communicates the student's state\. Coloured background ΓÇö green/amber/red ΓÇö high contrast, large font\.
- __Semester tabs: __default opens to the most recent semester\. Clicking switches the subject table without any reload or scroll jump\.
- __Subject table rows: __failing subjects \(Grade = FF or GP = 0\) get a red background tint and a small 'Γ£ù Backlog' pill\. Passing subjects get a subtle green tint\.
- __Backlog History panel: __collapsed by default to keep the page uncluttered\. Expanded via a chevron toggle\. Shows a clear 'Active' \(amber\) or 'Cleared' \(grey/green\) pill per row\.
- __'ΓåÉ Back to Search': __returns to Search screen with the previous search term still in the input ΓÇö no extra clicks needed to find the next student\.
- __Print: __clicking 'Print Report' calls window\.print\(\)\. CSS hides zones A \(report bar\) and the search bar\. Profile card \+ chips \+ all semester tables print on A4\.
- __Empty semesters: __if a semester tab has no data, it shows 'No results uploaded for this semester' ΓÇö never crashes or shows an empty table\.

__Key UI Rules for Report Screen__

Status badge must be the first thing the eye lands on ΓÇö largest, highest\-contrast element on the page\.

Red rows in the subject table must be immediately obvious ΓÇö background colour, not just a text colour change\.

Print output must require zero configuration from the user ΓÇö one click, clean A4\.

__06__

__Data Parsing & Backlog Logic__

## __Excel ΓåÆ App State \(5 Steps\)__

- __1\. Read: __SheetJS converts the \.xlsx ArrayBuffer into a JSON array of row objects\. Column headers become object keys\.
- __2\. Unpack subjects: __for each row, loop i = 1ΓÇª8 over SubCode0i, SubName0i, SubCredit0i, SubThryMrk0i, SubMidMrk0i, SubVivaMrk0i, SubGrade0i, SubGP0i\. Each non\-empty group ΓåÆ one subject object\.
- __3\. Group by student: __rows are keyed by EnrollmentNo\. Multiple rows for the same student \(different semesters\) are merged into one student record with a semesters array\.
- __4\. Flag backlogs: __a subject is a backlog if SubjectGrade === 'FF' OR GradePoint === 0\. This rule lives in a single config object ΓÇö easy to change\.
- __5\. Store: __the processed map \(enrollmentNo ΓåÆ studentObject\) is set in React state\. All search and display is driven from this object\.

## __Status Determination__

__Status__

__Condition__

__Badge Colour__

CLEAR

Active backlogs = 0

Green

BACKLOG

Active backlogs ΓëÑ 1

Amber

DETAINED

Active backlogs ΓëÑ threshold \(configurable, e\.g\. 4\)

Red

__07__

__Component Structure__

Flat, simple structure ΓÇö no over\-engineering for this scope\.

__Component__

__Responsibility__

<App />

Top\-level state \(parsed data, active screen, selected student\)\. Renders the correct screen\.

<UploadScreen />

Drag\-and\-drop zone, file validation, calls SheetJS parser, calls App's onDataLoaded callback\.

<SearchScreen />

Search input \+ filtered results list\. Calls App's onStudentSelect callback\.

<ReportScreen />

Receives one student object\. Renders Profile, Chips, Tabs, SubjectTable, BacklogHistory\.

<ProfileCard />

Name, enrollment, branch, semester, status badge\. Pure display component\.

<SummaryChips />

4 stat chips\. Derives values from the student object prop\.

<SemesterTabs />

Tab bar\. Manages active tab index in local state\.

<SubjectTable />

Receives a subjects array\. Renders the marks table with conditional row colours\.

<BacklogHistory />

Receives backlogs array\. Collapsible\. Groups by semester\.

<SearchResult />

Single row in the search dropdown\. Shows name, enrollment, backlog badge\.

__08__

__Future Scope__

Ordered by value\-to\-effort ratio\. None of these block the MVP\.

__Priority__

__Feature__

__Why it matters__

P1 ΓÇö Easy

Filter by semester / subject status

Lets HOD see only active backlogs; reduces noise in large datasets

P1 ΓÇö Easy

Sort columns in subject table

Click Grade or GP column header to find weakest subjects instantly

P1 ΓÇö Easy

SPI/CPI trend mini\-chart

Line chart per student across semesters ΓÇö shows improvement or decline at a glance

P2 ΓÇö Medium

Multi\-file upload \(merge semesters\)

Upload separate semester files; app merges into one timeline per student

P2 ΓÇö Medium

Class\-wide backlog dashboard

Aggregate: how many students have 0/1/2/3\+ backlogs; which subjects fail most

P2 ΓÇö Medium

CSV/Excel export of backlog report

Download the current student's backlog table as a \.xlsx for record\-keeping

P3 ΓÇö Larger

Configurable grading rules UI

Admin\-facing settings panel to adjust 'FF' detection rules without touching code

P3 ΓÇö Larger

Backend \+ persistent storage

PostgreSQL \+ Node\.js; enables multi\-user access, login, history across years

P4 ΓÇö Big

Student self\-service portal

Students log in with enrollment no\. to view their own report; no admin needed

__Recommended build order__

Step 1 ΓÇö Build and validate the 3\-screen MVP \(Upload, Search, Report\)\.

Step 2 ΓÇö Add filters, sort, and mini SPI/CPI chart \(all client\-side, low risk\)\.

Step 3 ΓÇö Add class\-wide dashboard and export features\.

Step 4 ΓÇö Introduce a backend only if multi\-user or persistent history becomes a real need\.

