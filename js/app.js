import {MODEL_ORDER,RECORD_ORDER,CATEGORIES,CATEGORY_COLORS,createDefaultData} from "../data/models.js";
import {saveFile,getFile,deleteAllFiles,addAudit} from "./database.js";
import {toast,escapeHtml,formatBytes,downloadBlob,downloadText} from "./ui.js";

const STORAGE_KEY="MOBILE_RND_DB_DATA_V10";
const PREF_KEY="MOBILE_RND_PREFS_V1";
const AUTH_KEY="RND_AUTH_V2";
const MAX_FILE_SIZE=500*1024*1024;
const ALLOWED=["pdf","xlsx","xls","zip","bin","dwg","csv","doc","docx","ppt","pptx"];

let data=loadData();
let prefs=loadPrefs();
let currentModel=MODEL_ORDER[0];
let activeCategory="all";
let query="";
let isAdmin=sessionStorage.getItem(AUTH_KEY)==="true";
let selectedFile=null;

function loadData(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||createDefaultData()}catch{return createDefaultData()}
}
function saveData(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
function loadPrefs(){
  try{return {...{compact:false,motion:true},...JSON.parse(localStorage.getItem(PREF_KEY))}}catch{return {compact:false,motion:true}}
}
function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}
function currentItems(){return data[currentModel].items}

function init(){
  document.getElementById("modelSelect").innerHTML=MODEL_ORDER.map(m=>`<option value="${m}">${m} • ${data[m].meta.name}</option>`).join("");
  document.getElementById("uploadModel").innerHTML=MODEL_ORDER.map(m=>`<option value="${m}">${m} • ${data[m].meta.name}</option>`).join("");
  document.getElementById("modelSelect").value=currentModel;
  document.getElementById("uploadModel").value=currentModel;
  renderCategories(); renderAll(); bindEvents(); applyPrefs();
}

function renderAll(){
  renderHero(); renderCards(); populateUploadRecords(); renderAuth();
}

function renderHero(){
  const m=data[currentModel].meta;
  document.getElementById("activeModelCode").textContent=currentModel;
  document.getElementById("activeModelName").textContent=m.name;
  document.getElementById("modelStatus").innerHTML=`<i class="fa-solid fa-circle"></i> ${escapeHtml(m.status)}`;
  document.getElementById("metaAp").textContent=m.ap;
  document.getElementById("metaModem").textContent=m.modem;
  document.getElementById("metaSw").textContent=m.swVersion;
  document.getElementById("metaLead").textContent=m.leadKorea;
}

function renderCategories(){
  document.getElementById("categoryTabs").innerHTML=CATEGORIES.map(c=>`
    <button class="cat-btn ${activeCategory===c.key?"active":""}" data-cat="${escapeHtml(c.key)}">${escapeHtml(c.label)}</button>
  `).join("");
}

function filteredEntries(){
  const q=query.toLowerCase();
  return RECORD_ORDER.map(k=>[k,currentItems()[k]]).filter(([,item])=>item).filter(([k,item])=>{
    const catOk=activeCategory==="all"||item.category===activeCategory;
    const hay=[k,item.title,item.category,item.filename,...(item.tags||[]),...(item.subItems||[]).flatMap(s=>[s.name,s.filename])].join(" ").toLowerCase();
    return catOk && (!q||hay.includes(q));
  });
}

function renderCards(){
  const grid=document.getElementById("cardsGrid");
  const entries=filteredEntries();
  document.getElementById("recordCount").textContent=`${entries.length} ${entries.length===1?"record":"records"} displayed`;
  document.getElementById("activeFilters").classList.toggle("hidden",!(query||activeCategory!=="all"));
  document.getElementById("activeFilters").innerHTML=`
    ${query?`<span class="filter-chip">Search: ${escapeHtml(query)}</span>`:""}
    ${activeCategory!=="all"?`<span class="filter-chip">Category: ${escapeHtml(activeCategory)}</span>`:""}
  `;
  if(!entries.length){
    grid.innerHTML=`<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><h3 class="font-bold mt-3">No records found</h3><p class="text-xs mt-1">Try another search term or category.</p></div>`;
    return;
  }
  grid.innerHTML=entries.map(([key,item])=>renderCard(key,item)).join("");
}

function renderCard(key,item){
  const color=CATEGORY_COLORS[item.category]||CATEGORY_COLORS.General;
  const tags=(item.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");
  let files="";
  if(item.subItems?.length){
    files=item.subItems.map((s,i)=>`
      <div class="file-row">
        <div class="min-w-0">
          <div class="file-name">${escapeHtml(s.name)}</div>
          <div class="file-size">${escapeHtml(s.size||"FILE")}</div>
        </div>
        <button class="download-btn" style="background:${color}" data-download="${currentModel}_${key}_${i}" data-filename="${escapeHtml(s.filename)}"><i class="fa-solid fa-download"></i> GET</button>
      </div>`).join("");
  }else{
    files=`<div class="file-row">
      <div class="min-w-0"><div class="file-name" title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</div><div class="file-size">${escapeHtml(item.size||"Master")}</div></div>
      <button class="download-btn" style="background:${color}" data-download="${currentModel}_${key}" data-filename="${escapeHtml(item.filename)}"><i class="fa-solid fa-download"></i> DOWNLOAD</button>
    </div>`;
  }
  return `<article class="record-card">
    <div class="record-stripe" style="background:${color}"></div>
    <div class="record-body">
      <div>
        <div class="record-header">
          <div class="record-title-wrap">
            <div class="record-icon" style="background:${color}"><i class="fa-solid ${escapeHtml(item.icon)}"></i></div>
            <div class="min-w-0"><div class="record-key">RECORD ${key}</div><div class="record-title">${escapeHtml(item.title)}</div></div>
          </div>
          <span class="category-label">${escapeHtml(item.category)}</span>
        </div>
        <div class="tags">${tags||'<span class="tag">No additional metadata</span>'}</div>
      </div>
      <div class="file-area">${files}</div>
    </div>
  </article>`;
}

function renderAuth(){
  const slot=document.getElementById("adminAuthSlot");
  slot.innerHTML=isAdmin
    ? `<div class="flex gap-1"><button id="uploadBtn" class="btn btn-cyan"><i class="fa-solid fa-cloud-arrow-up"></i> Upload</button><button id="logoutBtn" class="header-icon-btn" title="Logout"><i class="fa-solid fa-right-from-bracket"></i></button></div>`
    : `<button id="loginBtn" class="btn btn-dark"><i class="fa-solid fa-lock"></i> Admin</button>`;
  document.getElementById(isAdmin?"uploadBtn":"loginBtn").addEventListener("click",()=>openModal(isAdmin?"uploadModal":"loginModal"));
  if(isAdmin)document.getElementById("logoutBtn").addEventListener("click",()=>{isAdmin=false;sessionStorage.removeItem(AUTH_KEY);renderAuth();toast("Admin session ended.","info")});
}

function populateUploadRecords(){
  const sel=document.getElementById("uploadRecord");
  sel.innerHTML=RECORD_ORDER.filter(k=>currentItems()[k]).map(k=>`<option value="${k}">[${k}] ${escapeHtml(currentItems()[k].title)}</option>`).join("");
}

function openModal(id){document.getElementById(id).classList.remove("hidden")}
function closeModal(id){document.getElementById(id).classList.add("hidden")}

function bindEvents(){
  document.getElementById("modelSelect").addEventListener("change",e=>{currentModel=e.target.value;document.getElementById("uploadModel").value=currentModel;renderAll()});
  document.getElementById("searchInput").addEventListener("input",e=>{query=e.target.value.trim();document.getElementById("clearSearchBtn").classList.toggle("hidden",!query);renderCards()});
  document.getElementById("clearSearchBtn").addEventListener("click",()=>{query="";document.getElementById("searchInput").value="";document.getElementById("clearSearchBtn").classList.add("hidden");renderCards()});
  document.getElementById("categoryTabs").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;activeCategory=b.dataset.cat;renderCategories();renderCards()});
  document.getElementById("cardsGrid").addEventListener("click",e=>{const b=e.target.closest("[data-download]");if(b)downloadRecord(b.dataset.download,b.dataset.filename)});
  document.getElementById("copySpecsBtn").addEventListener("click",copySpecs);
  document.getElementById("exportJsonBtn").addEventListener("click",()=>exportModel());
  document.getElementById("exportReportBtn").addEventListener("click",exportReport);
  document.getElementById("settingsBtn").addEventListener("click",()=>openModal("settingsModal"));
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
  document.querySelectorAll(".modal-backdrop").forEach(b=>b.addEventListener("click",()=>b.parentElement.classList.add("hidden")));
  document.getElementById("loginForm").addEventListener("submit",login);
  document.getElementById("uploadModel").addEventListener("change",e=>{currentModel=e.target.value;document.getElementById("modelSelect").value=currentModel;renderAll()});
  document.getElementById("dropZone").addEventListener("click",()=>document.getElementById("fileInput").click());
  document.getElementById("dropZone").addEventListener("dragover",e=>{e.preventDefault();document.getElementById("dropZone").classList.add("drag-active")});
  document.getElementById("dropZone").addEventListener("dragleave",()=>document.getElementById("dropZone").classList.remove("drag-active"));
  document.getElementById("dropZone").addEventListener("drop",e=>{e.preventDefault();document.getElementById("dropZone").classList.remove("drag-active");selectFile(e.dataTransfer.files[0])});
  document.getElementById("fileInput").addEventListener("change",e=>selectFile(e.target.files[0]));
  document.getElementById("uploadForm").addEventListener("submit",upload);
  document.getElementById("compactToggle").addEventListener("change",e=>{prefs.compact=e.target.checked;savePrefs();applyPrefs()});
  document.getElementById("motionToggle").addEventListener("change",e=>{prefs.motion=e.target.checked;savePrefs();applyPrefs()});
  document.getElementById("backupBtn").addEventListener("click",()=>downloadText(JSON.stringify(data,null,2),`MobileRD_Backup_${dateStamp()}.json`));
  document.getElementById("resetBtn").addEventListener("click",resetData);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal:not(.hidden)").forEach(m=>m.classList.add("hidden"))});
}

function applyPrefs(){document.body.classList.toggle("compact",prefs.compact);document.body.classList.toggle("no-motion",!prefs.motion);document.getElementById("compactToggle").checked=prefs.compact;document.getElementById("motionToggle").checked=prefs.motion}

function login(e){
  e.preventDefault();
  const pwd=document.getElementById("passwordInput").value;
  if(pwd==="admin123"){
    isAdmin=true;sessionStorage.setItem(AUTH_KEY,"true");closeModal("loginModal");document.getElementById("passwordInput").value="";renderAuth();toast("Admin session authenticated.","success");addAudit("LOGIN");
  }else document.getElementById("loginError").classList.remove("hidden");
}

function selectFile(file){
  if(!file)return;
  const ext=file.name.split(".").pop().toLowerCase();
  if(!ALLOWED.includes(ext)){toast(`File type .${ext} is not supported.`,"error");return}
  if(file.size>MAX_FILE_SIZE){toast("File exceeds the 500 MB application limit.","error");return}
  selectedFile=file;document.getElementById("fileName").textContent=`${file.name} (${formatBytes(file.size)})`;document.getElementById("uploadStatus").textContent="File ready for upload.";
}

async function upload(e){
  e.preventDefault();
  if(!selectedFile){toast("Please select a file first.","error");return}
  const model=document.getElementById("uploadModel").value;
  const key=document.getElementById("uploadRecord").value;
  const note=document.getElementById("uploadNote").value.trim();
  const item=data[model].items[key];
  const btn=document.getElementById("saveUploadBtn");
  btn.disabled=true;
  const progressWrap=document.getElementById("uploadProgressWrap"),progress=document.getElementById("uploadProgress");
  progressWrap.classList.remove("hidden");progress.style.width="20%";
  try{
    const storageKey=`${model}_${key}`;
    await saveFile(storageKey,selectedFile);
    progress.style.width="70%";
    item.filename=selectedFile.name;item.size=formatBytes(selectedFile.size);
    if(note)item.tags=[note];
    if(item.subItems){toast("For multi-file records, select the specific child record in a future upload manager.","info")}
    saveData();await addAudit("UPLOAD",{model,key,filename:selectedFile.name,size:selectedFile.size});
    progress.style.width="100%";
    renderAll();closeModal("uploadModal");
    toast(`${selectedFile.name} saved successfully.`,"success");
    selectedFile=null;document.getElementById("uploadForm").reset();document.getElementById("uploadModel").value=currentModel;document.getElementById("fileName").textContent="Drop file here or click to browse";
  }catch(err){toast("Could not save the file to IndexedDB.","error")}finally{btn.disabled=false;setTimeout(()=>progressWrap.classList.add("hidden"),300)}
}

async function downloadRecord(key,filename){
  try{
    const record=await getFile(key);
    if(record?.blob){downloadBlob(record.blob,record.filename||filename);await addAudit("DOWNLOAD",{key,filename});return}
  }catch{}
  const fallback=`Mobile R&D Engineering Portal\nModel: ${currentModel}\nRecord: ${key}\nFile: ${filename}\nGenerated: ${new Date().toISOString()}`;
  downloadText(fallback,filename||`${key}.txt`,"text/plain");
  toast("No local binary was found; generated a reference file instead.","info");
}

function copySpecs(){
  const m=data[currentModel].meta;
  navigator.clipboard.writeText(`Model: ${currentModel} (${m.name})\nProcessor: ${m.ap}\nModem/RF: ${m.modem}\nSW Build: ${m.swVersion}\nHQ Lead: ${m.leadKorea}\nStatus: ${m.status}`);
  toast("Model specification copied.","success");
}

function exportModel(){
  downloadText(JSON.stringify(data[currentModel],null,2),`${currentModel}_Engineering_Master.json`);
  toast("Model JSON exported.","success");
}

function exportReport(){
  const m=data[currentModel].meta;
  const rows=filteredEntries().map(([k,i])=>`${k} | ${i.title} | ${i.category} | ${i.filename||`${i.subItems?.length||0} linked files`}`).join("\n");
  const text=`MOBILE R&D ENGINEERING REPORT\n================================\nModel: ${currentModel} - ${m.name}\nStatus: ${m.status}\nProcessor: ${m.ap}\nModem/RF: ${m.modem}\nSW Build: ${m.swVersion}\nHQ Lead: ${m.leadKorea}\n\nRECORDS\n-------\n${rows}\n\nGenerated: ${new Date().toISOString()}`;
  downloadText(text,`${currentModel}_Engineering_Report.txt`,"text/plain");toast("Engineering report exported.","success");
}

async function resetData(){
  if(!confirm("Reset all local dashboard data and stored files? This cannot be undone."))return;
  data=createDefaultData();saveData();await deleteAllFiles();await addAudit("RESET");
  currentModel="A576";activeCategory="all";query="";document.getElementById("searchInput").value="";renderCategories();renderAll();closeModal("settingsModal");toast("Local data reset to default dataset.","success");
}
function dateStamp(){return new Date().toISOString().slice(0,10).replaceAll("-","")}

init();
