#📚 Sistema de Gestão Bibliotecária

Este é um sistema prático para o gerenciamento de bibliotecas, focado na organização de cadastros e no fluxo de movimentação de acervo.

##🚀 Funcionalidades
Gestão de Alunos: Cadastro, edição e remoção de usuários da biblioteca.

Gestão de Livros: Controle de estoque e catálogo de títulos disponíveis.

Controle de Empréstimos: Registro de saídas, devoluções e prazos.

##🛠️ Como Instalar o Projeto

Siga os passos abaixo para ter o sistema rodando na sua máquina local:

1. Clonar o Repositório

Abra o seu terminal (ou Git Bash) e execute:

Bash
git clone https://github.com/brendahidalgos/gestao}_bibliotecaria.git
2. Acessar a Pasta
Bash
cd NOME_DO_REPOSITORIO
##🗄️ Configuração do Banco de Dados

Para que o sistema funcione, você precisa configurar o banco de dados utilizando os comandos que deixei no arquivo banco.txt.

Abra o seu terminal do Banco de Dados (ex: MySQL, PostgreSQL, etc).

Crie o banco de dados principal:

SQL
CREATE DATABASE gestao_bibliotecaria;
Selecione o banco criado:

SQL
USE gestao_bibliotecaria;
Abra o arquivo bancodedados.txt na raiz deste projeto, copie todos os comandos SQL e cole no seu terminal de banco de dados para criar as tabelas e relacionamentos necessários.

##💻 Tecnologias Utilizadas
[HTML, CSS, JAVASCRIPT, PHP E MYSQL]
