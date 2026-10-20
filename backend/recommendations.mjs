import { generateOutfits } from '../src/engine/index.js'
let raw = ''
for await (const chunk of process.stdin) raw += chunk
const input = JSON.parse(raw || '{}')
process.stdout.write(JSON.stringify(generateOutfits(input)))
