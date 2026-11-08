import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

// Manual visual check against an isolated, synthetic fixture. Never uses the user's Chrome profile.
const output = await mkdtemp(join(tmpdir(), 'resolvai-detail-browser-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${join(output, 'profile')}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' })
let socket
let messageId = 0
const pending = new Map()
function call(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++messageId
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)) }, 10000)
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value) }, reject: error => { clearTimeout(timeout); reject(error) } })
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
}

try {
  let port
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number((await readFile(join(output, 'profile', 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break } catch { await delay(100) }
  }
  assert.ok(port, 'the isolated browser must start')
  const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  socket = new WebSocket(info.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    const operation = pending.get(message.id)
    if (!operation) return
    pending.delete(message.id)
    if (message.error) operation.reject(new Error(JSON.stringify(message.error)))
    else operation.resolve(message.result)
  })
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true })
  await call('Page.enable', {}, sessionId)
  const evaluate = async expression => (await call('Runtime.evaluate', { expression, returnByValue: true }, sessionId)).result.value
  for (const { name, width, height, mobile } of [
    { name: 'desktop', width: 1732, height: 1050, mobile: false },
    { name: 'mobile', width: 390, height: 1000, mobile: true },
  ]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor: 1 }, sessionId)
    await call('Page.navigate', { url: 'http://localhost:5173/tests/fixtures/opportunity-detail.html?id=20000000-0000-4000-8000-000000000001' }, sessionId)
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate('document.body?.dataset.previewReady === "true"')) { ready = true; break }
      await delay(100)
    }
    assert.ok(ready, `${name} must render the real detail component`)
    const metrics = await evaluate('({width:innerWidth,contentWidth:document.documentElement.scrollWidth,client:document.querySelector(".request-client-identity strong")?.textContent,content:document.body.innerText})')
    assert.equal(metrics.width, width)
    assert.ok(metrics.contentWidth <= width, `${name} must have no horizontal overflow`)
    assert.equal(metrics.client, 'Cliente de teste')
    assert.doesNotMatch(metrics.content, /Análise de Compatibilidade|92%/)
    const layout = await call('Page.getLayoutMetrics', {}, sessionId)
    const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.ceil(layout.cssContentSize.height), scale: 1 } }, sessionId)
    await writeFile(join(output, `${name}.png`), Buffer.from(screenshot.data, 'base64'))
    await evaluate('document.querySelector(".request-photo").click()')
    assert.equal(await evaluate('document.querySelector("dialog")?.open'), true, 'photo preview opens')
    await evaluate('document.querySelector(".request-photo-close").click()')
    assert.equal(await evaluate('document.querySelector("dialog") === null'), true, 'photo preview closes')
    console.log(JSON.stringify({ name, viewport: width, contentWidth: metrics.contentWidth, photoPreview: 'passed', screenshot: join(output, `${name}.png`) }))
    await call('Page.navigate', { url: 'http://localhost:5173/tests/fixtures/opportunity-detail.html?screen=proposal&id=20000000-0000-4000-8000-000000000001' }, sessionId)
    let proposalReady = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate('!!document.querySelector(".send-proposal-layout") && document.body.dataset.previewReady === "true"')) { proposalReady = true; break }
      await delay(100)
    }
    assert.ok(proposalReady, `${name} proposal form must render`)
    const proposalMetrics = await evaluate('({width:innerWidth,contentWidth:document.documentElement.scrollWidth,content:document.body.innerText,back:document.querySelector(".send-proposal-back").getAttribute("href")})')
    assert.ok(proposalMetrics.contentWidth <= width, `${name} proposal form must not overflow`)
    assert.match(proposalMetrics.content, /Infiltração no Banheiro/)
    assert.match(proposalMetrics.content, /Fornecedor de teste/)
    assert.doesNotMatch(proposalMetrics.content, /Dica.*IA|Sugestão.*IA|Carlos Silva/)
    assert.match(proposalMetrics.back, /20000000-0000-4000-8000-000000000001/)
    const proposalLayout = await call('Page.getLayoutMetrics', {}, sessionId)
    const proposalScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.ceil(proposalLayout.cssContentSize.height), scale: 1 } }, sessionId)
    await writeFile(join(output, `${name}-proposal.png`), Buffer.from(proposalScreenshot.data, 'base64'))
    console.log(JSON.stringify({ name: `${name}-proposal`, viewport: width, contentWidth: proposalMetrics.contentWidth, screenshot: join(output, `${name}-proposal.png`) }))
    assert.doesNotMatch(metrics.content, /Pedir Esclarecimento|esclarecimentos estarão/)
    await evaluate('document.querySelector("input[name=value]").focus()')
    await call('Input.insertText', { text: '145000' }, sessionId)
    await evaluate('document.querySelector("textarea[name=description]").focus()')
    await call('Input.insertText', { text: 'Diagnóstico e reparo completo do circuito elétrico.' }, sessionId)
    await evaluate('document.querySelector(".send-proposal-submit").click()')
    let submitted = false
    for (let attempt = 0; attempt < 50; attempt++) {
      if (await evaluate('!!document.querySelector(".send-proposal-success")')) { submitted = true; break }
      await delay(100)
    }
    assert.ok(submitted, 'proposal form must show confirmed success from the isolated HTTP fixture')
    console.log(JSON.stringify({ name: `${name}-submission`, result: 'confirmed success; mock HTTP only' }))
  }
} finally {
  if (socket?.readyState === WebSocket.OPEN) { await call('Browser.close').catch(() => {}); socket.close() }
  else chrome.kill()
}
