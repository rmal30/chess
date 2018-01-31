var winScore = 100000;


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
        moveOrigin = move[1];
        moveDest = move[2];
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
            captureList = generateCaptureList(pieceIds,allMoves, -side);
        }else{
            captureList = [];
        }
        if(captureList.length>0){
            replies = findBestMove(pieceIds,captureList,allMoves, -side, 1, maxDepth, -b, -a);
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
        if(legalMoveExists(pieceIds, -side)){
            var draw = false;
            hash = hashPosition(-side, pieceIds);
            numHashes = gameHashes.length; 
            for(var i=0; i<numHashes; i++){
                if(hash===gameHashes[i]){
                    newScore = 0;
                    draw = true;
                    break;
                }
            }
            if(!draw){
		replies = findBestMove(pieceIds,undefined,allMoves, -side, depth, maxDepth, -b, -a);
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
            if(detectCheck(pieceIds, -side)){
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
    if(!moveList){
        moveList = generateMoveList(pieceIds,side, depth>maxDepth-2);
        if(depth>1){    
            sortMoves(pieceIds, moveList, allMoves, controllingList, side, depth>>1, maxDepth, a, b);
        }
    }
    
    var initScore = evaluateScore(pieceIds, allMoves, numAllMoves, side);
     /*
     if(depth>3){
        var nullMoveScore = scoreMove(pieceIds, undefined, initScore,allMoves, numAllMoves, controllingList, side, depth - 3 - (depth&1), maxDepth, b-1, b);
        if(nullMoveScore>=b){
            depth=2;
        }
    }
    */
    numMoves = moveList.length;
    for(var i=0; i<numMoves; i++){
        move = moveList[i];    
        newScore = scoreMove(pieceIds, move, initScore,allMoves, numAllMoves, controllingList, side, depth-1, maxDepth, a, b);
        if(newScore>bestScore){
            bestScore = newScore;
            bestMoves[3] = move[0];
            bestMoves[4] = move[1];
            bestMoves[5] = move[2];
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
            bestMoves[c] = move[0];
            bestMoves[c+1] = move[1];
            bestMoves[c+2] = move[2];
            c+=3;
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
