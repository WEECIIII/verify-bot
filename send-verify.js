// One-time script: sends the verify embed to a channel
// Run: node send-verify.js CHANNEL_ID
// Example: node send-verify.js 1234567890123456789

const CHANNEL_ID = process.argv[2];
const BOT_TOKEN  = process.env.DISCORD_TOKEN;

if (!CHANNEL_ID) {
  console.error('❌ Usage: node send-verify.js <CHANNEL_ID>');
  process.exit(1);
}

const embed = {
  color: 0x00b856,
  title: '✅  Welcome to Manifest Hub',
  description:
    '> To get access, click the button below and **login with Discord** on our website.\n\n' +
    '> If verification isn\'t working, contact **huudess** on Discord.',
  footer: { text: 'Manifest Hub • Verification System' },
  timestamp: new Date().toISOString(),
};

const components = [{
  type: 1, // Action Row
  components: [{
    type: 2,           // Button
    style: 5,          // Link style — no bot needed!
    label: '✅  Get Access',
    url: 'https://manifesthubs.netlify.app/verify.html',
  }],
}];

fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ embeds: [embed], components }),
})
  .then(async res => {
    if (res.ok) {
      console.log('✅ Verify embed sent successfully!');
    } else {
      const err = await res.text();
      console.error('❌ Failed:', err);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
