const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  SlashCommandBuilder,
  REST,
  Routes,
} = require('discord.js');

// ── Config ────────────────────────────────
const BOT_TOKEN       = process.env.DISCORD_TOKEN;
const CLIENT_ID       = '1507028051429691624';
const GUILD_ID        = '1504579285103677651';
const MEMBER_ROLE_ID  = '1504793152131829850';

// ┌─────────────────────────────────────────────────────────┐
// │  TICKET SYSTEM CONFIG — fill these in                   │
// │  TICKET_CATEGORY_ID : category where tickets are made   │
// │  SUPPORT_ROLE_ID    : role that can see all tickets     │
// │  TICKET_LOG_CHANNEL : channel to log closed tickets     │
// └─────────────────────────────────────────────────────────┘
const TICKET_CATEGORY_ID  = process.env.TICKET_CATEGORY_ID  || '1507332056642879538';
const SUPPORT_ROLE_ID     = process.env.SUPPORT_ROLE_ID     || '1507332152465821706';
const TICKET_LOG_CHANNEL  = process.env.TICKET_LOG_CHANNEL  || '1507332505458573403';

// ── Welcome System Config ─────────────────
const WELCOME_CHANNEL_ID  = process.env.WELCOME_CHANNEL_ID  || '1504579285694943495';

// ── In-memory set to prevent duplicate open tickets ───────
// Maps userId → ticketChannelId
const openTickets = new Map();

// ── Client ────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

// ── Register slash commands on startup ────
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup-verify')
      .setDescription('Send the verification embed to this channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),

    new SlashCommandBuilder()
      .setName('setup-tickets')
      .setDescription('Send the ticket panel embed to this channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),

    new SlashCommandBuilder()
      .setName('close')
      .setDescription('Close this support ticket')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('add')
      .setDescription('Add a user to this ticket')
      .addUserOption(opt =>
        opt.setName('user').setDescription('User to add').setRequired(true)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName('remove')
      .setDescription('Remove a user from this ticket')
      .addUserOption(opt =>
        opt.setName('user').setDescription('User to remove').setRequired(true)
      )
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
}

// ── Ready ─────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Manifest Helper Bot logged in as ${client.user.tag}`);
  await registerCommands();
});

// ══════════════════════════════════════════════════════════
//  WELCOME SYSTEM
// ══════════════════════════════════════════════════════════
client.on('guildMemberAdd', async (member) => {
  const guild = member.guild;

  // ── Welcome embed in hub channel ────────
  try {
    const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (welcomeChannel) {
      const avatarUrl = member.user.displayAvatarURL({ dynamic: true, size: 256 });
      const memberCount = guild.memberCount;

      const embed = new EmbedBuilder()
        .setColor(0x00b856)
        .setAuthor({ name: `${member.user.username} just joined!`, iconURL: avatarUrl })
        .setTitle('🎉  Welcome to Manifest Hub!')
        .setDescription(
          `Hey ${member}, glad to have you here!\n\n` +
          '**To get started:**\n' +
          '1️⃣ Head to <#1504793152131829850> and verify your account\n' +
          '2️⃣ Visit **[manifesthubs.netlify.app](https://manifesthubs.netlify.app)** and log in\n' +
          '3️⃣ Download manifests, Lua scripts and more!\n\n' +
          '> Need help? Open a ticket in our support channel.'
        )
        .setThumbnail(avatarUrl)
        .setImage('https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg')
        .addFields(
          { name: '👤 Member', value: `${member}`, inline: true },
          { name: '🪪 Account', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true },
          { name: '👥 Members', value: `You are member **#${memberCount}**!`, inline: true },
        )
        .setFooter({ text: 'Manifest Hub • Steam Manifest Downloader' })
        .setTimestamp();

      await welcomeChannel.send({ content: `Welcome ${member} 🎉`, embeds: [embed] });
      console.log(`👋 Welcome message sent for ${member.user.tag}`);
    }
  } catch (err) {
    console.error('❌ Failed to send welcome message:', err.message);
  }

  // ── DM the new member ───────────────────
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('👋  Welcome to Manifest Hub!')
      .setDescription(
        `Hey **${member.user.username}**, thanks for joining **Manifest Hub**!\n\n` +
        '**Here\'s how to get started:**\n' +
        '1️⃣ Visit our website below and log in with Discord\n' +
        '2️⃣ You\'ll get verified automatically ✅\n' +
        '3️⃣ Download Steam manifests, Lua scripts and more!\n\n' +
        '> 🔒 Need help? Open a support ticket in the server.'
      )
      .addFields(
        { name: '🌐 Website', value: '[manifesthubs.netlify.app](https://manifesthubs.netlify.app)', inline: true },
        { name: '💬 Discord', value: '[Join here](https://discord.gg/KUDhw8zYh)', inline: true },
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'Manifest Hub • Automated Welcome Message' })
      .setTimestamp();

    await member.send({ embeds: [dmEmbed] });
    console.log(`📨 DM sent to ${member.user.tag}`);
  } catch (err) {
    // User may have DMs disabled — that's fine
    console.warn(`⚠️ Could not DM ${member.user.tag}: ${err.message}`);
  }
});

// ══════════════════════════════════════════════════════════
//  INTERACTION HANDLER
// ══════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {

  // ──────────────────────────────────────────────────────
  //  SLASH COMMANDS
  // ──────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {

    // ── /setup-verify ───────────────────────────────────
    if (interaction.commandName === 'setup-verify') {
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

    // ── /setup-tickets ──────────────────────────────────
    if (interaction.commandName === 'setup-tickets') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ You need Administrator permission.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎫  Manifest Hub — Support')
        .setDescription(
          'Need help with a manifest, an issue, or have a question?\n\n' +
          '**Click the button below to open a private support ticket.**\n\n' +
          '> 📋 Describe your issue clearly after opening the ticket.\n' +
          '> ⏱️ Our team will respond as soon as possible.\n' +
          '> 🔒 Only you and the support team can see your ticket.'
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'Manifest Hub • Support System' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_ticket')
          .setLabel('🎫  Open a Ticket')
          .setStyle(ButtonStyle.Primary),
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: '✅ Ticket panel sent!', ephemeral: true });
    }

    // ── /close ──────────────────────────────────────────
    if (interaction.commandName === 'close') {
      const channel = interaction.channel;

      // Must be inside a ticket channel (name starts with "ticket-")
      if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: '❌ This command can only be used inside a ticket channel.', ephemeral: true });
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('🔒  Close Ticket')
        .setDescription('Are you sure you want to close this ticket?\n\nThis channel will be **deleted** shortly after confirmation.');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_close')
          .setLabel('✅  Confirm Close')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_close')
          .setLabel('❌  Cancel')
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.reply({ embeds: [confirmEmbed], components: [row] });
    }

    // ── /add ────────────────────────────────────────────
    if (interaction.commandName === 'add') {
      const channel = interaction.channel;
      if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: '❌ This command can only be used inside a ticket channel.', ephemeral: true });
      }
      const target = interaction.options.getMember('user');
      await channel.permissionOverwrites.create(target, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
      await interaction.reply({ content: `✅ Added ${target} to the ticket.` });
    }

    // ── /remove ─────────────────────────────────────────
    if (interaction.commandName === 'remove') {
      const channel = interaction.channel;
      if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: '❌ This command can only be used inside a ticket channel.', ephemeral: true });
      }
      const target = interaction.options.getMember('user');
      await channel.permissionOverwrites.delete(target);
      await interaction.reply({ content: `✅ Removed ${target} from the ticket.` });
    }
  }

  // ──────────────────────────────────────────────────────
  //  BUTTON INTERACTIONS
  // ──────────────────────────────────────────────────────
  if (interaction.isButton()) {

    // ── verify_member ────────────────────────────────────
    if (interaction.customId === 'verify_member') {
      const member = interaction.member;

      if (member.roles.cache.has(MEMBER_ROLE_ID)) {
        return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
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

    // ── open_ticket ───────────────────────────────────────
    if (interaction.customId === 'open_ticket') {
      await interaction.deferReply({ ephemeral: true });

      const guild  = interaction.guild;
      const member = interaction.member;

      // Check if user already has an open ticket
      if (openTickets.has(member.id)) {
        const existingId = openTickets.get(member.id);
        const existing   = guild.channels.cache.get(existingId);
        if (existing) {
          return interaction.editReply({
            content: `❌ You already have an open ticket: ${existing}. Please use that channel.`,
          });
        } else {
          // Channel was deleted externally — clean up
          openTickets.delete(member.id);
        }
      }

      // Sanitise username for channel name
      const safeName = member.user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20) || member.user.id;

      try {
        const permissionOverwrites = [
          {
            // @everyone — deny view
            id: guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            // Ticket opener — allow
            id: member.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          },
          {
            // Bot itself — allow
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ];

        // Add support role override if configured
        if (SUPPORT_ROLE_ID) {
          permissionOverwrites.push({
            id: SUPPORT_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.AttachFiles,
            ],
          });
        }

        // Create ticket channel (no category for now — set TICKET_CATEGORY_ID env var with a valid Category ID to group tickets)
        let ticketChannel;
        try {
          ticketChannel = await guild.channels.create({
            name: `ticket-${safeName}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID || null,
            permissionOverwrites,
            topic: `Support ticket for ${member.user.tag} (${member.id}) — opened <t:${Math.floor(Date.now()/1000)}:R>`,
          });
        } catch (createErr) {
          console.warn(`⚠️ Could not create ticket with category (${createErr.code}: ${createErr.message}). Retrying without category...`);
          ticketChannel = await guild.channels.create({
            name: `ticket-${safeName}`,
            type: ChannelType.GuildText,
            permissionOverwrites,
            topic: `Support ticket for ${member.user.tag} (${member.id}) — opened <t:${Math.floor(Date.now()/1000)}:R>`,
          });
        }

        openTickets.set(member.id, ticketChannel.id);

        // Welcome embed inside ticket
        const ticketEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🎫  Ticket — ${member.user.username}`)
          .setDescription(
            `Hey ${member}, welcome to your support ticket!\n\n` +
            '**Please describe your issue in as much detail as possible:**\n' +
            '• What game / App ID are you having trouble with?\n' +
            '• What error or problem are you experiencing?\n' +
            '• What have you already tried?\n\n' +
            '> Our support team will be with you shortly.'
          )
          .setFooter({ text: `Ticket ID: ${ticketChannel.id} • Manifest Hub Support` })
          .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_close')
            .setLabel('🔒  Close Ticket')
            .setStyle(ButtonStyle.Danger),
        );

        await ticketChannel.send({
          content: `${member}${SUPPORT_ROLE_ID ? ` <@&${SUPPORT_ROLE_ID}>` : ''}`,
          embeds: [ticketEmbed],
          components: [closeRow],
        });

        await interaction.editReply({
          content: `✅ Your ticket has been created: ${ticketChannel}`,
        });

        console.log(`🎫 Ticket opened by ${member.user.tag} → #${ticketChannel.name}`);
      } catch (err) {
        console.error('❌ Failed to create ticket channel:', err.code, err.message, err);
        await interaction.editReply({
          content: `❌ Failed to create your ticket. Error: \`${err.code || err.message}\` — please contact an admin.`,
        });
      }
    }

    // ── confirm_close ─────────────────────────────────────
    if (interaction.customId === 'confirm_close') {
      const channel = interaction.channel;
      if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
      }

      await interaction.reply({ content: '🔒 Closing ticket in **5 seconds**...' });

      // Log to log channel if configured
      if (TICKET_LOG_CHANNEL) {
        try {
          const logChannel = interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor(0xff4444)
              .setTitle('🔒  Ticket Closed')
              .addFields(
                { name: 'Channel',   value: channel.name,                              inline: true  },
                { name: 'Closed by', value: `${interaction.user.tag}`,                 inline: true  },
                { name: 'Time',      value: `<t:${Math.floor(Date.now()/1000)}:F>`,    inline: false },
              )
              .setFooter({ text: `Channel ID: ${channel.id}` })
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch (e) { console.error('❌ Could not log to ticket log channel:', e); }
      }

      // Remove from openTickets map
      for (const [uid, cid] of openTickets.entries()) {
        if (cid === channel.id) { openTickets.delete(uid); break; }
      }

      setTimeout(() => {
        channel.delete('Ticket closed').catch(console.error);
      }, 5000);
    }

    // ── cancel_close ──────────────────────────────────────
    if (interaction.customId === 'cancel_close') {
      await interaction.update({ content: '✅ Close cancelled.', components: [], embeds: [] });
    }
  }
});

// ── Login ─────────────────────────────────
client.login(BOT_TOKEN);

// ── Keep-Alive Web Server ─────────────────
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Manifest Helper Bot is Online! 🚀');
});

app.listen(PORT, () => {
  console.log(`✅ Keep-alive server is listening on port ${PORT}`);
});

