const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
  REST,
  Routes,
} = require('discord.js');

// ── Config ────────────────────────────────
const BOT_TOKEN     = process.env.DISCORD_TOKEN;
const CLIENT_ID     = '1507028051429691624';
const GUILD_ID      = '1504579285103677651';
const MEMBER_ROLE_ID = '1504793152131829850';

// ── Client ────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ── Register slash command on startup ─────
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup-verify')
      .setDescription('Send the verification embed to this channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash command /setup-verify registered.');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
}

// ── Ready ─────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Verify bot logged in as ${client.user.tag}`);
  await registerCommands();
});

// ── Slash command: /setup-verify ──────────
client.on('interactionCreate', async (interaction) => {

  // ── /setup-verify ─────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup-verify') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ You need Administrator permission.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00b856)
      .setTitle('✅  Welcome to Manifest Hub')
      .setDescription(
        '> To gain access to the server, **login with Discord** on our website.\n\n' +
        '**Steps:**\n' +
        '1️⃣ Visit **[manifesthubs.netlify.app](https://manifesthubs.netlify.app)**\n' +
        '2️⃣ Click **Login with Discord**\n' +
        '3️⃣ You\'ll automatically get access ✅\n\n' +
        '> If verification isn\'t working, contact **huudess** on Discord.'
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'Manifest Hub • Verification System' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_member')
        .setLabel('✅  Verify Me')
        .setStyle(ButtonStyle.Success),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Verification panel sent!', ephemeral: true });
  }

  // ── Button: verify_member ──────────────
  if (interaction.isButton() && interaction.customId === 'verify_member') {
    const member = interaction.member;

    // Already has role?
    if (member.roles.cache.has(MEMBER_ROLE_ID)) {
      return interaction.reply({
        content: '✅ You are already verified!',
        ephemeral: true,
      });
    }

    try {
      await member.roles.add(MEMBER_ROLE_ID);
      await interaction.reply({
        content: '🎉 **You\'re verified!** Welcome to Manifest Hub — you now have full access.',
        ephemeral: true,
      });
      console.log(`✅ Verified: ${member.user.tag}`);
    } catch (err) {
      console.error(`❌ Failed to assign role to ${member.user.tag}:`, err);
      await interaction.reply({
        content: '❌ Failed to assign your role. Please contact an admin.',
        ephemeral: true,
      });
    }
  }
});

// ── Login ─────────────────────────────────
client.login(BOT_TOKEN);

// ── Render Keep-Alive Web Server ──────────
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Manifest Helper Bot is Online! 🚀');
});

app.listen(PORT, () => {
  console.log(`✅ Keep-alive server is listening on port ${PORT}`);
});

