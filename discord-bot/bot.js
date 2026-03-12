const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_SECRET = process.env.BOT_SECRET;
const SITE_URL = process.env.SITE_URL || "https://dev-cs.psykostats.com";

// Reward interval: 20 minutes
const INTERVAL_MS = 20 * 60 * 1000;

// ── Slash Commands ──────────────────────────────────────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link your Discord to your Psyko Skrubs account")
    .addStringOption((opt) =>
      opt.setName("code").setDescription("The 6-character code from your profile page").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("coins")
    .setDescription("Check your Psyko Coins balance and today's voice earnings"),
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the top earners from Discord voice today"),
].map((c) => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: commands });
  console.log("Slash commands registered.");
}

// ── API helpers ─────────────────────────────────────────────────────────────

async function callAPI(path, method = "GET", body = null) {
  const res = await fetch(`${SITE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BOT_SECRET}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Voice reward loop ───────────────────────────────────────────────────────

async function runRewardCycle(client) {
  const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
  if (!guild) return;

  // Collect all members in any voice channel (excluding bots and AFK)
  const afkChannelId = guild.afkChannelId;
  const voiceMembers = [];

  for (const [, channel] of guild.channels.cache) {
    if (channel.type !== 2) continue; // 2 = GuildVoice
    if (channel.id === afkChannelId) continue;
    for (const [, member] of channel.members) {
      if (!member.user.bot) voiceMembers.push(member.user.id);
    }
  }

  if (voiceMembers.length === 0) return;

  console.log(`[rewards] ${voiceMembers.length} members in voice — awarding coins`);
  const result = await callAPI("/api/discord/award", "POST", { discordIds: voiceMembers });

  if (!result.awarded || result.awarded.length === 0) return;

  // Post a reward summary to the first text channel we can find named general/coins/bot
  const notifyChannel =
    guild.channels.cache.find(
      (c) => c.type === 0 && ["coins", "bot-spam", "bot", "general"].includes(c.name.toLowerCase())
    ) ?? null;

  if (notifyChannel) {
    const lines = result.awarded.map(
      (a) => `🪙 **${a.username}** earned **${a.coins}** coins (${a.dailyTotal}/500 today)`
    );
    const embed = new EmbedBuilder()
      .setColor(0xf97316)
      .setTitle("Voice Rewards Distributed")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Earn up to 500 coins/day by being in voice chat" })
      .setTimestamp();
    await notifyChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID || !BOT_SECRET) {
    throw new Error("Missing required env vars: DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, BOT_SECRET");
  }

  await registerCommands();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
    // Run immediately, then every 20 minutes
    runRewardCycle(client);
    setInterval(() => runRewardCycle(client), INTERVAL_MS);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // ── /link <code> ──
    if (interaction.commandName === "link") {
      await interaction.deferReply({ ephemeral: true });
      const code = interaction.options.getString("code").trim().toUpperCase();

      const result = await callAPI("/api/discord/verify-link", "POST", {
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        code,
      });

      if (result.error) {
        const messages = {
          "Invalid code": "That code doesn't exist. Generate one on your profile page.",
          "Code expired": "That code has expired (10 min limit). Generate a new one on your profile page.",
          "Discord account already linked to another user": "Your Discord is already linked to a different account.",
          "Discord already linked": "This site account already has Discord linked.",
        };
        await interaction.editReply({ content: `❌ ${messages[result.error] ?? result.error}` });
      } else {
        await interaction.editReply({
          content: `✅ Linked! Your Discord is now connected to **${result.username}** on Psyko Skrubs.\nYou'll earn **100 coins every 20 minutes** in voice chat (up to 500/day).`,
        });
      }
    }

    // ── /coins ──
    if (interaction.commandName === "coins") {
      await interaction.deferReply({ ephemeral: true });

      // We can't look up by discordId directly from the bot without a dedicated endpoint,
      // so we POST to award with 0-length list just to check — instead let's add a status endpoint call
      const result = await callAPI(`/api/discord/bot-status?discordId=${interaction.user.id}`);

      if (!result.linked) {
        await interaction.editReply({
          content: `❌ Your Discord isn't linked yet!\nGo to your profile on **${SITE_URL}**, generate a link code, then run \`/link <code>\`.`,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xf97316)
        .setTitle("Your Psyko Coins")
        .addFields(
          { name: "Balance", value: `🪙 ${result.balance.toLocaleString()} coins`, inline: true },
          { name: "Earned Today", value: `${result.todayEarned} / 500 coins`, inline: true }
        )
        .setFooter({ text: "Earn coins by hanging in voice chat • 100 coins per 20 min" });
      await interaction.editReply({ embeds: [embed] });
    }

    // ── /leaderboard ──
    if (interaction.commandName === "leaderboard") {
      await interaction.deferReply();
      const result = await callAPI("/api/discord/leaderboard");

      if (!result.entries || result.entries.length === 0) {
        await interaction.editReply({ content: "No voice earnings today yet — hop in a voice channel!" });
        return;
      }

      const lines = result.entries.map(
        (e, i) => `${["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} **${e.username}** — ${e.coins} coins today`
      );

      const embed = new EmbedBuilder()
        .setColor(0xf97316)
        .setTitle("Today's Voice Earners")
        .setDescription(lines.join("\n"))
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }
  });

  await client.login(DISCORD_TOKEN);
}

main().catch(console.error);
