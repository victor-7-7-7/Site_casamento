# Nosso casamento

Site em HTML, CSS e JavaScript, sem instalação de pacotes ou compilação. Inclui servidor Python com SQLite para testar e salvar confirmações localmente; a publicação estática usa a integração Supabase existente.

## Começar agora

Na pasta do projeto, execute `python server.py` e abra http://localhost:8080. Requer Python 3.10 ou superior. Encerre com Ctrl+C; use `python server.py --port 8081` se a porta estiver ocupada.

Sem Supabase configurado, o formulário identifica o servidor local e salva respostas reais em `.data/rsvps.sqlite3`. Os dados persistem após reiniciar e podem ser consultados com um cliente SQLite. Esse diretório é ignorado pelo Git e não pode ser acessado pelo servidor web. Para escolher outro arquivo, defina a variável de ambiente `WEDDING_DATABASE`.

O servidor aceita conexões apenas deste computador. Serve somente a página, o CSS e os assets; valida respostas, exige consentimento, bloqueia duplicatas e limita tentativas. A API pública não tem operações para listar, alterar ou excluir convidados. O arquivo SQLite deve permanecer privado. Para convidados responderem pela internet, configure o Supabase e publique o frontend com HTTPS conforme abaixo.

A versão inclui galeria ampliada com navegação por teclado e download da data em formato `.ics` quando `dateISO` estiver preenchido. Os demais dados ausentes permanecem identificados por placeholders; Pix e links de lojas exigem os dados reais.

## Personalizar

Edite **assets/scripts/config.js**: nomes, iniciais, data com fuso, textos pessoais, versículo, endereço, links, fotos, presentes, valores, Pix, padrinhos e conexão Supabase. A data válida gera automaticamente o dia e o horário exibidos. Enquanto dateISO estiver vazio, o contador mostra traços.

As fotografias externas do Unsplash são ilustrativas; substitua por fotos próprias em assets/images e atualize src e alt. Depois marque photosAreIllustrative como false. Há fallback local quando uma foto não carrega. A arte assets/images/local-aquarela.svg é uma ilustração decorativa, não uma representação do local real. Substitua-a pela arte desejada.

Presentes, valores e paleta são exemplos. Os status disponíveis são disponivel, reservado e ganhamos; a atualização é manual no arquivo de configuração. Links de lojas e mapas precisam usar HTTPS. Presentes sem link mostram 'Link em breve'. Pix vazio não permite copiar nem simula pagamento. A chave informada é pública e aparece aos visitantes; prefira chave aleatória se não quiser divulgar telefone ou CPF.

Adicione assets/videos/pedido-casamento.mp4 e marque videoAvailable como true. Adicione legendas .vtt, configure videoCaptions e descreva o pedido em proposalDescription. O vídeo permanece com fallback se faltar ou falhar.

## Ativar a confirmação de presença

1. Crie seu projeto em https://supabase.com/dashboard e abra o SQL Editor.
2. Execute supabase/setup.sql uma vez. Não reutilize sobre uma tabela existente.
3. Execute supabase/verify.sql: deve terminar sem erro. Os registros de teste são desfeitos.
4. Na configuração do projeto, copie a URL e a chave **publishable** (sb_publishable_...). Preencha supabase.url e supabase.publishableKey no config.js.
5. Verifique se a Data API está habilitada para o schema public. Publique via HTTPS e envie uma resposta de teste.
6. Confira a gravação no Table Editor, teste o reenvio do mesmo nome/telefone e a opção de não comparecer. Remova o registro de teste pelo painel.

Nunca coloque service_role, sb_secret_ ou senha do banco no frontend. A API permite somente inserir as colunas do formulário; não concede leitura, alteração ou exclusão a visitantes. Consulte e corrija respostas pelo painel privado do Supabase. A combinação de nome normalizado e telefone evita reenvios duplicados, inclusive simultâneos. Pessoas diferentes que compartilham telefone podem responder separadamente.

Em hospedagem estática ou ao abrir o arquivo diretamente, sem Supabase configurado, o formulário avisa que está indisponível e desativa o envio. Com `python server.py`, usa o banco SQLite privado do servidor local. Não há dados pessoais em localStorage nem confirmação de pagamento. Uma mensagem de sucesso só aparece depois que o servidor aceita a resposta.

O formulário público não autentica convidados: a validação, o campo antirrobô e a unicidade não substituem proteção contra abuso em grande escala. Se necessário, coloque a entrada atrás de uma Edge Function com validação de desafio antirrobô e limite de frequência, revogando então o INSERT público. Após o evento, revogue os grants de INSERT e exclua dados pessoais quando não forem mais necessários.

Documentação consultada: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [chaves públicas](https://supabase.com/docs/guides/getting-started/api-keys).

## Abrir e publicar

Abra index.html para pré-visualizar apenas a interface. Para testar a versão completa por HTTP, na pasta do projeto execute:

    python server.py

Acesse http://localhost:8080. Publique somente index.html, style.css e assets em uma hospedagem estática com HTTPS. Não publique `.data`, `server.py`, `tests`, README.md ou a pasta supabase. Não há rastreadores; fontes Google e fotografias ilustrativas exigem conexão externa.

## QR Codes e revisão final

Use a URL definitiva publicada com #presentes, #pix, #local e #confirmacao. Exemplo: https://seu-dominio.com/#confirmacao. Gere e teste os QR Codes com essa URL antes de imprimi-los.

Confira em celular: menu, convite, localização, filtros de presentes, Pix e formulário (sucesso, erro, duplicata e acompanhantes). Confira também foco por teclado, preferência de movimento reduzido e vídeo sem arquivo. O banco só poderá ser validado de ponta a ponta depois que o projeto Supabase existir e for configurado.


## Validação

Execute `python -m unittest discover -s tests -v`. A suíte verifica persistência SQLite, duplicatas simultâneas, recusa de presença, acompanhantes, entradas inválidas, origem das requisições, limite de tentativas e bloqueio de acesso aos arquivos privados. Os seis testes do servidor passaram nesta implementação.

Para incluir a verificação de interface com Edge ou Chrome instalado no caminho padrão do Windows, defina `RUN_BROWSER_TESTS=1` no ambiente e execute o mesmo comando. Ela cobre galeria, filtros, menu, convite, Pix sem chave e envio real ao servidor local em três tamanhos de janela. Dados dos testes ficam em diretórios temporários privados. A execução visual neste ambiente ficou bloqueada por restrições de inicialização do Chrome e timeout do Edge; ainda é necessária a revisão visual no navegador.

As integrações Supabase e Pix reais dependem da configuração do casal. O banco Supabase ainda não foi provisionado nem testado nesta versão. Antes de publicar, substitua os placeholders, confira o recebedor Pix e faça um envio de teste no ambiente publicado.
