# Publicar o PULA TORTO no Railway

1. Suba esta pasta para um repositório GitHub.
2. No Railway, crie um projeto com **Deploy from GitHub repo**.
3. Selecione o repositório. O `Dockerfile` e o `railway.json` serão detectados.
4. No serviço, abra **Settings → Networking → Generate Domain**.
5. Em **Volumes**, crie um volume montado em `/data`.
6. Mantenha **1 réplica** para o ranking gravado no arquivo não sofrer concorrência entre instâncias.
7. Faça um novo deploy após adicionar o volume.

O jogo usa `GET /api/ranking` e `POST /api/ranking`. O placar global fica em
`/data/leaderboard.json`, dentro do volume persistente. Sem volume, o ranking
funciona, mas pode ser apagado quando o Railway recriar o container.

Para testar localmente:

```bash
npm start
```

Depois abra `http://localhost:3000`.
