const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require("discord.js");

// إنشاء البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// === الإعدادات (عدلها على حسب سيرفرك) ===
const MANAGER_ROLE_ID = "123456789012345678";   // رول الإدارة
const BLACKLIST_ROLE_ID = "987654321098765432"; // رول البلاك ليست
const SERVER_LOGO_URL = "https://i.ibb.co/q9tR7bS/server-logo.png"; // ضع رابط صورة السيرفر

client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// أمر الإدارة لإرسال رسالة التيكتات
client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.content.toLowerCase() === "تيكيات") {
        if (!message.member.roles.cache.has(MANAGER_ROLE_ID)) return;

        const embed = new EmbedBuilder()
            .setTitle("🎫 نظام التيكتات")
            .setDescription("اختر نوع الشكوى من الأزرار تحت 👇")
            .setFooter({ text: "Ticket System V2.0" })
            .setColor("Yellow")
            .setThumbnail(SERVER_LOGO_URL);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("general").setLabel("📩 شكاوي عامة").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("rp").setLabel("🎭 شكاوي RP").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("admin").setLabel("⚖️ شكاوي الإدارة").setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// الضغط على زر نوع الشكوى
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.member.roles.cache.has(BLACKLIST_ROLE_ID)) {
        return interaction.reply({ content: "🚫 لا يمكنك استخدام نظام التذاكر.", ephemeral: true });
    }

    const modal = new ModalBuilder()
        .setCustomId("ticketModal")
        .setTitle("📋 استمارة الشكوى");

    const q1 = new TextInputBuilder().setCustomId("q1").setLabel("ما نوع الشكوى؟").setStyle(TextInputStyle.Short).setRequired(true);
    const q2 = new TextInputBuilder().setCustomId("q2").setLabel("من هو الشخص المشتكى عليه؟").setStyle(TextInputStyle.Short).setRequired(false);
    const q3 = new TextInputBuilder().setCustomId("q3").setLabel("اشرح تفاصيل الشكوى.").setStyle(TextInputStyle.Paragraph).setRequired(true);
    const q4 = new TextInputBuilder().setCustomId("q4").setLabel("هل عندك أدلة؟ (روابط/صور)").setStyle(TextInputStyle.Paragraph).setRequired(false);
    const q5 = new TextInputBuilder().setCustomId("q5").setLabel("أي ملاحظات إضافية؟").setStyle(TextInputStyle.Paragraph).setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(q1),
        new ActionRowBuilder().addComponents(q2),
        new ActionRowBuilder().addComponents(q3),
        new ActionRowBuilder().addComponents(q4),
        new ActionRowBuilder().addComponents(q5)
    );

    await interaction.showModal(modal);
});

// عند إرسال الاستمارة
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "ticketModal") return;

    const answers = {
        q1: interaction.fields.getTextInputValue("q1"),
        q2: interaction.fields.getTextInputValue("q2"),
        q3: interaction.fields.getTextInputValue("q3"),
        q4: interaction.fields.getTextInputValue("q4"),
        q5: interaction.fields.getTextInputValue("q5"),
    };

    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: 0,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: MANAGER_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
        ]
    });

    const embed = new EmbedBuilder()
        .setTitle("📋 استمارة الشكوى")
        .setColor("Yellow")
        .setThumbnail(SERVER_LOGO_URL)
        .addFields(
            { name: "📝 نوع الشكوى", value: answers.q1 || "—" },
            { name: "👤 المشتكى عليه", value: answers.q2 || "—" },
            { name: "📖 تفاصيل الشكوى", value: answers.q3 || "—" },
            { name: "📎 الأدلة", value: answers.q4 || "—" },
            { name: "💬 ملاحظات إضافية", value: answers.q5 || "—" }
        )
        .setFooter({ text: "Ticket System V2.0 | حقوق السيرفر ©" })
        .setTimestamp();

    const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("closeTicket").setLabel("🔒 إغلاق الشكوى").setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ 
        content: `<@${interaction.user.id}> ✅ شكراً لإرسال الشكوى, تقدر تتابع هنا`, 
        embeds: [embed], 
        components: [closeButton] 
    });

    await interaction.reply({ content: "✅ تم إنشاء تذكرة خاصة بك!", ephemeral: true });
});

// زر إغلاق التذكرة
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === "closeTicket") {
        if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
            return interaction.reply({ content: "🚫 فقط الإدارة يمكنهم إغلاق الشكوى.", ephemeral: true });
        }
        await interaction.channel.delete();
    }
});

// تسجيل الدخول
client.login(process.env.TOKEN);
