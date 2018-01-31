var pawnSquareTable = [0, 0, 1, 3, 13, 50, 201, 804];
var pieceValues = [0, 96, 300, 325, 500, 900, 3950];

//Heuristic evaluation of depth 0. Counts piece values and their mobility
function evaluateScore(pieceIds, allMoves, numAllMoves, side){
        var score;
        numCalls.eval++;
        var mobilityScore = 0;
        var materialScore = 0;
        var kingFreedomScore = 0;
        var pieceId;
        var whitePieceCount = 0;
        var blackPieceCount = 0;
        for(var i=0; i<numSquares; i++){
            pieceId = pieceIds[i];
            if(pieceId>0){
                whitePieceCount++;
                if(pieceId<=4){
                    mobilityScore+= numAllMoves[i];
                }
                materialScore+= pieceValues[pieceId];
                if(pieceId===1){
                    materialScore+=pawnSquareTable[i>>3];
                }
                
            }else if(pieceId<0){
                blackPieceCount++;
                if(pieceId>=-4){
                    mobilityScore-= numAllMoves[i];
                }
                if(pieceId===-1){
                    materialScore-=pawnSquareTable[7 - (i>>3)];
                }
                materialScore-= pieceValues[-pieceId];
            }
        }
        if(whitePieceCount<2){
            kingFreedomScore+= kingFreedom(pieceIds, 1, allMoves, findPieceId(pieceIds, 6))-numSquares;
        }
        if(blackPieceCount<2){
            kingFreedomScore-= kingFreedom(pieceIds, -1, allMoves, findPieceId(pieceIds, -6))-numSquares;
        }    
        score = mobilityScore*5+materialScore+kingFreedomScore*2;
        return score*side;
}

//Uses the flood filling algorithm to fill in safe squares for the king
function floodFill(kingSafetyTable, posId){
    if(kingSafetyTable[posId]===0){
        kingSafetyTable[posId] = 1;
    }
    var options = allPieceMoves[6*numSquares+posId];
    var newPos;

    for(var i=0; i<options.length; i++){
        newPos = options[i];
        if(kingSafetyTable[newPos]===0){
            floodFill(kingSafetyTable, newPos);
        }
    }
}

//Identifies how many squares the king can move to in a board state
function kingFreedom(pieceIds, side, validMoves, position){
    var kingSafetyTable = genKingSafetyTable(pieceIds, side, validMoves);
    var count = 0;
    floodFill(kingSafetyTable, position);
    for(var i=0; i<numSquares; i++){
        if(kingSafetyTable[i]===1){
            count++;
        }
    }
    return count;
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


