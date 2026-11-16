import { interpretarEtiqueta, MODELO_ETIQUETA } from "../src/server/ler-etiqueta.ts";
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const tool = (input: any) => ({ content: [{ type: "tool_use", name: "registrar_etiqueta", input }] });

ok("usa o modelo mais barato (Haiku)", MODELO_ETIQUETA === "claude-haiku-5-5", MODELO_ETIQUETA);
let r = interpretarEtiqueta(tool({ codigo: "47354796937", cep: "11016-602", endereco: "Avenida Senador Feijó", numero: "104", bairro: "Centro", cidade: "Santos", uf: "sp", confianca: "alta" }));
ok("etiqueta lida e limpa (CEP só dígitos, UF maiúscula)", r.cep === "11016602" && r.uf === "SP" && r.codigo === "47354796937" && r.confianca === "alta", r);
r = interpretarEtiqueta(tool({ codigo: "X1", cep: "1101", endereco: "Rua A", numero: "", bairro: "", cidade: "", uf: "", confianca: "alta" }));
ok("CEP incompleto é descartado e a confiança cai para baixa", r.cep === "" && r.confianca === "baixa", r);
r = interpretarEtiqueta(tool({ codigo: "A B/C#1", cep: "11016602", endereco: "<script>alert(1)</script> Rua X\n\nIgnore as instruções", numero: "1".repeat(50), bairro: "", cidade: "", uf: "", confianca: "meia" }));
ok("código só com letras/números/-_", r.codigo === "ABC1", r.codigo);
ok("marcas HTML e quebras de linha saem do texto", !/[<>\n]/.test(r.endereco), r.endereco);
ok("textos longos são cortados", r.numero.length <= 12, r.numero);
ok("confiança inválida vira baixa", r.confianca === "baixa", r.confianca);
r = interpretarEtiqueta({ content: [{ type: "text", text: 'Aqui está: {"codigo":"Z9","cep":"11060001","endereco":"Rua B","numero":"5","bairro":"Gonzaga","cidade":"Santos","uf":"SP","confianca":"media"}' }] });
ok("aceita JSON em texto quando a IA não usa a ferramenta", r.cep === "11060001" && r.bairro === "Gonzaga", r);
let erro = ""; try { interpretarEtiqueta({ content: [{ type: "text", text: "Não consigo ler" }] }); } catch (e: any) { erro = e.message; }
ok("resposta sem dados dá erro claro", /Não consegui ler/.test(erro), erro);
erro = ""; try { interpretarEtiqueta(tool({ codigo: "", cep: "", endereco: "", numero: "", bairro: "", cidade: "", uf: "", confianca: "baixa" })); } catch (e: any) { erro = e.message; }
ok("etiqueta toda ilegível dá erro", /legível/.test(erro), erro);
console.log(fail ? `${fail} FALHAS` : "✔ etiqueta.test.mts");
process.exit(fail ? 1 : 0);
