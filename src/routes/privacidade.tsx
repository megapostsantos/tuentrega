import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { CONTATO_WHATSAPP, CONTATO_TELEFONE } from "@/lib/contato";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Política de Privacidade — TuEntrega" }] }),
  component: PrivacyPage,
});

const ATUALIZADO_EM = "14 de outubro de 2026";

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/"><Logo /></Link>
      <h1 className="mt-8 text-3xl font-bold">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-muted-foreground">Atualizada em {ATUALIZADO_EM}</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">1. Quem somos</h2>
          <p>
            A TuEntrega é uma plataforma que conecta empresas a entregadores para serviços de entrega de último
            quilômetro. Esta política explica como tratamos seus dados pessoais, conforme a Lei Geral de Proteção
            de Dados (Lei 13.709/2018 — LGPD).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Dados que coletamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Cadastro: nome, e-mail, senha (armazenada de forma criptografada), telefone/WhatsApp.</li>
            <li>Empresas: razão social, CNPJ, endereço, segmento e responsável.</li>
            <li>Entregadores: CPF, CNPJ (se houver), data de nascimento, endereço, veículo e placa, turnos, dados de chave PIX e banco, selfie e comprovantes.</li>
            <li>Operação: ofertas, rotas, pacotes, endereços de entrega, assinatura e foto de comprovação de entrega, notas fiscais e ocorrências.</li>
            <li>Localização: posição do entregador durante uma rota ativa, para acompanhamento da entrega.</li>
            <li>Dados técnicos: tipo de dispositivo, navegador e registros de acesso.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Para que usamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Criar e manter sua conta e autenticar seu acesso.</li>
            <li>Distribuir ofertas e rotas, acompanhar entregas e emitir comprovantes.</li>
            <li>Realizar pagamentos e conciliações financeiras via PIX.</li>
            <li>Calcular a confiabilidade do entregador e prevenir fraudes.</li>
            <li>Enviar avisos sobre ofertas, entregas e pagamentos (inclusive por WhatsApp).</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Localização</h2>
          <p>
            A localização do entregador é coletada somente enquanto há uma rota ativa e o aplicativo está em uso, e
            é compartilhada com a empresa contratante e com o destinatário do pacote para fins de rastreio.
            Você pode desativar a permissão nas configurações do dispositivo, mas o acompanhamento da rota ficará indisponível.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Com quem compartilhamos</h2>
          <p>
            Compartilhamos dados apenas quando necessário para a prestação do serviço: entre empresa e entregador
            envolvidos na operação, com o destinatário (rastreio), com provedores de infraestrutura (hospedagem e
            banco de dados), com serviços de mensagens e com autoridades quando exigido por lei. Não vendemos dados pessoais.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Por quanto tempo guardamos</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa e pelo prazo necessário para cumprir obrigações
            legais, fiscais e de defesa em processos. Após esse período, os dados são excluídos ou anonimizados.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Seus direitos</h2>
          <p>
            Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, informação
            sobre compartilhamento e a exclusão dos seus dados. Para excluir sua conta diretamente, acesse{" "}
            <Link to="/excluir-conta" className="text-primary underline">Excluir minha conta</Link>. Para outras solicitações,
            fale conosco pelo WhatsApp <a className="text-primary underline" href={CONTATO_WHATSAPP}>{CONTATO_TELEFONE}</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Segurança</h2>
          <p>
            Adotamos medidas técnicas e administrativas para proteger seus dados, como conexão criptografada (HTTPS),
            senhas armazenadas com hash e controle de acesso por perfil.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Alterações e contato</h2>
          <p>
            Podemos atualizar esta política; a data de atualização fica no topo da página. Dúvidas:{" "}
            <a className="text-primary underline" href={CONTATO_WHATSAPP}>WhatsApp {CONTATO_TELEFONE}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
