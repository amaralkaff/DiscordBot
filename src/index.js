require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ActivityType,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const ytdl = require("ytdl-core");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

let player = createAudioPlayer();

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays a YouTube video URL in your voice channel.")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("YouTube video URL")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops playing and leaves the voice channel."),
  // Add more commands as needed
].map((command) => command.toJSON());

const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity({
    name: "Rafly LEMAH KALI",
    type: ActivityType.Watching,
  });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "play") {
    const songUrl = interaction.options.getString("url");
    if (!ytdl.validateURL(songUrl)) {
      await interaction.reply("Please provide a valid YouTube URL.");
      return;
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply("You need to join a voice channel first!");
      return;
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });
    try {
      const stream = ytdl(songUrl, { filter: "audioonly" });
      const resource = createAudioResource(stream);

      player.play(resource);
      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      await interaction.reply(`Now playing: ${songUrl}`);
    } catch (error) {
      console.error(error);
      await interaction.reply("There was an error playing the song.");
    }
  } else if (commandName === "stop") {
    if (connection) {
      connection.destroy();
      await interaction.reply("Stopped playing and left the voice channel.");
    } else {
      await interaction.reply("I am not in a voice channel.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
