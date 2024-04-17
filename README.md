# Crawler do Mercado Livre

Este projeto consiste em um crawler desenvolvido em TypeScript para extrair informações de produtos do Mercado Livre.
Ele retorna todos os precos e links de um certo produto ordenados por preco.

## Pré-requisitos

- Ambiente Linux
- Node.js (versão 21.6.0)
- TypeScript (versão 5.4.5)
- Google-Chorme instalado na maquina, no caminho /usr/bin/google-chrome

## Instalação

1. Clone o repositório:
2. Instale as dependencias com um `npm install`
3. Rode o crawler com o comando npx `ts-node crawler.ts --product {nome do produto a ser Buscado, ex: iPad}`
