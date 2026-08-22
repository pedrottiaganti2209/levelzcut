import * as Sentry from '@sentry/react';

// Monitoramento de erro em runtime (Sentry, free tier).
//
// Fica atrás de VITE_SENTRY_DSN, exatamente como o Supabase e o
// VITE_REQUIRE_AUTH: sem a variável definida, nada é inicializado — zero
// impacto no app. Isso evita depender de uma conta/projeto do Sentry que a
// squad não tem, e evita mandar erros de ambientes de dev/preview sem DSN
// configurado.
const dsn = import.meta.env.VITE_SENTRY_DSN;

export const sentryEnabled = !!dsn;

export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Não captura PII (IP, cookies, headers etc. das requisições). Nunca
    // chamamos Sentry.setUser() nem anexamos valores de faturamento aos
    // eventos — ver reportError() abaixo.
    sendDefaultPii: false,
    // Sem tracing de performance: fora do escopo desta história e evita
    // consumir a cota gratuita mais rápido do que precisa.
    tracesSampleRate: 0,
  });
}

/**
 * Reporta um erro pro Sentry com um rótulo curto de contexto (ex.:
 * "storage.loadRemote"), sem incluir dado de faturamento nem qualquer
 * payload de usuário — só o próprio objeto de erro (mensagem/código),
 * que no caso dos erros do Supabase já vem sem valores de cortes/receita.
 * No-op quando o Sentry não está configurado (VITE_SENTRY_DSN ausente).
 */
export function reportError(error: unknown, context: string): void {
  if (!dsn) return;
  Sentry.captureException(error, { tags: { context } });
}
