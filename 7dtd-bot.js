#!/usr/bin/node

process.stdout.write( "\033c" );

const bot = require( "./functions.js" );

bot.initFolders();
bot.connectToGame();

//Process command queue every 250 milliseconds
setInterval( function ()
{
    bot.processCmdQueue();
}, 250 );

//Lookup game details every 20 seconds
setInterval( function ()
{
    bot.lookupDay();
    bot.lookupPlayers();
}, 20000 );

//Lookup admins every 15 minute
setInterval( function ()
{
    bot.lookupAdmins();
}, 900000 );
