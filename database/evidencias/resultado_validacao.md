# Resultado real da validação

Execução em 12/10/2026 (America/Bahia), Windows x86_64, PostgreSQL 18.6.

## Ambientes e resultados

A primeira validação foi realizada em uma instância isolada em 127.0.0.1:55439, com um banco exclusivo de teste. Foram executados os scripts 01 a 06, as repetições de 02 a 04 e a limpeza 07 duas vezes. A instância isolada foi encerrada depois dos testes.

A segunda validação terminou às 00:34 no servidor local preexistente em 127.0.0.1:5432. O banco `bahia_economia_teste_modelagem` foi inspecionado antes da criação: não havia tabelas de usuário nem schema economia. Foram executados 01, 02, 03, 04 e 06, sem apagar nem recriar o banco. A senha foi digitada diretamente no prompt oculto do psql. Código de saída: 0.

As consultas finais confirmaram sete tabelas, duas views, 417 municípios, 308 observações reais e quatro fictícias. A view v_dashboard retornou somente as 308 observações reais. O PIB de Guanambi em 2023 retornou 2028013.000000 Mil Reais.

## Como reproduzir

Siga a sequência do README em um banco exclusivo de testes. Com psql disponível, a forma equivalente para cada script, executada na raiz do repositório, é:

```powershell
psql -X -h 127.0.0.1 -p 5432 -U postgres -d bahia_economia_teste_modelagem -W -v ON_ERROR_STOP=1 -f .\database\sql\06_testes.sql
```

O exemplo executa apenas os testes, que dependem da estrutura e das cargas 02 a 04. A criação 01 deve ocorrer somente quando o schema ainda não existir. Não repetir a criação em um banco já instalado.

## Resultado dos testes

| Verificação | Resultado |
|---|---|
| DDL, catálogos, dados reais, fixtures | Passou |
| Rejeitar observação duplicada | Passou |
| Rejeitar município inexistente | Passou |
| Rejeitar período não catalogado | Passou |
| Rejeitar unidade incompatível com indicador | Passou |
| Rejeitar fonte incompatível | Passou |
| Impedir observação ibge ligada a coleta teste | Passou |
| Rejeitar zero para ausência | Passou |
| Rejeitar NULL quando estado é disponível | Passou |
| Quatro fixtures e 308 observações na view real | Passou |
| Preservar NULL de VAB/agropecuária 2023 em Guanambi | Passou |
| Último PIB 2023 e último VAB/agropecuária 2021 | Passou |
| Série histórica, comparação e filtros SQL | Executados com sucesso |
| Variação fictícia de 100 para 120 | Retornou 20% |
| Repetir 02–04 | Sem duplicação; INSERT 0 0 |
| Limpar somente fixtures | DELETE 4 observações e 1 coleta; 308 reais preservadas |
| Repetir limpeza | DELETE 0; dados reais preservados |
| Repetir DDL em schema existente | Falha esperada; 308 reais preservadas |
| Executor psql diante de banco já existente | Saiu sem alteração, conforme previsto |

## Ajustes e limites

Duas versões iniciais dos testes de chave estrangeira encontraram primeiro conflitos de chave primária. Os cenários foram ajustados para isolar a restrição pretendida e executados novamente com sucesso, sem alteração do esquema. Os logs originais foram preservados localmente, mas não são distribuídos no repositório.

As respostas públicas da API foram preservadas com hashes em manifesto.json. Há 308 observações reais, incluindo 24 ausências; não foram substituídas por zero. O DER foi renderizado em PNG e inspecionado visualmente.

Não houve validação da aplicação completa FastAPI/SQLAlchemy/React nem execução automatizada pelo pgAdmin. O executor interativo de instalação inicial em banco novo permanece como roteiro de uso; a instalação autenticada no banco existente utilizou um auxiliar local não distribuído. Os testes relatados validam os scripts SQL e seus dados, não a aplicação inteira.
