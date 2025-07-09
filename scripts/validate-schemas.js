#!/usr/bin/env node

/**
 * CI Script: Validate all JSON schemas in architecture/schemas/
 * 
 * This script:
 * 1. Loads all .schema.json files from architecture/schemas/
 * 2. Validates each schema against JSON Schema Draft-07
 * 3. Checks for required fields like $id, title, description
 * 4. Reports any validation errors or missing required fields
 * 
 * Usage: node scripts/validate-schemas.js
 */

import fs from 'fs'
import path from 'path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

// Initialize AJV with JSON Schema Draft-07
const ajv = new Ajv({ 
  allErrors: true, 
  strict: false,
  verbose: true 
})
addFormats(ajv)

// JSON Schema Draft-07 meta-schema for validation
const metaSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["$schema", "$id", "title", "description", "type"],
  "properties": {
    "$schema": { "type": "string", "format": "uri" },
    "$id": { "type": "string", "format": "uri" },
    "title": { "type": "string", "minLength": 1 },
    "description": { "type": "string", "minLength": 1 },
    "type": { "type": "string" }
  }
}

const validateMetaSchema = ajv.compile(metaSchema)

class SchemaValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.schemasValidated = 0
    this.schemasPassed = 0
  }

  validateSchemaFile(filePath) {
    const fileName = path.basename(filePath)
    console.log(`🔍 Validating ${fileName}...`)

    try {
      // Read and parse the schema file
      const content = fs.readFileSync(filePath, 'utf8')
      const schema = JSON.parse(content)

      // Validate against meta-schema
      const isValid = validateMetaSchema(schema)
      
      if (!isValid) {
        this.errors.push({
          file: fileName,
          errors: validateMetaSchema.errors
        })
        console.log(`❌ ${fileName} - FAILED meta-schema validation`)
        return false
      }

      // Additional checks
      this.performAdditionalChecks(fileName, schema)

      // Try to compile the schema with AJV
      try {
        ajv.compile(schema)
        console.log(`✅ ${fileName} - PASSED validation`)
        this.schemasPassed++
        return true
      } catch (compileError) {
        this.errors.push({
          file: fileName,
          errors: [{ message: `Schema compilation failed: ${compileError.message}` }]
        })
        console.log(`❌ ${fileName} - FAILED compilation`)
        return false
      }

    } catch (error) {
      this.errors.push({
        file: fileName,
        errors: [{ message: `File read/parse error: ${error.message}` }]
      })
      console.log(`❌ ${fileName} - FAILED file read/parse`)
      return false
    } finally {
      this.schemasValidated++
    }
  }

  performAdditionalChecks(fileName, schema) {
    // Check $id format
    if (schema.$id && !schema.$id.startsWith('https://sdk.openverifiable.org/schemas/')) {
      this.warnings.push({
        file: fileName,
        message: `$id should start with 'https://sdk.openverifiable.org/schemas/'`
      })
    }

    // Check for proper naming convention
    if (!fileName.match(/^[a-z-]+\.schema\.json$/)) {
      this.warnings.push({
        file: fileName,
        message: `Filename should follow kebab-case.schema.json convention`
      })
    }

    // Check for additionalProperties: false (security best practice)
    if (schema.type === 'object' && schema.additionalProperties !== false) {
      this.warnings.push({
        file: fileName,
        message: `Consider adding 'additionalProperties: false' for security`
      })
    }
  }

  validateAllSchemas() {
    const schemasDir = path.join(process.cwd(), 'architecture', 'schemas')
    
    if (!fs.existsSync(schemasDir)) {
      console.error(`❌ Schemas directory not found: ${schemasDir}`)
      process.exit(1)
    }

    const schemaFiles = fs.readdirSync(schemasDir)
      .filter(file => file.endsWith('.schema.json'))
      .map(file => path.join(schemasDir, file))

    if (schemaFiles.length === 0) {
      console.error(`❌ No .schema.json files found in ${schemasDir}`)
      process.exit(1)
    }

    console.log(`📁 Found ${schemaFiles.length} schema files to validate\n`)

    let allValid = true
    for (const schemaFile of schemaFiles) {
      if (!this.validateSchemaFile(schemaFile)) {
        allValid = false
      }
    }

    this.printReport()
    return allValid
  }

  printReport() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 SCHEMA VALIDATION REPORT')
    console.log('='.repeat(60))
    
    console.log(`\n📈 Summary:`)
    console.log(`   Schemas validated: ${this.schemasValidated}`)
    console.log(`   Schemas passed: ${this.schemasPassed}`)
    console.log(`   Schemas failed: ${this.schemasValidated - this.schemasPassed}`)

    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.errors.length}):`)
      this.errors.forEach(({ file, errors }) => {
        console.log(`\n   ${file}:`)
        errors.forEach(error => {
          console.log(`     - ${error.message || error}`)
        })
      })
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`)
      this.warnings.forEach(({ file, message }) => {
        console.log(`   ${file}: ${message}`)
      })
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`\n🎉 All schemas passed validation!`)
    }
  }
}

// Main execution
async function main() {
  console.log('🔧 Open Verifiable ID SDK - Schema Validation')
  console.log('='.repeat(50))

  const validator = new SchemaValidator()
  const success = validator.validateAllSchemas()

  if (!success) {
    console.log('\n❌ Schema validation failed. Please fix the errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ All schemas validated successfully!')
    process.exit(0)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Validation script failed:', error)
    process.exit(1)
  })
}

export { SchemaValidator } 