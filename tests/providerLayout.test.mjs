import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { create } from 'react-test-renderer'
import { createServer } from 'vite'

async function layout(t) {
  const previous={window:globalThis.window,document:globalThis.document,act:globalThis.IS_REACT_ACT_ENVIRONMENT}
  const events=Object.assign(new EventTarget(),{innerWidth:390,location:new URL('http://localhost/home')})
  const document=Object.assign(new EventTarget(),{body:{style:{overflow:''}}})
  const calls={restored:0,mainFocus:0,scroll:0}
  const before={focus(){calls.restored++;document.activeElement=before}}
  const first={focus(){document.activeElement=first}},last={focus(){document.activeElement=last}}
  document.activeElement=before
  globalThis.window=events;globalThis.document=document;globalThis.IS_REACT_ACT_ENVIRONMENT=true
  const server=await createServer({cacheDir:'node_modules/.vite-provider-layout-tests',server:{middlewareMode:true,ws:false},appType:'custom',optimizeDeps:{noDiscovery:true,include:[]}})
  let renderer
  t.after(async()=>{if(renderer)await act(()=>renderer.unmount());await server.close();globalThis.window=previous.window;globalThis.document=previous.document;globalThis.IS_REACT_ACT_ENVIRONMENT=previous.act})
  const {default:Layout}=await server.ssrLoadModule('/src/components/layout/ProviderLayout.jsx')
  await act(()=>{renderer=create(React.createElement(Layout,{currentPath:'/home'},React.createElement('h1',null,'Página de teste')),
    {createNodeMock:node=>node.type==='aside'?{querySelectorAll:()=>[first,last]}:node.type==='main'?{focus(){calls.mainFocus++},scrollIntoView(){calls.scroll++}}:null})})
  const menu=()=>renderer.root.findAllByType('button').find(n=>n.props['aria-label']==='Abrir menu de navegação')
  return{renderer,events,document,calls,first,last,menu,open:()=>act(()=>menu().props.onClick())}
}

test('mobile menu traps keyboard focus, closes with Escape and restores scrolling and focus',async t=>{
  const page=await layout(t)
  await page.open()
  assert.equal(page.menu().props['aria-expanded'],true)
  assert.equal(page.document.body.style.overflow,'hidden')
  assert.equal(page.document.activeElement,page.first)
  const backwards=new Event('keydown',{cancelable:true})
  Object.defineProperties(backwards,{key:{value:'Tab'},shiftKey:{value:true}})
  await act(()=>page.document.dispatchEvent(backwards))
  assert.equal(backwards.defaultPrevented,true)
  assert.equal(page.document.activeElement,page.last)
  const escape=new Event('keydown');Object.defineProperty(escape,'key',{value:'Escape'})
  await act(()=>page.document.dispatchEvent(escape))
  assert.equal(page.menu().props['aria-expanded'],false)
  assert.equal(page.document.body.style.overflow,'')
  assert.equal(page.calls.restored,1)
})

test('returning to desktop closes a mobile drawer so the page never stays scroll-locked',async t=>{
  const page=await layout(t);await page.open()
  page.events.innerWidth=1280
  await act(()=>page.events.dispatchEvent(new Event('resize')))
  assert.equal(page.menu().props['aria-expanded'],false)
  assert.equal(page.document.body.style.overflow,'')
  assert.equal(page.calls.restored,1)
})

test('skip link moves focus without changing the route hash or remounting a form',async t=>{
  const page=await layout(t)
  let prevented=false
  const skip=page.renderer.root.findAllByType('a').find(n=>n.props.href==='#provider-main')
  await act(()=>skip.props.onClick({preventDefault(){prevented=true}}))
  assert.equal(prevented,true)
  assert.equal(page.events.location.hash,'')
  assert.equal(page.calls.mainFocus,1)
  assert.equal(page.calls.scroll,1)
})

test('navigation closes the drawer and keeps the shared shell available',async t=>{
  const page=await layout(t);await page.open()
  await act(()=>page.events.dispatchEvent(new Event('popstate')))
  assert.equal(page.menu().props['aria-expanded'],false)
  assert.equal(page.document.body.style.overflow,'')
  assert.equal(page.renderer.root.findAllByType('main').length,1)
})
