// ---------------------
// Servidor Express para uptime
// ---------------------
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot activo y funcionando!');
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor web activo en el puerto ' + listener.address().port);
});

// ---------------------
// Bot de Discord
// ---------------------
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const TOKEN = process.env.TOKEN;

// Estados de juegos
const adivinaGames = new Map();
const tresEnRayaGames = new Map();

// Listas de verdad/reto
const verdadPreguntas = [
  "¿Cuál es tu mayor miedo?",
  "¿Alguna vez has mentido a un amigo?",
  "¿Cuál es tu secreto más embarazoso?"
];
const retoDesafios = [
  "Haz 10 flexiones.",
  "Canta una canción ahora mismo.",
  "Imita a tu personaje favorito."
];

// — Funciones Tres en Raya —
function crearBotones(tablero) {
  return tablero.map((fila, i) => {
    const row = new ActionRowBuilder();
    fila.forEach((celda, j) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ter_${i}_${j}`)
          .setLabel(' ')
          .setEmoji(celda === '⬜' ? '⬜' : celda)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(celda !== '⬜')
      );
    });
    return row;
  });
}
function revisarGanador(tablero) {
  const lines = [
    [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]],
  ];
  for (const line of lines) {
    const [a,b,c] = line;
    if (
      tablero[a[0]][a[1]] !== '⬜' &&
      tablero[a[0]][a[1]] === tablero[b[0]][b[1]] &&
      tablero[a[0]][a[1]] === tablero[c[0]][c[1]]
    ) return tablero[a[0]][a[1]];
  }
  return null;
}
function tableroLleno(tablero) {
  return tablero.every(f => f.every(c => c !== '⬜'));
}
function turnoBot(tablero) {
  const vacios = [];
  for (let i=0;i<3;i++) for (let j=0;j<3;j++)
    if (tablero[i][j]==='⬜') vacios.push([i,j]);
  if (!vacios.length) return;
  const [x,y] = vacios[Math.floor(Math.random()*vacios.length)];
  tablero[x][y] = '⭕';
}

// — Eventos —
client.once('ready', () => {
  console.log('✅ Bot conectado como Comunidad Roblox Studio');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const prefix = '!';
  if (!message.content.startsWith(prefix)) {
    // Manejo de adivina si ya activo
    if (adivinaGames.has(message.author.id)) {
      const numero = adivinaGames.get(message.author.id);
      const intento = parseInt(message.content);
      if (isNaN(intento)) return;
      if (intento === numero) {
        message.reply(`¡Correcto! 🎉 Era ${numero}.`);
        adivinaGames.delete(message.author.id);
      } else if (intento < numero) {
        message.reply('🔼 Más alto.');
      } else {
        message.reply('🔽 Más bajo.');
      }
    }
    return;
  }

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // !hola
  if (cmd === 'hola') {
    return message.channel.send(
      `Hola ${message.author}, comandos:\n` +
      "`!hola`, `!ter`, `!ter @usuario`, `!ppt`, `!verdad`, `!reto`, `!adivina`"
    );
  }

  // !adivina
  if (cmd === 'adivina') {
    if (adivinaGames.has(message.author.id)) {
      return message.reply('Ya tienes un juego activo. Escribe un número para adivinar.');
    }
    const numero = Math.floor(Math.random()*100)+1;
    adivinaGames.set(message.author.id, numero);
    return message.reply('He pensado un número entre 1 y 100. ¡Envíalo para adivinar!');
  }

  // !verdad
  if (cmd === 'verdad') {
    const q = verdadPreguntas[Math.floor(Math.random()*verdadPreguntas.length)];
    return message.channel.send(`🌟 Verdad: ${q}`);
  }

  // !reto
  if (cmd === 'reto') {
    const r = retoDesafios[Math.floor(Math.random()*retoDesafios.length)];
    return message.channel.send(`🎯 Reto: ${r}`);
  }

  // !ppt
  if (cmd === 'ppt') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('ppt_piedra').setLabel('✊ Piedra').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ppt_papel').setLabel('🖐 Papel').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ppt_tijera').setLabel('✌️ Tijera').setStyle(ButtonStyle.Primary)
      );
    return message.channel.send({ content: '¡Elige!', components: [row] });
  }

  // !ter
  if (cmd === 'ter') {
    if (tresEnRayaGames.has(message.channel.id)) {
      return message.channel.send('Ya hay un tres en raya activo aquí.');
    }
    const mention = message.mentions.users.first();
    const board = [['⬜','⬜','⬜'],['⬜','⬜','⬜'],['⬜','⬜','⬜']];
    tresEnRayaGames.set(message.channel.id, {
      board,
      turn: 0,
      players: [message.author, mention|| 'BOT']
    });
    const filas = crearBotones(board);
    return message.channel.send({
      content: mention
        ? `Tres en raya: <@${message.author.id}> vs <@${mention.id}>. Turno: <@${message.author.id}>`
        : `Tres en raya contra bot. Eres ❌. Turno: <@${message.author.id}>`,
      components: filas
    });
  }
});

// Botones interactivos
client.on(Events.InteractionCreate, async inter => {
  if (!inter.isButton()) return;

  // PPT
  if (inter.customId.startsWith('ppt_')) {
    const play = inter.customId.split('_')[1];
    const opts = ['piedra','papel','tijera'];
    const bot = opts[Math.floor(Math.random()*opts.length)];
    let res = '';
    if (play === bot) res = 'Empate 🤝';
    else if (
      (play==='piedra'&&bot==='tijera')||
      (play==='papel'&&bot==='piedra')||
      (play==='tijera'&&bot==='papel')
    ) res = '¡Ganaste! 🎉';
    else res = 'Perdiste 😢';
    return inter.update({ content: `Tú: ${play} — Bot: ${bot}. ${res}`, components: [] });
  }

  // Tres en raya botones
  if (inter.customId.startsWith('ter_')) {
    const game = tresEnRayaGames.get(inter.channelId);
    if (!game) return inter.reply({ content: 'No hay juego.', ephemeral: true });

    const [_, i, j] = inter.customId.split('_').map((v,k)=> k>0?parseInt(v):v);
    if (game.board[i][j] !== '⬜') {
      return inter.reply({ content: 'Casilla ocupada.', ephemeral: true });
    }

    const mark = game.turn===0? '❌':'⭕';
    game.board[i][j] = mark;

    // Comprueba ganador
    if (revisarGanador(game.board)) {
      tresEnRayaGames.delete(inter.channelId);
      const rows = crearBotones(game.board).map(r=>{ r.components.forEach(b=>b.setDisabled(true)); return r; });
      return inter.update({ content: `¡${mark} gana!`, components: rows });
    }
    if (tableroLleno(game.board)) {
      tresEnRayaGames.delete(inter.channelId);
      const rows = crearBotones(game.board).map(r=>{ r.components.forEach(b=>b.setDisabled(true)); return r; });
      return inter.update({ content: `¡Empate!`, components: rows });
    }

    // Cambio de turno
    game.turn = 1 - game.turn;

    // Si es turno bot
    if (game.players[game.turn] === 'BOT') {
      turnoBot(game.board);
      if (revisarGanador(game.board) || tableroLleno(game.board)) {
        tresEnRayaGames.delete(inter.channelId);
      }
      game.turn = 0;
    }

    const rows = crearBotones(game.board);
    return inter.update({
      content: `Turno: ${game.players[game.turn] === 'BOT' ? 'Bot' : `<@${game.players[game.turn].id}>`}`,
      components: rows
    });
  }
});

client.login(TOKEN);
