const { generateOutfits } = await import(new URL('../frontend/src/engine/index.js', import.meta.url).href)
let raw = ''
for await (const chunk of process.stdin) raw += chunk
const input = JSON.parse(raw || '{}')
process.stdout.write(JSON.stringify(generateOutfits(input)))
