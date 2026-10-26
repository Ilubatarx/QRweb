import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import React from 'react';
import fs from 'node:fs/promises';

const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
  const {default:App,faqs}=await server.ssrLoadModule('/src/App.jsx');
  const markup=renderToString(React.createElement(App));
  const faqData=JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(([question,answer])=>({'@type':'Question',name:question,acceptedAnswer:{'@type':'Answer',text:answer}}))}).replace(/</g,'\\u003c');
  let html=await fs.readFile('dist/index.html','utf8');
  html=html.replace('<div id="root"></div>',`<div id="root">${markup}</div>`).replace('</head>',`<script type="application/ld+json">${faqData}</script></head>`);
  await fs.writeFile('dist/index.html',html);
  console.log('Pre-rendered landing page, tool and FAQ structured data for search engines.');
}finally{await server.close();}
