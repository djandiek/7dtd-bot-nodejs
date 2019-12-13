# 7dtd-bot-nodejs
A 7 Days To Die Request Bot

## Prerequisites:
- Machine with internet access (Windows or Linux)
- NodeJS (v11+) installed
- Admin access to a 7 Days To Die Server
- The following MODs installed on the server:
  - [Alloc Fixes](https://7dtd.illy.bz/wiki/Server%20fixes)
  - [BC Manager](https://7daystodie.com/forums/showthread.php?57569-Bad-Company-Manager-(ApiMod-for-Servers)) installed on the 7 Days To Die server

## Installation
1. Ensure all prerequisites are met. To install NodeJS visit [Node.JS](https://nodejs.org/)
2. Create a directory on your machine where you want to install the bot.
3. Copy all files to the desired location.
4. Edit the `data/config.json` file to include the 7 Days To Die server details
5. Run `npm install`
6. Launch the Bot by typing `node 7dtd-bot.js`

## In-Game Commands
The following commands are available in-game via the chat function. i.e. Press T in game and type `/help`
```
Commands:
/fixleg - Fix a sprained or broken leg.
/save <location> - Saves your current location. i.e. /save base
/goto <location> - Teleports you to a previously saved location. i.e. /goto base. If no location is given, list all your saved locations.
/teleport - Randomly teleports you.
/gimme <item> [amount] (i.e. /gimme steel pickaxe. You have a 80% chance of getting the item. Becareful as failed attempts will attract zombies!)
```
Feel free to experiment and add or remove commands.

### Logs
Log files are located in the log subdirectory. The logs roll over each day.

### Working Example
To see the bot in action, play the game 7 Days To Die and connect to the server called **Urban Looting** at

[IP: 170.130.205.130 Port:41451](steam://connect/170.130.205.130:41451)
