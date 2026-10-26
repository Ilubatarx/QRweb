import test from 'node:test';
import assert from 'node:assert/strict';
import {contentDraft,hasContent,examplePayload} from '../src/content.js';
import {makeQR} from '../src/qr.js';

test('all four content types have a QR example for an immediate preview',()=>{
  const samples=['link','wifi','reviews','instagram'].map(examplePayload);
  assert.equal(new Set(samples).size,4);
  for(const sample of samples)assert.ok(makeQR(sample));
});

test('empty content cannot be downloaded even though a preview example is available',()=>{
  for(const kind of ['link','reviews','instagram'])assert.equal(hasContent({kind,value:'   '}),false);
  assert.equal(hasContent({kind:'wifi',ssid:' ',password:'password',security:'WPA'}),false);
  assert.equal(hasContent({kind:'wifi',ssid:'Mi red',password:'',security:'nopass'}),true);
});

test('content drafts preserve each tab input without copying design or unrelated data',()=>{
  assert.deepEqual(contentDraft({kind:'instagram',value:'https://instagram.com/mi-negocio',label:'Nombre',ssid:'Otra red'}),{value:'https://instagram.com/mi-negocio'});
  assert.deepEqual(contentDraft({kind:'wifi',ssid:'Invitados',password:'Ejemplo123',security:'WPA',value:'https://example.com'}),{ssid:'Invitados',password:'Ejemplo123',security:'WPA'});
});
