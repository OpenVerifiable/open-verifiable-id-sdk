import fs from 'fs'
import path from 'path'
import Ajv, { ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'

// Initialise a single AJV instance for the whole SDK
const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

/**
 * Validate arbitrary data against one of the JSON-Schemas inside
 * architecture/schemas/.
 *
 * @param schemaFileName file name such as `credential-template.schema.json`
 * @param data           object to validate
 * @throws Error if validation fails (message contains formatted errors)
 */
export function validateWithSchema (schemaFileName: string, data: unknown): void {
  const rootDir = process.cwd() // repo root when tests run via npm scripts
  const schemaPath = path.join(rootDir, 'architecture', 'schemas', schemaFileName)

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`)
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))

  // Cache compiled validators on the AJV instance to avoid recompilation
  const key = schema.$id || schemaPath
  let validateFn = ajv.getSchema(key)
  if (!validateFn) {
    validateFn = ajv.compile(schema)
  }

  const valid = validateFn(data)
  if (!valid) {
    const errText = ajv.errorsText(validateFn.errors as ErrorObject[] | null, { separator: '\n' })
    throw new Error(`Validation failed for ${schemaFileName}:\n${errText}`)
  }
} 