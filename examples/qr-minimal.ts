#!/usr/bin/env tsx

import QRCode from 'qrcode'
import { writeFileSync } from 'fs'
import { join } from 'path'

const text = 'Hello World! This is a readable QR code.'
console.log('Generating minimal QR code for:', text)

QRCode.toString(text, { type: 'svg' }, (err, svg) => {
  if (err) throw err
  writeFileSync(join(process.cwd(), 'test-results', 'minimal-hello-world.svg'), svg)
  console.log('✅ Minimal QR code saved as test-results/minimal-hello-world.svg')
}) 