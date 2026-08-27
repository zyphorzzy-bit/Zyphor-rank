require('dotenv').config();

const { 
    Client, 
    GatewayIntentBits, 
    PermissionFlagsBits, 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    EmbedBuilder,
    ActivityType
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

const GUILD_PERMITIDA = '1533306874513068093';
let config = { resetDias: 7 };

// Armazenamento
const mensagesCount = {};
const voiceTime = {};
const streamStatusTime = {};

const callStartTime = {};
const streamStatusStartTime = {};

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
}

function getRealTimeVoice(userId) {
    let total = voiceTime[userId] || 0;
    if (callStartTime[userId]) {
        total += Math.floor((Date.now() - callStartTime[userId]) / 1000);
    }
    return total;
}

function getRealTimeStreamStatus(userId) {
    let total = streamStatusTime[userId] || 0;
    if (streamStatusStartTime[userId]) {
        total += Math.floor((Date.now() - streamStatusStartTime[userId]) / 1000);
    }
    return total;
}

// 🟢 EVENTO READY - AQUI DEFINE O STATUS ROXO (STREAMING) DO BOT
client.on('ready', async () => {
    // Coloca o status do perfil do bot como ROXO (Transmitindo)
    client.user.setActivity('Zyphor Apps', {
        type: ActivityType.Streaming,
        url: 'https://www.twitch.tv/discord' // Link necessário para o Discord ativar a cor roxa
    });

    const guild = client.guilds.cache.get(GUILD_PERMITIDA);
    if (guild) {
        await guild.commands.create(
            new SlashCommandBuilder()
                .setName('config')
                .setDescription('Configura o sistema Zyphor (Apenas Admins)')
                .addIntegerOption(opt => 
                    opt.setName('dias_reset')
                       .setDescription('Dias para resetar o rank automaticamente')
                       .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        );
    }
    console.log(`<:zyphor:1540096483276095621> Zyphor Apps Bot Online com Status Roxo!`);
});

// Interação /config
client.on('interactionCreate', async (interaction) => {
    if (interaction.guildId !== GUILD_PERMITIDA) return;

    if (interaction.isChatInputCommand() && interaction.commandName === 'config') {
        const diasInput = interaction.options.getInteger('dias_reset');
        if (diasInput) config.resetDias = diasInput;

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_config')
                .setPlaceholder('Selecione uma opção do Zyphor Apps...')
                .addOptions([
                    { 
                        label: 'Ajuda / Comandos (Help)', 
                        value: 'help_cmds', 
                        description: 'Lista completa de comandos', 
                        emoji: '1539124693460713552' 
                    },
                    { 
                        label: 'Tempo de Reset', 
                        value: 'set_reset', 
                        description: `Atual: ${config.resetDias} dias`, 
                        emoji: '1534611997335883886' 
                    },
                    { 
                        label: 'Salvar Alterações', 
                        value: 'save_config', 
                        emoji: '1541318082574684240' 
                    }
                ])
        );

        await interaction.reply({
            content: `<:zyphor:1540096483276095621> **Painel Zyphor Apps**\n<:horrio:1534611997335883886> Reset programado a cada **${config.resetDias}** dias.`,
            components: [row],
            ephemeral: true
        });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_config') {
        const opcao = interaction.values[0];

        if (opcao === 'help_cmds') {
            const embedHelp = new EmbedBuilder()
                .setTitle('<:zyphor:1540096483276095621> Zyphor Apps - Central de Ajuda')
                .setColor('#2b2d31')
                .setDescription('<:linkexterno:1539124690709385330> Comandos disponíveis:')
                .addFields(
                    { name: '<:horrio:1534611997335883886> `z.rank call`', value: 'Exibe o ranking de tempo em voz.' },
                    { name: '<:ID:1534611999085039786> `z.rank sms`', value: 'Exibe o ranking de mensagens enviadas.' },
                    { name: '<:arquivo:1539124693460713552> `/config`', value: 'Painel administrativo de configurações.' }
                );

            await interaction.update({ embeds: [embedHelp] });
        } else if (opcao === 'save_config') {
            await interaction.update({ 
                content: `<:fixo:1541318082574684240> Configurações registradas!`, 
                components: [] 
            });
        }
    }
});

// Comandos de Chat
client.on('messageCreate', async (message) => {
    if (message.guildId !== GUILD_PERMITIDA || message.author.bot) return;

    const userId = message.author.id;
    mensagesCount[userId] = (mensagesCount[userId] || 0) + 1;

    const comando = message.content.toLowerCase();

    // z.rank call
    if (comando === 'z.rank call') {
        const guildMembers = Object.keys({ ...voiceTime, ...callStartTime, ...streamStatusTime, ...streamStatusStartTime });
        
        const sorted = guildMembers
            .map(id => {
                const totalCall = getRealTimeVoice(id);
                const totalStreamStatus = getRealTimeStreamStatus(id);
                return { id, total: totalCall + totalStreamStatus, totalCall, totalStreamStatus };
            })
            .filter(u => u.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        const lista = sorted.length > 0 
            ? sorted.map((u, i) => `**#${i + 1}** <@${u.id}>\n └ <:horrio:1534611997335883886> Call: \`${formatTime(u.totalCall)}\` | Status Zyphor: \`${formatTime(u.totalStreamStatus)}\``).join('\n')
            : 'Nenhum registro de call/status ainda.';

        const embed = new EmbedBuilder()
            .setTitle('<:zyphor:1540096483276095621> Ranking de Call & Zyphor Apps Status')
            .setDescription(`${lista}`)
            .setColor('#2b2d31');

        return message.channel.send({ embeds: [embed] });
    }

    // z.rank sms
    if (comando === 'z.rank sms') {
        const sorted = Object.keys(mensagesCount)
            .map(id => ({ id, count: mensagesCount[id] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const lista = sorted.length > 0 
            ? sorted.map((u, i) => `**#${i + 1}** <@${u.id}> — \`${u.count}\` mensagens`).join('\n')
            : 'Nenhuma mensagem registrada ainda.';

        const embed = new EmbedBuilder()
            .setTitle('<:arquivo:1539124693460713552> Ranking de Mensagens (Tempo Real)')
            .setDescription(`<:ID:1534611999085039786> **Top 10 Enviadores:**\n\n${lista}`)
            .setColor('#2b2d31');

        return message.channel.send({ embeds: [embed] });
    }
});

// Monitoramento de Tempo em Call
client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.guild.id !== GUILD_PERMITIDA) return;
    const userId = newState.id;

    if (!oldState.channelId && newState.channelId) {
        callStartTime[userId] = Date.now();
    } else if (oldState.channelId && !newState.channelId) {
        if (callStartTime[userId]) {
            const timeSpent = Math.floor((Date.now() - callStartTime[userId]) / 1000);
            voiceTime[userId] = (voiceTime[userId] || 0) + timeSpent;
            delete callStartTime[userId];
        }
    }
});

// Monitoramento do Status Roxo dos Membros
client.on('presenceUpdate', (oldPresence, newPresence) => {
    if (!newPresence || newPresence.guild.id !== GUILD_PERMITIDA) return;
    const userId = newPresence.userId;

    const isStreamingZyphor = newPresence.activities.some(act => 
        act.type === ActivityType.Streaming && 
        (act.name?.toLowerCase().includes('zyphor') || act.state?.toLowerCase().includes('zyphor') || act.details?.toLowerCase().includes('zyphor'))
    );

    const wasStreamingZyphor = oldPresence?.activities?.some(act => 
        act.type === ActivityType.Streaming && 
        (act.name?.toLowerCase().includes('zyphor') || act.state?.toLowerCase().includes('zyphor') || act.details?.toLowerCase().includes('zyphor'))
    );

    if (!wasStreamingZyphor && isStreamingZyphor) {
        streamStatusStartTime[userId] = Date.now();
    } else if (wasStreamingZyphor && !isStreamingZyphor) {
        if (streamStatusStartTime[userId]) {
            const spent = Math.floor((Date.now() - streamStatusStartTime[userId]) / 1000);
            streamStatusTime[userId] = (streamStatusTime[userId] || 0) + spent;
            delete streamStatusStartTime[userId];
        }
    }
});

const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
client.login(token);
