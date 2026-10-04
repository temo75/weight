const ADMIN_EMAIL="temo75elia@gmail.com";

function corsHeaders(origin){
  return {
    "Access-Control-Allow-Origin":origin||"*",
    "Access-Control-Allow-Headers":"Content-Type,Authorization",
    "Access-Control-Allow-Methods":"POST,OPTIONS",
    "Content-Type":"application/json; charset=utf-8"
  };
}

function json(data,status=200,origin="*"){
  return new Response(JSON.stringify(data),{status,headers:corsHeaders(origin)});
}

export default {
  async fetch(request,env){
    const origin=request.headers.get("Origin")||"*";
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(origin)});
    if(request.method!=="POST")return json({error:"POST only"},405,origin);

    try{
      const body=await request.json();
      const action=String(body?.action||"");

      // Admin actions will be enabled after Firebase Admin credentials
      // are configured in this Worker. No user/password data is accepted here.
      if(action==="health"){
        return json({ok:true,service:"TEMO WEIGHT Admin",adminEmail:ADMIN_EMAIL},200,origin);
      }

      return json({error:"Admin service is not configured yet"},503,origin);
    }catch(e){
      return json({error:"Worker error",detail:String(e?.message||e)},500,origin);
    }
  }
};