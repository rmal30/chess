var game, future;
var moveHistory, futureMoves;
var pieceIds; //Board
var maxInt = ~(1<<32);
var gameNotation;
var squareSize = 42;
var currentSide, pendingMove;
var pieceTypes = ["-", "P", "N", "B", "R", "Q", "K"]; //Piece types
var order = [4, 2, 3, 5, 6, 3, 2, 4]; //Identifies the position of pieces on the first or last rank
var bestMoves, outcome, randZTable;
var gameHashes = [];
var bestMoveTable;
var width = 8;
var castlingBits = 6;
var files = "abcdefgh";

//Computer plays a move
function play(){
    if(outcome===null){
        var level = parseInt(document.getElementById("level").value);
        var moveList, allMoves;
        var initLevel = 1;
        if(level%2===0){
            initLevel = 2;
        }
        moveList = generateMoveList(pieceIds, currentSide, true);
        allMoves = findAllMoves(pieceIds);
        var bestScore = evaluateScore(pieceIds, allMoves, genNumAllMoves(allMoves), currentSide);
        var controllingList = genControllingList(pieceIds, allMoves);
        if(level>6){
            sortMoves(pieceIds, moveList, allMoves, controllingList, currentSide, level-2, level, -winScore, winScore);
        }
        if(level>2){
            for(var i=initLevel; i<=level; i+=2){
                bestMoves = MTDf(pieceIds,moveList, bestScore,currentSide, i, level);
                bestScore = bestMoves[2];
            }
        }else{
            bestMoves = findBestMove(pieceIds, moveList, allMoves, currentSide, level,level, -winScore, winScore);
        }
        if(bestMoves.length>3){
            applyMove(bestMoves.slice(3, 6));
        }
        if(Object.keys(bestMoveTable).length>1000000){
            bestMoveTable = {};
        }
        updateStatus();
        document.getElementById("pending").style.visibility = "hidden";
    }
}

//Find the square clicked by the user given the x-y coordinates of the mouse
function getCell(x, y){
    var row = Math.ceil((-y+5)/squareSize) + width - 1;
    var col = Math.floor((x-5)/squareSize);
    return col+row*width;
}


//Get the square reference from board index
function getPosFromId(id){
    return files.charAt(id % width) + (Math.floor(id / width) + 1);
}

// Add a piece to the gui board
function addPiece(pieceId, position, piecesDOM){
    var left = width - 1 + squareSize*(position%width);
    var top = (width - 1)*squareSize + width - 1 - squareSize*Math.floor(position/width);
    var color;
    if(pieceId<0){
        color = "b";
    }else{
        color = "w";    
    }
    var image = pieceTypes[Math.abs(pieceId)].toLowerCase()+color;
    var startMoveFunc = '"startMove(' + position + ',' + Math.sign(pieceId) + ')"'
    return '<img src="images/'+image+'.png" id="piece-'+position+'" style="position:absolute; left:'+left+'px;top:'+top+'px;"'
    +' ontouchend='+startMoveFunc +' onclick=' + startMoveFunc + '></img>';
}

//Generate a random integer from 0 to n-1
function genRandomNum(n){
    return Math.floor(Math.random()*n);
}


//Initialise Zobrist hashing
 function initZobrist(maxInt){
    var randNum;
    var sideSeed = [];
    var randZTable = [];
    for(var i=0; i < numSquares + castlingBits; i++){
        randZTable.push([]);
        if(i<numSquares){
            for(var j=0; j<13; j++){
                randNum = genRandomNum(maxInt);
                randZTable[i][j] = randNum;
            }
        }else{
            randNum = genRandomNum(maxInt);
            randZTable[i].push(randNum);
        }
    }
    randNum = genRandomNum(maxInt);
    randZTable.push(randNum);
    randNum = genRandomNum(maxInt);
    randZTable.push(randNum);
    return randZTable;
 }

//Encode the position - Previously used Zobrist hashing, now stores a text based version of the board
function hashPosition(side, pieceIds){
    /*
    var hash1 = 0;
    var pieceId;
    for(var i=0; i<70; i++){
        if(i<numSquares){
            pieceId = pieceIds[i]; 
            if(pieceId!==0){
                hash1^=randZTable[i][pieceId+6];
            }
        }else{
            if(pieceIds[i]>0){
                hash1^=randZTable[i];
            }    
        }
    }
    hash1^=randZTable[70+(side+1)>>1];
    */
    return pieceIds.toString()+"-"+side;
}


//Returns the notation for a move
function getNotation(pieceIds, move){
    var promotion = "";
    var finalPosId = pieceIds[move[2]];
    var capture = "";
    var check="";
    var typeId = Math.abs(move[0]);
    var side = Math.sign(move[0]);

    var pieceType = pieceTypes[typeId];
    var idLetters = pieceType;

    if(finalPosId!==noPiece){
        capture="x";
    }else{
        if((Math.abs(move[1] - move[2])===width-1 || Math.abs(move[1] - move[2])===width+1) && typeId===1){
            return files.charAt(move[1]%width)+"x"+getPosFromId(move[2]);
        }
    }

    if(pieceType==="P"){
        if(capture==="x"){idLetters=files.charAt(move[1]%width);}else{idLetters="";}
        if(move[2] < width || move[2] >= numSquares - width){
            promotion="=Q";
        }
    }else{
        idLetters=pieceType;
    }

    if(typeId >= 2 && typeId <= 5){
        var initPositions = [];
        pieceIds[move[2]] = - move[0];
        var capturePositions = findValidPieceMoves(pieceIds, move[2], true)[1];
        for(var i=0; i<capturePositions.length; i++){
            if(Math.abs(pieceIds[capturePositions[i]]) === typeId && capturePositions[i] !== move[1]){
                initPositions.push(capturePositions[i]);
            }
        }        
        pieceIds[move[2]] = finalPosId;
        var sameFile = false;
        var sameRank = false;
        for(var j=0; j<initPositions.length; j++){
            if(initPositions[j] % width === move[1] % width){
                sameFile = true;
            }
            if(Math.floor(initPositions[j]/width) === Math.floor(move[1]/width)){
                sameRank = true;
            }
        }
        if(initPositions.length > 0){
            if(!sameFile){idLetters += files.charAt(move[1] % width);}
            else if(!sameRank){idLetters += Math.floor(move[1] / width) + 1;}
            else{
                idLetters+=getPosFromId(move[1]);
            }
        }
    }
    
    var pieceIds2 = pieceIds.slice();
    var allMoves = findAllMoves(pieceIds2);
    makeMove(pieceIds2, move, allMoves, genNumAllMoves(allMoves));
    if(detectCheck(pieceIds2, -side)){
        if(generateMoveList(pieceIds2, -side, true).length===0){
            check="#";
        }else{
            check="+";
        }
    }
    if(pieceType==="K" && move[1] % width === 4){
        if(move[2] % width === 6){
            return "O-O" + check;
        }else if(move[2] % width === 2){
            return "O-O-O" + check;
        }
    }
    return idLetters+capture+getPosFromId(move[2])+promotion+check;
}


//Update GUI status after a move
function updateStatus(){
    var notationStr = "";
    document.getElementById("moves").innerHTML="";
    var possibleMoves = generateMoveList(pieceIds, currentSide, true);
    for(var j=0; j<gameNotation.length; j++){
        notationStr+=(j+1)+". "+gameNotation[j][0]+" "+gameNotation[j][1]+" ";
    }    
    var undoButton = document.getElementById("undo");
    var redoButton = document.getElementById("redo");
    undoButton.disabled = game.length<=1;
    redoButton.disabled = future.length===0;
    var hash = hashPosition(currentSide, pieceIds);
    var count = 0;
    for(var i=0; i<gameHashes.length; i++){
        if(hash===gameHashes[i]){
            count++;
        }
    }
    document.getElementById("history").innerHTML = notationStr;
    var statusText;
    if(detectCheck(pieceIds,1) || detectCheck(pieceIds, -1)){
        if(possibleMoves.length===0){
            statusText = "Checkmate!";
            outcome = -currentSide;
        }else{
            statusText = "Check!";
        }
    }else{
        if(possibleMoves.length===0){
            statusText = "Stalemate!";
            outcome = 0;
        }else{
            statusText = "";
        }
    }
    if(count>=3){
        statusText = "Draw!";
        outcome = 0;
    }
    document.getElementById("status").innerHTML = statusText;
}

//Sets up the pieces based on a board position
function setupBoard(pieceIds){
    var piecesDOM = document.getElementById("pieces");
    var pieceHTML = "";
    for(var i=0; i<numSquares; i++){
        if(pieceIds[i]!==0){
            pieceHTML+=addPiece(pieceIds[i], i, piecesDOM);
        }
    }
    piecesDOM.innerHTML = pieceHTML;
}


//Initialise game, cache information
function init(){
    moveHistory = [];
    futureMoves = [];
    gameNotation = [];
    currentSide = 1;
    outcome = null;
    pendingMove = false;
    pieceIds = newGamePosition();
    game = [pieceIds.slice()];
    future = [];
    bestMoveTable = {};//new Array(maxInt-1);
    gameHashes = [hashPosition(currentSide, pieceIds)];
    allPieceMoves = generateAllMovesTable();
    setupBoard(pieceIds);
    updateStatus();
}


//Player has selected a piece, handle move that could be made by the player
function startMove(initPos, side){
    if(outcome===null && side===currentSide && !pendingMove){
        pendingMove = true;
        document.getElementById("piece-"+initPos).style.WebkitFilter='drop-shadow(1px 1px 0 yellow) drop-shadow(-1px 1px 0 yellow) drop-shadow(1px -1px 0 yellow) drop-shadow(-1px -1px 0 yellow)';
        var possibleRays = findValidPieceMoves(pieceIds, initPos, true);
        document.getElementById("moves").innerHTML = highlightMoves(possibleRays);

        fmove = function(e){
            console.log(e)
            if(e.targetTouches){
                var cell = getCell(e.changedTouches[0].pageX, e.changedTouches[0].pageY)
            }else{    
                var cell = getCell(e.pageX,e.pageY);
            }
            if(cell !== initPos){
                var valid = false;
                for(var i = 0; i < possibleRays.length; i++){
                    for(var j = 0; j < possibleRays[i].length; j++){
                        if(possibleRays[i][j] === cell){
                            valid = true;
                        }    
                    }
                }
                if(valid){
                    applyMove([pieceIds[initPos], initPos, cell]);
                }else{
                    document.getElementById("piece-" + initPos).style.WebkitFilter='none';
                    document.removeEventListener('mouseup', fmove);
                    document.removeEventListener('touchend', fmove);
                }
                document.getElementById("moves").innerHTML = "";    
            }
            pendingMove = false;
            document.removeEventListener('mouseup', fmove);
            document.removeEventListener('touchend', fmove);
        }
        document.addEventListener('mouseup', fmove);
        document.addEventListener('touchend', fmove);
    }
}

//Initialises and starts the game
function startGame(){
    init();
    doPlay();
}

//Computer plays if necessary
function doPlay(){
    if(outcome===null){
        var compPlayer = parseInt(document.getElementById("compPlayer").value);
        var inProgress;
        if(compPlayer===currentSide || compPlayer===2){
            inProgress = "visible";
            setTimeout(play, 50);
        }else{
            inProgress = "hidden";
        }
        document.getElementById("pending").style.visibility = inProgress;
    }
}

function undo(){
    if(game.length>1){
        currentSide = -currentSide;
        outcome = null;
        future.push(game.pop());
        gameHashes.pop();
        if(currentSide === 1){
            gameNotation.pop();
        }else{
            gameNotation[gameNotation.length - 1][1] = "";
        }
        futureMoves.push(moveHistory.pop());
        pieceIds = game[game.length - 1].slice();
        setupBoard(pieceIds);
        updateStatus();
    }
}

//User redid a move
function redo(){
    if(future.length>0){
        var futureBoard = future.pop();
        var futureMove = futureMoves.pop();
        var moveNotation = getNotation(pieceIds, futureMove);
        if(currentSide === 1){
            gameNotation.push([moveNotation, ""]);
        }else{
            gameNotation[gameNotation.length - 1][1] = moveNotation;
        }
        moveHistory.push(futureMove);
        currentSide = - currentSide;
        pieceIds = futureBoard;
        game.push(pieceIds.slice());
        gameHashes.push(hashPosition(currentSide, futureBoard));
        setupBoard(pieceIds);
        updateStatus();
    }   
}


//Applies a move to the GUI - Commits a move
function applyMove(move){
    var moveNotation = getNotation(pieceIds, move);
    if(currentSide === 1){
        gameNotation.push([moveNotation,""]);
    }else{
        gameNotation[gameNotation.length - 1][1] = moveNotation;
    }
    var allMoves = findAllMoves(pieceIds);
    makeMove(pieceIds, move, allMoves, genNumAllMoves(allMoves));
    moveHistory.push(move);
    currentSide = - currentSide;
    game.push(pieceIds.slice());
    futureMoves = [];
    future = [];
    gameHashes.push(hashPosition(currentSide, pieceIds));
    setupBoard(pieceIds);
    updateStatus();
    doPlay();
}

//Highlight valid moves
function highlightMoves(rays){
    var DOMStr = "";
    var moves;
    var offset = 8;
    for(var i=0; i<rays.length; i++){
        moves = rays[i];
        for(var j=0; j<moves.length;j++){
            var left = offset + squareSize*(moves[j]%width);
            var top = (width-1)*squareSize + offset - squareSize*Math.floor(moves[j]/width);
            DOMStr+='<div style="position:absolute; left:'+left+'px;top:'+top+'px; height:'+squareSize+'px; width:'+squareSize+'px; background-color: rgba(255, 255, 0, 0.2)"></div>';
        }
    }
    return DOMStr;
}


//Position of board at start of game
function newGamePosition(){
    var pieceIds = [];
    for(var i=0; i<width; i++){
        pieceIds[i] = order[i];
        pieceIds[i + width]   = 1;

        pieceIds[i + width*2] = 0;
        pieceIds[i + width*3] = 0;
        pieceIds[i + width*4] = 0;
        pieceIds[i + width*5] = 0;

        pieceIds[i + width*6] = -1;
        pieceIds[i + width*7] = -order[i];
    }
    for(var j = 0; j < castlingBits; j++){
        pieceIds[numSquares + j] = 0;
    }
    return pieceIds;
}

//Initialization
randZTable = initZobrist(maxInt);
init();
