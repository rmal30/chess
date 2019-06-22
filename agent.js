var winScore = 100000;
var pawnSquareTable = [0, 0, 1, 3, 13, 50, 201, 804];
var pieceValues = [0, 96, 300, 325, 500, 900, 3950, 1500];

function evaluate(pieceIds, side){
    var allMoves = findAllMoves(pieceIds);
    var numAllMoves = genNumAllMoves(allMoves);
    return evaluateScore(pieceIds, allMoves, numAllMoves, side);
}

//Heuristic evaluation of depth 0. Counts piece values and their mobility
function evaluateScore(pieceIds, allMoves, numAllMoves, side){
    var score;
    numCalls.eval++;
    var mobilityScore = 0;
    var materialScore = 0;
    var kingFreedomScore = 0;
    var pieceId;
    var typeId;
    var whitePieceCount = 0;
    var blackPieceCount = 0;
    for(var i=0; i<numSquares; i++){
        pieceId = pieceIds[i];
        typeId = getPieceType(pieceId)
        if(isPieceSide(pieceId, 0)){
            whitePieceCount++;
            if(typeId<=4 || typeId == 7){
                mobilityScore+= numAllMoves[i];
            }
            materialScore+= pieceValues[typeId];
            if(typeId===1){
                materialScore+=pawnSquareTable[i>>3];
            }
        }else if(isPieceSide(pieceId, 1)){
            blackPieceCount++;
            if(typeId<=4 || typeId == 7){
                mobilityScore-= numAllMoves[i];
            }
            if(typeId===1){
                materialScore-=pawnSquareTable[7 - (i>>3)];
            }
            materialScore-= pieceValues[typeId];
        }
    }
    if(whitePieceCount<3){
        kingFreedomScore+= kingFreedom(pieceIds, 1, allMoves, findPieceId(pieceIds, getPieceId(0, 6)))-numSquares;
    }
    if(blackPieceCount<3){
        kingFreedomScore-= kingFreedom(pieceIds, -1, allMoves, findPieceId(pieceIds, getPieceId(1, 6)))-numSquares;
    }    
    score = (mobilityScore*5)+materialScore+(kingFreedomScore<<1);
    return score*(1-side*2);
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
        if(!isPieceSide(pieceIds[i], side) || pieceIds[i] === getPieceId(side, 6)){
            checkTable[i] = 0;
        }else{
            checkTable[i] = -1;
        }
        if(isPieceSide(pieceIds[i], 1^side)){
            if(pieceIds[i]!==getPieceId(1^side, 1)){
                for(var j = 0; j<validMoves[i].length; j++){    
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
    var pieceId = getPiece(move);
    var moveDest = getDest(move);
    var score = initScore;
    var destId = pieceIds[moveDest];
    var isNull = true;
    if(destId!==noPiece){
        score+=pieceValues[getPieceType(destId)];
        isNull = false;
    }
    if(pieceId===getPieceId(side, 1) && moveDest>>3 === 7-7*side){
        score+= pieceValues[5]-pieceValues[1];
        pieceId = getPieceId(side, 5);
        isNull = false;
    }
    var controllingPieces = controllingList[moveDest];
    var numMoves = controllingPieces.length;
    for(var i=0; i<numMoves; i++){
        if(isPieceSide(pieceIds[controllingPieces[i]], 1^side)){
            score-=pieceValues[getPieceType(pieceId)];
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
    if(isPieceSide(pieceId, 1^side)){
        numControllingPieces = controllingPieces.length;
        for(var i=0; i<numControllingPieces; i++){
            if(getPieceSide(controllingPieces[i]) === 1^getPieceSide(pieceId<0)){
                score+=pieceValues[getPieceType(pieceId)];
                pieceId = controllingPieces[i];
                controllingPieces.splice(i, 1);
                score-= qSearch(pieceId, controllingPieces, 1^side);
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



//The MTDf search algorithm, uses Alpha Beta minimax to select the best moves
function MTDf(pieceIds,moveList, guess, side, depth, maxDepth){
    numCalls.mtdF++;
    var lower = -winScore;
    var upper = winScore;
    var mtdBestMoves, beta;
    var allMoves = findAllMoves(pieceIds);
    while(lower<upper){
        if(guess > lower+1){ beta = guess;} else {beta = lower+1;}
        mtdBestMoves = findBestMove(pieceIds, moveList, allMoves, side, depth, maxDepth,  beta - 1, beta);
        guess = mtdBestMoves[2];
        if(guess<beta){upper = guess;}else{lower = guess;}
    }
    return mtdBestMoves;
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


//Score a move at a certain depth - Uses the Alpha Beta Minimax algorithm
function scoreMove(pieceIds, move, initScore, allMoves,numAllMoves, controllingList, side, depth, maxDepth, a, b){
    var newScore, hash, numHashes, replies;
    var capturedPiece, moveDest, moveOrigin, originalMoves;
    var doQSearch = false; //document.getElementById("qsearch").checked;
    if(move){
        moveOrigin = getOrigin(move);
        moveDest = getDest(move);
        if( depth===0 && !doQSearch){    
            var score = guessMoveScore(pieceIds, move, initScore, controllingList, side);
            if(score !== null){
                return score;
            }
        }
        originalMoves = copyArr(allMoves[moveOrigin]);
        capturedPiece = makeMove(pieceIds, move, allMoves, numAllMoves);
        updateMoveTable(pieceIds, allMoves, numAllMoves, controllingList, moveOrigin, moveDest, undefined);
    }
    if(depth===0){
        var captureList;
        if(doQSearch){
            captureList = generateCaptureList(pieceIds,allMoves, 1 ^ side);
        }else{
            captureList = [];
        }
        if(captureList.length>0){
            replies = findBestMove(pieceIds,captureList,allMoves, 1 ^ side, 1, maxDepth, -b, -a);
            newScore = -replies[2];
        }else{
            newScore = evaluateScore(pieceIds, allMoves, numAllMoves, side);
        }
        if(newScore>maxDepth - depth-1){
            newScore-= maxDepth - depth - 1;
        }else if(newScore<-maxDepth + depth - 1){
            newScore+= maxDepth - depth - 1;
        }
    }else{
        if(legalMoveExists(pieceIds, 1 ^ side)){
            var draw = false;
            hash = hashPosition(1 ^ side, pieceIds);
            numHashes = gameHashes.length; 
            for(var i=0; i<numHashes; i++){
                if(hash===gameHashes[i]){
                    newScore = 0;
                    draw = true;
                    break;
                }
            }
            if(!draw){
		        replies = findBestMove(pieceIds,null,allMoves, 1 ^ side, depth, maxDepth, -b, -a);
                newScore = -replies[2];
                /*
                if(newScore>0){
                    newScore--;
                }else if(newScore<0){
                    newScore++;
                }
                */
                /*
                if(newScore>maxDepth - depth){
                    newScore-= maxDepth - depth;
                }else if(newScore<-maxDepth + depth){
                    newScore+= maxDepth - depth;
                }
                */

            }
        }else{
            if(detectCheck(pieceIds, 1 ^ side)){
                newScore =  winScore-maxDepth+depth+1;
            }else{
                newScore = 0;
            }
        }
    }
    if(move){
        undoMove(pieceIds, move, capturedPiece, allMoves, numAllMoves);
        updateMoveTable(pieceIds, allMoves, numAllMoves, controllingList, moveDest, moveOrigin, originalMoves);
    }
    return newScore;
}


//Move sorting is used to reduce the number of positions searched
function sortMoves(pieceIds, moveList, allMoves, controllingList, side, depth, maxDepth, a, b){
    var numMoves;
    var scores = [];
    var move;
    var j;
    numMoves = moveList.length;
    var numAllMoves = genNumAllMoves(allMoves);
    var newScore = evaluateScore(pieceIds, allMoves,numAllMoves, side);
    for(var i=0; i<numMoves; i++){
        move = moveList[i];
        newScore = scoreMove(pieceIds, move, newScore,allMoves, numAllMoves, controllingList, side, depth-1, maxDepth, a, b);
        j = i;
        while(j >= 1 && scores[j-1] < newScore){
            scores[j] = scores[j-1];
            moveList[j] = moveList[j-1];
            j--;
        }
        scores[j] = newScore;
        moveList[j] = move;
    }
}

//Finds the best move
function findBestMove(pieceIds, moveList, allMoves, side, depth, maxDepth, a, b){
    var a_old = a;
    var hash = hashPosition(side, pieceIds);
    var entryMoves = bestMoveTable[hash];
    if(entryMoves && entryMoves[0]>=depth){
        var entryLimit = entryMoves[1];
        var entryScore = entryMoves[2];
        if(entryLimit===0){
            return entryMoves;
        }
        if(entryLimit===-1){
            if(entryScore>a){
                a = entryScore;
            }
        }else if(entryLimit===1){
            if(entryScore<b){
                b = entryScore;
            }
        }
        if(a>=b){
            return entryMoves;
        }
    }
    gameHashes.push(hash);
    var bestScore = -winScore;
    var bestMoves = [];
    var newScore,controllingList, numMoves, move;
    var numAllMoves = genNumAllMoves(allMoves);
    bestMoves[0] = depth;
    controllingList = genControllingList(pieceIds, allMoves);
    if(moveList === null){
        moveList = generateMoveList(pieceIds,side, depth>maxDepth-2);
        if(depth>1){
            sortMoves(pieceIds, moveList, allMoves, controllingList, side, depth>>1, maxDepth, a, b);
        }
    }
    var initScore = evaluateScore(pieceIds, allMoves, numAllMoves, side);
    numMoves = moveList.length;
    for(var i=0; i<numMoves; i++){
        move = moveList[i];
        newScore = scoreMove(pieceIds, move, initScore,allMoves, numAllMoves, controllingList, side, depth-1, maxDepth, a, b);
        if(newScore>bestScore){
            bestScore = newScore;
            bestMoves[3] = move;
            if(bestScore>a){a = bestScore;}
        }
        if(a>=b){
            break;
        }
    }
    if(bestScore<=a_old){
        bestMoves[1] = 1;
    }else if(bestScore>=b){
        bestMoves[1] = -1;
    }else{
        bestMoves[1] = 0;
    }
    bestMoves[2] = bestScore;
    if(!entryMoves || depth>=entryMoves[0]){
        bestMoveTable[hash] = bestMoves;
    }
    gameHashes.pop();
    return bestMoves;
}

//Finds multiple best moves
function findBestMoves(pieceIds, moveList, allMoves, controllingList, side, depth, maxDepth, a, b){
    var bestScore = -winScore;
    var bestMoves = [];
    var newScore, numMoves, move;
    var c = 3;
    var numAllMoves = genNumAllMoves(allMoves);
    var initScore = evaluateScore(pieceIds, allMoves,numAllMoves, side);
    numMoves = moveList.length;
    bestMoves[0] = depth;
    bestMoves[1] = 0;
    for(var i=0; i<numMoves; i++){
        move = moveList[i];
        newScore = scoreMove(pieceIds, move, initScore,allMoves, numAllMoves, controllingList, side, depth-1, maxDepth, a, b);
        if(newScore>bestScore){
            bestScore = newScore;
            c = 3;
        }
        if(newScore===bestScore){
            bestMoves[c] = move;
            c+=1;
        }
        if(bestScore>a){
            a = bestScore;
            if(a>b){
                break;
            }
        }
    }
    bestMoves[2] = bestScore;
    bestMoves.length = c;
    return bestMoves;
}
