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
  SUPABASE_URL: "COLE_AQUI_A_URL_DO_PROJETO",
  SUPABASE_ANON_KEY: "COLE_AQUI_A_CHAVE_ANON_PUBLICA",
};
