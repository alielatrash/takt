# Quick Start Guide - Data Import

## Three Ways to Import Data

### 1. 📁 Drag & Drop CSV/Excel

**Fastest for local files**

1. Navigate to any repository page:
   - Repositories → Clients
   - Repositories → Suppliers
   - Repositories → Cities
   - Repositories → Truck Types

2. Click **"Import CSV"** button

3. Drag your file into the upload area
   - Supports: .csv, .xlsx, .xls
   - Or click to browse

4. Review preview (first 5 rows)

5. Click **"Upload"**

6. Done! View results summary

### 2. 🔗 Redash Direct Import

**Fastest for Redash users - No download needed!**

1. Navigate to any repository page

2. Click **"Import from Redash"** button

3. Select entity type from dropdown:
   - Clients
   - Suppliers
   - Cities
   - Truck Types

4. Paste your Redash CSV URL:
   ```
   https://redash.trella.co/api/queries/XXXX/results.csv?api_key=YOUR_KEY
   ```

5. Click **"Import from Redash"**

6. Done! Data imported directly

### 3. 📥 Download Template

**Best for creating new data**

1. Click **"Import CSV"** button

2. Click **"Download Template"**

3. Open in Excel/Sheets

4. Fill in your data

5. Save and upload

## Example: Import Your Redash Data

### For Clients (737 records)
```
1. Go to: Repositories → Clients
2. Click: "Import from Redash"
3. Select: "Clients"
4. Paste: https://redash.trella.co/api/queries/4846/results.csv?api_key=ZR5ljs1fWvwAUkiS4nQ36M71qdHtWcmxzfBxI9Kc
5. Click: "Import from Redash"
6. Wait ~5 seconds
7. See: "Created: 737, Skipped: 0"
```

### For Suppliers (660 records)
```
1. Go to: Repositories → Suppliers
2. Click: "Import from Redash"
3. Select: "Suppliers"
4. Paste: https://redash.trella.co/api/queries/4845/results.csv?api_key=FiKfue3L7xQ8Vc6VaPWvARVBY4cx9fMyza48cQls
5. Click: "Import from Redash"
6. Wait ~5 seconds
7. See: "Created: 660, Skipped: 0"
```

## Supported File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| CSV | .csv | Standard comma-separated values |
| Excel (Modern) | .xlsx | Excel 2007 and later |
| Excel (Legacy) | .xls | Excel 97-2003 |
| Redash | URL | Direct import from Redash API |

## Required Columns

### Clients & Suppliers
- **name** (required) - Entity name
- **code** (optional) - Short code/identifier

### Cities
- **name** (required) - City name
- **code** (optional) - City code (e.g., RUH, JED)
- **region** (optional) - Region (e.g., Central, Western)

### Truck Types
- **name** (required) - Truck type name (e.g., Flatbed, Curtainside)

## Tips & Tricks

### ✅ Automatic Column Detection
Don't worry about exact column names! The system automatically detects:
- `name`, `Name`, `shipper_name`, `supplier_name`, `client_name`
- `code`, `Code`, `shipper_code`, `supplier_code`

### ✅ Duplicate Protection
If a record already exists (same name), it will be skipped automatically. Safe to re-run imports!

### ✅ Error Reporting
If some rows fail, you'll see exactly which rows and why:
```
Row 5: Name is required
Row 12: Supplier "ACME" already exists
Row 18: Invalid code format
```

### ✅ Preview Before Import
CSV/Excel uploads show you the first 5 rows so you can verify the data before importing.

## Troubleshooting

### "Invalid file format"
- Make sure file is .csv, .xlsx, or .xls
- Check file isn't corrupted
- Try opening in Excel to verify

### "Failed to fetch from Redash"
- Verify URL includes `?api_key=...`
- Check API key is valid
- Ensure query has run successfully in Redash

### "Name is required"
- Check your CSV has a name column
- Verify column isn't empty
- Try the template for correct format

### Import is slow
- Large files (1000+ rows) may take 10-20 seconds
- Wait for the progress indicator
- Don't close the dialog during import

## Quick Reference

| Task | Button | File Type | Time |
|------|--------|-----------|------|
| Import local CSV | "Import CSV" | .csv | ~5 sec |
| Import Excel file | "Import CSV" | .xlsx/.xls | ~5 sec |
| Import from Redash | "Import from Redash" | URL | ~5 sec |
| Download template | "Download Template" | .csv | Instant |

## Getting Redash CSV URL

1. Open your query in Redash
2. Click **"Export"** dropdown
3. Select **"Copy CSV API URL"**
4. Paste into Takt import dialog

The URL format should be:
```
https://redash.example.com/api/queries/1234/results.csv?api_key=xxxxx
```

## Video Tutorials (Coming Soon)

- [ ] CSV Drag & Drop Import
- [ ] Excel File Import
- [ ] Redash Direct Import
- [ ] Template Usage

## Need Help?

- Check [CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md) for detailed documentation
- Check [README.md](./README.md) for full application documentation
- Contact support team

---

Happy importing! 🚀
