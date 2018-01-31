var file = ["a", "b", "c", "d", "e", "f", "g", "h"];
var pieceTypes = ["-", "P", "N", "B", "R", "Q", "K"];
var noPiece = 0;
var numSquares = 64;
var bestMoves, outcome, randZTable;
var gameHashes = [];
var bestMoveTable;
var allPieceMoves = [];
var numCalls = {eval:0, p:0, k:0, n:0, vMoves:0, check:0, umt:0, aMoves:0, mtdF:0};

//Each cell has an id from 1-64
//Store legal moves for pieces, each number is a cell id offset indicating a relative change from initial position
var rookPaths = [-8, -1, 1, 8]; // The move rays for a rook
var bishopPaths = [-9, -7, 7, 9]; // The move rays for a bishop
var whitePawnPaths = [7, 9]; // Pawn moves - White
var blackPawnPaths = [-7, -9]; // Black
var queenPaths = [-9, -8, -7, -1, 1, 7, 8, 9]; //Rays for a queen
var kingPaths = [-9, -8, -7, -1, 1, 7, 8, 9]; //Moves for a king
var knightPaths = [-17,-15,-10,-6, 6, 10, 15, 17]; //Moves for a knight


//Find the total number of moves possible for each piece on the board
function genNumAllMoves(allMoves){
    var numAllMoves = [];
    for(var i=0; i<numSquares; i++){
        numAllMoves[i] = allMoves[i].length;
    }
    return numAllMoves;
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
    var kingId = 6;
    var pos = findPieceId(pieceIds, kingId*side);
    if(pos === -1){
        return true; //Can't find the king
    }
    var pLeft = adjustPosition(pos, -1+side*8); //Potential pawn on left
    var pRight = adjustPosition(pos, 1+side*8); //On right
    if((pRight!==-1 && pieceIds[pRight] === -side) || (pLeft!==-1 && pieceIds[pLeft] ===  -side)){
        return true; //King attacked by pawns
    } 
    var moves = allPieceMoves[kingId*numSquares+pos];
    for(var i=0; i<moves.length; i++){
        if(pieceIds[moves[i]]===-kingId*side){
            return true; //King attacked by opposite king
        }
    }
    var pieceId;
    //Change to a knight, bishop and rook, find potential attackers
    for(var j=2; j<=4; j++){
        pieceIds[pos] = j*side; //Change piece to detect pieces nearby
        possibleThreats = findValidPieceMoves(pieceIds, pos, false)[1];
        numThreats = possibleThreats.length;
        for(var k=0; k<numThreats; k++){
            pieceId = pieceIds[possibleThreats[k]];
            if(pieceId === - j*side || (j!==2 && pieceId===-5*side)){
                pieceIds[pos] = kingId*side; //Change back to king
                return true; //King attacked by knight, bishop, rook or queen
            }
        }
    }
    pieceIds[pos] = kingId*side; //Change back to king, no threats found
    return false;
}

//Check if move is valid
function validMove(pieceIds,move){
    var initPos = move[1];
    var finalPos = move[2];
    var pieceId = move[0]; 
    var j = pieceIds[finalPos];
    var valid = true;
    
    if(j*pieceId>0){
        return false;
    }
    pieceIds[initPos]=noPiece;
    pieceIds[finalPos]=pieceId;
    
    if(detectCheck(pieceIds, Math.sign(pieceId))){
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
    var side = pieceId > 0 ? 1 : -1;
    var leftCapturePos = pos+8*side-1;
    var rightCapturePos = pos+8*side+1;
    if((pos&7)>0 && pieceIds[leftCapturePos]*side < 0){        
        if(!noCheckAllowed || validMove(pieceIds, [pieceId, position, leftCapturePos])){
            positions[1].push(leftCapturePos);    
        }
    }

    if((pos&7)<7 && pieceIds[rightCapturePos]*side < 0){
        if(!noCheckAllowed || validMove(pieceIds, [pieceId, position, rightCapturePos])){
            positions[1].push(rightCapturePos);    
        }
    }
    if(pos>>3 === 3.5 + 0.5*side){
        var move = moveHistory[moveHistory.length-1];
        if(move){
            var moveDest = move[2];
            var moveOrigin = move[1];
            if(move[0] === -side && (moveOrigin>>3===3.5+2.5*side)){
                var enPassantLeft = adjustPosition(pos, -1);
                var enPassantRight = adjustPosition(pos, 1);
                var enl = pieceIds[enPassantLeft];
                var enr = pieceIds[enPassantRight];
                
                if(enPassantLeft!==-1 && enl*side<0 && moveDest===enPassantLeft){
                    leftCapturePos = adjustPosition(pos, -1+8*side);
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
                
                if(enPassantRight!==-1 && enr*side<0 && moveDest===enPassantRight){
                    rightCapturePos = adjustPosition(pos, side*8+1);
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
    var forwardPos =  pos + 8*side;
    if(pieceIds[forwardPos]===noPiece){
        var doubleForwardPos = pos + 16*side;
        if(!noCheckAllowed || validMove(pieceIds,[pieceId, pos, forwardPos])){
            positions[0].push(forwardPos);
        }
        if(pos>>3===3.5-2.5*side && pieceIds[doubleForwardPos]===noPiece){
            if(!noCheckAllowed || validMove(pieceIds,[pieceId, pos, doubleForwardPos])){
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
    var typeId = Math.abs(pieceId);
    var numPaths;
    var p, j;
    var possibleMoves, numMoves, possibleRays, possibleMove;
    
    switch(typeId){
        case 1: positions = findValidPawnMoves(pieceIds, position, noCheckAllowed); break;
        case 3:
        case 4:
        case 5:
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
                        if(!noCheckAllowed || validMove(pieceIds,[pieceId, position, possibleMove])){        
                            positions[0].push(possibleMove);                    
                        }                
                    }
                    else if(p*pieceId<0){
                        if(!noCheckAllowed || validMove(pieceIds,[pieceId, position, possibleMove])){
                            positions[1].push(possibleMove);
                        }
                    }    
                    j++;
                }
            }
            break;
        case 2:
            possibleMoves = allPieceMoves[2*numSquares+position];
            numMoves = possibleMoves.length;
            for(var i=0; i<numMoves; i++){
                possibleMove = possibleMoves[i];
                p = pieceIds[possibleMove];
                if(p===noPiece){
                    if(!noCheckAllowed || validMove(pieceIds,[pieceId, position, possibleMove])){        
                        positions[0].push(possibleMove);                    
                    }
                }else if(p*pieceId<0){
                    if(!noCheckAllowed || validMove(pieceIds,[pieceId, position, possibleMove])){
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
        if(pieceId*side>0){
            var options = findValidPieceMoves(pieceIds, i, noCheckAllowed); 
            var moves = options[0];
            var captures = options[1];
            var numMoves = moves.length;
            for(var j=0; j<captures.length; j++){
                moveList.unshift([pieceId, i, captures[j]]);
            }
            for(var k=0; k<numMoves; k++){
                moveList.push([pieceId, i, moves[k]]);
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
        if(pieceId*side>0){
            options = findValidPieceMoves(pieceIds, i, false); 
            captures = options[1];
            for(var j=0; j<captures.length; j++){
                capturePos = captures[j];
                if(pieceId*side<-side*pieceIds[capturePos]){
                    moveList.unshift([pieceId, i, capturePos]);
                }else{
                    controllingPieces = genControllingArr(pieceIds, controllingList[capturePos]);
                    /*
                    for(var k=0; k<controllingList[capturePos].length; k++){
                        controllingPieces.push(pieceIds[controllingList[capturePos][k]]);
                    }
                    */
                    score = qSearch(pieceIds[capturePos], controllingPieces, side);
                    if(score>0){
                        moveList.unshift([pieceId, i, capturePos]);
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
    if(pieceId===0){
        return [];
    }
    if(pieceId===-1){
        return allPieceMoves[pos];
    }
    var typeId = Math.abs(pieceId);
    var hash = typeId*numSquares+pos;
    var numMoves, numPaths;
    var positions;
    var p, j;
    var possibleMoves;
    var pieceMoves = allPieceMoves[hash];    
    if(typeId>=3 && typeId<=5){
        positions = [];
        numPaths = pieceMoves.length;
        for(var i=0; i<numPaths; i++){
            possibleMoves = pieceMoves[i];
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
    var pieceMoves;
    for(var i=0; i<numSquares; i++){
        if(pieceIds[i]*side>0){
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
    var id = move[0];
    var type = Math.abs(id);
    var moveOrigin = move[1];
    var moveDest = move[2];
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
            pieceIds[moveDest] = 5*id;
        }
    }
    else if(type===4){
        var side = Math.sign(id);
        var rank = 28 - 28*side;
        var castlingIndex = 65.5-1.5*side;
        if(moveOrigin===rank && pieceIds[castlingIndex+1] === 0){
            pieceIds[castlingIndex+1] = 1;
            delta[0] = 1;
        }else if(moveOrigin===rank+7 && pieceIds[castlingIndex+2]===0){
            pieceIds[castlingIndex+2] = 1;
            delta[0] = 1;
        }
    }
    else if(type===6){ 
        var side = Math.sign(id);
        var rank = 28 - 28*side;    
        if(moveOrigin === 4 + rank){
            var castlingIndex = 65.5-1.5*side;
            if(pieceIds[castlingIndex] === 0){
                pieceIds[castlingIndex] = 1;
                delta[0] = 1;
            }    
            if(moveDest === 2 + rank){
                pieceIds[rank] = noPiece;
                pieceIds[3+rank] = 4*side;
                pieceIds[castlingIndex+1] = 1;
                allMoves[rank] = [];
                numAllMoves[rank] = 0;
                allMoves[3+rank] = findAllPieceMoves(pieceIds,3+rank);
                numAllMoves[3+rank] = allMoves[3+rank].length;
            }else if(moveDest===6+rank){
                pieceIds[7+rank] = noPiece;
                pieceIds[5+rank] = 4*side;
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
    var id = move[0];
    var side = Math.sign(id);
    var type = Math.abs(id);
    var moveOrigin = move[1];
    var moveDest = move[2];
    var castlingIndex;
    pieceIds[moveDest] = noPiece;
    if(capture && capture.length>1){
        pieceIds[capture[1]] = capture[2];
        allMoves[capture[1]] = capture[3];
        numAllMoves[capture[1]] = capture[3].length;
    }
    var rank = 28 - 28*side;
    if(type===4){
        if(capture && capture[0]===1){
            castlingIndex  = 65.5-1.5*side;
            if(moveOrigin ===rank){
                pieceIds[castlingIndex+1] = 0;
            }else if(moveOrigin===rank+7){
                pieceIds[castlingIndex+2] = 0;
            }    
        }
    }

    pieceIds[moveOrigin] = id;
    if(type===6 && moveOrigin === 4 + rank){
        castlingIndex  = 65.5-1.5*side;
        if(capture && capture[0]===1){
            pieceIds[castlingIndex] = 0;
        }
        if(moveDest === 2 + rank){
            pieceIds[castlingIndex] = 0;
            pieceIds[castlingIndex+1] = 0;
            pieceIds[rank] = 4*side;
            pieceIds[3+rank] = noPiece;
            allMoves[rank] = findAllPieceMoves(pieceIds,rank);
            numAllMoves[rank] = allMoves[rank].length;
            allMoves[3+rank] = [];
            numAllMoves[3+rank] = allMoves[3+rank].length;
        }    
        if(moveDest===6+rank){
            pieceIds[castlingIndex] = 0;
            pieceIds[castlingIndex+2] = 0;
            pieceIds[7+rank] =  4*side;
            pieceIds[5+rank] = noPiece;
            allMoves[7+rank] = findAllPieceMoves(pieceIds,7+rank);
            allMoves[5+rank] = [];
            numAllMoves[7+rank] = allMoves[7+rank].length;
            numAllMoves[5+rank] = allMoves[5+rank].length;
        }
    }
}

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
            typeId = Math.abs(pieceIds[initPiecePos]);
            if(typeId>=3 && typeId<=5 && initPiecePos!==moveDest){    
                pos = moveOrigin;
                delta = Math.sign(file - (initPiecePos&7))+ 8*Math.sign(rank - (initPiecePos>>3));
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
            typeId = Math.abs(pieceIds[finalPiecePos]);
            if(typeId>=3 && typeId<=5 && finalPiecePos!==moveOrigin){
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
    var side = pieceId > 0 ? 1 : -1;
    var p, possibleMove;
    var possibleMoves = allPieceMoves[6*64+position];
    var numMoves = possibleMoves.length;

    for(var i=0; i<numMoves; i++){
        possibleMove = possibleMoves[i];
        p = pieceIds[possibleMove];
        if(!noCheckAllowed || validMove(pieceIds, [pieceId, position, possibleMove])){
            if(p===noPiece){
                positions[0].push(possibleMove);
            }else if(p*pieceId<0){
                positions[1].push(possibleMove);
            }        
        }
    }    
    var row = 28 - 28*side;
    var castlingIndex = 65.5-1.5*side;
    if(pos === row + 4 && pieceIds[castlingIndex]===0 && (!noCheckAllowed || !detectCheck(pieceIds, side))){
        if(pieceIds[castlingIndex+1]===0 && pieceIds[1+row]===noPiece && pieceIds[2+row]===noPiece && pieceIds[3+row]===noPiece && pieceIds[row]===4*side){
            var kingLeftPos = pos - 2;
            if(validMove(pieceIds, [pieceId, position,kingLeftPos])){
                pieceIds[position] = noPiece;
                pieceIds[position-1] = pieceId;
                if(!noCheckAllowed || !detectCheck(pieceIds, side)){
                    positions[0].push(kingLeftPos);
                }
                pieceIds[position] = pieceId;
                pieceIds[position-1] = noPiece;
            }
        }
        if(pieceIds[castlingIndex+2]===0 && pieceIds[5+row]===noPiece && pieceIds[6+row]===noPiece && pieceIds[7+row]===4*side){
            var kingRightPos = pos + 2;
            if(validMove(pieceIds, [pieceId, position, kingRightPos])){
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

