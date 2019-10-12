let bot = require('./bot/bot.js');
bot.command.execute('#instances min_users=100 max_users=10000 sort=statuses sort_order=desc limit=13').then(result => {
  console.log(result);
  bot.command.execute('#instances min_users=100 max_users=10000 sort=users sort_order=desc limit=13').then(console.log);
});
