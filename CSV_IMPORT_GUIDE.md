# Data Import Feature Guide

## Overview
You can now import clients, suppliers, cities, and truck types via:
1. **CSV/Excel Upload** - Upload files from your computer (supports .csv, .xlsx, .xls)
2. **Redash Query Import** - Import directly from Redash query URLs

## How to Use

### Method 1: CSV/Excel Upload

#### 1. Clients Import
- Navigate to **Repositories → Clients**
- Click the **"Import CSV"** button
- Download the CSV template (columns: `name`, `code`)
- Fill in your data
- **Drag and drop** your file or click to browse (.csv, .xlsx, .xls supported)
- Review the preview (first 5 rows)
- Click "Upload"

#### 2. Suppliers Import
- Navigate to **Repositories → Suppliers**
- Click the **"Import CSV"** button
- Template columns: `name`, `code`
- Drag and drop or upload your file

#### 3. Cities Import
- Navigate to **Repositories → Cities**
- Click the **"Import CSV"** button
- Template columns: `name`, `code`, `region`
- Drag and drop or upload your file

#### 4. Truck Types Import
- Navigate to **Repositories → Truck Types**
- Click the **"Import CSV"** button
- Template columns: `name`
- Drag and drop or upload your file

### Method 2: Redash Query Import

#### Quick Import from Redash
- Navigate to any repository page (Clients, Suppliers, Cities, or Truck Types)
- Click the **"Import from Redash"** button
- Select the entity type you want to import
- Paste your Redash CSV API URL (must include `?api_key=...`)
- Click "Import from Redash"
- Wait for the import to complete

**Example Redash URLs:**
- Clients: `https://redash.trella.co/api/queries/4846/results.csv?api_key=YOUR_KEY`
- Suppliers: `https://redash.trella.co/api/queries/4845/results.csv?api_key=YOUR_KEY`

## File Format Support

### Supported File Types
- **CSV** (.csv) - Comma-separated values
- **Excel** (.xlsx, .xls) - Microsoft Excel spreadsheets
- **Redash CSV API** - Direct import from Redash query results

### CSV/Excel Format

#### Clients & Suppliers
```csv
name,code
Aramco,ARM
SABIC,SAB
Al Rajhi Bank,ARB
```

#### Cities
```csv
name,code,region
Riyadh,RUH,Central
Jeddah,JED,Western
Dammam,DMM,Eastern
```

#### Truck Types
```csv
name
Flatbed
Curtain Side
Reefer
Closed Flatbed
```

## Redash Integration

### Direct Import (Recommended)
Instead of downloading CSV files from Redash and uploading them, you can now import directly:

1. Click **"Import from Redash"** on any repository page
2. Select entity type (clients, suppliers, cities, truck-types)
3. Paste the Redash CSV API URL
4. Click "Import from Redash"

The system will:
- Fetch the CSV directly from Redash
- Parse the data automatically
- Handle column mapping (supports various column names)
- Import into your organization

### Getting the Redash CSV URL
1. Open your query in Redash
2. Click **"Export"** → **"Copy CSV API URL"**
3. The URL should look like: `https://redash.example.com/api/queries/1234/results.csv?api_key=...`
4. Paste this URL into the Redash Import dialog

### Supported Column Names
The importer automatically detects these column names:
- **Name**: `name`, `shipper_name`, `supplier_name`, `client_name`, `city_name`
- **Code**: `code`, `shipper_code`, `supplier_code`
- **Region**: `region` (for cities only)

## Features

✅ **Multiple File Formats**: Supports CSV, XLSX, and XLS files
✅ **Drag & Drop**: Drag files directly into the upload area
✅ **Redash Integration**: Import directly from Redash query URLs
✅ **Duplicate Detection**: Skips records that already exist
✅ **Error Handling**: Shows detailed error messages for invalid rows
✅ **Preview**: Shows first 5 rows before uploading (CSV/Excel upload)
✅ **Bulk Import**: Upload hundreds of records at once
✅ **Template Download**: Get the correct CSV format with one click
✅ **Flexible Column Mapping**: Automatically detects various column names
✅ **Progress Tracking**: See how many records were created/skipped
✅ **Organization Scoped**: All imported data is automatically assigned to your organization

## Import Results

After uploading, you'll see a summary:
- **Created**: Number of new records added
- **Skipped**: Number of duplicates or invalid records
- **Errors**: Detailed list of any issues with specific rows

## API Endpoints

### CSV/Excel Import
- `POST /api/clients/import` - Import clients from uploaded file
- `POST /api/suppliers/import` - Import suppliers from uploaded file
- `POST /api/cities/import` - Import cities from uploaded file
- `POST /api/truck-types/import` - Import truck types from uploaded file

### Redash Import
- `POST /api/admin/import-from-redash` - Import from Redash query URL
  - Parameters: `queryUrl`, `entityType` (clients/suppliers/cities/truck-types)

## Example: Import 737 Clients

### Option A: Direct Redash Import (Faster)
1. Go to Repositories → Clients
2. Click "Import from Redash"
3. Select entity type: "Clients"
4. Paste Redash CSV URL: `https://redash.trella.co/api/queries/4846/results.csv?api_key=...`
5. Click "Import from Redash"
6. Wait for completion (usually < 10 seconds for 737 records)
7. Check results: "Created: 737, Skipped: 0"

### Option B: CSV/Excel Upload
1. Download CSV from Redash or prepare Excel file
2. Go to Repositories → Clients
3. Click "Import CSV"
4. Drag and drop your file (CSV, XLSX, or XLS)
5. Review preview
6. Click "Upload"
7. Check results

## Notes

### File Upload
- Supports CSV (.csv), Excel (.xlsx, .xls) formats
- Drag and drop or click to browse
- Parser is forgiving - handles different column orders and extra columns
- Shows preview of first 5 rows before import

### Redash Import
- Fetches data directly from Redash - no download needed
- Automatically handles various column names
- Requires valid Redash CSV API URL with API key
- Faster than downloading and re-uploading

### General
- Required fields are clearly marked in templates
- All imports are audited in system logs
- Imports are transactional - one row failure won't affect others
- Duplicates are automatically skipped
- You can safely re-run imports
