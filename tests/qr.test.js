import test from 'node:test';
import assert from 'node:assert/strict';
import { makeQR, payload, contrast, qrSVG } from '../src/qr.js';

test('wifi escapes special characters and never puts a password into an open network',()=>{
  const config={kind:'wifi',ssid:'Café; invitados',password:'a:b,c\\d',security:'WPA'};
  assert.equal(payload(config),'WIFI:T:WPA;S:Café\\; invitados;P:a\\:b\\,c\\\\d;;');
  assert.equal(payload({...config,security:'nopass'}),'WIFI:T:nopass;S:Café\\; invitados;P:;;');
});
test('QR generator uses high correction and reserves a four-module quiet zone',()=>{
  const matrix=makeQR('https://example.com');
  assert.ok(matrix.size>=21);
  const svg=qrSVG(matrix,{base:'#FFFFFF',ink:'#000000',dots:'square',emoji:'',logo:''});
  assert.ok(svg.includes(`viewBox="0 0 ${matrix.size+8} ${matrix.size+8}"`));
  assert.ok(!svg.includes('undefined'));
  assert.equal(makeQR(''),null);
});
test('contrast calculations are symmetric and detect unreadable palettes',()=>{
  assert.equal(contrast('#ffffff','#000000'),21);
  assert.equal(contrast('#294C3F','#F1EDE3'),contrast('#F1EDE3','#294C3F'));
  assert.ok(contrast('#F1EDE3','#294C3F')>7);
  assert.ok(contrast('#cccccc','#dddddd')<1.5);
});
