
const supabaseClient=window.supabase?.createClient(window.SUPABASE_CONFIG.url,window.SUPABASE_CONFIG.publishableKey);
document.getElementById("enterApp").onclick=()=>{
  document.getElementById("entryScreen").style.display="none";
  document.getElementById("authScreen").style.display="flex";
};
let currentSessionUser=null;
let refreshTimer=null;
let calendarViewDate=new Date();
const authRedirectUrl=window.location.origin+window.location.pathname;
function showAuthMessage(message,success=false){
  const box=document.getElementById("authMessage");
  box.textContent=message; box.className=`alert ${success?"alert-success":"alert-danger"}`;
}
document.getElementById("authSwitch").onclick=()=>{
  const registerVisible=!document.getElementById("registerForm").classList.toggle("d-none");
  document.getElementById("loginForm").classList.toggle("d-none");
  document.getElementById("authTitle").textContent=registerVisible?"Criar conta":"Entrar no +Apoio";
  document.getElementById("authIntro").textContent=registerVisible?"A sua conta ficará pendente até ser aprovada pela coordenação.":"Use o seu utilizador e palavra-passe.";
  document.getElementById("authSwitch").textContent=registerVisible?"Já tenho conta":"Ainda não tenho conta";
  document.getElementById("authMessage").className="alert d-none";
};
document.getElementById("forgotPassword").onclick=async()=>{
  const email=loginUsername.value.trim();
  if(!supabaseClient||!email.includes("@")){showAuthMessage("Introduza o email da conta para recuperar a palavra-passe.");return;}
  const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:authRedirectUrl});
  showAuthMessage(error?.message||"Se o email existir, receberá uma ligação para redefinir a palavra-passe.",!error);
};

document.getElementById("registerForm").onsubmit = async event => {
  event.preventDefault();

  const form = event.target;
  const button = form.querySelector("button[type='submit'], button:not([type])");

  if (button?.disabled) return;

  const payload = {
    name: document.getElementById("registerName").value.trim(),
    username: document.getElementById("registerUsername").value.trim(),
    email: document.getElementById("registerEmail").value.trim(),
    phone: document.getElementById("registerPhone").value.trim(),
    password: document.getElementById("registerPassword").value,
    role: document.getElementById("registerRole").value
  };

  if (!supabaseClient) {
    showAuthMessage("Supabase não está configurado.");
    return;
  }

  if (!payload.email) {
    showAuthMessage("Introduza um endereço de email válido.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "A criar conta...";
  }

  try {
    const { error } = await supabaseClient.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          name: payload.name,
          username: payload.username,
          phone: payload.phone,
          role: payload.role
        }
      }
    });

    if (error) throw error;

    form.reset();
    document.getElementById("authSwitch").click();

    showAuthMessage(
      "Pedido de registo enviado. Confirme o email, se solicitado, e aguarde a aprovação da coordenação.",
      true
    );
  } catch (error) {
    console.error("Erro ao criar perfil:", error);

    const message = String(error?.message || "").toLowerCase();
    const code = error?.code || "";

    if (
      code === "over_email_send_rate_limit" ||
      message.includes("email rate limit exceeded")
    ) {
      showAuthMessage(
        "O limite de envio de emails do Supabase foi atingido. Aguarde antes de tentar novamente. Para testes frequentes, configure um serviço SMTP próprio no Supabase."
      );
    } else if (code === "over_request_rate_limit") {
      showAuthMessage(
        "Foram feitas demasiadas tentativas. Aguarde alguns minutos antes de voltar a tentar."
      );
    } else {
      showAuthMessage(
        error?.message || "Não foi possível criar a conta. Tente novamente mais tarde."
      );
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Criar conta";
    }
  }
};

  event.preventDefault();
  const payload={
    name:document.getElementById("registerName").value,
    username:document.getElementById("registerUsername").value,
    email:document.getElementById("registerEmail").value,
    phone:document.getElementById("registerPhone").value,
    password:document.getElementById("registerPassword").value,
    role:document.getElementById("registerRole").value
  };
  if(!supabaseClient){showAuthMessage("Supabase não está configurado.");return;}
  try{
    const {error}=await supabaseClient.auth.signUp({email:payload.email,password:payload.password,options:{data:{name:payload.name,username:payload.username,phone:payload.phone,role:payload.role}}});
    if(error)throw error;
    showAuthMessage("Conta criada no Supabase. Confirma o email e aguarda aprovação da coordenação.",true);
    event.target.reset();
    document.getElementById("authSwitch").click();
  }catch(error){showAuthMessage(error.message||"Não foi possível criar a conta.");}
};
document.getElementById("loginForm").onsubmit=async event=>{
  event.preventDefault();
  if(!supabaseClient){showAuthMessage("Supabase não está configurado.");return;}
  try{
    const {data,error}=await supabaseClient.auth.signInWithPassword({email:loginUsername.value.trim(),password:loginPassword.value});
    if(error)throw error;
    const {data:profile,error:profileError}=await supabaseClient.from("profiles").select("id,username,name,email,phone,role,status").eq("id",data.user.id).single();
    if(profileError)throw profileError;
    if(profile.status!=="approved")throw new Error("A conta ainda aguarda aprovação da coordenação.");
    currentSessionUser=profile;
  }catch(error){
    showAuthMessage(error.message||"Não foi possível iniciar sessão.");
    return;
  }
  document.getElementById("authScreen").style.display="none";
  await enterRole(currentSessionUser.role,currentSessionUser.role==="admin"?"dashboard":currentSessionUser.role==="medico"?"dashboard":"apoios");
};
async function enterRole(role,page){
  document.getElementById("roleScreen").style.display="none";
  document.getElementById("appShell").style.display="block";
  const beneficiaryRole=role==="beneficiario";
  document.querySelectorAll("#mainNav .nav-link").forEach(link=>{
    link.hidden=beneficiaryRole && !["apoios","medicosDisponiveis"].includes(link.dataset.page);
  });
  document.getElementById("quickAdd").hidden=beneficiaryRole;
  document.getElementById("scheduleSupportButton").hidden=false;
  document.querySelector('[data-page="utilizadores"]').hidden=role!=="admin";
  document.querySelector('[data-page="comentarios"]').hidden=!['medico','admin'].includes(role);
  document.querySelector('[data-page="pedidos"]').hidden=false;
  document.querySelector('[data-page="ajuda"]').hidden=false;
  document.getElementById("newRequestButton").hidden=role!=="beneficiario";
  showPage(page);
  await loadData();
  await loadRequestsData();
  startAutoRefresh();
  if(role==="admin") await loadUsers();
}
document.getElementById("beneficiaryEntry").onclick=()=>enterRole("beneficiario","apoios");
document.getElementById("doctorEntry").onclick=()=>enterRole("medico","dashboard");
function normalizeData(value){
  return {
    beneficiarios:(value.beneficiarios||[]).map(x=>({...x,id:Number(x.id)})),
    medicos:(value.medicos||[]).map(x=>({...x,id:Number(x.id),avail:x.avail==="Indisponível"?"Em atendimento":(x.avail||"Disponível")})),
    apoios:(value.apoios||[]).map(x=>({...x,id:Number(x.id),benef:Number(x.benef),med:Number(x.med)})),
    ratings:(value.ratings||[]).map(x=>({...x,id:Number(x.id),apoio_id:Number(x.apoio_id),benef:Number(x.benef),med:Number(x.med),stars:Number(x.stars)}))
  };
}
let data = normalizeData({});
data.requests=[];
const usesSupabase=()=>Boolean(supabaseClient&&currentSessionUser?.id);
async function supabaseLoadData(){
  const [beneficiaries,volunteers,supports,ratings]=await Promise.all([
    supabaseClient.from("beneficiaries").select("*").order("id"),
    supabaseClient.from("volunteers").select("*").order("id"),
    supabaseClient.from("supports").select("*").order("scheduled_at"),
    supabaseClient.from("ratings").select("*").order("id")
  ]);
  const failure=[beneficiaries,volunteers,supports,ratings].find(result=>result.error);
  if(failure)throw failure.error;
  return normalizeData({
    beneficiarios:beneficiaries.data.map(item=>({id:item.id,profile_id:item.profile_id||null,name:item.name,birth:item.birth_date||"",priority:item.priority,phone:item.phone||"",email:item.email||"",address:item.address||"",city:item.city||"",need:item.need,emergency:item.emergency_contact||"",notes:item.notes||""})),
    medicos:volunteers.data.map(item=>({id:item.id,name:item.name,spec:item.specialty,phone:item.phone||"",email:item.email||"",city:item.city||"",avail:item.availability,reg:item.registration_number||"",areas:item.areas||"",profile_id:item.profile_id})),
    apoios:supports.data.map(item=>({id:item.id,date:item.scheduled_at,duration:Number(item.duration_minutes)||60,benef:item.beneficiary_id,med:item.volunteer_id,type:item.type,status:item.status,notes:item.notes||""})),
    ratings:ratings.data.map(item=>({id:item.id,apoio_id:item.support_id,stars:item.stars,comment:item.comment||"",author_id:item.author_id}))
  });
}
async function supabaseSaveData(){
  const beneficiaryRows=data.beneficiarios.map(item=>({id:item.id,name:item.name,birth_date:item.birth||null,priority:item.priority,phone:item.phone||null,email:item.email||null,address:item.address||null,city:item.city||null,need:item.need,emergency_contact:item.emergency||null,notes:item.notes||null,profile_id:item.profile_id||null}));
  const volunteerRows=data.medicos.map(item=>({id:item.id,name:item.name,specialty:item.spec,phone:item.phone||null,email:item.email||null,city:item.city||null,availability:item.avail,registration_number:item.reg||null,areas:item.areas||null,profile_id:item.profile_id||null}));
  const supportRows=data.apoios.map(item=>({id:item.id,beneficiary_id:item.benef,volunteer_id:item.med||null,type:item.type,scheduled_at:item.date,duration_minutes:Number(item.duration)||60,status:item.status,notes:item.notes||null}));
  for(const [table,rows] of [["beneficiaries",beneficiaryRows],["volunteers",volunteerRows],["supports",supportRows]]){
    if(!rows.length)continue;
    const result=await supabaseClient.from(table).upsert(rows);
    if(result.error)throw result.error;
  }
}
async function supabaseLoadRequests(){
  const result=await supabaseClient.from("support_requests").select("*").order("created_at",{ascending:false});
  if(result.error)throw result.error;
  data.requests=(result.data||[]).map(item=>({...item,beneficiary_name:getBenef(item.beneficiary_id)?.name||item.beneficiary_name||"—"}));
}
async function loadData(showError=true){
  if(!usesSupabase()){if(showError)toast("Supabase não está configurado.");return;}
  try{data=await supabaseLoadData();renderAll();}
  catch(error){console.error(error);if(showError)toast("Não foi possível carregar os dados do Supabase.");}
}
async function loadRequestsData(showError=false){
  if(!usesSupabase()){if(showError)toast("Supabase não está configurado.");return;}
  try{await supabaseLoadRequests();renderRequests();renderNotifications();}
  catch(error){console.error(error);if(showError)toast("Não foi possível carregar os pedidos do Supabase.");}
}
function startAutoRefresh(){
  clearInterval(refreshTimer);
  refreshTimer=setInterval(async()=>{
    if(document.hidden||document.querySelector('.modal.show'))return;
    await loadData(false);
    await loadRequestsData(false);
    if(currentSessionUser?.role==="admin"&&document.querySelector('#utilizadores.active'))await loadUsers();
  },10000);
}
async function loadUsers(){
  if(!usesSupabase()){toast("Supabase não está configurado.");return;}
  const result=await supabaseClient.from("profiles").select("id,username,name,email,phone,role,status,created_at").order("created_at",{ascending:false});
  if(result.error){toast("Não foi possível carregar os perfis.");return;}
  usersTable.innerHTML=(result.data||[]).map(user=>`<tr><td><strong>${esc(user.name)}</strong></td><td>${esc(user.phone||"—")}<div class="small text-secondary">${esc(user.email||"")}</div></td><td>${esc(user.username||"—")}</td><td>${user.role==="medico"?"Médico voluntário":user.role==="beneficiario"?"Beneficiário":"Coordenação"}</td><td><span class="badge text-bg-${user.status==="approved"?"success":user.status==="pending"?"warning":"danger"} badge-soft">${user.status==="approved"?"Aprovado":user.status==="pending"?"Pendente":"Recusado"}</span></td><td>${user.role!=="admin"?`${user.status==="pending"?`<button class="btn btn-sm btn-success me-1" onclick="approveUser('${user.id}','approved')">Aprovar</button><button class="btn btn-sm btn-outline-danger me-1" onclick="approveUser('${user.id}','rejected')">Recusar</button>`:""}<button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.id}','${esc(user.name)}')"><i class="bi bi-trash me-1"></i>Eliminar</button>`:"—"}</td></tr>`).join("")||'<tr><td colspan="6" class="empty">Ainda não existem pedidos.</td></tr>';
}
async function approveUser(id,status){
  if(!usesSupabase()){toast("Supabase não está configurado.");return;}
  const result=await supabaseClient.from("profiles").update({status}).eq("id",id);
  if(result.error){toast("Não foi possível atualizar a conta.");return;}
  await loadUsers();toast(status==="approved"?"Conta aprovada.":"Conta recusada.");
}
async function deleteUser(id,name){
  if(!confirm(`Eliminar o utilizador ${name}? O perfil e as consultas associadas também serão removidos.`))return;
  if(!usesSupabase()){toast("Supabase não está configurado.");return;}
  const result=await supabaseClient.from("profiles").delete().eq("id",id);
  if(result.error){toast("Não foi possível eliminar o utilizador.");return;}
  await loadUsers();await loadData(false);toast("Utilizador eliminado.");
}
async function save(){
  if(!usesSupabase()){toast("Supabase não está configurado.");return false;}
  try{await supabaseSaveData();return true}
  catch(error){console.error(error);toast(error.code==="23P01"?"O médico já está ocupado nesse horário.":"Não foi possível guardar no Supabase.");return false}
}
function nextId(list){ return list.reduce((max,x)=>Math.max(max,Number(x.id)||0),0)+1; }
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const getBenef=id=>data.beneficiarios.find(x=>x.id==id);
const getMed=id=>data.medicos.find(x=>x.id==id);
const priorityBadge=p=>p==="Alta"?"danger":p==="Média"?"warning":"secondary";
function toast(msg){document.getElementById("toastMsg").textContent=msg;bootstrap.Toast.getOrCreateInstance(document.getElementById("toast")).show();}
function showPage(page){
  document.querySelectorAll(".page-section").forEach(x=>x.classList.toggle("active",x.id===page));
  document.querySelectorAll("#mainNav .nav-link").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  const titles={dashboard:"Dashboard",beneficiarios:"Beneficiários",medicos:"Médicos voluntários",medicosDisponiveis:"Médicos disponíveis",apoios:"Apoios",pedidos:"Pedidos de apoio",comentarios:"Comentários das consultas",relatorios:"Relatórios",ajuda:"Ajuda e contactos",utilizadores:"Aprovar utilizadores"};
  document.getElementById("pageTitle").textContent=titles[page];
  renderAll();
}
document.querySelectorAll("#mainNav .nav-link").forEach(a=>a.onclick=e=>{e.preventDefault();showPage(a.dataset.page)});
document.getElementById("quickAdd").onclick=()=> {
  const active=document.querySelector(".page-section.active").id;
  if(active==="medicos") openMedModal(); else if(active==="apoios") openApoioModal(); else openBenefModal();
};

function renderDashboard(){
  statBenef.textContent=data.beneficiarios.length; statMed.textContent=data.medicos.length;
  statApoio.textContent=data.apoios.filter(a=>a.status!=="Realizado").length;
  statPriority.textContent=data.beneficiarios.filter(b=>b.priority==="Alta").length;
  const isAdmin=currentSessionUser?.role==="admin";
  adminOverview.classList.toggle("d-none",!isAdmin);
  if(isAdmin){
    adminBenefTotal.textContent=data.beneficiarios.length;
    adminBenefPriority.textContent=data.beneficiarios.filter(b=>b.priority==="Alta").length;
    adminMedTotal.textContent=data.medicos.length;
    adminMedAvailable.textContent=data.medicos.filter(m=>m.avail==="Disponível").length;
    adminMedBusy.textContent=data.medicos.filter(m=>m.avail!=="Disponível").length;
  }
  const visibleSupports=getVisibleSupports();
  const upcoming=visibleSupports.filter(a=>a.status==="Agendado"&&new Date(a.date)>=new Date()).sort((a,b)=>a.date.localeCompare(b.date));
  nextSupportText.textContent=upcoming.length?`${formatDate(upcoming[0].date)} · ${getBenef(upcoming[0].benef)?.name||"Beneficiário"}`:"Não existem apoios futuros agendados.";
  dashboardApoios.innerHTML=visibleSupports.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5).map(a=>{
    const b=getBenef(a.benef),m=getMed(a.med);
    return `<tr><td><span class="avatar me-2">${esc(b?.name?.[0]||"?")}</span>${esc(b?.name||"—")}</td><td>${esc(m?.name||"—")}</td><td>${formatDate(a.date)}</td><td><span class="badge bg-${a.status==="Realizado"?"success":"primary"} badge-soft">${a.status}</span></td></tr>`;
  }).join("") || `<tr><td colspan="4" class="empty">Ainda não existem apoios.</td></tr>`;
  const counts={}; data.beneficiarios.forEach(b=>counts[b.need]=(counts[b.need]||0)+1);
  needsChart.innerHTML=Object.entries(counts).map(([k,v])=>`<div class="mb-3"><div class="d-flex justify-content-between small mb-1"><span>${esc(k)}</span><strong>${v}</strong></div><div class="progress" style="height:8px"><div class="progress-bar" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="${data.beneficiarios.length}" style="width:${Math.round(v/data.beneficiarios.length*100)}%"></div></div></div>`).join("") || '<div class="empty">Sem dados.</div>';
  activityFeed.innerHTML = [
    `<div class="d-flex gap-2 mb-3"><span class="text-primary"><i class="bi bi-people-fill"></i></span><span><strong>${data.beneficiarios.length}</strong> beneficiários registados</span></div>`,
    `<div class="d-flex gap-2 mb-3"><span class="text-success"><i class="bi bi-heart-pulse-fill"></i></span><span><strong>${data.medicos.filter(m=>m.avail==="Disponível").length}</strong> médicos disponíveis</span></div>`,
    `<div class="d-flex gap-2"><span class="text-warning"><i class="bi bi-calendar-event-fill"></i></span><span><strong>${data.apoios.filter(a=>a.status==="Agendado").length}</strong> apoios aguardam realização</span></div>`
  ].join("");
  renderNotifications();
}
function renderBenef(){
 const q=(benefSearch?.value||"").toLowerCase(), p=benefPriority?.value||"";
 const rows=data.beneficiarios.filter(b=>(!q||[b.name,b.phone,b.city,b.need].join(" ").toLowerCase().includes(q))&&(!p||b.priority===p));
 benefTable.innerHTML=rows.map(b=>`<tr><td><span class="avatar me-2">${esc(b.name[0])}</span><strong>${esc(b.name)}</strong><div class="small text-secondary">${esc(b.email)}</div></td><td>${esc(b.phone)}</td><td>${esc(b.city)}</td><td>${esc(b.need)}</td><td><span class="badge text-bg-${priorityBadge(b.priority)} badge-soft">${b.priority}</span></td><td><button class="btn btn-sm btn-outline-success me-1" onclick="openRoute(${b.id})" aria-label="Abrir rota para o beneficiário" title="Abrir rota"><i class="bi bi-geo-alt"></i></button><button class="btn btn-sm btn-outline-primary me-1" onclick="editBenef(${b.id})" aria-label="Editar beneficiário" title="Editar"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="deleteBenef(${b.id})" aria-label="Eliminar beneficiário" title="Eliminar"><i class="bi bi-trash"></i></button></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Nenhum beneficiário encontrado.</td></tr>';
}
function renderMed(){
 const q=(medSearch?.value||"").toLowerCase(), av=medAvailability?.value||"";
 const rows=data.medicos.filter(m=>(!q||[m.name,m.spec,m.city].join(" ").toLowerCase().includes(q))&&(!av||m.avail===av));
 medTable.innerHTML=rows.map(m=>`<tr><td><span class="avatar me-2 bg-success-subtle text-success">${esc(m.name.replace("Dr. ","").replace("Dra. ","")[0])}</span><strong>${esc(m.name)}</strong><div class="small text-secondary">${esc(m.reg)}</div></td><td>${esc(m.spec)}</td><td>${esc(m.phone)}</td><td>${esc(m.city)}</td><td><span class="badge text-bg-${m.avail==="Disponível"?"success":"warning"} badge-soft">${m.avail}</span></td><td>${qualityForDoctor(m.id)}</td><td><button class="btn btn-sm btn-outline-${m.avail==="Disponível"?"warning":"success"} me-1" onclick="toggleMedAvailability(${m.id})" title="${m.avail==="Disponível"?"Marcar em atendimento":"Marcar como disponível"}"><i class="bi bi-${m.avail==="Disponível"?"pause-circle":"play-circle"}"></i><span class="d-none d-xl-inline ms-1">${m.avail==="Disponível"?"Em atendimento":"Disponível"}</span></button><button class="btn btn-sm btn-outline-primary me-1" onclick="editMed(${m.id})" aria-label="Editar médico" title="Editar"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="deleteMed(${m.id})" aria-label="Eliminar médico" title="Eliminar"><i class="bi bi-trash"></i></button></td></tr>`).join("")||'<tr><td colspan="7" class="empty">Nenhum médico encontrado.</td></tr>';
}
function qualityForDoctor(id){
  const ratings=(data.ratings||[]).filter(r=>r.med===id);
  return ratings.length?`${Math.round(ratings.reduce((sum,r)=>sum+r.stars,0)/(ratings.length*5)*100)}%`:`Sem avaliações`;
}
function renderAvailableMedicos(){
  const rows=data.medicos.filter(m=>m.avail==="Disponível");
  availableMedTable.innerHTML=rows.map(m=>`<tr><td><span class="avatar me-2 bg-success-subtle text-success">${esc(m.name.replace("Dr. ","").replace("Dra. ","")[0])}</span><strong>${esc(m.name)}</strong></td><td>${esc(m.spec)}</td><td>${esc(m.city)}</td><td>${esc(m.areas||"—")}</td><td>${qualityForDoctor(m.id)}</td><td>${esc(m.phone)}<div class="small text-secondary">${esc(m.email)}</div></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Não existem médicos disponíveis neste momento.</td></tr>';
}
function renderApoios(){
 const canManage=currentSessionUser?.role!=="beneficiario";
  const supports=getVisibleSupports().filter(matchesApoioFilters);
 const pendingRatings=supports.filter(a=>a.status==="Realizado"&&!(data.ratings||[]).some(r=>r.apoio_id===a.id));
 ratingPrompt.classList.toggle("d-none",!pendingRatings.length||currentSessionUser?.role!=="beneficiario");
 ratingPrompt.classList.toggle("d-flex",pendingRatings.length>0&&currentSessionUser?.role==="beneficiario");
 if(pendingRatings.length&&currentSessionUser?.role==="beneficiario"){const support=pendingRatings[0];ratingPrompt.innerHTML=`<span><i class="bi bi-star-fill me-2"></i>Tem uma consulta realizada para avaliar.</span><button class="btn btn-warning btn-sm" onclick="openRatingModal(${support.id})">Avaliar agora</button>`;}
 apoioTable.innerHTML=supports.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(a=>{const rated=(data.ratings||[]).some(r=>r.apoio_id===a.id);const rateButton=currentSessionUser?.role==="beneficiario"&&a.status==="Realizado"&&!rated?`<button class="btn btn-sm btn-outline-warning" onclick="openRatingModal(${a.id})"><i class="bi bi-star me-1"></i>Classificar</button>`:rated?`<span class="badge text-bg-success badge-soft"><i class="bi bi-check2 me-1"></i>Avaliada</span>`:"";return `<tr><td><strong>${formatDate(a.date)}</strong></td><td>${esc(getBenef(a.benef)?.name||"—")}</td><td>${esc(getMed(a.med)?.name||"—")}</td><td>${esc(a.type)}</td><td>${canManage?`<select class="form-select form-select-sm" style="width:140px" onchange="changeStatus(${a.id},this.value)"><option ${a.status==="Agendado"?"selected":""}>Agendado</option><option ${a.status==="Realizado"?"selected":""}>Realizado</option><option ${a.status==="Cancelado"?"selected":""}>Cancelado</option></select>`:`<span class="badge text-bg-${a.status==="Realizado"?"success":a.status==="Cancelado"?"secondary":"primary"} badge-soft">${esc(a.status)}</span>`}</td><td>${canManage?`<button class="btn btn-sm btn-outline-danger" onclick="deleteApoio(${a.id})"><i class="bi bi-trash"></i></button>`:rateButton||"—"}</td></tr>`}).join("")||'<tr><td colspan="6" class="empty">Nenhum apoio agendado.</td></tr>';
  renderCalendar(supports);
}
function setApoioView(view){
  const calendar=view==="calendar";
  apoioListView.classList.toggle("d-none",calendar);
  apoioCalendarView.classList.toggle("d-none",!calendar);
  calendarControls.classList.toggle("d-none",!calendar);
  calendarControls.classList.toggle("d-flex",calendar);
  listViewButton.classList.toggle("btn-primary",!calendar); listViewButton.classList.toggle("btn-outline-primary",calendar);
  calendarViewButton.classList.toggle("btn-primary",calendar); calendarViewButton.classList.toggle("btn-outline-primary",!calendar);
  if(calendar)renderCalendar(getVisibleSupports().filter(matchesApoioFilters));
}
function changeCalendarMonth(offset){calendarViewDate.setMonth(calendarViewDate.getMonth()+offset);renderCalendar(getVisibleSupports().filter(matchesApoioFilters));}
function calendarDateKey(year,month,day){return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;}
function renderCalendar(supports){
  const year=calendarViewDate.getFullYear(), month=calendarViewDate.getMonth();
  calendarMonthLabel.textContent=calendarViewDate.toLocaleDateString("pt-PT",{month:"long",year:"numeric"});
  const firstDay=(new Date(year,month,1).getDay()+6)%7, daysInMonth=new Date(year,month+1,0).getDate(), previousDays=new Date(year,month,0).getDate();
  const weekdays=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  let html=weekdays.map(day=>`<div class="calendar-weekday">${day}</div>`).join("");
  const today=new Date().toISOString().slice(0,10);
  for(let index=0;index<42;index++){
    const dayNumber=index-firstDay+1, isPrevious=dayNumber<1, isNext=dayNumber>daysInMonth;
    const day=isPrevious?previousDays+dayNumber:isNext?dayNumber-daysInMonth:dayNumber;
    const cellMonth=isPrevious?month-1:isNext?month+1:month, cellYear=year+(cellMonth<0?-1:cellMonth>11?1:0), normalizedMonth=(cellMonth+12)%12;
    const key=calendarDateKey(cellYear,normalizedMonth,day), daySupports=supports.filter(a=>a.date.slice(0,10)===key);
    html+=`<div class="calendar-day ${isPrevious||isNext?"muted":""} ${key===today?"today":""}"><div class="calendar-number"><span>${day}</span>${daySupports.length?`<span class="badge rounded-pill text-bg-light">${daySupports.length}</span>`:""}</div>${daySupports.map(a=>`<button class="calendar-event ${a.status==="Realizado"?"done":a.status==="Cancelado"?"cancelled":"scheduled"}" type="button" title="${esc(`${formatDate(a.date)} — ${getBenef(a.benef)?.name||"Beneficiário"} — ${a.status}`)}">${esc(getBenef(a.benef)?.name||"Apoio")} · ${esc(a.status)}</button>`).join("")}</div>`;
  }
  apoioCalendar.innerHTML=html;
}
function getVisibleSupports(){
  const beneficiaryId=currentSessionUser?.role==="beneficiario"?data.beneficiarios.find(b=>b.name===currentSessionUser.name&&b.email===currentSessionUser.email)?.id:null;
  if(beneficiaryId)return data.apoios.filter(a=>a.benef===beneficiaryId);
  if(currentSessionUser?.role==="medico"){
    const volunteer=data.medicos.find(item=>item.profile_id===currentSessionUser.id);
    return volunteer?data.apoios.filter(a=>a.med===volunteer.id):[];
  }
  return data.apoios;
}
function matchesApoioFilters(a){
  const query=(apoioSearch?.value||"").trim().toLowerCase();
  const status=apoioStatus?.value||"";
  const dateFilter=apoioDateFilter?.value||"all";
  const text=[getBenef(a.benef)?.name,getMed(a.med)?.name,a.type].join(" ").toLowerCase();
  const date=new Date(a.date), now=new Date(), today=now.toISOString().slice(0,10), dateOnly=a.date.slice(0,10);
  return (!query||text.includes(query))&&(!status||a.status===status)&&(
    dateFilter==="all"||
    (dateFilter==="today"&&dateOnly===today)||
    (dateFilter==="upcoming"&&date>=now&&a.status!=="Cancelado")||
    (dateFilter==="past"&&date<now)
  );
}
function clearApoioFilters(){
  apoioSearch.value=""; apoioStatus.value=""; apoioDateFilter.value="all"; renderApoios();
}
function renderNotifications(){
  const pendingRatings=getVisibleSupports().filter(a=>a.status==="Realizado"&&!(data.ratings||[]).some(r=>r.apoio_id===a.id));
  const today=new Date().toISOString().slice(0,10);
  const todaySupports=getVisibleSupports().filter(a=>a.status==="Agendado"&&a.date.slice(0,10)===today);
  const messages=[];
  if(pendingRatings.length&&currentSessionUser?.role==="beneficiario")messages.push(`<i class="bi bi-star-fill text-warning me-2"></i>${pendingRatings.length} avaliação(ões) pendente(s)`);
  if(todaySupports.length)messages.push(`<i class="bi bi-calendar-event text-primary me-2"></i>${todaySupports.length} apoio(s) agendado(s) para hoje`);
  if(currentSessionUser?.role!=="beneficiario"){
    const priorities=data.beneficiarios.filter(b=>b.priority==="Alta").length;
    if(priorities)messages.push(`<i class="bi bi-exclamation-circle text-danger me-2"></i>${priorities} caso(s) de prioridade alta`);
    const pendingRequests=(data.requests||[]).filter(request=>request.status==="Pendente").length;
    if(pendingRequests)messages.push(`<i class="bi bi-inbox text-primary me-2"></i>${pendingRequests} pedido(s) de apoio pendente(s)`);
  }
  const button=document.getElementById("notificationButton"), badge=document.getElementById("notificationCount");
  badge.textContent=messages.length; badge.classList.toggle("d-none",!messages.length);
  const popover=bootstrap.Popover.getOrCreateInstance(button);
  popover.setContent({".popover-body":messages.length?messages.map(message=>`<div class="mb-2">${message}</div>`).join(""):"Sem novas notificações."});
}
function renderComments(){
  commentsTable.innerHTML=data.apoios.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(a=>{const rating=(data.ratings||[]).find(r=>r.apoio_id===a.id);return `<tr><td>${formatDate(a.date)}</td><td>${esc(getBenef(a.benef)?.name||"—")}</td><td>${esc(a.type)}</td><td><span class="badge text-bg-${a.status==="Realizado"?"success":a.status==="Cancelado"?"secondary":"primary"} badge-soft">${esc(a.status)}</span></td><td>${esc(a.notes||"Sem notas.")}</td><td>${rating?`${"★".repeat(rating.stars)}${"☆".repeat(5-rating.stars)}<div class="small mt-1">${esc(rating.comment)}</div>`:"Ainda sem avaliação."}</td></tr>`}).join("")||'<tr><td colspan="6" class="empty">Ainda não existem consultas.</td></tr>';
}
function openRatingModal(supportId){
  ratingSupportId.value=supportId;
  ratingStars.value="";
  ratingComment.value="";
  document.querySelectorAll(".rating-star").forEach(button=>button.classList.remove("active","bg-warning","text-white"));
  const modal=bootstrap.Modal.getOrCreateInstance(document.getElementById("ratingModal"));
  modal.show();
  document.getElementById("ratingModal").addEventListener("shown.bs.modal",()=>ratingComment.focus(),{once:true});
}
document.querySelectorAll(".rating-star").forEach(button=>button.onclick=()=>{
  const stars=Number(button.dataset.stars);
  ratingStars.value=stars;
  document.querySelectorAll(".rating-star").forEach(item=>{
    const active=Number(item.dataset.stars)<=stars;
    item.classList.toggle("active",active);
    item.classList.toggle("bg-warning",active);
    item.classList.toggle("text-white",active);
  });
});
ratingForm.onsubmit=async event=>{
  event.preventDefault();
  if(!ratingStars.value){toast("Escolha uma classificação de 1 a 5 estrelas.");return;}
  if(!usesSupabase()){toast("Supabase não está configurado.");return;}
  const result=await supabaseClient.from("ratings").insert({support_id:Number(ratingSupportId.value),author_id:currentSessionUser.id,stars:Number(ratingStars.value),comment:ratingComment.value.trim()});
  if(result.error){toast(result.error.message||"Não foi possível guardar a classificação.");return}
  bootstrap.Modal.getInstance(ratingModal).hide();
  await loadData();
  toast("Obrigado pela sua avaliação.");
};
function renderReports(){
  rBenef.textContent=data.beneficiarios.length;rMed.textContent=data.medicos.length;rDone.textContent=data.apoios.filter(x=>x.status==="Realizado").length;rPending.textContent=data.apoios.filter(x=>x.status==="Agendado").length;
  const statuses=["Agendado","Realizado","Cancelado"], colors={Agendado:"primary",Realizado:"success",Cancelado:"secondary"};
  reportStatusChart.innerHTML=statuses.map(status=>{const total=data.apoios.filter(item=>item.status===status).length;const percent=data.apoios.length?Math.round(total/data.apoios.length*100):0;return `<div class="mb-3"><div class="d-flex justify-content-between small mb-1"><span>${status}</span><strong>${total} (${percent}%)</strong></div><div class="progress" style="height:9px"><div class="progress-bar bg-${colors[status]}" style="width:${percent}%" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"></div></div></div>`}).join("");
}
function renderAll(){renderDashboard();renderBenef();renderMed();renderAvailableMedicos();renderApoios();renderComments();renderReports();}

function renderRequests(){
  if(!document.getElementById("requestsTable"))return;
  const canManage=currentSessionUser?.role==="admin";
  requestsTable.innerHTML=(data.requests||[]).map(request=>`<tr><td><strong>${esc(request.subject)}</strong><div class="small text-secondary text-truncate" style="max-width:320px">${esc(request.description)}</div></td><td>${esc(request.beneficiary_name||"—")}</td><td><span class="badge text-bg-${priorityBadge(request.priority)} badge-soft">${esc(request.priority)}</span></td><td>${formatDate(request.created_at)}</td><td>${canManage?`<select class="form-select form-select-sm" onchange="changeRequestStatus(${request.id},this.value)"><option ${request.status==="Pendente"?"selected":""}>Pendente</option><option ${request.status==="Em análise"?"selected":""}>Em análise</option><option ${request.status==="Aceite"?"selected":""}>Aceite</option><option ${request.status==="Concluído"?"selected":""}>Concluído</option><option ${request.status==="Cancelado"?"selected":""}>Cancelado</option></select>`:`<span class="badge text-bg-${request.status==="Concluído"?"success":request.status==="Cancelado"?"secondary":"primary"} badge-soft">${esc(request.status)}</span>`}</td><td>${canManage?`<button class="btn btn-sm btn-outline-primary" onclick="changeRequestStatus(${request.id},'Em análise')" title="Assumir pedido"><i class="bi bi-arrow-right-circle"></i></button>`:"—"}</td></tr>`).join("")||'<tr><td colspan="6" class="empty">Ainda não existem pedidos de apoio.</td></tr>';
}
function openRequestModal(){requestForm.reset();bootstrap.Modal.getOrCreateInstance(requestModal).show();}
requestForm.onsubmit=async event=>{
  event.preventDefault();
  if(!usesSupabase()){toast("Supabase não está configurado.");return;}
  const ownBeneficiary=data.beneficiarios.find(item=>item.profile_id===currentSessionUser.id);
  const result=await supabaseClient.from("support_requests").insert({beneficiary_id:ownBeneficiary?.id||null,subject:requestSubject.value.trim(),description:requestDescription.value.trim(),priority:requestPriority.value});
  if(result.error){toast(result.error.message||"Não foi possível enviar o pedido.");return}
  bootstrap.Modal.getInstance(requestModal).hide();await loadRequestsData(true);toast("Pedido de apoio enviado.");
};
async function changeRequestStatus(id,status){
  if(!usesSupabase()){toast("Supabase não está configurado.");return;}
  const result=await supabaseClient.from("support_requests").update({status}).eq("id",id);
  if(result.error){toast("Não foi possível atualizar o pedido.");return}
  await loadRequestsData(true);toast("Estado do pedido atualizado.");
}

function formatDate(s){const d=new Date(s);return Number.isNaN(d.getTime())?"—":d.toLocaleString("pt-PT",{dateStyle:"short",timeStyle:"short"})}
function openRoute(id){
  const beneficiary=getBenef(id);
  if(!beneficiary)return;
  const destination=[beneficiary.address,beneficiary.city].filter(Boolean).join(", ");
  if(!destination){toast("Adicione a morada ou localidade do beneficiário primeiro.");return;}
  const openMaps=origin=>{
    const params=new URLSearchParams({api:"1",destination});
    if(origin)params.set("origin",origin);
    params.set("travelmode","driving");
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`,"_blank","noopener");
  };
  if(!navigator.geolocation){openMaps();return;}
  navigator.geolocation.getCurrentPosition(
    position=>openMaps(`${position.coords.latitude},${position.coords.longitude}`),
    ()=>openMaps(),
    {enableHighAccuracy:true,timeout:8000,maximumAge:300000}
  );
}
function openBenefModal(id=null){
 benefForm.reset();benefId.value=id||"";benefModalTitle.textContent=id?"Editar beneficiário":"Novo beneficiário";
 if(id){const b=getBenef(id);Object.entries({bName:b.name,bBirth:b.birth,bPriority:b.priority,bPhone:b.phone,bEmail:b.email,bAddress:b.address,bCity:b.city,bNeed:b.need,bEmergency:b.emergency,bNotes:b.notes}).forEach(([k,v])=>document.getElementById(k).value=v||"")}
 bootstrap.Modal.getOrCreateInstance(benefModal).show();
}
function editBenef(id){openBenefModal(id)}
benefForm.onsubmit=e=>{e.preventDefault();const id=+benefId.value||nextId(data.beneficiarios), obj={id,name:bName.value,birth:bBirth.value,priority:bPriority.value,phone:bPhone.value,email:bEmail.value,address:bAddress.value,city:bCity.value,need:bNeed.value,emergency:bEmergency.value,notes:bNotes.value};const i=data.beneficiarios.findIndex(x=>x.id===id);i>=0?data.beneficiarios[i]=obj:data.beneficiarios.push(obj);save();bootstrap.Modal.getInstance(benefModal).hide();renderAll();toast("Beneficiário guardado com sucesso.");}
async function deleteBenef(id){if(confirm("Eliminar este beneficiário?")){if(usesSupabase()){const result=await supabaseClient.from("beneficiaries").delete().eq("id",id);if(result.error){toast("Não foi possível eliminar o beneficiário.");return}}data.beneficiarios=data.beneficiarios.filter(x=>x.id!==id);data.apoios=data.apoios.filter(x=>x.benef!==id);await save();renderAll();toast("Beneficiário eliminado.");}}

function openMedModal(id=null){
 medForm.reset();medId.value=id||"";medModalTitle.textContent=id?"Editar médico voluntário":"Novo médico voluntário";
 if(id){const m=getMed(id);Object.entries({mName:m.name,mSpec:m.spec,mPhone:m.phone,mEmail:m.email,mCity:m.city,mAvail:m.avail,mReg:m.reg,mAreas:m.areas}).forEach(([k,v])=>document.getElementById(k).value=v||"")}
 bootstrap.Modal.getOrCreateInstance(medModal).show();
}
function editMed(id){openMedModal(id)}
async function toggleMedAvailability(id){
  const med=data.medicos.find(x=>x.id===id);
  if(!med)return;
  med.avail=med.avail==="Disponível"?"Em atendimento":"Disponível";
  await save();
  renderAll();
  toast(`${med.name} está agora ${med.avail.toLowerCase()}.`);
}
medForm.onsubmit=e=>{e.preventDefault();const id=+medId.value||nextId(data.medicos),obj={id,name:mName.value,spec:mSpec.value,phone:mPhone.value,email:mEmail.value,city:mCity.value,avail:mAvail.value,reg:mReg.value,areas:mAreas.value};const i=data.medicos.findIndex(x=>x.id===id);i>=0?data.medicos[i]=obj:data.medicos.push(obj);save();bootstrap.Modal.getInstance(medModal).hide();renderAll();toast("Médico guardado com sucesso.");}
async function deleteMed(id){if(confirm("Eliminar este médico? Os apoios associados também serão removidos.")){if(usesSupabase()){const result=await supabaseClient.from("volunteers").delete().eq("id",id);if(result.error){toast("Não foi possível eliminar o médico.");return}}data.medicos=data.medicos.filter(x=>x.id!==id);data.apoios=data.apoios.filter(x=>x.med!==id);await save();renderAll();toast("Médico eliminado.");}}

function fillApoioSelects(){
  const beneficiaryId=currentSessionUser?.role==="beneficiario"?data.beneficiarios.find(b=>b.name===currentSessionUser.name&&b.email===currentSessionUser.email)?.id:null;
  const beneficiaries=beneficiaryId?data.beneficiarios.filter(b=>b.id===beneficiaryId):data.beneficiarios;
  aBenef.innerHTML='<option value="">Selecione...</option>'+beneficiaries.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join("");
  aMed.innerHTML='<option value="">Selecione...</option>'+data.medicos.filter(m=>m.avail==="Disponível").map(m=>`<option value="${m.id}">${esc(m.name)} — ${esc(m.spec)}</option>`).join("");
}
function openApoioModal(){if(!data.beneficiarios.length||!data.medicos.length){alert("Registe pelo menos um beneficiário e um médico antes de agendar.");return}fillApoioSelects();apoioForm.reset();if(currentSessionUser?.role==="beneficiario"){const beneficiary=data.beneficiarios.find(b=>b.name===currentSessionUser.name&&b.email===currentSessionUser.email);if(beneficiary)aBenef.value=beneficiary.id;}aDate.value=new Date(Date.now()+86400000).toISOString().slice(0,16);bootstrap.Modal.getOrCreateInstance(apoioModal).show();}
function hasMedScheduleConflict(medId,date,duration,idToIgnore=null){
 const selectedStart=new Date(date).getTime();
 const selectedEnd=selectedStart+(Number(duration)||60)*60000;
 return Number.isFinite(selectedStart)&&data.apoios.some(item=>{
   if(item.med!==medId||item.id===idToIgnore||item.status==="Cancelado")return false;
   const start=new Date(item.date).getTime();
   const end=start+(Number(item.duration)||60)*60000;
   return selectedStart<end&&start<selectedEnd;
 });
}
apoioForm.onsubmit=async e=>{
  e.preventDefault();
  const selectedDate=aDate.value;
  const selectedMed=+aMed.value;
  const duration=Number(aDuration.value)||60;
  if(new Date(selectedDate).getTime()<=Date.now()){
    alert("A consulta tem de ser marcada para uma data e hora futuras.");
    aDate.focus();
    return;
  }
  if(hasMedScheduleConflict(selectedMed,selectedDate,duration)){
    const doctorName=getMed(selectedMed)?.name||"O médico selecionado";
    alert(`${doctorName} já tem um apoio agendado para ${formatDate(selectedDate)}. Escolha outro horário ou outro médico.`);
    aDate.focus();
    return;
  }
  data.apoios.push({id:nextId(data.apoios),date:selectedDate,duration,benef:+aBenef.value,med:selectedMed,type:aType.value,status:"Agendado",notes:aNotes.value});
  const saved=await save();
  if(!saved&&usesSupabase()){data.apoios.pop();renderAll();return;}
  bootstrap.Modal.getInstance(apoioModal).hide();
  renderAll();
  toast("Apoio agendado com sucesso.");
}
function changeStatus(id,status){const a=data.apoios.find(x=>x.id===id);if(a){a.status=status;save();renderAll();toast("Estado atualizado.");}}
async function deleteApoio(id){if(confirm("Eliminar este apoio?")){if(usesSupabase()){const result=await supabaseClient.from("supports").delete().eq("id",id);if(result.error){toast("Não foi possível eliminar o apoio.");return}}data.apoios=data.apoios.filter(x=>x.id!==id);await save();renderAll();toast("Apoio eliminado.");}}
function exportData(){
  const payload={exportedAt:new Date().toISOString(),application:"Apoio+",version:"2.0",data};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="apoio-plus-export-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url);toast("Dados exportados.");
}
function exportCsv(){
  const rows=[["Tipo","Nome/Assunto","Estado/Prioridade","Data","Detalhe"]];
  data.beneficiarios.forEach(item=>rows.push(["Beneficiário",item.name,item.priority,"",item.need]));
  data.medicos.forEach(item=>rows.push(["Médico",item.name,item.avail,"",item.spec]));
  data.apoios.forEach(item=>rows.push(["Apoio",getBenef(item.benef)?.name||"",item.status,item.date,getMed(item.med)?.name||""]));
  (data.requests||[]).forEach(item=>rows.push(["Pedido",item.subject,item.priority,item.created_at,item.status]));
  const csv=rows.map(row=>row.map(value=>`"${String(value??"").replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`apoio-plus-relatorio-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);toast("Relatório CSV exportado.");
}
async function resetData(){if(confirm("Apagar todos os dados da aplicação no Supabase?")){if(!usesSupabase()){toast("Supabase não está configurado.");return;}const operations=await Promise.all(["ratings","supports","support_requests","volunteers","beneficiaries"].map(table=>supabaseClient.from(table).delete().not("id","is",null)));const failure=operations.find(result=>result.error);if(failure){toast("Não foi possível apagar os dados no Supabase.");return;}await loadData();await loadRequestsData();toast("Dados apagados.");}}
logoutButton.onclick=async()=>{try{if(supabaseClient)await supabaseClient.auth.signOut();}finally{currentSessionUser=null;clearInterval(refreshTimer);document.getElementById("appShell").style.display="none";document.getElementById("authScreen").style.display="none";document.getElementById("roleScreen").style.display="none";document.getElementById("entryScreen").style.display="flex";toast("Sessão terminada.");}};
benefSearch.oninput=renderBenef;benefPriority.onchange=renderBenef;medSearch.oninput=renderMed;medAvailability.onchange=renderMed;
apoioSearch.oninput=renderApoios;apoioStatus.onchange=renderApoios;apoioDateFilter.onchange=renderApoios;
renderAll();
