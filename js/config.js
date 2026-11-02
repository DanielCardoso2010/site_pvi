/* =========================================================
   QuestãoCerta — configuração do servidor (Supabase)

   1) Crie um projeto grátis em https://supabase.com
   2) Em Project Settings > API, copie:
        - "Project URL"               -> SUPABASE_URL
        - "anon public" (chave pública) -> SUPABASE_ANON_KEY
   3) Cole abaixo, entre as aspas.

   A chave "anon" É PÚBLICA por natureza: pode ficar no GitHub.
   Quem protege os dados são as regras do banco (banco/schema.sql).
   NUNCA coloque aqui a chave "service_role" (essa é secreta).
   ========================================================= */
window.QC_CONFIG = {
  SUPABASE_URL: "https://mugehoakktgtxqefturm.supabase.co/rest/v1/",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11Z2Vob2Fra3RndHhxZWZ0dXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MzE3MTIsImV4cCI6MjEwOTIwNzcxMn0.7sPQeLAp3HgEBJ6FvOtRvUiHXJYtzwlIRrWxO8dTVMc",
};
