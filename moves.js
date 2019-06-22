var noPiece = getPieceId(3, 0);
var numSquares = 64;
var allPieceMoves = [];
var numCalls = {eval:0, p:0, k:0, n:0, vMoves:0, check:0, umt:0, aMoves:0, mtdF:0, lme:0};

//Each cell has an id from 1-64
//Store legal moves for pieces, each number is a cell id offset indicating a relative change from initial position
var rookPaths = [-8, -1, 1, 8]; // The move rays for a rook
var bishopPaths = [-9, -7, 7, 9]; // The move rays for a bishop
var whitePawnPaths = [7, 9]; // Pawn moves - White
var blackPawnPaths = [-7, -9]; // Black
var queenPaths = [-9, -8, -7, -1, 1, 7, 8, 9]; //Rays for a queen
var kingPaths = [-9, -8, -7, -1, 1, 7, 8, 9]; //Moves for a king
var knightPaths = [-17,-15,-10,-6, 6, 10, 15, 17]; //Moves for a knight

const PIECES = {PAWN: 1, KNIGHT: 2, BISHOP: 3, ROOK: 4, QUEEN: 5, KING: 6};

//Find the total number of moves possible for each piece on the board
function genNumAllMoves(allMoves){
    var numAllMoves = [];
    for(var i=0; i<numSquares; i++){
        numAllMoves[i] = allMoves[i].length;
    }
    return numAllMoves;
}

function getPieceType(pieceId){
    return pieceId & 0x7
}

function getPieceSide(pieceId){
    return pieceId >> 3
}

function isPieceSide(pieceId, side){
    return (pieceId >> 3) == side
}

function getPieceId(side, type){
    return ((side & 3) << 3) | type
}

function getPiece(move){
    return (move >> 16) & 0xF
}

function getOrigin(move){
    return (move >> 8) & 0xFF
}

function getDest(move){
    return move & 0xFF
}

function getMove(pieceId, origin, dest){
    return (pieceId << 16) | (origin << 8) | dest
}

//Find the piece types controlling a square
function genControllingArr(pieceIds, controllingPieceIds){
    var arrLength = controllingPieceIds.length;
    var num, j;
    var arr = new Array(arrLength);
    for(var i=0; i<arrLength; i++){
        num = pieceIds[controllingPieceIds[i]];
        j = i;
        while(j >= 1 && getPieceType(arr[j-1]) > getPieceType(num)){
            arr[j] = arr[j-1];
            j--;
        }
        arr[j] = num;
    }
    return arr;
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

//Generate all moves on an empty board for any piece in any position
function generateAllMovesTable(){
    var hash, vectors, numPaths, positions, rayMoves, pos;
    var allPieceMoves = [];
    for(var i=0; i<8; i++){
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
                case 7:
                    vectors = queenPaths; numPaths = 8; break;
            }
            if((i>=3 && i<=5) || i===7){
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
            }
            if((i===2) || (i === 6) || (i===7)){
                if(i==7){
                    vectors = knightPaths;
                }
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

//Detect a check that attacks the player's king
function detectCheck(pieceIds, side){
    numCalls.check++;
    var possibleThreats, numThreats;
    var pos1 = findPieceId(pieceIds, getPieceId(side, 6));
    var pos2 = findPieceId(pieceIds, getPieceId(side, 7));
    if(pos1 === -1 && pos2 === -1){
        return true; //Can't find the king
    }
    var pos;
    if(pos1 === -1){
        pos = pos2;
    }else{
        pos = pos1;
    }
    var oldPieceId = pieceIds[pos];
    var pLeft = adjustPosition(pos, 7 - (side << 4)); //Potential pawn on left
    var pRight = adjustPosition(pos, 9 - (side << 4)); //On right
    if((pRight!==-1 && pieceIds[pRight] === getPieceId( 1 ^ side, 1)) || (pLeft!==-1 && pieceIds[pLeft] ===  getPieceId(1^side, 1))){
        return true; //King attacked by pawns
    } 
    var moves = allPieceMoves[6*numSquares+pos];
    for(var i=0; i<moves.length; i++){
        if(pieceIds[moves[i]]===getPieceId(1^side, 6)){
            return true; //King attacked by opposite king
        }
    }
    var pieceId;
    //Change to a knight, bishop and rook, find potential attackers
    for(var j=2; j<=4; j++){
        pieceIds[pos] = getPieceId(side, j); //Change piece to detect pieces nearby
        possibleThreats = findValidPieceMoves(pieceIds, pos, false)[1];
        numThreats = possibleThreats.length;
        for(var k=0; k<numThreats; k++){
            pieceId = pieceIds[possibleThreats[k]];
            if(pieceId === getPieceId(1 ^ side, j) || (j!==2 && pieceId===getPieceId(1 ^ side, 5)) || pieceId===getPieceId(1 ^ side, 7)){
                pieceIds[pos] = oldPieceId; //Change back to king
                return true; //King attacked by knight, bishop, rook or queen
            }
        }
    }

    pieceIds[pos] = oldPieceId; //Change back to king, no threats found
    return false;
}

//Check if move is valid
function validMove(pieceIds,move){
    var initPos = getOrigin(move);
    var finalPos = getDest(move);
    var pieceId = getPiece(move); 
    var j = pieceIds[finalPos];
    var valid = true;
    
    if(getPieceSide(j) == getPieceSide(pieceId)){
        return false;
    }
    pieceIds[initPos]=noPiece;
    pieceIds[finalPos]=pieceId;
    
    if(detectCheck(pieceIds, getPieceSide(pieceId))){
        valid = false;
    }
    pieceIds[initPos] = pieceId;
    pieceIds[finalPos] = noPiece;

    if(j!==noPiece){
        pieceIds[finalPos] = j;
    }
    return valid;
}

//Find valid pawn moves
function findValidPawnMoves(pieceIds, position, noCheckAllowed){
    numCalls.p++;
    var positions = [[],[]];
    var pos = position;
    var pieceId = pieceIds[pos];
    var side = getPieceSide(pieceId);
    var leftCapturePos = pos + 7 - 16*side;
    var rightCapturePos = pos + 9 - 16*side;
    if((pos&7)>0 && isPieceSide(pieceIds[leftCapturePos], 1 ^ side)){
        if(!noCheckAllowed || validMove(pieceIds, getMove(pieceId, position, leftCapturePos))){
            positions[1].push(leftCapturePos);    
        }
    }

    if((pos&7)<7 && isPieceSide(pieceIds[rightCapturePos], 1 ^ side)){
        if(!noCheckAllowed || validMove(pieceIds, getMove(pieceId, position, rightCapturePos))){
            positions[1].push(rightCapturePos);    
        }
    }
    if(pos>>3 === 4 - side){
        var move = moveHistory[moveHistory.length-1];
        if(move){
            var moveDest = getDest(move);
            var moveOrigin = getOrigin(move);
            if(getPiece(move) === getPieceId(1 ^ side, 1) && (moveOrigin>>3 === 6 - 5*side)){
                var enPassantLeft = adjustPosition(pos, -1);
                var enPassantRight = adjustPosition(pos, 1);
                var enl = pieceIds[enPassantLeft];
                var enr = pieceIds[enPassantRight];
                
                if(enPassantLeft!==-1 && isPieceSide(enl, 1^side) && moveDest===enPassantLeft){
                    leftCapturePos = adjustPosition(pos, 7 - 16*side);
                    if(!noCheckAllowed){
                        positions[1].push(leftCapturePos);
                    }else{
                        pieceIds[leftCapturePos]=pieceId;
                        pieceIds[pos]=noPiece;
                        pieceIds[enPassantLeft]=noPiece;
                        if(!detectCheck(pieceIds, side)){
                            positions[1].push(leftCapturePos);
                        }
                        pieceIds[enPassantLeft] = enl;
                        pieceIds[leftCapturePos]= noPiece;
                        pieceIds[pos]=pieceId;
                    }
                }
                
                if(enPassantRight!==-1 && isPieceSide(enr, 1^side) && moveDest===enPassantRight){
                    rightCapturePos = adjustPosition(pos, 9 - side*16);
                    if(!noCheckAllowed){
                        positions[1].push(rightCapturePos);
                    }else{
                        pieceIds[rightCapturePos]=pieceId;
                        pieceIds[pos]=noPiece;
                        pieceIds[enPassantRight]=noPiece;
                        if(!detectCheck(pieceIds, side)){
                            positions[1].push(rightCapturePos);
                        }
                        pieceIds[enPassantRight] = enr;
                        pieceIds[rightCapturePos]= noPiece;
                        pieceIds[pos]=pieceId;
                    }
                }
            }
        }
    }    
    var forwardPos =  pos + 8 - 16*side;
    if(pieceIds[forwardPos]===noPiece){
        var doubleForwardPos = pos + 16 - 32*side;
        if(!noCheckAllowed || validMove(pieceIds,getMove(pieceId, pos, forwardPos))){
            positions[0].push(forwardPos);
        }
        if((pos>>3) ===1 + 5*side && pieceIds[doubleForwardPos]===noPiece){
            if(!noCheckAllowed || validMove(pieceIds,getMove(pieceId, pos, doubleForwardPos))){
                positions[0].push(doubleForwardPos);    
            }
        }
    }
    return positions;
}

//Finds valid moves for a piece
function findValidPieceMoves(pieceIds, position, noCheckAllowed){
    numCalls.vMoves++;
    var positions = [[],[]];
    var pieceId = pieceIds[position];
    var typeId = getPieceType(pieceId);
    var side = getPieceSide(pieceId)
    var numPaths;
    var p, j;
    var possibleMoves, numMoves, possibleRays, possibleMove;

    switch(typeId){
        case 1: positions = findValidPawnMoves(pieceIds, position, noCheckAllowed); break;
        case 3:
        case 4:
        case 5:
        case 7:
            possibleRays = allPieceMoves[typeId*numSquares+position];
            numPaths = possibleRays.length;
            for(var i=0; i<numPaths; i++){
                possibleMoves = possibleRays[i];
                numMoves = possibleMoves.length;
                j=0;
                p=noPiece;
                while(p===noPiece && j<numMoves){
                    possibleMove = possibleMoves[j];
                    p = pieceIds[possibleMove];
                    if(p===noPiece){
                        if(!noCheckAllowed || validMove(pieceIds, getMove(pieceId, position, possibleMove))){        
                            positions[0].push(possibleMove);                    
                        }                
                    }
                    else if(isPieceSide(p, 1^side)){
                        if(!noCheckAllowed || validMove(pieceIds, getMove(pieceId, position, possibleMove))){
                            positions[1].push(possibleMove);
                        }
                    }
                    j++;
                }
            }
            if(typeId !==7){
                break;
            }
        case 2:
        case 7:
            possibleMoves = allPieceMoves[2*numSquares+position];
            numMoves = possibleMoves.length;
            for(var i=0; i<numMoves; i++){
                possibleMove = possibleMoves[i];
                p = pieceIds[possibleMove];
                if(p===noPiece){
                    if(!noCheckAllowed || validMove(pieceIds,getMove(pieceId, position, possibleMove))){        
                        positions[0].push(possibleMove);                    
                    }
                }else if(isPieceSide(p, 1^side)){
                    if(!noCheckAllowed || validMove(pieceIds,getMove(pieceId, position, possibleMove))){
                        positions[1].push(possibleMove);
                    }
                }
            }
            break;
        case 6:
            positions = findValidKingMoves(pieceIds, position, noCheckAllowed);
            break;

    default: return [];
    }
    return positions;
}

//Generate a list of moves that can be made by a player
function generateMoveList(pieceIds, side, noCheckAllowed){
    var moveList = [];
    for(var i=0; i<numSquares; i++){
        var pieceId = pieceIds[i];
        if(isPieceSide(pieceId, side)){
            var options = findValidPieceMoves(pieceIds, i, noCheckAllowed); 
            var moves = options[0];
            var captures = options[1];
            var numMoves = moves.length;
            for(var j=0; j<captures.length; j++){
                moveList.unshift(getMove(pieceId, i, captures[j]));
            }
            for(var k=0; k<numMoves; k++){
                moveList.push(getMove(pieceId, i, moves[k]));
            }
        }
    }
    return moveList;
}

//Generate list of captures
function generateCaptureList(pieceIds, allMoves, side){
    var moveList = [];
    var score, options, captures, capturePos;
    var controllingPieces = [];
    var controllingList = genControllingList(pieceIds, allMoves)
    for(var i=0; i<numSquares; i++){
        var pieceId = pieceIds[i];
        if(isPieceSide(pieceId, side)){
            options = findValidPieceMoves(pieceIds, i, false); 
            captures = options[1];
            for(var j=0; j<captures.length; j++){
                capturePos = captures[j];
                if(getPieceType(pieceId) < ((1 ^ side)<<3) ^ pieceIds[capturePos]){
                    moveList.unshift(getMove(pieceId, i, capturePos));
                }else{
                    controllingPieces = genControllingArr(pieceIds, controllingList[capturePos]);
                    /*
                    for(var k=0; k<controllingList[capturePos].length; k++){
                        controllingPieces.push(pieceIds[controllingList[capturePos][k]]);
                    }
                    */
                    score = qSearch(pieceIds[capturePos], controllingPieces, side);
                    if(score>0){
                        moveList.unshift(getMove(pieceId, i, capturePos));
                    }
                }
            }
        }
    }
    return moveList;
}

//Find all moves on an empty board
function findAllPieceMoves(pieceIds, position){
    numCalls.aMoves++;
    var pos = position;
    var pieceId = pieceIds[pos];
    if(pieceId===noPiece){
        return [];
    }
    if(pieceId===getPieceId(1, 1)){
        return allPieceMoves[pos];
    }
    var typeId = getPieceType(pieceId);
    var hash = typeId*numSquares+pos;
    var numMoves, numPaths;
    var positions;
    var p, j;
    var possibleMoves;
    var pieceMoves = allPieceMoves[hash];
    if((typeId>=3 && typeId<=5) || typeId == 7){
        positions = [];
        numPaths = pieceMoves.length;
        for(var i=0; i<numPaths; i++){
            possibleMoves = pieceMoves[i];
            if(typeId == 7 && !Array.isArray(possibleMoves)){
                positions.push(possibleMoves)
            }else{
                numMoves = possibleMoves.length;
                j=0;
                p=noPiece;
                while(p===noPiece && j<numMoves){
                    pos = possibleMoves[j];
                    p = pieceIds[pos];
                    positions.push(pos);
                    j++;
                }
            }
        }
        return positions;
    }else{
        return pieceMoves;
    }
}
//Finds all moves for all pieces
function findAllMoves(pieceIds){
    var allMoves = [];
    for(var i=0; i<numSquares; i++){
        allMoves.push(findAllPieceMoves(pieceIds,i));
    }
    return allMoves;
}


//Checks if a legal move exists for a player
function legalMoveExists(pieceIds, side){
    numCalls.lme++;
    var pieceMoves;
    for(var i=0; i<numSquares; i++){
        if(isPieceSide(pieceIds[i], side)){
            pieceMoves = findValidPieceMoves(pieceIds, i, true);
            if(pieceMoves[0].length>0 || pieceMoves[1].length>0){
                return true;
            }
        }

    }
    return false;
}

//Returns the change in position from making a move
function makeMove(pieceIds, move, allMoves, numAllMoves){
    var id = getPiece(move);
    var type = getPieceType(id);
    var moveOrigin = getOrigin(move);
    var moveDest = getDest(move);
    var delta = [];
    var captureMade = pieceIds[moveDest]!==noPiece;
    pieceIds[moveOrigin] = noPiece;
    if(captureMade){
        delta = [0, moveDest, pieceIds[moveDest], copyArr(allMoves[moveDest])];
    }
    pieceIds[moveDest] = id;
    if(type===1){
        if(!captureMade){
            var dPos = moveDest - moveOrigin;
            if(dPos!==8*id && dPos!==16*id){
                var capturePos = ((moveOrigin>>3)<<3) + (moveDest&7);
                delta = [0, capturePos, pieceIds[capturePos], allMoves[capturePos]];
                pieceIds[capturePos] = noPiece;
                allMoves[capturePos] = [];
                numAllMoves[capturePos] = 0;
            }
        }
        var rank = moveDest>>3;
        if(rank===0 || rank===7){
            var side = getPieceSide(id);
            pieceIds[moveDest] = getPieceId(side, 5);
        }
    }
    else if(type===4){
        var side = getPieceSide(id);
        var rank = 56*side;
        var castlingIndex = numSquares + 3*side;
        if(moveOrigin===rank && pieceIds[castlingIndex+1] === 0){
            pieceIds[castlingIndex+1] = 1;
            delta[0] = 1;
        }else if(moveOrigin===rank+7 && pieceIds[castlingIndex+2]===0){
            pieceIds[castlingIndex+2] = 1;
            delta[0] = 1;
        }
    }
    else if(type===6){ 
        var side = getPieceSide(id);
        var rank = 56*side;
        if(moveOrigin === 4 + rank){
            var castlingIndex = 64 + 3*side;
            if(pieceIds[castlingIndex] === 0){
                pieceIds[castlingIndex] = 1;
                delta[0] = 1;
            }
            if(moveDest === 2 + rank){
                pieceIds[rank] = noPiece;
                pieceIds[3+rank] = getPieceId(side, 4);
                pieceIds[castlingIndex+1] = 1;
                allMoves[rank] = [];
                numAllMoves[rank] = 0;
                allMoves[3+rank] = findAllPieceMoves(pieceIds,3+rank);
                numAllMoves[3+rank] = allMoves[3+rank].length;
            }else if(moveDest===6+rank){
                pieceIds[7+rank] = noPiece;
                pieceIds[5+rank] = getPieceId(side, 4);
                pieceIds[castlingIndex+2] = 1;
                allMoves[7+rank] = [];
                numAllMoves[7+rank] = 0;
                allMoves[5+rank] = findAllPieceMoves(pieceIds,5+rank);
                numAllMoves[5+rank] = allMoves[5+rank].length;
            }
        }
    }
    return delta;
}


//Undoes a move
function undoMove(pieceIds, move, capture, allMoves, numAllMoves){
    var id = getPiece(move);
    var side = getPieceSide(id);
    var type = getPieceType(id);
    var moveOrigin = getOrigin(move);
    var moveDest = getDest(move);
    var castlingIndex;
    pieceIds[moveDest] = noPiece;
    if(capture && capture.length>1){
        pieceIds[capture[1]] = capture[2];
        allMoves[capture[1]] = capture[3];
        numAllMoves[capture[1]] = capture[3].length;
    }
    var rank = 56*side;
    if(type===4){
        if(capture && capture[0]===1){
            castlingIndex = numSquares + 3*side;
            if(moveOrigin ===rank){
                pieceIds[castlingIndex+1] = 0;
            }else if(moveOrigin===rank+7){
                pieceIds[castlingIndex+2] = 0;
            }
        }
    }

    pieceIds[moveOrigin] = id;
    if(type===6 && moveOrigin === 4 + rank){
        castlingIndex = numSquares + 3*side;
        if(capture && capture[0]===1){
            pieceIds[castlingIndex] = 0;
        }
        if(moveDest === 2 + rank){
            pieceIds[castlingIndex] = 0;
            pieceIds[castlingIndex+1] = 0;
            pieceIds[rank] = getPieceId(side, 4);
            pieceIds[3+rank] = noPiece;
            allMoves[rank] = findAllPieceMoves(pieceIds,rank);
            numAllMoves[rank] = allMoves[rank].length;
            allMoves[3+rank] = [];
            numAllMoves[3+rank] = allMoves[3+rank].length;
        }
        if(moveDest===6+rank){
            pieceIds[castlingIndex] = 0;
            pieceIds[castlingIndex+2] = 0;
            pieceIds[7+rank] = getPieceId(side, 4);
            pieceIds[5+rank] = noPiece;
            allMoves[7+rank] = findAllPieceMoves(pieceIds,7+rank);
            allMoves[5+rank] = [];
            numAllMoves[7+rank] = allMoves[7+rank].length;
            numAllMoves[5+rank] = allMoves[5+rank].length;
        }
    }
}

function m_sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

//Checks for changes in position and updates the moves possible accordingly
function updateMoveTable(pieceIds, allMoves,numAllMoves, controllingList, moveOrigin, moveDest, originalMoves){
        numCalls.umt++;
        var initPieces = controllingList[moveOrigin];
        var finalPieces = controllingList[moveDest];
        var typeId, initPiecePos, finalPiecePos, p, pos, delta;
        var file = moveOrigin&7;
        var rank = moveOrigin>>3;
        var numInitPieces = initPieces.length;
        var numFinalPieces = finalPieces.length;
        for(var i=0; i<numInitPieces; i++){
            initPiecePos = initPieces[i];
            typeId = getPieceType(pieceIds[initPiecePos]);
            if(((typeId>=3 && typeId<=5) || typeId == 7) && initPiecePos!==moveDest){
                pos = moveOrigin;
                delta = m_sign(file - (initPiecePos&7))+ 8*m_sign(rank - (initPiecePos>>3));
                 p = noPiece;
                 while(pos!==-1 && p===noPiece){
                     pos = adjustPosition(pos, delta);
                     if(pos!==-1){
                         p = pieceIds[pos];
                         allMoves[initPiecePos].push(pos);
                     }
                 }
                numAllMoves[initPiecePos] = allMoves[initPiecePos].length;
            }
        }
        for(var j=0; j<numFinalPieces; j++){
            finalPiecePos = finalPieces[j];
            typeId = getPieceType(pieceIds[finalPiecePos]);
            if(((typeId>=3 && typeId<=5) || typeId == 7)&& finalPiecePos!==moveOrigin){
                allMoves[finalPiecePos] = findAllPieceMoves(pieceIds, finalPiecePos);
                numAllMoves[finalPiecePos] = allMoves[finalPiecePos].length;
            }
        }
        if(originalMoves){
            allMoves[moveDest] = originalMoves;
            numAllMoves[moveDest] = originalMoves.length;
        }else{
            allMoves[moveDest] = findAllPieceMoves(pieceIds, moveDest);
            numAllMoves[moveDest] = allMoves[moveDest].length;
        }
}

//Finds valid moves for the king
function findValidKingMoves(pieceIds, position, noCheckAllowed){
    numCalls.k++;
    var positions = [[],[]];
    var pos = position;
    var pieceId = pieceIds[position];
    var side = getPieceSide(pieceId);
    var p, possibleMove;
    var possibleMoves = allPieceMoves[6*numSquares+position];
    var numMoves = possibleMoves.length;

    for(var i=0; i<numMoves; i++){
        possibleMove = possibleMoves[i];
        p = pieceIds[possibleMove];
        if(!noCheckAllowed || validMove(pieceIds, getMove(pieceId, position, possibleMove))){
            if(p===noPiece){
                positions[0].push(possibleMove);
            }else if(isPieceSide(p, 1^side)){
                positions[1].push(possibleMove);
            }
        }
    }    
    var row = 56*side;
    var castlingIndex = numSquares + 3*side;
    if(pos === row + 4 && pieceIds[castlingIndex]===0 && (!noCheckAllowed || !detectCheck(pieceIds, side))){
        if(pieceIds[castlingIndex+1]===0 && pieceIds[1+row]===noPiece && pieceIds[2+row]===noPiece && pieceIds[3+row]===noPiece && pieceIds[row]=== getPieceId(side, 4)){
            var kingLeftPos = pos - 2;
            if(validMove(pieceIds, getMove(pieceId, position,kingLeftPos))){
                pieceIds[position] = noPiece;
                pieceIds[position-1] = pieceId;
                if(!noCheckAllowed || !detectCheck(pieceIds, side)){
                    positions[0].push(kingLeftPos);
                }
                pieceIds[position] = pieceId;
                pieceIds[position-1] = noPiece;
            }
        }
        if(pieceIds[castlingIndex+2]===0 && pieceIds[5+row]===noPiece && pieceIds[6+row]===noPiece && pieceIds[7+row]===getPieceId(side, 4)){
            var kingRightPos = pos + 2;
            if(validMove(pieceIds, getMove(pieceId, position, kingRightPos))){
                pieceIds[position] = noPiece;
                pieceIds[position+1] = pieceId;
                if(!noCheckAllowed || !detectCheck(pieceIds, side)){
                    positions[0].push(kingRightPos);
                }
                pieceIds[position] = pieceId;
                pieceIds[position+1] = noPiece;
            }
        }
    }
    return positions;
}

