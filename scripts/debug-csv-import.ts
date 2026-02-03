import Papa from 'papaparse'

async function debugCsvImport(url: string, entityType: string) {
  console.log('\n' + '='.repeat(60))
  console.log(`Debugging ${entityType} CSV import`)
  console.log(`URL: ${url.substring(0, 80)}...`)
  console.log('='.repeat(60))
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error('Failed to fetch CSV:', response.statusText)
      return
    }
    
    const csvText = await response.text()
    console.log('\nFirst 500 characters of CSV:')
    console.log(csvText.substring(0, 500))
    console.log('...\n')
    
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Total rows:', results.data.length)
        console.log('\nColumn headers found:')
        if (results.meta && results.meta.fields) {
          results.meta.fields.forEach((field: string, i: number) => {
            console.log(`  ${i + 1}. "${field}"`)
          })
        }
        
        console.log('\nFirst 3 rows of data:')
        results.data.slice(0, 3).forEach((row: any, i: number) => {
          console.log(`\nRow ${i + 1}:`)
          Object.entries(row).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`)
          })
        })
        
        const firstRow = results.data[0] as Record<string, unknown>
        const possibleNameColumns = [
          'name', 'Name', 'shipper_name', 'supplier_name', 
          'partner_entity_name', 'partner_name', 'city_name', 'truck_type'
        ]
        
        console.log('\nLooking for name column...')
        let foundNameColumn = false
        for (const col of possibleNameColumns) {
          if (firstRow[col]) {
            console.log(`Found name in column: "${col}" = "${firstRow[col]}"`)
            foundNameColumn = true
            break
          }
        }
        
        if (!foundNameColumn) {
          console.log('No name column found!')
          console.log('Available columns:', Object.keys(firstRow).join(', '))
        }
      },
      error: (error: any) => {
        console.error('Parse error:', error)
      }
    })
  } catch (error) {
    console.error('Error:', error)
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: npx tsx scripts/debug-csv-import.ts <csv-url>')
    process.exit(1)
  }
  
  const url = process.argv[2]
  const entityType = process.argv[3] || 'Data'
  
  await debugCsvImport(url, entityType)
}

main()
