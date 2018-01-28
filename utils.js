var numSquares = 64; //Number of squares on chess board
var pieceTypes = ["-", "P", "N", "B", "R", "Q", "K"]; //Piece types
var pieceValues = [0, 100, 300, 325, 500, 900, 3950]; //Values for pieces
var order = [4, 2, 3, 5, 6, 3, 2, 4]; //Identifies the position of pieces on the first or last rank

//Each cell has an id from 1-64
//Store legal moves for pieces, each number is a cell id offset indicating a relative change from initial position
var rookPaths = [-8, -1, 1, 8]; // The move rays for a rook
var bishopPaths = [-9, -7, 7, 9]; // The move rays for a bishop
var whitePawnPaths = [7, 9]; // Pawn moves - White
var blackPawnPaths = [-7, -9]; // Black
var queenPaths = [-9, -8, -7, -1, 1, 7, 8, 9]; //Rays for a queen
var kingPaths = [-9, -8, -7, -1, 1, 7, 8, 9]; //Moves for a king
var knightPaths = [-17,-15,-10,-6, 6, 10, 15, 17]; //Moves for a knight

//The files on the board
var file = ["a", "b", "c", "d", "e", "f", "g", "h"];

//Identify the location of a piece: Black rook etc. Returns a cell id representing the location
function findPieceId(pieceIds, pieceId){
    for(var i=0; i<numSquares; i++){
        if(pieceIds[i]===pieceId){return i;}
    }
    return -1; //The piece was not found
}


//Checks if move is legal on an empty board. If so, return the new location, else return -1
function adjustPosition(pos, delta){
    var file = (pos & 7)+((delta+20) & 7) - 4; //Identify the file of the new location
    var finalNum; 
    if(file<8 && file>=0){
        finalNum = pos+delta;
        if(finalNum<numSquares && finalNum>=0){
            return finalNum; //Move is legal
        }
    }
    return -1; //Not legal - Goes outside board
}

//Finds the location of all pieces on board, grouped by type
function groupPieceIdsByType(pieceIds){
    var types = [[],[],[],[],[],[]];
    for(var i=0; i<numSquares; i++){
        if(pieceIds[i]!==0){
            types[Math.abs(pieceIds[i]) - 1].push(i);
        }
    }
    return types;
}

//Find the piece types controlling a square
function genControllingArr(pieceIds, controllingPieceIds){
    var arrLength = controllingPieceIds.length;
    var num, j;
    var arr = new Array(arrLength);
    for(var i=0; i<arrLength; i++){    
        num = pieceIds[controllingPieceIds[i]];
        j = i;
        while(j >= 1 && Math.abs(arr[j-1]) > Math.abs(num)){
            arr[j] = arr[j-1];
            j--;
        }    
        arr[j] = num;
    }
    return arr;
}

//Find the square clicked by the user given the x-y coordinates of the mouse
function getCell(x, y){
    var row = Math.ceil((-y+5)/42)+7;
    var col = Math.floor((x-5)/42);
    return col+row*8;
}

// Add a piece to the gui board
function addPiece(pieceId, position, piecesDOM){
    var length = 8;
    var squareSize = 42;
    var left = length - 1 + squareSize*(position%length);
    var top = (length - 1)*squareSize + length - 1 - squareSize*Math.floor(position/length);
    var color;
    if(pieceId<0){
        color = "b";
    }else{
        color = "w";    
    }
    var image = pieceTypes[Math.abs(pieceId)].toLowerCase()+color;
    return '<img src="images/'+image+'.png" id="piece-'+position+'" style="position:absolute; left:'+left+'px;top:'+top+'px;'
    +'" onclick="startMove('+position+','+Math.sign(pieceId)+')"></img>';
}

//Get the square reference from board index
function getPosFromId(id){
    return file[id&7]+((id>>3)+1);
}


//Generate a random integer from 0 to n-1
function genRandomNum(n){
    return Math.floor(Math.random()*n);
}

//Copy array elements
function copyArr(arr){
    var arr2 = [];
    var arrLength = arr.length;
    for(var i=0; i<arrLength; i++){
        arr2.push(arr[i]);
    }
    return arr2;
}

//Find the total number of moves possible for each piece on the board
function genNumAllMoves(allMoves){
    var numAllMoves = [];
    for(var i=0; i<numSquares; i++){
        numAllMoves[i] = allMoves[i].length;
    }
    return numAllMoves;
}

//Identify which squares control a given square
function genControllingList(pieceIds, allMoves){
    var controllingPieces = [];
    var numMoves, pieceMoves;
    for(var i=0; i<numSquares; i++){
        controllingPieces[i] = [];
    }
    for(var k=0; k<numSquares; k++){
        pieceMoves = allMoves[k];
        numMoves = pieceMoves.length;
        for(var j=0; j<numMoves; j++){
            controllingPieces[pieceMoves[j]].push(k);
        }
    }
    return controllingPieces;
}

//Initialise Zobrist hashing
 function initZobrist(maxInt){
    var randNum;
    var sideSeed = [];
    var randZTable = [];
    for(var i=0; i<70; i++){
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


//Identify squares where the king is safe/unsafe
 function genKingSafetyTable(pieceIds, side, validMoves){
    var checkTable = [];
    for(var i=0; i<numSquares; i++){
        if(pieceIds[i]*side<=0 || pieceIds[i] === 6*side){
            checkTable[i] = 0;
        }else{
            checkTable[i] = -1;
        }
        if(pieceIds[i]*side<0){
            if(pieceIds[i]!==-side){
                for(var j=0; j<validMoves[i].length; j++){    
                    checkTable[validMoves[i][j]] = -1;            
                }
            }else{
                if(i&7 < 7){
                    checkTable[i-8*side+1] = -1;
                }
                if(i&7 > 0){
                    checkTable[i-8*side-1] = -1;
                }
            }
        }
    }
    return checkTable;
}

//Guesses a score from playing a move by looking at board control over the destination square of a piece in a move
function guessMoveScore(pieceIds, move, initScore, controllingList, side){
    var pieceId = move[0];
    var moveDest = move[2];
    var score = initScore;
    var destId = pieceIds[moveDest];
    var isNull = true;
    if(destId!==0){
        score+=pieceValues[-destId*side];
        isNull = false;
    }
    if(pieceId===side && moveDest>>3 === 3.5+3.5*side){
        score+= pieceValues[5]-pieceValues[1];
        pieceId = 5*side;
        isNull = false;
    }
    var controllingPieces = controllingList[moveDest];
    var numMoves = controllingPieces.length;
    for(var i=0; i<numMoves; i++){
        if(pieceIds[controllingPieces[i]]*side<0){
            score-=pieceValues[pieceId*side];
            return score;
        }
    }
    if(isNull){
        return null;    
    }else{
        return score;
    }
}

//Highlight valid moves
function highlightMoves(rays){
    var DOMStr = "";
    var moves;
    var squareSize = 42;
    var offset = 8;
    for(var i=0; i<rays.length; i++){
        moves = rays[i];
        for(var j=0; j<moves.length;j++){
            var left = offset + squareSize*(moves[j]%8);
            var top = 7*squareSize + offset - squareSize*Math.floor(moves[j]/8);
            DOMStr+='<div style="position:absolute; left:'+left+'px;top:'+top+'px; height:'+squareSize+'px; width:'+squareSize+'px; background-color: rgba(255, 255, 0, 0.2)"></div>';
        }
    }
    return DOMStr;
}

//Generate all moves on an empty board for any piece in any position
function generateAllMovesTable(){
    var hash, vectors, numPaths, positions, rayMoves, pos;
    var allPieceMoves = [];
    for(var i=0; i<7; i++){
        for(var j=0; j<numSquares; j++){
            hash = i*numSquares+j;
            positions = [];
            numPaths = 4;
            switch(i){
                case 0: vectors = blackPawnPaths; numPaths = 2; break;
                case 1: vectors = whitePawnPaths; numPaths = 2; break;
                case 2: vectors = knightPaths; numPaths = 8; break;
                case 3: vectors = bishopPaths; break;
                case 4: vectors = rookPaths; break;
                
                case 5: 
                case 6: 
                    vectors = queenPaths; numPaths = 8; break;
            }
            if(i>=3 && i<=5){
                for(var k=0; k<numPaths; k++){
                    pos = j;
                    rayMoves = [];
                    while(pos!==-1){
                        pos = adjustPosition(pos, vectors[k]);
                        if(pos!==-1){
                            rayMoves.push(pos);
                        }
                    }
                    if(rayMoves.length>0){
                        positions.push(rayMoves);
                    }
                }
            }else{
                for(var m=0; m<numPaths; m++){
                    pos = adjustPosition(j, vectors[m]);
                    if(pos!==-1){
                        positions.push(pos);
                    }
                }
            }
            allPieceMoves[hash] = positions;
        }
    }
    return allPieceMoves;
}

//Quiescience search
function qSearch(pieceId, controllingPieces, side){
    var score = 0;
    var numControllingPieces;
    if(pieceId*side<0){
        numControllingPieces = controllingPieces.length;
        for(var i=0; i<numControllingPieces; i++){
            if(controllingPieces[i]*pieceId<0){
                score+=pieceValues[-pieceId*side];
                pieceId = controllingPieces[i];
                controllingPieces.splice(i, 1);
                score-= qSearch(pieceId, controllingPieces, -side);
                if(score>0){
                    return score;
                }else{
                    return 0;
                }
            }
        }
    }
    return 0;
}

//Position of board at start of game
function newGamePosition(){
    var pieceIds = [];
    for(var i=0; i<8; i++){
        pieceIds[i] = order[i];
        pieceIds[i+8]     = 1;

        pieceIds[i+16]     = 0;
        pieceIds[i+24]     = 0;
        pieceIds[i+32]     = 0;
        pieceIds[i+40]     = 0;

        pieceIds[i+48]     = -1;
        pieceIds[i+56] = -order[i];
    }
    for(var j=numSquares; j<70; j++){
        pieceIds[j] = 0;
    }
    return pieceIds;
}
