// Teste de concorrencia com k6 (https://k6.io)
// Uso: k6 run -e TOKEN=<accessToken> -e PRODUTO=1 testes/carga-k6.js
// 50 usuarios virtuais dando SAIDA de 1 unidade no MESMO produto ao mesmo tempo.
// Resultado esperado: o saldo nunca fica negativo, e as saidas aceitas
// batem exatamente com o que havia em estoque.
import http from 'k6/http';
import { check } from 'k6';

export const options = { vus: 50, iterations: 500 };

export default function () {
  const res = http.post(
    `http://localhost:8080/api/estoque/produtos/${__ENV.PRODUTO}/movimentacoes`,
    JSON.stringify({ tipo: 'SAIDA', quantidade: 1 }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.TOKEN}` } }
  );
  check(res, { 'ok ou sem estoque': (r) => r.status === 200 || r.status === 422 });
}
