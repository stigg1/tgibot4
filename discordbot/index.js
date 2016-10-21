var fs = require('fs');

try {
	var Discord = require("discord.js");
} catch (e) {
	console.log(e.stack);
	console.log(process.version);
	console.log("Please run npm install and ensure it passes with no errors!");
	process.exit();
}

console.log('\n Starting TGI Discord Bot'.bold.yellow + '\nNode ver: '.bold.white + process.version.bold.green + ' ::: '.bold.blue + 'Discord.js ver: '.bold.white + Discord.version.bold.green);

try {
	var yt = require("./plugins/youtube_plugin");
	var youtube_plugin = new yt();
} catch(e) {
	console.log("couldn't load youtube plugin!\n"+e.stack);
}

try {
	var wa = require("./plugins/wolfram_plugin");
	var wolfram_plugin = new wa();
} catch(e) {
	console.log("couldn't load wolfram plugin!\n"+e.stack);
}

try {
	var AuthDetails = require("../auth.json");
} catch (e) {
	console.log("Please create an auth.json like auth.json.example with a bot token or an email and password.\n"+e.stack);
	process.exit();
}

// Load custom permissions
var dangerousCommands = ["eval","pullanddeploy","setUsername"];
var Permissions = {};
try {
	Permissions = require('../permissions.json');
} catch(e) {
	Permissions.global = {};
	Permissions.users = {};
}
for( var i=0; i<dangerousCommands.length;i++ ) {
	var cmd = dangerousCommands[i];
	if(!Permissions.global.hasOwnProperty(cmd)) {
		Permissions.global[cmd] = false;
	}
}
Permissions.checkPermission = function (user,permission) {
	try {
		var allowed = true;
		try {
			if(Permissions.global.hasOwnProperty(permission)) {
				allowed = Permissions.global[permission] === true;
			}
		} catch(e){}
		try {
			if(Permissions.users[user.id].hasOwnProperty(permission)) {
				allowed = Permissions.users[user.id][permission] === true;
			}
		} catch(e){}
		return allowed;
	} catch(e){}
	return false;
}

fs.writeFile('./permissions.json',JSON.stringify(Permissions,null,2));

//load config data
var Config = {};
try {
	Config = require('../config.json');
} catch(e) { // no config file, use defaults
	Config.debug = false;
	Config.commandPrefix = '!';
	try {
		if (fs.lstatSync("./config.json").isFile()) {
			console.log("WARNING: config.json found but we couldn't read it!\n" + e.stack);
		}
	} catch(e2) {
		fs.writeFile("./config.json",JSON.stringify(Config,null,2));
	}
}
if (!Config.hasOwnProperty("commandPrefix")) {
	Config.commandPrefix = "!";
}

var qs = require('querystring');

var d20 = require('d20');

var htmlToText = require('html-to-text');

var startTime = Date.now();

var aliases;

var messagebox;

var commands = {
	"aliases": {
		description: "lists all recorded aliases",
		process: function (bot, msg, suffix) {
			var text = "current aliases:\n";                                                                                     for(var a in aliases){                                                                                                       if(typeof a === 'string')
				text += a + " ";
			}
			msg.channel.sendMessage(text);
		}
	},
  "ping": {
    description: "responds pong, useful for checking if bot is alive",
    process: function (bot, msg, suffix) {
    	msg.channel.sendMessage( msg.author+" pong!");
    	if(suffix) {
      	msg.channel.sendMessage( "note that !ping takes no arguments!");
    	}
    }
  },
  "myid": {
    description: "returns the user id of the sender",
    process: function (bot,msg) {
			msg.channel.sendMessage(msg.author.id);
		}
  },
  "idle": {
		usage: "[status]",
    description: "sets bot status to idle",
    process: function (bot,msg,suffix) {
			bot.user.setStatus("idle",suffix);
		}
  },
  "online": {
		usage: "[status]",
    description: "sets bot status to online",
    process: function (bot,msg,suffix) {
			bot.user.setStatus("online",suffix);
		}
  },
  "youtube": {
    usage: "<video tags>",
    description: "gets youtube video matching tags",
    process: function (bot,msg,suffix) {
      youtube_plugin.respond(suffix,msg.channel,bot);
    }
  },
  "say": {
    usage: "<message>",
    description: "bot says message",
    process: function (bot, msg, suffix) {
			msg.channel.sendMessage(suffix);
		}
  },
	"announce": {
    usage: "<message>",
    description: "bot says message with text to speech",
    process: function (bot, msg, suffix) {
			msg.channel.sendMessage(suffix,{tts:true});
		}
  },
	"setUsername": {
		description: "sets the username of the bot. Note this can only be done twice an hour!",
		process: function (bot, msg, suffix) {
			bot.user.setUsername(suffix);
		}
	},
  "log": {
    usage: "<log message>",
    description: "logs message to bot console",
    process: function (bot, msg, suffix) {
			console.log('From !log:'.bold.yellow + msg.content.bold.white);
		}
  },
	// NOTE: NOT WORKING
  "wiki": {
    usage: "<search terms>",
    description: "returns the summary of the first matching search result from Wikipedia",
    process: function (bot, msg, suffix) {
      var query = suffix;
      if (!query) {
        msg.channel.sendMessage("usage: " + Config.commandPrefix + "wiki search terms");
        return;
    	}
      var Wiki = require('wikijs');
      new Wiki().search(query,1).then(function(data) {
      	new Wiki().page(data.results[0]).then(function(page) {
        	page.summary().then(function(summary) {
            var sumText = summary.toString().split('\n');
              var continuation = function() {
                var paragraph = sumText.shift();
                if (paragraph) {
                  msg.channel.sendMessage(paragraph,continuation);
                }
              };
            continuation();
          });
        });
      }, function (err) {
        msg.channel.sendMessage(err);
      });
    }
  },
  "create": {
    usage: "<channel name>",
    description: "creates a new text channel with the given name.",
    process: function(bot,msg,suffix) {
      msg.channel.guild.createChannel(suffix,"text").then(function(channel) {
        msg.channel.sendMessage("created " + channel);
      })
			.catch(function(error) {
				msg.channel.sendMessage("failed to create channel: " + error);
			});
    }
  },
	"voice": {
		usage: "<channel name>",
		description: "creates a new voice channel with the give name.",
		process: function(bot,msg,suffix) {
    	msg.channel.guild.createChannel(suffix,"voice").then(function(channel) {
        msg.channel.sendMessage("created " + channel.id);
				console.log("created " + channel);
      })
			.catch(function(error) {
				msg.channel.sendMessage("failed to create channel: " + error);
			});
    }
	},
	"delete": {
    usage: "<channel name>",
    description: "deletes the specified channel",
    process: function(bot,msg,suffix) {
			var channel = bot.channels.find("id",suffix);
			if (suffix.startsWith('<#')) {
				channel = bot.channels.find("id",suffix.substr(2,suffix.length-3));
			}
      if (!channel) {
				var channels = msg.channel.guild.channels.findAll("name",suffix);
				if(channels.length > 1) {
					var response = "Multiple channels match, please use id:";
					for(var i=0;i<channels.length;i++) {
						response += channels[i] + ": " + channels[i].id;
					}
					msg.channel.sendMessage(response);
					return;
				} else if(channels.length == 1) {
					channel = channels[0];
				} else {
					msg.channel.sendMessage( "Couldn't find channel " + suffix + " to delete!");
					return;
				}
			}
      msg.channel.guild.defaultChannel.sendMessage("deleting channel " + suffix + " at " +msg.author + "'s request");
      if (msg.channel.guild.defaultChannel != msg.channel) {
        msg.channel.sendMessage("deleting " + channel);
      }
      channel.delete().then(function(channel) {
				console.log("deleted " + suffix + " at " + msg.author + "'s request");
      })
			.catch(function(error) {
				msg.channel.sendMessage("couldn't delete channel: " + error);
			});
    }
  },
	"wolfram": {
		usage: "<search terms>",
		description: "gives results from wolframalpha using search terms",
		process: function(bot,msg,suffix) {
			if (!suffix) {
				msg.channel.sendMessage("Usage: " + Config.commandPrefix + "wolfram <search terms> (Ex. " + Config.commandPrefix + "wolfram integrate 4x)");
			}
			msg.channel.sendMessage("*Querying Wolfram Alpha...*").then(message => {
				wolfram_plugin.respond(suffix,msg.channel,bot,message);
			});
		}
	},
	"userid": {
	usage: "[user to get id of]",
	description: "Returns the unique id of a user. This is useful for permissions.",
	process: function(bot,msg,suffix) {
		if (suffix) {
			var users = msg.channel.guild.members.filter((member) => member.user.username == suffix).array();
			if(users.length == 1) {
				msg.channel.sendMessage( "The id of " + users[0].user.username + " is " + users[0].user.id)
			} else if(users.length > 1) {
				var response = "multiple users found:";
				for(var i=0;i<users.length;i++) {
					var user = users[i];
					response += "\nThe id of <@" + user.id + "> is " + user.id;
				}
				msg.channel.sendMessage(response);
			} else {
				msg.channel.sendMessage("No user " + suffix + " found!");
			}
			} else {
				msg.channel.sendMessage( "The id of " + msg.author + " is " + msg.author.id);
			}
		}
	},
	"eval": {
		usage: "<command>",
		description: 'Executes arbitrary javascript in the bot process. User must have "eval" permission',
		process: function(bot,msg,suffix) {
			if (Permissions.checkPermission(msg.author,"eval")) {
				msg.channel.sendMessage( eval(suffix,bot));
			} else {
				msg.channel.sendMessage( msg.author + " doesn't have permission to execute eval!");
			}
		}
	},
	"topic": {
		usage: "[topic]",
		description: 'Sets the topic for the channel. No topic removes the topic.',
		process: function(bot,msg,suffix) {
			msg.channel.setTopic(suffix);
		}
	},
	"roll": {
		usage: "[# of sides] or [# of dice]d[# of sides]( + [# of dice]d[# of sides] + ...)",
		description: "roll one die with x sides, or multiple dice using d20 syntax. Default value is 10",
		process: function(bot,msg,suffix) {
			if (suffix.split("d").length <= 1) {
				msg.channel.sendMessage(msg.author + " rolled a " + d20.roll(suffix || "10"));
			}
			else if (suffix.split("d").length > 1) {
				var eachDie = suffix.split("+");
				var passing = 0;
				for (var i = 0; i < eachDie.length; i++) {
					if (eachDie[i].split("d")[0] < 50) {
						passing += 1;
					};
				}
			if (passing == eachDie.length) {
				msg.channel.sendMessage(msg.author + " rolled a " + d20.roll(suffix));
				}  else {
					msg.channel.sendMessage(msg.author + " tried to roll too many dice at once!");
				}
			}
		}
	},
	"uptime": {
		usage: "",
		description: "returns the amount of time since the bot started",
		process: function (bot, msg, suffix) {
			var now = Date.now();
			var msec = now - startTime;
			console.log("Uptime is " + msec + " milliseconds");
			var days = Math.floor(msec / 1000 / 60 / 60 / 24);
			msec -= days * 1000 * 60 * 60 * 24;
			var hours = Math.floor(msec / 1000 / 60 / 60);
			msec -= hours * 1000 * 60 * 60;
			var mins = Math.floor(msec / 1000 / 60);
			msec -= mins * 1000 * 60;
			var secs = Math.floor(msec / 1000);
			var timestr = "";
			if (days > 0) {
				timestr += days + " days ";
			}
			if (hours > 0) {
				timestr += hours + " hours ";
			}
			if (mins > 0) {
				timestr += mins + " minutes ";
			}
			if (secs > 0) {
				timestr += secs + " seconds ";
			}
			msg.channel.sendMessage("**Uptime**: " + timestr);
		}
	}
};

if (AuthDetails.hasOwnProperty("client_id")) {
	commands["invite"] = {
		description: "generates an invite link you can use to invite the bot to your server",
		process: function(bot,msg,suffix) {
			msg.channel.sendMessage("invite link: https://discordapp.com/oauth2/authorize?&client_id=" + AuthDetails.client_id + "&scope=bot&permissions=470019135");
		}
	}
}

try {
	aliases = require("./alias.json");
} catch(e) {
	//No aliases defined
	aliases = {};
}

try {
	messagebox = require("./messagebox.json");
} catch(e) {
	//no stored messages
	messagebox = {};
}
function updateMessagebox() {
	require("fs").writeFile("./messagebox.json",JSON.stringify(messagebox,null,2), null);
}

var bot = new Discord.Client();

bot.on("ready", function () {
		console.log('DISCORD: '.bold.yellow + 'TGInquisitor logged in.'.bold.cyan);
		console.log('DISCORD: '.bold.yellow + 'Active in '.bold.cyan + bot.guilds.array().length + ' server(s).'.bold.cyan);
		require("./plugins.js").init();
		console.log('Type '.bold.white+Config.commandPrefix.bold.white+'help in Discord for a commands list.'.bold.white);
		bot.user.setStatus("online",Config.commandPrefix+"help");
});

bot.on("disconnected", function () {
	console.log('Discord Bot Disconnected!'.bold.red);
	process.exit(1); //exit node.js with an error
});

function checkMessageForCommand (msg, isEdit) {
	//check if message is a command
	if (msg.author.id != bot.user.id && (msg.content[0] === Config.commandPrefix)) {
		console.log(msg.content.bold.magenta + ' from '.yellow + msg.author + ' as !command.'.yellow);
		var cmdTxt = msg.content.split(" ")[0].substring(1);
		var suffix = msg.content.substring(cmdTxt.length+2); // add one for the ! and one for the space
		if (msg.isMentioned(bot.user)) {
			try {
				cmdTxt = msg.content.split(" ")[1];
				suffix = msg.content.substring(bot.user.mention().length+cmdTxt.length+2);
			} catch(e) { //no command
				msg.channel.sendMessage("Yes?");
				return;
			}
		}
		alias = aliases[cmdTxt];
		if(alias) {
			console.log(cmdTxt + " is an alias, constructed command is " + alias.join(" ") + " " + suffix);
			cmdTxt = alias[0];
			suffix = alias[1] + " " + suffix;
		}
		var cmd = commands[cmdTxt];
				if(cmdTxt === "help") {
					//help is special since it iterates over the other commands
					if(suffix) {
						var cmds = suffix.split(" ").filter(function(cmd){return commands[cmd]});
						var info = "";
						for(var i=0;i<cmds.length;i++) {
							var cmd = cmds[i];
							info += "**"+Config.commandPrefix + cmd+"**";
							var usage = commands[cmd].usage;
								if(usage) {
									info += " " + usage;
								}
								var description = commands[cmd].description;
								if(description instanceof Function) {
									description = description();
								}
								if(description) {
									info += "\n\t" + description;
								}
							info += "\n"
						}
						msg.channel.sendMessage(info);
					} else {
						msg.author.sendMessage("**Available Commands:**").then(function() {
							var batch = "";
							var sortedCommands = Object.keys(commands).sort();
							for(var i in sortedCommands) {
								var cmd = sortedCommands[i];
								var info = "**"+Config.commandPrefix + cmd+"**";
								var usage = commands[cmd].usage;
								if(usage) {
									info += " " + usage;
								}
								var description = commands[cmd].description;
								if(description instanceof Function) {
									description = description();
								}
								if(description) {
									info += "\n\t" + description;
								}
								var newBatch = batch + "\n" + info;
								if(newBatch.length > (1024 - 8)) { // limit message length
									msg.author.sendMessage(batch);
									batch = info;
								} else {
									batch = newBatch
								}
							}
							if(batch.length > 0) {
								msg.author.sendMessage(batch);
							}
						});
					}
				}
				else if(cmd) {
					if(Permissions.checkPermission(msg.author,cmdTxt)) {
						try {
							cmd.process(bot,msg,suffix,isEdit);
						} catch(e) {
							var msgTxt = "command " + cmdTxt + " failed :(";
							if(Config.debug) {
								msgTxt += "\n" + e.stack;
							}
							msg.channel.sendMessage(msgTxt);
						}
				} else {
					msg.channel.sendMessage("You are not allowed to run " + cmdTxt + "!");
				}
			} else {
				msg.channel.sendMessage(cmdTxt + " not recognized as a command!").then((message => message.delete(5000)))
			}
		} else {
			//message isn't a command or is from us
					//drop our own messages to prevent feedback loops
					if(msg.author == bot.user){
							return;
					}

					if (msg.author != bot.user && msg.isMentioned(bot.user)) {
									msg.channel.sendMessage(msg.author + ", you called?");
					} else {

					}
			}
	}

	bot.on("message", (msg) => checkMessageForCommand(msg, false));
	bot.on("messageUpdate", (oldMessage, newMessage) => {
		checkMessageForCommand(newMessage,true);
	});

	//Log user status changes
bot.on("presence", function(user,status,gameId) {
	//if(status === "online"){
	//console.log("presence update");
	console.log(user+" went "+status);
	//}
	try {
		if(status != 'offline') {
			if(messagebox.hasOwnProperty(user.id)) {
				console.log("found message for " + user.id);
				var message = messagebox[user.id];
				var channel = bot.channels.get("id",message.channel);
				delete messagebox[user.id];
				updateMessagebox();
				bot.sendMessage(channel,message.content);
			}
		}
	}catch(e){}
});

exports.addCommand = function(commandName, commandObject) {
	try {
		commands[commandName] = commandObject;
	} catch(err) {
		console.log(err);
	}
}

exports.commandCount = function() {
	return Object.keys(commands).length;
}

if (AuthDetails.bot_token) {
	console.log('::::::::::'.bold.blue + ' logged in with token '.cyan + '::::::::::'.bold.blue);
	bot.login(AuthDetails.bot_token);
} else {
	console.log("Logging in as a user account. Consider switching to an official bot account instead!");
	bot.login(AuthDetails.email, AuthDetails.password);
}
