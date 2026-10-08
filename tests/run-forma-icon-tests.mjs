import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {loadFormaIcons,renderFormaPrintIcon} from "../tools/forma-icons.mjs";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"folio-forma-icons-"));
const asset=path.join(root,"icons");
fs.mkdirSync(asset,{recursive:true});
const src='<svg xmlns="http://www.w3.org/2000/svg" class="ef-icon__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5V19M5 12H19"/></svg>\n';
const name="add";
const manifest={schemaVersion:1,grid:24,icons:[{name,category:"actions",label:"Add",keywords:[],origin:"original",svg:"icons/add.svg",html:"icons/html/add.html"}]};
const save=()=>fs.writeFileSync(path.join(asset,"registry.json"),JSON.stringify(manifest));
const assertReject=(f,pattern)=>assert.throws(f,pattern);
try{
  save();
  fs.writeFileSync(path.join(asset,name+".svg"),src);
  assert.deepEqual(loadFormaIcons(asset).icons.map(row=>row.name),["add"]);
  const decorative=renderFormaPrintIcon("add",{assetsRoot:asset});
  assert.match(decorative,/aria-hidden="true"/);
  assert.match(decorative,/stroke="currentColor"/);
  assert.match(decorative,/--ef-print-icon-size:1em/);
  assert.doesNotMatch(decorative,/<script|https?:\/\/|<iframe/i);
  const meaningful=renderFormaPrintIcon("add",{assetsRoot:asset,label:'Add "record" & return',size:"14pt"});
  assert.match(meaningful,/role="img" aria-label="Add &quot;record&quot; &amp; return"/);
  assertReject(()=>renderFormaPrintIcon("delete",{assetsRoot:asset}),/unknown icon/);
  assertReject(()=>renderFormaPrintIcon("../add",{assetsRoot:asset}),/invalid name/);
  assertReject(()=>renderFormaPrintIcon("add",{assetsRoot:asset,size:"10pt;background:url(x)"}),/unsafe size/);
  fs.writeFileSync(path.join(asset,name+".svg"),'<svg onload="alert(1)"></svg>');
  assertReject(()=>renderFormaPrintIcon("add",{assetsRoot:asset}),/unsafe SVG/);
  fs.writeFileSync(path.join(asset,name+".svg"),src.replace('stroke="currentColor"','stroke="red"'));
  assertReject(()=>renderFormaPrintIcon("add",{assetsRoot:asset}),/unexpected SVG/);
  fs.writeFileSync(path.join(asset,name+".svg"),src);
  manifest.icons[0].name="../add";save();
  assertReject(()=>loadFormaIcons(asset),/invalid or duplicate/);
  console.log("PASS Folio Forma icon assets: static rendering, registry constraints, labeling, escaping, safe geometry");
}finally{fs.rmSync(root,{recursive:true,force:true})}
