(()=>{"use strict";var e={398:e=>{e.exports=require("vscode")},972:(e,t,s)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.SQL_INSERT_INLAY_HINTS_PROVIDER=void 0;const n=s(398),r=/INSERT\s+INTO\s+"?\w+"?\s*\((.*?)\)\s*VALUES\s*((?:\s*\([^)]+\)\s*,?)+)/gis;t.SQL_INSERT_INLAY_HINTS_PROVIDER=n.languages.registerInlayHintsProvider({scheme:"file",language:"sql"},new class{async provideInlayHints(e,t,s){const n=e.getText(),r=[];for(const t of this.findInserts(n)){if(s.isCancellationRequested)return r;this.isValidInsert(t)&&this.createHintsForInsert(e,t,r)}return r}*findInserts(e){let t;for(;null!==(t=r.exec(e));){const s=t[1],n=t[2],r=e.toUpperCase().indexOf("VALUES",t.index),o=/\(([^)]+)\)/g,i=[];let a,u=e.indexOf(n,r);for(;null!==(a=o.exec(n));){const t=a[0],s=this.parseRowValues(a[1]),n=e.indexOf(t,u);-1!==n&&(i.push({values:s,position:n+1}),u=n+t.length)}yield{columns:this.parseColumns(s),valueRows:i}}}parseColumns(e){return e.split(",").map((e=>e.trim()))}parseRowValues(e){const t=[];let s="",n=!1,r=0;for(const o of e)this.shouldStartNewValue(o,n,r)?(t.push(s.trim()),s=""):(r=this.updateParenthesesDepth(o,n,r),n=this.updateStringState(o,n),s+=o);return s&&t.push(s.trim()),t}shouldStartNewValue(e,t,s){return","===e&&!t&&0===s}updateParenthesesDepth(e,t,s){return t?s:"("===e?s+1:")"===e?s-1:s}updateStringState(e,t){return"'"===e?!t:t}isValidInsert(e){if(!e.valueRows||0===e.valueRows.length)return!1;for(const t of e.valueRows)if(t.values.length!==e.columns.length)return!1;return!0}createHintsForInsert(e,t,s){for(const r of t.valueRows){let o=r.position;for(let i=0;i<t.columns.length;i++){const a=r.values[i].trim(),u=e.getText().indexOf(a,o);if(-1!==u){const r=new n.InlayHint(e.positionAt(u),`${t.columns[i]}: `,n.InlayHintKind.Parameter);s.push(r),o=u+a.length}}}}})}},t={};function s(n){var r=t[n];if(void 0!==r)return r.exports;var o=t[n]={exports:{}};return e[n](o,o.exports,s),o.exports}var n={};(()=>{var e=n;Object.defineProperty(e,"__esModule",{value:!0}),e.activate=function(e){e.subscriptions.push(t.SQL_INSERT_INLAY_HINTS_PROVIDER)},e.deactivate=function(){};const t=s(972)})(),module.exports=n})();