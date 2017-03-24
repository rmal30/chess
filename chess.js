var game, future;
var pieceIds;
var file = ["a", "b", "c", "d", "e", "f", "g", "h"];
var moveHistory, futureMoves;
var pieceTypes = ["-", "P", "N", "B", "R", "Q", "K"];
var gameNotation;
var noPiece = 0;
var numSquares = 64;
var pieceValues = [0, 96, 300, 325, 500, 900, 3950];
var winScore = 100000;
var bestMoves;
var outcome;
var randZTable;
var gameHashes = [];
var maxInt = Math.round(Math.pow(2, 32));
var bestMoveTable;
var allPieceMoves = [];
var numCalls = {eval:0, p:0, k:0, n:0, vMoves:0, check:0, umt:0, aMoves:0, mtdF:0};
var currentSide, pendingMove;
var pawnSquareTable = [0, 0, 1, 3, 13, 50, 201, 804];

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

function detectCheck(pieceIds,side){
	numCalls.check++;
	var possibleThreats, numThreats;
	var pos = findPieceId(pieceIds, 6*side);
	if(pos === -1){
		return true;
	}
	var pLeft = adjustPosition(pos, -1+side*8);
	var pRight = adjustPosition(pos, 1+side*8);
	if((pRight!==-1 && pieceIds[pRight] === -side) || (pLeft!==-1 && pieceIds[pLeft] ===  -side)){
		return true;
	} 
	var moves = allPieceMoves[6*numSquares+pos];
	for(var i=0; i<moves.length; i++){
		if(pieceIds[moves[i]]===-6*side){
			return true;
		}
	}
	var pieceId;
	for(var j=2; j<=4; j++){
		pieceIds[pos] = j*side;
		possibleThreats = findValidPieceMoves(pieceIds, pos, false)[1];
		numThreats = possibleThreats.length;
		for(var k=0; k<numThreats; k++){
			pieceId = pieceIds[possibleThreats[k]];
			if(pieceId === - j*side || (j!==2 && pieceId===-5*side)){
				pieceIds[pos] = 6*side;
				return true;
			}
		}
	}
	pieceIds[pos] = 6*side;
	return false;
}

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

function generateCaptureList(pieceIds, side){
	var moveList = [];
	for(var i=0; i<numSquares; i++){
		var pieceId = pieceIds[i];
		if(pieceId*side>0){
			var options = findValidPieceMoves(pieceIds, i, false); 
			var captures = options[1];
			for(var j=0; j<captures.length; j++){
				moveList.unshift([pieceId, i, captures[j]]);
			}
		}
	}	
	return moveList;
}

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
	if(detectCheck(pieceIds,1) || detectCheck(pieceIds, -1)){
		if(possibleMoves.length===0){
			document.getElementById("status").innerHTML="Checkmate!";
			outcome = -currentSide;
		}else{
			document.getElementById("status").innerHTML="Check!";
		}
	}else{
		if(possibleMoves.length===0){
			document.getElementById("status").innerHTML="Stalemate!";
			outcome = 0;
		}else{
			document.getElementById("status").innerHTML="";
		}
	}
	if(count>=3){
		document.getElementById("status").innerHTML = "Draw!";
		outcome = 0;
	}
}

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
				if(pieceId!== 6){
					mobilityScore+= numAllMoves[i];
				}
				materialScore+= pieceValues[pieceId];
				if(pieceId===1){
					materialScore+=pawnSquareTable[i>>3];
				}
				
			}else if(pieceId<0){
				blackPieceCount++;
				if(pieceId!==-6){
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

function findAllMoves(pieceIds){
	var allMoves = [];
	for(var i=0; i<numSquares; i++){
		allMoves.push(findAllPieceMoves(pieceIds,i));
	}
	return allMoves;
}

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


function scoreMove(pieceIds, move, initScore, allMoves,numAllMoves, controllingList, side, depth, maxDepth, a, b){
	var newScore, hash, numHashes, replies;
	var capturedPiece, moveDest, moveOrigin, originalMoves;
	
	if(move){
		moveOrigin = move[1];
		moveDest = move[2];
		var doQSearch = false;
		if(depth===0){	
			var score = guessMoveScore(pieceIds, move, initScore, controllingList, side);
			if(score !== null){
				return score;
			}else{
				doQSearch = true;
			}
		}
		originalMoves = copyArr(allMoves[moveOrigin]);
		capturedPiece = makeMove(pieceIds, move, allMoves, numAllMoves);
		updateMoveTable(pieceIds, allMoves, numAllMoves, controllingList, moveOrigin, moveDest, undefined);
	}
	if(depth===0){
		var captureList = generateCaptureList(pieceIds, -side);
		if(doQSearch && captureList.length>0){
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
		if((Math.abs(move[1] - move[2])===7 || Math.abs(move[1] - move[2])===9) && typeId===1){
			return file[move[1]%8]+"x"+getPosFromId(move[2]);
		}
	}

	if(pieceType==="P"){
		if(capture==="x"){idLetters=file[move[1]%8];}else{idLetters="";}
		if(move[2]<8 || move[2]>=56){
			promotion="=Q";
		}
	}else{
		idLetters=pieceType;
	}

	if(typeId>=2 && typeId<=5){
		var initPositions = [];
		pieceIds[move[2]] = - move[0];
		var capturePositions = findValidPieceMoves(pieceIds,move[2],true)[1];
		for(var i=0; i<capturePositions.length; i++){
			if(Math.abs(pieceIds[capturePositions[i]])===typeId && capturePositions[i]!==move[1]){
				initPositions.push(capturePositions[i]);
			}
		}		
		pieceIds[move[2]] = finalPosId;
		var sameFile = false;
		var sameRank = false;
		for(var j=0; j<initPositions.length; j++){
			if(initPositions[j]%8===move[1]%8){
				sameFile = true;
			}
			if(initPositions[j]>>3===move[1]>>3){
				sameRank = true;
			}
		}
		if(initPositions.length>0){
			if(!sameFile){idLetters+=file[move[1]%8];}
			else if(!sameRank){idLetters+=(move[1]>>3)+1;}
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
	if(pieceType==="K" && move[1] % 8 === 4){
		if(move[2]%8===6){
			return "O-O"+check;
		}else if(move[2]%8===2){
			return "O-O-O"+check;
		}
	}
	return idLetters+capture+getPosFromId(move[2])+promotion+check;
}

function applyMove(move){
	if(currentSide===1){
		gameNotation.push([getNotation(pieceIds, move),""]);
	}else{
		gameNotation[gameNotation.length-1][1] = getNotation(pieceIds, move);
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

function startMove(initPos, side){
	if(outcome===null && side===currentSide && !pendingMove){
		pendingMove = true;
		document.getElementById("piece-"+initPos).style.WebkitFilter='drop-shadow(1px 1px 0 yellow) drop-shadow(-1px 1px 0 yellow) drop-shadow(1px -1px 0 yellow) drop-shadow(-1px -1px 0 yellow)';
		var possibleRays = findValidPieceMoves(pieceIds, initPos, true);
		document.getElementById("moves").innerHTML = highlightMoves(possibleRays);
		document.addEventListener('mouseup', function fmove() {
			var cell = getCell(event.pageX,event.pageY);
			if(cell!==initPos){
				var valid = false;
				for(var i=0; i<possibleRays.length; i++){
					for(var j=0; j<possibleRays[i].length; j++){
						if(possibleRays[i][j]===cell){
							valid = true;
						}	
					}
				}
				if(valid){
					applyMove([pieceIds[initPos], initPos, cell]);
				}else{
					document.getElementById("piece-"+initPos).style.WebkitFilter='none';
					document.removeEventListener('mouseup', fmove);
				}
				document.getElementById("moves").innerHTML="";	
			}
			pendingMove=false;
			document.removeEventListener('mouseup', fmove);
		});
	}
}
function startGame(){
    init();
    doPlay();
}

function doPlay(){
	if(outcome===null){
		var compPlayer = parseInt(document.getElementById("compPlayer").value);
		if(compPlayer===currentSide || compPlayer===2){
			document.getElementById("pending").style.visibility = "visible";
			setTimeout(play, 50);
		}else{
			document.getElementById("pending").style.visibility = "hidden";
		}
	}
}

function undo(){
	if(game.length>1){
		currentSide = -currentSide;
		outcome = null;
		future.push(game.pop());
		gameHashes.pop();
		if(currentSide===1){
			gameNotation.pop();
		}else{
			gameNotation[gameNotation.length-1][1] = "";
		}
		futureMoves.push(moveHistory.pop());
		pieceIds = game[game.length-1].slice();
		setupBoard(pieceIds);
		updateStatus();
	}
}

function redo(){
	if(future.length>0){
		var futureBoard = future.pop();
		var futureMove = futureMoves.pop();
		if(currentSide===1){
			gameNotation.push([getNotation(pieceIds, futureMove),""]);
		}else{
			gameNotation[gameNotation.length-1][1] = getNotation(pieceIds, futureMove);
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
randZTable = initZobrist(maxInt);
init();
