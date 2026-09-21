const DB_NAME="MobileRD_Master_DB";
const DB_VERSION=3;
const VERSION_STORE="file_versions";
const FILE_STORE="files";
const LOG_STORE="audit";

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE);
      if(!db.objectStoreNames.contains(LOG_STORE)) db.createObjectStore(LOG_STORE,{keyPath:"id",autoIncrement:true});
      if(!db.objectStoreNames.contains(VERSION_STORE)) db.createObjectStore(VERSION_STORE,{keyPath:"id",autoIncrement:true});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

export async function saveFile(key,file){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const now=new Date().toISOString();
    const tx=db.transaction([FILE_STORE,VERSION_STORE],"readwrite");
    const record={blob:file,filename:file.name,size:file.size,type:file.type,updatedAt:now,key};
    tx.objectStore(FILE_STORE).put(record,key);
    tx.objectStore(VERSION_STORE).add({...record,versionAt:now});
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}


export async function listFiles(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FILE_STORE,"readonly");
    const store=tx.objectStore(FILE_STORE);
    const req=store.openCursor();
    const rows=[];
    req.onsuccess=()=>{const c=req.result;if(c){rows.push({key:c.key,...c.value});c.continue()}else resolve(rows)}};
    req.onerror=()=>reject(req.error);
  });
}

export async function getVersions(key){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(VERSION_STORE,"readonly");
    const req=tx.objectStore(VERSION_STORE).getAll();
    req.onsuccess=()=>resolve(req.result.filter(x=>x.key===key).sort((a,b)=>String(b.versionAt).localeCompare(String(a.versionAt))));
    req.onerror=()=>reject(req.error);
  });
}

export async function getFile(key){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FILE_STORE,"readonly");
    const req=tx.objectStore(FILE_STORE).get(key);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });
}

export async function deleteAllFiles(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction([FILE_STORE,VERSION_STORE],"readwrite");
    tx.objectStore(FILE_STORE).clear();
    tx.objectStore(VERSION_STORE).clear();
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}

export async function addAudit(action,details={}){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(LOG_STORE,"readwrite");
    tx.objectStore(LOG_STORE).add({action,details,at:new Date().toISOString()});
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}

export async function getAuditLogs(limit=100){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(LOG_STORE,"readonly");
    const req=tx.objectStore(LOG_STORE).getAll();
    req.onsuccess=()=>resolve(req.result.reverse().slice(0,limit));
    req.onerror=()=>reject(req.error);
  });
}
