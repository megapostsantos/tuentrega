# Publicar o TuEntrega na Google Play

O app é um PWA (manifest + service worker já incluídos). Para a Play Store ele é empacotado como TWA
(Trusted Web Activity): um app Android que abre o site em tela cheia, sem barra do navegador.

## Antes de começar
1. **Domínio próprio com HTTPS** (ex.: `app.tuentrega.com.br`) apontando para o Cloudflare Worker.
   Troque também `BETTER_AUTH_URL` (secret no Cloudflare) e `trustedOrigins` em `src/lib/auth.ts`.
2. Conta de desenvolvedor Google Play (US$ 25, pagamento único) e verificação de identidade.
3. Já pronto no projeto: `/manifest.webmanifest`, `/sw.js`, `/offline.html`, ícones em `/icons/`,
   `/privacidade` (política de privacidade) e `/excluir-conta` (exclusão de conta, exigida pela Play).

## Gerar o app (.aab)
1. Acesse https://www.pwabuilder.com, informe a URL do app e gere o pacote **Android**.
   - Package ID sugerido: `br.com.tuentrega.app` (não muda depois de publicado).
   - Marque "Signing key": gere uma nova e **guarde o arquivo .keystore e as senhas** (sem elas não há como atualizar o app).
2. Baixe o `.aab` e o `assetlinks.json` que o PWABuilder fornece.

## Digital Asset Links (remove a barra do navegador)
1. Pegue o SHA-256 do certificado de assinatura (Play Console → Integridade do app → Assinatura de apps).
2. Crie `public/.well-known/assetlinks.json` no projeto, usando `docs/assetlinks.template.json`
   com o package ID e o SHA-256, faça deploy e confira em `https://SEU-DOMINIO/.well-known/assetlinks.json`.

## Play Console
- Crie o app → envie o `.aab` na faixa de **teste interno** primeiro.
- Ficha da loja: nome, descrição curta/longa, ícone 512×512 (`public/icons/icon-512.png`),
  imagem de destaque 1024×500 e pelo menos 2 capturas de tela do celular.
- **Política de privacidade:** `https://SEU-DOMINIO/privacidade`
- **Exclusão de conta:** `https://SEU-DOMINIO/excluir-conta`
- Segurança dos dados: declare coleta de nome, e-mail, telefone, CPF/CNPJ, localização (durante o uso),
  fotos e informações financeiras (chave PIX).
- Contas de teste: informe um login de revisor (empresa e entregador) em "Acesso ao app".
- Contas novas (pessoais) precisam de teste fechado com 12 testadores por 14 dias antes da produção.

## Limitação importante: localização em segundo plano
No TWA o GPS só funciona com o app aberto na tela. Se o rastreio precisar continuar com a tela bloqueada,
use o Capacitor com plugin de localização em segundo plano (a Play exige declaração e justificativa para isso).
