//jshint unused:false
//jshint esversion: 6
//Disable Warning Justification: This is a JS library.

//Export Statements
module.exports = {
    "connectToGame": connectToGame,
    "initFolders": initFolders,
    "logError": logError,
    "logInfo": logInfo,
    "lookupPlayers": lookupPlayers,
    "lookupAdmins": lookupAdmins,
    "lookupDay": lookupDay,
    "details": details,
    "processCmdQueue": processCmdQueue
};

const
    fs = require( "fs" ),
    net = require( "net" );

const
    configFile = "data/config.json",
    itemsFile = "data/items-a18.json",
    coordFile = "data/coord.json";

const eob = new RegExp( '\r\n$' );

const config = getConfig();
const items = getItems();

var client;

var cmdQueue = [];
var cmdRunOk = true;
var buffered = "";

var players = {};
var admins = [];
var gameDay = 1;

function initFolders ()
{
    let dirs = [ "logs", "data" ];

    for ( let i = 0; i < dirs.length; i++ )
    {
        if ( !fs.existsSync( __dirname + "/" + dirs[ i ] ) )
        {
            fs.mkdirSync( __dirname + "/" + dirs[ i ] );
        }
    }
}

function processCommand ( user, id, input )
{
    let [ original, cmd, params ] = new RegExp( /(\w+)\s*(.*)/, "sm" ).exec( input );
    console.log(
        "USER:" + user,
        "CMD: " + cmd,
        "PARAMS: " + params
    );

    logToFile( `USER: ${user}; CMD: ${cmd}; PARAMS: ${params}` );

    switch ( cmd )
    {
        case "teleport":
            teleport( id );
            break;
        case "gimme":
            giveItem( id, params );
            break;
        case "save":
            saveCoord( id, params );
            break;
        case "goto":
            gotoCoord( id, params );
            break;
        default:
            logInfo( "Unknown CMD: " + cmd );
    }
}

function logError ( input )
{
    console.log( "\x1b[31m%s\x1b[0m", input );
}

function logInfo ( input )
{
    console.log( "\x1b[36m%s\x1b[0m", input );
}

function logToFile ( text )
{
    let now = new Date();
    let logFile = `logs/log-${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}.txt`;
    let timeStamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    fs.appendFile( logFile, timeStamp + " - " + text + "\n", function ( err )
    {
        if ( err )
        {
            logError( err );
        }
    } );
}

//Read configuration file
function getConfig ()
{
    let data = {};
    try
    {
        data = JSON.parse( fs.readFileSync( configFile, "utf8" ) );
    }
    catch ( err )
    {
        logError( "Configuration not available. Exiting." );
        process.exit( 1 );
    }
    return data;
}

//Read items file
function getItems ()
{
    let data = {};
    try
    {
        data = JSON.parse( fs.readFileSync( itemsFile, "utf8" ) );
    }
    catch ( err )
    {
        logError( "Items not available. Exiting." );
    }
    return data;
}

//Read coords file
function getCoords ()
{
    let data = {};
    try
    {
        data = JSON.parse( fs.readFileSync( coordFile, "utf8" ) );
    }
    catch ( err )
    {
        logError( "Coords file not available." );
    }
    return data;
}

function teleport ( id )
{
    let
        x = getRandomInt( -4096, 4096 ),
        y = getRandomInt( -4096, 4096 );

    client.write( `tele "${id}" ${x} -1 ${y}\n` );
    pmPlayer( id, "ZAP! You've just been randomly teleported. Good luck!" );
    return 1;
}

function giveItem ( steamID, request )
{
    if ( getRandomInt( 1, 100 ) > 80 )
    {
        pmPlayer( steamID, "Sorry, I'm a bit busy at the moment. Try again later." );
        return;
    }
    let quality = getRandomInt( 1, 6 );

    let
        name = "",
        amt = 1;

    let itemLookup = new RegExp( /(.*)\s(\d+)/, "sm" ).exec( request );
    if ( !itemLookup )
    {
        name = request;
    }
    else
    {
        name = itemLookup[ 1 ];
        amt = itemLookup[ 2 ];
    }

    if ( !name )
    {
        pmPlayer( steamID, "You didn't give an item name." );
        return 0;
    }

    let found = {};
    for ( let i = 0; i < items.length; i++ )
    {
        if ( items[ i ].Local.toLowerCase() == name.toLowerCase() || items[ i ].Name.toLowerCase() == name.toLowerCase() )
        {
            found = items[ i ];
            break;
        }
    }

    if ( !found )
    {
        pmPlayer( steamID, "Sorry, I have no idea what that item is. Check the item code or name and try again." );
        return;
    }

    if ( [ 'gunSuperDigger', 'superWrench', 'gunJustDie' ].includes( found.Name ) )
    {
        pmPlayer( steamID, "Sorry, I don't know what that is." );
        return;
        //_addnaughty( $sock, $player );
        //_isnaughty( $sock, $player );
    }

    if ( amt > found.StackNumber )
    {
        amt = found.StackNumber;
    }

    srvcmd( `bc-give "${steamID}" "${found.Name}" /c=${amt} /silent` );
    pmPlayer( steamID, `Ok, ${amt} ${found.Local} should be in your inventory now.` );
    let text = `Gave ${found.Local} to ${steamID}`;
    logInfo( text );
    logToFile( text );
}

function fixLeg ( steamID )
{
    srvcmd( `debuffplayer ${steamID}" buffLegSprained` );
    srvcmd( `debuffplayer ${steamID}" buffLegBroken` );

    pmPlayer( steamID, "Tada! Your leg is now all healed." );
    let text = `Healed leg: ${steamID}`;
    logInfo( text );
    logToFile( text );
}

function saveCoord ( entityID, request )
{
    if ( !request )
    {
        request = "default";
        pmPlayer( entityID, "You didn't give a location name. I'll use 'default'" );
    }
    request.replace( /'|"|^\s+|\s+$/g, "" );
    request = request.toLowerCase();

    let player = players[ entityID ];

    let coords = getCoords();

    if ( !coords[ player.SteamId ] )
    {
        coords[ player.SteamId ] = [];
    }

    let playerCoords = coords[ player.SteamId ] || [];
    let currentPosition = player.Position;

    let found = false;

    if ( playerCoords.length )
    {
        for ( let i = 0; i < playerCoords.length; i++ )
        {
            if ( playerCoords[ i ].label == request )
            {
                playerCoords[ i ].coord = currentPosition;
                found = 1;
                break;
            }
        }
        coords[ player.SteamId ] = playerCoords;
    }

    if ( !found )
    {
        coords[ player.SteamId ].push(
        {
            "label": request,
            "coord": currentPosition
        } );
    }

    coords[ player.SteamId ].sort( ( a, b ) => ( a.label > b.label ) ? 1 : ( ( a.label < b.label ) ? -1 : 0 ) );

    let requestAsJSON = JSON.stringify( coords, null, 4 );
    fs.writeFile( coordFile, requestAsJSON, function ( err )
    {
        if ( err )
        {
            logError( err );
        }
    } );
    pmPlayer( player.SteamId, `Ok, your current position (within the past 20 seconds) has been saved as '${request}'` );
}

function gotoCoord ( entityID, request )
{
    let player = players[ entityID ];
    let coords = getCoords();
    let playerCoords = coords[ player.SteamId ] || [];

    if ( !playerCoords )
    {
        pmPlayer( entityID, "You don't have any saved places yet. Use /save [label] to save your current position" );
        return;
    }

    if ( !request )
    {
        let locations = [];
        for ( let i = 0; i < playerCoords.length; i++ )
        {
            locations.push( `Label: '${playerCoords[i].label}' - Coords: '${playerCoords[i].coord}'` );
        }
        if ( locations )
        {
            pmPlayer( entityID, "Locations you have saved:" );
            for ( let i = 0; i < locations.length; i++ )
            {
                pmPlayer( entityID, locations[ i ] );
            }
        }
        return;
    }

    request.replace( /'|"|^\s+|\s+$/g, "" );
    request = request.toLowerCase();

    let found = false;

    let jump = "";

    if ( playerCoords.length )
    {
        for ( let i = 0; i < playerCoords.length; i++ )
        {
            if ( playerCoords[ i ].label == request )
            {
                jump = playerCoords[ i ].coord;
                found = true;
                break;
            }
        }
    }

    if ( found )
    {
        client.write( `tele "${entityID}" ${jump}\n` );
        pmPlayer( entityID, `ZAP! You've just been teleported to '${request}'` );
    }
    else
    {
        pmPlayer( entityID, `Sorry, I don't know where '${request}' is. Try /save ${request} when you are in the location you want to save` );
    }
}

// Process received data and add to a buffer until EOB string is detected. Once EOB is reached, process the data to
// execute various functions
function processReceived ( data )
{
    buffered += data;

    let playerLookup = new RegExp( /^(\[.*])/, "m" ).exec( buffered );
    if ( playerLookup )
    {
        buffered = "";
        storePlayers( playerLookup[ 1 ] );
        return true;
    }

    let adminLookup = new RegExp( /^(\{.*})/, "m" ).exec( buffered );
    if ( adminLookup )
    {
        buffered = "";
        storeAdmins( adminLookup[ 1 ] );
        return true;
    }

    if ( !eob.test( buffered ) )
    {
        return false;
    }

    buffered.replace( /\r\n/g, "\n" );

    let chat = new RegExp( /\(BCM\)\s+Global:(.+?):(.+?):\s+\/(.+?)\r\n/, "sm" ).exec( buffered );
    let dayLookup = new RegExp( /Day\s+(\d+),/, "sm" ).exec( buffered );
    let joining = new RegExp( /INF\s+Player\s+connected.+?name=(.+?),\s+steamid=(\d+)/, "sm" ).exec( buffered );
    let leaving = new RegExp( /INF\s+Player\s+disconnected:.+?PlayerID='(.+?)'.+?PlayerName='(.+?)'/, "sm" ).exec( buffered );

    buffered = "";

    if ( chat )
    {
        processCommand( chat[ 1 ], chat[ 2 ], chat[ 3 ] );
    }

    if ( joining )
    {
        let text = `${joining[1]} (${joining[2]}) joined the game`;
        logInfo( text );
        logToFile( text );
    }

    if ( leaving )
    {
        let text = `${leaving[2]} (${leaving[1]}) left the game`;
        logInfo( text );
        logToFile( text );
    }

    if ( dayLookup )
    {
        gameDay = dayLookup[ 1 ];
    }
    return true;
}

function getRandomInt ( min, max )
{
    min = Math.ceil( min );
    max = Math.floor( max );
    return Math.floor( Math.random() * ( max - min + 1 ) ) + min;
}

function pmPlayer ( id, msg )
{
    if ( !( id && msg ) )
    {
        return;
    }

    let text = msg.replace( /^\s+|\s+$/g, "" );
    cmdQueue.push( `pm "${id}" "${text}"` );
}

function lookupPlayers ()
{
    cmdQueue.push( "bc-lp /strpos /online" );
}

function lookupAdmins ()
{
    cmdQueue.push( "bc-admins" );
}

function lookupDay ()
{
    cmdQueue.push( "gt" );
}

function details ()
{
    console.log(
    {
        "Players": players,
        "Admins": admins,
        "Day": gameDay
    } );
}

function processCmdQueue ()
{
    if ( client && cmdQueue.length > 0 && cmdRunOk )
    {
        let cmd = cmdQueue.shift();
        srvcmd( cmd );
        //logInfo( "Running: " + cmd );
    }
}

function srvcmd ( cmd )
{
    if ( !cmd )
    {
        logError( "No CMD given" );
        return;
    }

    let cleanCmd = cmd.replace( /^\s+|\s+$/g, "" );
    client.write( cleanCmd + "\n" );
}

function storePlayers ( json )
{
    try
    {
        let data = JSON.parse( json );
        players = {};
        for ( let i = 0; i < data.length; i++ )
        {
            players[ data[ i ].EntityId ] = data[ i ];
        }
    }
    catch ( err )
    {
        logError( "Players data not supplied as expected JSON format - " + err + " - " + json );
    }
}

function storeAdmins ( json )
{
    try
    {
        let data = JSON.parse( json );
        admins = [];
        for ( let i = 0; i < data.Admins.length; i++ )
        {
            admins.push( data.Admins[ i ].SteamId );
        }
    }
    catch ( err )
    {
        logError( "Admins data not supplied as expected JSON format - " + err + " - " + json );
    }
}

function connectToGame ()
{
    client = new net.Socket();

    client.setEncoding( "utf8" );
    client.connect( config.port, config.host, function ()
    {
        logInfo( "Connecting" );
    } );

    client.on( "connect", function ()
    {
        logInfo( "Connection established with server" );
    } );

    client.on( "ready", function ()
    {
        //Send password when connection established
        client.write( config.password + "\n" );
        cmdQueue = [
            'bc-prefix "/"',
            "gt",
            "bc-lp /strpos /online",
            "bc-admins"
        ];
    } );

    // When data is received, check if it is complete or needs to be buffered
    client.on( "data", function ( data )
    {
        client.pause();
        cmdRunOk = processReceived( data );
        client.resume();
    } );

    client.on( "error", function ()
    {
        client = null;
        logError( "Connection lost, trying to reconnecting..." );
        setTimeout( function ()
        {
            connectToGame();
        }, 10000 );
    } );
}

function pad ( n, width, padding )
{
    padding = padding || "0";
    width = width || 2;
    n = n + "";
    return n.length >= width ? n : new Array( width - n.length + 1 ).join( padding ) + n;
}
