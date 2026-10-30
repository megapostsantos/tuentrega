import type { PassoDemo } from "@/components/ajuda/PhoneDemo";

export type Perfil = "dono" | "funcionario" | "entregador";

export type Guia = {
  id: string;
  titulo: string;
  resumo: string;
  perfis: Perfil[];
  tempo: string;
  /** tela do app onde o guia se aplica (botão "Abrir esta tela") */
  tela?: string;
  passos: PassoDemo[];
  dicas?: string[];
};

export const GUIAS: Guia[] = [
  // ---------------------------------------------------------------- EMPRESA
  {
    id: "montar-operacao",
    titulo: "Montar a operação do dia",
    resumo: "Cadastre os pacotes e cole a lista de zonas do marketplace.",
    perfis: ["dono", "funcionario"],
    tempo: "2 min",
    tela: "/pacotes",
    passos: [
      { titulo: "Abra Pacotes e toque em Nova operação", texto: "É aqui que começa o dia: toda operação nasce em Pacotes.", barra: "Pacotes", elementos: [{ t: "item", titulo: "Nenhuma operação ainda", sub: "Comece cadastrando os pacotes do dia" }, { t: "botao", texto: "+ Nova operação", destaque: true }] },
      { titulo: "Escolha a data e informe o total de pacotes", texto: "Dá para criar hoje a operação de amanhã: as ofertas já aparecem para os entregadores com a data. As paradas são opcionais.", barra: "Nova operação · Etapa 1 de 4", elementos: [{ t: "campo", rotulo: "Data da operação", valor: "02/11/2026", destaque: true }, { t: "botoes", itens: [{ texto: "Hoje" }, { texto: "Amanhã", ativo: true }, { texto: "Depois de amanhã" }] }, { t: "campo", rotulo: "Total de pacotes", valor: "1982" }, { t: "campo", rotulo: "Total de paradas (opcional)", valor: "" }] },
      { titulo: "Na etapa 2, escolha “Colar lista de zonas”", texto: "É o jeito mais rápido quando você tem muitas zonas.", barra: "Como dividir as rotas?", elementos: [{ t: "item", titulo: "Divisão automática" }, { t: "item", titulo: "Colar lista de zonas", sub: "Ideal para muitas zonas", destaque: true }, { t: "item", titulo: "Divisão manual" }, { t: "item", titulo: "Rota única" }] },
      { titulo: "Copie a tela do marketplace e cole", texto: "Copie “Distribuição por zonas” (zona, paradas e pacotes) e cole no campo. O sistema lê tudo sozinho e mostra a soma. Se o total não bater, toque em “Usar os totais da lista”.", barra: "Colar lista de zonas", elementos: [{ t: "botoes", itens: [{ texto: "Da tela do marketplace", ativo: true }, { texto: "Nome e pacotes" }] }, { t: "campo", rotulo: "Cole aqui", valor: "Mega 16 135\nVila 63 118\nMarape 39 53\nGonzaga 1 54 101\n…", grande: true, destaque: true }, { t: "aviso", texto: "21 zonas · 1982 / 1982 pacotes ✓", tom: "ok" }] },
      { titulo: "Revise e crie a operação", texto: "Cada zona vira uma rota. Confira os nomes e as quantidades.", barra: "Revisão e ajustes", elementos: [{ t: "item", titulo: "Mega", sub: "135 pacotes · 16 paradas" }, { t: "item", titulo: "Vila", sub: "118 pacotes · 63 paradas" }, { t: "item", titulo: "Marape", sub: "53 pacotes · 39 paradas" }, { t: "botao", texto: "Criar operação", destaque: true }] },
      { titulo: "Pronto: publique ou aloque", texto: "Escolha “Publicar como Oferta” para abrir as rotas no mercado, ou vá em Ver operação para escolher quem leva cada rota.", barra: "Operação criada!", elementos: [{ t: "aviso", texto: "Operação criada com sucesso ✓", tom: "ok" }, { t: "botao", texto: "📢 Publicar como Oferta", destaque: true }, { t: "botao", texto: "📋 Ver operação", claro: true }] },
    ],
    dicas: ["O valor por pacote usado é o padrão definido pelo dono. Funcionários não veem nem digitam valores.", "Errou uma rota? No detalhe da operação use “Ajustar rotas” para mover pacotes entre zonas."],
  },
  {
    id: "alocar-parceiros",
    titulo: "Escolher quem leva cada rota",
    resumo: "Atribua parceiros às rotas e inicie a operação.",
    perfis: ["dono", "funcionario"],
    tempo: "1 min",
    tela: "/pacotes",
    passos: [
      { titulo: "Abra a operação e vá em “Quem leva cada rota”", texto: "Em Pacotes, toque em Ver detalhes da operação. O primeiro bloco mostra todas as rotas e quem já está atribuído.", barra: "Operação de hoje", elementos: [{ t: "titulo", texto: "Quem leva cada rota (0/3)" }, { t: "item", titulo: "Mega", sub: "135 pacotes", badge: "sem parceiro", tom: "erro", destaque: true }, { t: "item", titulo: "Vila", sub: "118 pacotes", badge: "sem parceiro", tom: "erro" }] },
      { titulo: "Escolha o parceiro e toque em Atribuir", texto: "Quem já confirmou na agenda do dia aparece primeiro, com ★. Não precisa publicar a oferta antes: ela é criada sozinha.", barra: "Operação de hoje", elementos: [{ t: "item", titulo: "Mega", sub: "135 pacotes" }, { t: "campo", rotulo: "Parceiro", valor: "★ Alcino", destaque: true }, { t: "botao", texto: "Atribuir", destaque: true }] },
      { titulo: "Quer distribuir de uma vez?", texto: "Se há parceiros confirmados na agenda, use “Distribuir entre os confirmados”. O sistema atribui as rotas livres em sequência.", barra: "Operação de hoje", elementos: [{ t: "item", titulo: "Mega", badge: "✅ Alcino", tom: "ok" }, { t: "item", titulo: "Vila", badge: "sem parceiro", tom: "erro" }, { t: "botao", texto: "Distribuir entre os confirmados", destaque: true, claro: true }] },
      { titulo: "Não achou a pessoa? Cadastre na hora", texto: "Toque em “Cadastrar parceiro”. Com e-mail, a pessoa cria a própria senha depois e mantém o histórico. Sem e-mail, você opera a rota por ela.", barra: "Cadastrar parceiro", elementos: [{ t: "campo", rotulo: "Nome completo", valor: "Alcino" }, { t: "campo", rotulo: "E-mail (para ele criar a senha depois)", valor: "alcino@email.com", destaque: true }, { t: "botao", texto: "Cadastrar" }] },
      { titulo: "Com tudo atribuído, toque em Iniciar operação", texto: "Os parceiros são avisados e a rota passa a aparecer no celular deles.", barra: "Operação de hoje", elementos: [{ t: "item", titulo: "Mega", badge: "✅ Alcino", tom: "ok" }, { t: "item", titulo: "Vila", badge: "✅ Bia", tom: "ok" }, { t: "botao", texto: "Iniciar operação", destaque: true }] },
    ],
    dicas: ["Se o parceiro não responder em 2 horas, a rota volta para o mercado de ofertas."],
  },
  {
    id: "rotas-ao-vivo",
    titulo: "Acompanhar as rotas ao vivo",
    resumo: "Veja progresso, mapa, parados e ocorrências com foto.",
    perfis: ["dono", "funcionario"],
    tempo: "1 min",
    tela: "/rotas",
    passos: [
      { titulo: "O painel mostra o dia inteiro", texto: "A barra mostra entregues, a entregar e com problema. Cada bloco é clicável e leva para a tela certa.", barra: "Hoje", elementos: [{ t: "progresso", pct: 62, rotulo: "Pacotes do dia" }, { t: "botoes", itens: [{ texto: "Sem entregador · 0" }, { texto: "Em rota · 12", destaque: true }, { texto: "Devolver · 3" }] }, { t: "item", titulo: "Mega", sub: "Alcino · 135 pacotes", badge: "Em rota", tom: "ok" }] },
      { titulo: "Em Rotas, veja quem anda e quem parou", texto: "O mapa mostra a frota. Verde é em movimento, amarelo é parado, cinza é sem sinal. A rota ao vivo mostra o rastro por onde o motorista passou.", barra: "Rotas ao vivo", elementos: [{ t: "mapa", destaque: true }, { t: "item", titulo: "Alcino", sub: "Em movimento · 24 km/h", badge: "ao vivo", tom: "ok" }, { t: "item", titulo: "Bia", sub: "Parado há 14 min", badge: "atenção", tom: "alerta" }] },
      { titulo: "Veja as ocorrências com foto", texto: "Quando o entregador registra um insucesso, a foto fica visível para você em “Ocorrências” de cada rota.", barra: "Ocorrências · Mega", elementos: [{ t: "item", titulo: "ID ML123456", sub: "Estabelecimento fechado", badge: "foto", tom: "alerta", destaque: true }, { t: "foto", rotulo: "foto do local" }] },
    ],
    dicas: ["O GPS só envia enquanto o app do entregador está aberto e a tela ligada. Entregador sem app (cadastrado por você) não tem GPS."],
  },
  {
    id: "encerrar-rota",
    titulo: "Fim do dia: encerrar a rota e conferir",
    resumo: "O motorista não deu baixa? Encerre pelo gestor e confira no dia seguinte.",
    perfis: ["dono", "funcionario"],
    tempo: "2 min",
    tela: "/rotas",
    passos: [
      { titulo: "Na rota do motorista, toque em “Encerrar pelo gestor”", texto: "Use quando o motorista terminou o dia e não deu baixa nos pacotes.", barra: "Rotas ao vivo", elementos: [{ t: "item", titulo: "Mega · Alcino", sub: "Em andamento · 80/100" }, { t: "botao", texto: "Encerrar pelo gestor", destaque: true, claro: true }] },
      { titulo: "Informe o que o marketplace mostra", texto: "Digite quantos foram entregues e quantos foram insucesso. O que sobra fica como “sem baixa” e volta para a empresa.", barra: "Encerrar rota pelo gestor", elementos: [{ t: "campo", rotulo: "Entregues", valor: "75", destaque: true }, { t: "campo", rotulo: "Insucessos", valor: "5" }, { t: "campo", rotulo: "Sem baixa (calculado)", valor: "20" }, { t: "botao", texto: "Encerrar rota" }] },
      { titulo: "A rota aguarda a devolução", texto: "Se houve pacotes que voltam, a rota fica em “Aguardando devolução”. O valor do entregador ainda não é liberado.", barra: "Hoje", elementos: [{ t: "item", titulo: "Mega", sub: "75 entregues · 25 voltam", badge: "Aguardando devolução", tom: "alerta", destaque: true }] },
      { titulo: "No dia seguinte, confronte o motorista", texto: "Em “Devoluções para confirmar” aparece um aviso: “Encerrada pelo gestor — conferir com o motorista”. Depois da conversa, toque em Conferido.", barra: "Devoluções para confirmar", elementos: [{ t: "aviso", texto: "Encerrada pelo gestor · 75 entregues, 5 insucessos, 20 sem baixa", tom: "alerta" }, { t: "botao", texto: "Conferido", claro: true, destaque: true }] },
      { titulo: "Receba os pacotes e a rota fecha", texto: "Toque em “Recebi todos” (ou marque só alguns). Quando todos forem recebidos, a rota conclui e o valor do entregador é liberado.", barra: "Devoluções para confirmar", elementos: [{ t: "item", titulo: "ID ML123456", sub: "Estabelecimento fechado", badge: "foto" }, { t: "botao", texto: "Recebi todos", destaque: true }, { t: "aviso", texto: "Rota encerrada. Valor liberado ao entregador ✓", tom: "ok" }] },
    ],
    dicas: ["Pacote que não voltou? Use “Encerrar como extraviado”: o entregador perde 30 pontos por pacote (até 60)."],
  },
  {
    id: "parceiro-sem-app",
    titulo: "Cadastrar parceiro (com ou sem app)",
    resumo: "Cadastre pelo e-mail, envie o convite e o histórico fica com a pessoa.",
    perfis: ["dono", "funcionario"],
    tempo: "2 min",
    tela: "/entregadores",
    passos: [
      { titulo: "Cadastre o parceiro", texto: "Nome e telefone ou e-mail bastam. Comprovante de residência e documento são recomendados e ficam visíveis só para a sua empresa.", barra: "Cadastrar parceiro", elementos: [{ t: "campo", rotulo: "Nome completo", valor: "Jefferson Alves" }, { t: "campo", rotulo: "E-mail (opcional)", valor: "jefferson@email.com", destaque: true }, { t: "foto", rotulo: "comprovante e documento" }] },
      { titulo: "Envie o convite pelo WhatsApp", texto: "A tela mostra um código. Mande para a pessoa pelo botão do WhatsApp.", barra: "Jefferson cadastrado", elementos: [{ t: "item", titulo: "E-mail", sub: "jefferson@email.com" }, { t: "item", titulo: "Código", sub: "K7M2Q9XA" }, { t: "botao", texto: "Enviar convite pelo WhatsApp", destaque: true }] },
      { titulo: "A pessoa ativa a conta no login", texto: "No login, na aba “Convite”, ela informa e-mail, código e cria a senha. O histórico que você já registrou continua com ela.", barra: "Login · Convite", elementos: [{ t: "abas", itens: ["Entrar", "Cadastrar", "Convite"], ativo: 2 }, { t: "campo", rotulo: "Código do convite", valor: "K7M2Q9XA", destaque: true }, { t: "campo", rotulo: "Crie uma senha", valor: "••••••" }, { t: "botao", texto: "Ativar minha conta" }] },
      { titulo: "Sem e-mail? Você opera a rota por ele", texto: "Para parceiro cadastrado sem acesso ao app, use “Operar rota” no painel: você dá as baixas e encerra a rota por ele.", barra: "Rotas ao vivo", elementos: [{ t: "item", titulo: "Mega · Jefferson", badge: "Sem app (gerenciado)", tom: "alerta" }, { t: "botao", texto: "Operar rota", destaque: true }] },
    ],
  },
  {
    id: "equipe",
    titulo: "Equipe: funcionários sem valores",
    resumo: "Dê acesso a quem opera o dia a dia sem mostrar dinheiro.",
    perfis: ["dono"],
    tempo: "1 min",
    tela: "/equipe",
    passos: [
      { titulo: "Defina o valor padrão por pacote", texto: "É o valor usado automaticamente quando um funcionário cria operações. Ele não vê nem altera esse valor.", barra: "Equipe", elementos: [{ t: "titulo", texto: "Valor padrão por pacote" }, { t: "campo", rotulo: "R$", valor: "2,50", destaque: true }, { t: "botao", texto: "Salvar" }] },
      { titulo: "Adicione o funcionário", texto: "Informe nome e e-mail. Ele recebe um código e cria a própria senha na aba Convite do login.", barra: "Adicionar funcionário", elementos: [{ t: "campo", rotulo: "Nome", valor: "Bia Operadora" }, { t: "campo", rotulo: "E-mail", valor: "bia@empresa.com", destaque: true }, { t: "botao", texto: "Cadastrar" }] },
      { titulo: "O que ele pode e não pode", texto: "Pode criar operações, alocar parceiros, acompanhar rotas, encerrar rotas e conferir devoluções. Não vê valores, pagamentos nem PIX, e não apaga nada.", barra: "Equipe", elementos: [{ t: "aviso", texto: "✓ Operações, alocação, rotas, devoluções", tom: "ok" }, { t: "aviso", texto: "✗ Valores, pagamentos, PIX, exclusões", tom: "erro" }] },
      { titulo: "Desative quando quiser", texto: "Se a pessoa sair da empresa, toque em Desativar. O acesso é cortado na hora.", barra: "Equipe", elementos: [{ t: "item", titulo: "Bia Operadora", sub: "bia@empresa.com", badge: "Ativo", tom: "ok" }, { t: "botao", texto: "Desativar", claro: true, destaque: true }] },
    ],
  },
  {
    id: "apagar-testes",
    titulo: "Apagar rota ou histórico de teste",
    resumo: "Só o dono apaga de verdade, para começar limpo.",
    perfis: ["dono"],
    tempo: "1 min",
    tela: "/pacotes",
    passos: [
      { titulo: "Apagar uma rota de vez", texto: "No detalhe da operação, toque na lixeira da rota e marque “Apagar de vez”. Remove a rota, a oferta e os pacotes sem deixar histórico.", barra: "Operação · Rotas", elementos: [{ t: "item", titulo: "Zona teste", sub: "10 pacotes", badge: "🗑", tom: "erro", destaque: true }, { t: "aviso", texto: "☑ Apagar de vez", tom: "erro" }] },
      { titulo: "Apagar todo o histórico de testes", texto: "Em Configurações, no fim da página: “Apagar histórico de testes”. Digite APAGAR para confirmar. Seus cadastros ficam.", barra: "Configurações", elementos: [{ t: "titulo", texto: "Apagar histórico de testes" }, { t: "campo", rotulo: "Digite APAGAR", valor: "APAGAR", destaque: true }, { t: "botao", texto: "Apagar tudo", claro: true }] },
    ],
    dicas: ["Rotas já pagas não podem ser apagadas."],
  },

  // -------------------------------------------------------------- ENTREGADOR
  {
    id: "aceitar-ofertas",
    titulo: "Encontrar e aceitar ofertas",
    resumo: "Veja as rotas do dia e dos próximos dias e aceite.",
    perfis: ["entregador"],
    tempo: "1 min",
    tela: "/ofertas",
    passos: [
      { titulo: "Abra Ofertas", texto: "As rotas aparecem agrupadas por dia: Hoje, Amanhã e as datas seguintes. Assim você já planeja o que pegar.", barra: "Ofertas", elementos: [{ t: "abas", itens: ["Disponíveis (8)", "Minhas (1)"], ativo: 0 }, { t: "titulo", texto: "Amanhã · segunda-feira" }, { t: "item", titulo: "Mega", sub: "135 pacotes", badge: "Aberta", tom: "alerta", destaque: true }] },
      { titulo: "Toque na oferta para ver os detalhes", texto: "Confira zona, quantidade de pacotes, valor por pacote, horário e se exige nota fiscal.", barra: "Detalhes da oferta", elementos: [{ t: "item", titulo: "Mega · 135 pacotes", sub: "Valor por pacote e total" }, { t: "botao", texto: "Aceitar oferta", destaque: true }] },
      { titulo: "Ela vai para “Minhas”", texto: "No dia, abra Rotas para iniciar. Se precisar desistir, avise a empresa com antecedência: desistir depois das 18h do dia anterior tira pontos.", barra: "Ofertas", elementos: [{ t: "abas", itens: ["Disponíveis (7)", "Minhas (2)"], ativo: 1 }, { t: "item", titulo: "Mega", sub: "Aceita · amanhã", badge: "Aceita", tom: "ok", destaque: true }] },
    ],
    dicas: ["Se a empresa atribuir uma rota para você, responda em até 2 horas; senão ela volta para o mercado."],
  },
  {
    id: "fazer-rota",
    titulo: "Fazer a rota",
    resumo: "Iniciar, acompanhar o mapa e dar baixa nos pacotes.",
    perfis: ["entregador"],
    tempo: "2 min",
    tela: "/rotas",
    passos: [
      { titulo: "Abra Rotas e toque em “Aceitar e iniciar rota”", texto: "A rota que a empresa atribuiu ou que você aceitou aparece aqui. Ao iniciar, o relógio e o GPS começam.", barra: "Rotas", elementos: [{ t: "item", titulo: "Mega", sub: "135 pacotes · hoje" }, { t: "botao", texto: "Aceitar e iniciar rota", destaque: true }] },
      { titulo: "Mantenha o app aberto e a tela ligada", texto: "O GPS só funciona com o app aberto. A empresa vê onde você está e por onde passou.", barra: "Rota em andamento", elementos: [{ t: "mapa" }, { t: "progresso", pct: 40, rotulo: "54 de 135" }] },
      { titulo: "Dê baixa em cada pacote", texto: "Entregou? Marque o pacote como entregue (ou use “Marcar visíveis” para dar baixa em vários de uma vez). Não conseguiu entregar? Registre o insucesso.", barra: "Pacotes", elementos: [{ t: "item", titulo: "Pacote 55", badge: "entregue", tom: "ok" }, { t: "item", titulo: "Pacote 56", sub: "Pendente", destaque: true }, { t: "botao", texto: "Registrar insucesso (ID do pacote)", claro: true }] },
      { titulo: "Ao terminar, toque em Finalizar rota", texto: "Pacotes sem baixa viram “não entregues” e voltam para a empresa. Veja o guia “Fechar e receber”.", barra: "Rota em andamento", elementos: [{ t: "progresso", pct: 100, rotulo: "135 de 135" }, { t: "botao", texto: "Finalizar rota", destaque: true }] },
    ],
  },
  {
    id: "registrar-insucesso",
    titulo: "Registrar um insucesso com foto",
    resumo: "ID do pacote, motivo e a foto certa para cada caso.",
    perfis: ["entregador"],
    tempo: "1 min",
    tela: "/rotas",
    passos: [
      { titulo: "Digite o ID do pacote", texto: "Use o código que aparece na etiqueta ou no aplicativo do marketplace.", barra: "Registrar insucesso", elementos: [{ t: "campo", rotulo: "ID do pacote", valor: "ML123456", destaque: true }, { t: "texto", texto: "Mínimo 4 caracteres" }] },
      { titulo: "Escolha o motivo", texto: "Cliente ausente, estabelecimento fechado, recusou, endereço não encontrado, pacote danificado ou outro.", barra: "Registrar insucesso", elementos: [{ t: "item", titulo: "Estabelecimento fechado", destaque: true }, { t: "item", titulo: "Cliente ausente" }, { t: "item", titulo: "Pacote danificado" }] },
      { titulo: "Tire a foto certa", texto: "Estabelecimento fechado, cliente ausente ou pacote recusado: foto do LOCAL (fachada, número). Pacote danificado: foto do PACOTE. A empresa vê a foto.", barra: "Registrar insucesso", elementos: [{ t: "foto", rotulo: "foto do local", destaque: true }, { t: "texto", texto: "Mostre a fachada e o número do imóvel" }] },
      { titulo: "Salve", texto: "O pacote fica marcado como não entregue e volta para a empresa no fim do dia.", barra: "Registrar insucesso", elementos: [{ t: "botao", texto: "Salvar insucesso", destaque: true }, { t: "aviso", texto: "Insucesso registrado ✓", tom: "ok" }] },
    ],
  },
  {
    id: "fechar-e-receber",
    titulo: "Fechar a rota e receber",
    resumo: "Quando o valor da rota fica disponível para você.",
    perfis: ["entregador"],
    tempo: "1 min",
    tela: "/ganhos",
    passos: [
      { titulo: "Tudo entregue? A rota fecha na hora", texto: "Com 100% entregue, a rota conclui e o valor (pacotes entregues × valor por pacote) fica disponível.", barra: "Rota concluída", elementos: [{ t: "aviso", texto: "135 de 135 entregues ✓", tom: "ok" }, { t: "item", titulo: "A receber", sub: "R$ liberado" }] },
      { titulo: "Teve insucesso? Devolva os pacotes", texto: "A rota fica em “Aguardando devolução”. Entregue os pacotes que voltaram para a empresa.", barra: "Rotas", elementos: [{ t: "item", titulo: "Mega", sub: "5 pacotes para devolver", badge: "Aguardando devolução", tom: "alerta", destaque: true }] },
      { titulo: "A empresa confirma e o valor é liberado", texto: "Quando a empresa recebe tudo e encerra a rota, o valor aparece em “Meus ganhos”. O PIX é feito entre vocês.", barra: "Meus ganhos", elementos: [{ t: "item", titulo: "Mega · concluída", badge: "A receber", tom: "ok", destaque: true }, { t: "botao", texto: "Pedir antecipação", claro: true }] },
    ],
    dicas: ["Pacote que você não devolver é marcado como extraviado e tira pontos da sua nota."],
  },
  {
    id: "pontos-confiabilidade",
    titulo: "Seus pontos de confiabilidade",
    resumo: "O que sobe e o que desce a sua nota.",
    perfis: ["entregador"],
    tempo: "1 min",
    tela: "/dashboard",
    passos: [
      { titulo: "Quem entrega bem ganha mais oportunidades", texto: "Sua nota define o nível (Bronze, Silver, Gold, Diamond). Empresas preferem quem tem nota alta.", barra: "Confiabilidade", elementos: [{ t: "progresso", pct: 78, rotulo: "Nível Gold" }] },
      { titulo: "O que aumenta", texto: "Rota concluída: +10 pontos com 100% entregue, +5 com 95% ou mais.", barra: "Confiabilidade", elementos: [{ t: "item", titulo: "Rota 100% entregue", badge: "+10", tom: "ok" }, { t: "item", titulo: "Rota 95% entregue", badge: "+5", tom: "ok" }] },
      { titulo: "O que diminui", texto: "Recusar depois das 18h do dia anterior: −15. Pacote não devolvido (extravio): −30 cada, até −60. Endereço não visitado: −20. Pacote danificado: −10.", barra: "Confiabilidade", elementos: [{ t: "item", titulo: "Recusa fora do prazo", badge: "−15", tom: "erro" }, { t: "item", titulo: "Extravio", badge: "−30", tom: "erro" }, { t: "item", titulo: "Endereço não visitado", badge: "−20", tom: "erro" }] },
    ],
  },
];

/** Qual guia abre pelo botão “?” em cada tela. */
export const GUIA_DA_TELA: Record<string, string> = {
  "/dashboard": "rotas-ao-vivo",
  "/pacotes": "montar-operacao",
  "/rotas": "rotas-ao-vivo",
  "/ofertas": "aceitar-ofertas",
  "/entregadores": "parceiro-sem-app",
  "/equipe": "equipe",
  "/devolucoes": "encerrar-rota",
  "/ganhos": "fechar-e-receber",
  "/pagamentos": "fechar-e-receber",
};
