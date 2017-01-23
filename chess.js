//var boardPieces;
var game;
var pieceIds;
var file = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
var order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
var moveHistory;
var pieceTypes = ['-', 'P', 'N', 'B', 'R', 'Q', 'K'];
var gameNotation;
var boardTable = {};
var noPiece = 0;
var numSquares = 64;
var bestMoves;
var moveTable = {};
var numCalls = {eval:0,evalM:0, p:0, k:0, n:0, moves:0, check:0, umt:0, umtm:0, fcp:0, upInit:0, upFinal:0, fcpm:0};
var currentSide, pendingMove;
function init(){
	moveHistory=[];
	gameNotation = [];
	boardTable = {};
	posTable = [];
	currentSide=1;
	pendingMove = false;
	pieceIds = [];
	for(var i=0; i<8; i++){
		pieceIds[i] = pieceToNum(order[i], 1);
		pieceIds[i+8] 	= 1;

		pieceIds[i+16] 	= 0;
		pieceIds[i+24] 	= 0;
		pieceIds[i+32] 	= 0;
		pieceIds[i+40] 	= 0;

		pieceIds[i+48] 	= -1;
		pieceIds[i+56] = pieceToNum(order[i], -1);
	}
	

	game = [pieceIds.slice()];
	setupBoard(pieceIds);
	updateStatus();
}

function pieceToNum(type, side){
	var typeNum;
	switch(type){
		case "P":typeNum = 1; break;
		case "N": typeNum = 2; break;
		case "B": typeNum = 3; break;
		case "R": typeNum = 4; break;
		case "Q": typeNum = 5; break;
		case "K": typeNum = 6; break;
	}
	return typeNum*side;
}
function undo(){
	document.getElementById("moves").innerHTML="";
	if(game.length>1){
		currentSide = -currentSide;
		game.pop();
		if(currentSide==1){
			gameNotation.pop();
		}else{
			gameNotation[gameNotation.length-1][1] = "";
		}

		moveHistory.pop();
		pieceIds = game[game.length-1];
		setupBoard(pieceIds);
		updateStatus();
	}
}
function play(){
    var level = parseInt(document.getElementById("level").value);
	for(var i=0; i<=level; i++){
		bestMoves = findBestMoves(pieceIds, currentSide, i, -100, 100);
	}
	
	if(bestMoves.length>0){
		var bestMove = bestMoves[Math.floor(bestMoves.length*Math.random())];
		applyMove(bestMove[0]);
	}
	updateStatus();
	if(Object.keys(boardTable).length>1000000){
		boardTable = {};
	}
	if(Object.keys(moveTable).length>1000000){
		moveTable = {};
	}
	
	document.getElementById("pending").style.visibility = "hidden";
}

function findValidMoves(pieceIds, noCheckAllowed){
	var validMoves = [];
	for(var i=0; i<numSquares; i++){
		validMoves.push(findValidPieceMoves(pieceIds,getPosFromId(i),noCheckAllowed));
	}
	return validMoves;
}

function startGame(){
    init();
    doPlay();
}

function doPlay(){
    var compPlayer= document.getElementById("compPlayer").value;
    
    if(compPlayer==currentSide || compPlayer==2){
        document.getElementById("pending").style.visibility = "visible";
        setTimeout(play, 200);
    }else{
        document.getElementById("pending").style.visibility = "hidden";
    }
}

function groupPieceIdsByType(pieceIds){
	var types = [[],[],[],[],[],[]];
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]!=0){
			types[Math.abs(pieceIds[i]) - 1].push(i);
		}
	}
	return types;
}

function evaluateScore(pieceIds,validMoves, side){
	var scores = evaluateBoard(pieceIds, validMoves);
	var score;
	score = (scores[0] - scores[1])*side;	
	return score;
}

function findAllPieceMoves(position, pieceId){
	var pos = position;
	var typeId = Math.abs(pieceId);
	var pieceType = pieceTypes[typeId];
	var positions = [];
	var vectors;

	var possibleMove;
	var numPaths;
	switch(pieceType){
		case 'R': vectors = [[-1, 0], [0, 1], [0, -1], [1, 0]]; numPaths = 4; break;
		case 'B': vectors = [[-1, 1], [1, 1], [-1, -1], [1, -1]]; numPaths = 4; break;
		case 'Q': vectors = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]; numPaths = 8; break;
	}
	
	switch(pieceType){
		case 'R':
		case 'B':
		case 'Q':
			for(var i=0; i<numPaths; i++){
				pos = position;
				while(pos!=="--"){
					pos = adjustPosition(pos, vectors[i]);
					if(pos!=="--"){
						positions.push(pos);
					}
				}
			}
			break;
		case 'N':
			var options = [[2, 1],[1, 2],[-1, 2],[-2, 1],[-2, -1],[-1, -2],[1, -2],[2, -1]];
			for(var i=0; i<8; i++){
				possibleMove = adjustPosition(pos, options[i]);
				if(possibleMove!=="--"){
					positions.push(possibleMove);
				}
			}	
			break;
		case 'K':
			var options = [[1, 0],[1, 1],[0, 1],[-1, 1],[-1, 0],[-1, -1],[0, -1],[1, -1]];
			for(var i=0; i<8; i++){
				possibleMove = adjustPosition(pos, options[i]);
				if(possibleMove!=="--"){
					positions.push(possibleMove);
				}
			}	
			break;
		case 'P':
			var options = [[0, typeId],[0, 2*typeId],[-1, typeId],[1, typeId]];
			for(var i=0; i<4; i++){
				possibleMove = adjustPosition(pos, options[i]);
				if(possibleMove!=="--"){
					positions.push(possibleMove);
				}
			}	
			break;
	default:
    }	
	return positions;

}

function checkRelations(posArray, pieceType){
  var valid;
  var numPos = posArray.length;
	if(pieceType==='R'){
		valid = true;
		for(var i=1; i<numPos; i++){
			if(posArray[i][0]!=posArray[0][0]){valid=false; break;}
		}
		if(!valid){
			valid = true;
			for(var i=1; i<numPos; i++){
				if(posArray[i][1]!=posArray[0][1]){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType==='B'){
		valid = true;
		for(var i=1; i<numPos; i++){
			if(findCol(posArray[i][0]) + ~~(posArray[i][1])!=findCol(posArray[0][0]) + ~~(posArray[0][1])){valid=false; break;}
		}
		if(!valid){
			valid = true;
			for(var i=1; i<numPos; i++){
				if(findCol(posArray[i][0]) - posArray[i][1]!=findCol(posArray[0][0]) - posArray[0][1]){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType==='Q'){
		return checkRelations(posArray, 'R') || checkRelations(posArray, 'B');
	}else{
		return false;
	}
	
}

function posToNum(pos){
	if(pos!=="--"){return findCol(pos[0])+(pos[1]-1)*8;}
}

function generateMoveList(pieceIds, side, validMoves){
	var moveList = [];
	for(var i=0; i<validMoves.length; i++){
		var pos = getPosFromId(i);
		var pieceId = pieceIds[i]
		if(pieceId*side>0){
			var moves = validMoves[i][0];
			var captures = validMoves[i][1];
			for(var j=0; j<moves.length; j++){
				moveList.push({origin:pos, dest:moves[j], pieceId:pieceId});
			}
			for(var j=0; j<captures.length; j++){
				moveList.push({origin:pos, dest:captures[j], pieceId:pieceId});
			}
		}
	}
	return moveList;
}

function genControllingList(pieceIds){
	var controllingPieces = [];
	var allMoves;
	for(var i=0; i<numSquares; i++){
		controllingPieces[i] = [];
	}
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]!=0){
			allMoves = findAllPieceMoves(getPosFromId(i), pieceIds[i]);
			for(var j=0; j<allMoves.length; j++){
				controllingPieces[posToNum(allMoves[j])].push(i);
			}
		}
	}
	return controllingPieces;
}

function copyArr(arr){
	var arr2 = [];
	var arrLength = arr.length;
	for(var i=0; i<arrLength; i++){
		arr2[i] = arr[i];
	}
	return arr2;
}

function findBestMoves(pieceIds, side, depth, a, b){
	var bestScore = -1000;
	var bestMoves = [];
	var newScore;
	var replies;
	var pieceIds2 = [];
	var validMoves2 = [];
	var pieceId;
	var validMoves = findValidMoves(pieceIds, depth>1);
	var controllingList = genControllingList(pieceIds);
	var moveList = generateMoveList(pieceIds,side,validMoves);
	
	for(var i=0; i<moveList.length; i++){	
		pieceIds2 = copyArr(pieceIds);
		validMoves2 = copyArr(validMoves);
		makeMove(pieceIds2, moveList[i], controllingList, validMoves2);
		if(depth>1){
			replies = findBestMoves(pieceIds2,-side, depth-1, -b, -a);
			if(replies.length>0){
				newScore = - replies[0][1];
			}else{
				if(detectCheck(pieceIds, -side)){
					newScore = 1000;
				}else{
					newScore = 0;
				}
				
			}
		}else{
			newScore = evaluateScore(pieceIds2, validMoves2, side);
		}
		if(newScore>bestScore){
			bestScore = newScore;
			bestMoves = [];
		}
		if(newScore>=bestScore){
			bestMoves.push([moveList[i], newScore]);
		}
		if(bestScore>a){a = bestScore;}
		if(a>b){ return bestMoves;}				
	}
	return bestMoves;	
}
function updateStatus(){
	var scores = deepEvaluation(pieceIds);
	var notationStr = "";
	for(var i=0; i<gameNotation.length; i++){
		notationStr+=(i+1)+". "+gameNotation[i][0]+" "+gameNotation[i][1]+" ";
	}	
	document.getElementById("history").innerHTML = notationStr;
	document.getElementById("scores").innerHTML="White: "+scores[0]+", Black: "+scores[1];
	if(detectCheck(pieceIds,1) || detectCheck(pieceIds, -1)){
		if(scores[0]===0){
			document.getElementById("status").innerHTML="Checkmate! Black wins!";
		}else if(scores[1]===0){
			document.getElementById("status").innerHTML="Checkmate! White wins!";
		}else{
			document.getElementById("status").innerHTML="Check!";
		}
	}else{
		if(scores[0]===0 || scores[1]===0){
			document.getElementById("status").innerHTML="Stalemate!";
		}else{
			document.getElementById("status").innerHTML="";
		}
	}
}


function highlightMoves(rays){
	document.getElementById("moves").innerHTML="";
	var moves;
	for(var i=0; i<rays.length; i++){
		moves = rays[i];
		for(var j=0; j<rays[i].length;j++){
			var left = (8+52*findCol(moves[j][0])).toString();
			var top = (416 + 8-52*parseInt(moves[j][1])).toString();
			document.getElementById("moves").innerHTML+='<div style="position:absolute; left:'+left+'px;top:'+top+'px; height:52px; width:52px; background-color: rgba(255, 255, 0, 0.2)"></div>';
		}
	}
}
function getCell(x, y){
	var row = Math.ceil((416 - y+10)/52);
	var col = Math.floor((x-10)/52);
	return file[col]+row;
}
function findCol(c){
	switch(c){
		case "a": return 0;
		case "b": return 1;
		case "c": return 2;
		case "d": return 3;
		case "e": return 4;
		case "f": return 5;
		case "g": return 6;
		case "h": return 7;
	}
}


function makeMove(pieceIds, move, controllingList, validMoves){
	var captureMade = false;
	var id = move.pieceId;
	var side = Math.sign(id);
	var type = Math.abs(id);
	pieceIds[posToNum(move.origin)] = noPiece;
	var initPieces = controllingList[posToNum(move.origin)];
	for(var i=0; i<initPieces.length; i++){
		validMoves[initPieces[i]] = findValidPieceMoves(pieceIds, getPosFromId(initPieces[i]), false);
	}
	validMoves[posToNum(move.origin)] = [];
	if(pieceIds[posToNum(move.dest)]!==noPiece){
		captureMade = true;
	}
	pieceIds[posToNum(move.dest)] = move.pieceId;
	
	if(type===pieceToNum("P", 1) && !captureMade && Math.abs(move.origin[1] - move.dest[1])===1 && Math.abs(findCol(move.origin[0]) - findCol(move.dest[0]))===1){
		pieceIds[posToNum(move.dest[0]+move.origin[1])] = noPiece;
	}
	if(move.origin==="e"+move.origin[1] && move.dest==="c"+move.origin[1] && type===pieceToNum("K", 1)){
		pieceIds[posToNum("a"+move.origin[1])] = noPiece;
		pieceIds[posToNum("d"+move.origin[1])] = pieceToNum("R", side);
	}	
	if(move.origin==="e"+move.origin[1] && move.dest==="g"+move.origin[1] && type===pieceToNum("K", 1)){
		pieceIds[posToNum("h"+move.origin[1])] = noPiece;
		pieceIds[posToNum("f"+move.origin[1])] = pieceToNum("R", side);
	}
	if((side===-1 && move.dest[1]==="1") || (side===1 && move.dest[1]==="8")){
		if(type===pieceToNum("P",1)){
			pieceIds[posToNum(move.dest)] = pieceToNum("Q", side);
		}
	}
	var finalPieces = controllingList[posToNum(move.dest)];
	for(var i=0; i<finalPieces.length; i++){
		validMoves[finalPieces[i]] = findValidPieceMoves(pieceIds, getPosFromId(finalPieces[i]), false);
	}
	validMoves[posToNum(move.dest)] = findValidPieceMoves(pieceIds, move.dest, false);
}


function getNotation(pieceIds, move){
	var promotion = "";
	var finalPosId = pieceIds[posToNum(move.dest)];
	var capture = "";
	var check="";
	var typeId = Math.abs(move.pieceId);
	var side = Math.sign(move.pieceId);

	var pieceType = pieceTypes[typeId];
	var idLetters = pieceType;

	if(finalPosId!==noPiece){
		capture="x";
	}else{
		if(Math.abs(move.origin[1] - move.dest[1])===1 && Math.abs(findCol(move.origin[0]) - findCol(move.dest[0]))===1 && typeId===pieceToNum("P",1)){
			return move.origin[0]+"x"+move.dest+"e.p.";
		}
	}

	if(pieceType==="P"){
		if(capture==="x"){idLetters=move.origin[0];}else{idLetters="";}
		if(move.dest[1]=="1" || move.dest[1]=="8"){
			promotion="=Q";
		}
	}else{
		idLetters=pieceType;
	}

	if(pieceType=="R" || pieceType=="Q" || pieceType=="B" || pieceType=="N"){
		var moves;
		
		var initPositions = [];
		pieceIds[posToNum(move.dest)] = - move.pieceId;
		var capturePositions = findValidPieceMoves(pieceIds,move.dest,true)[1];
		for(var i=0; i<capturePositions.length; i++){
			if(Math.abs(pieceIds[posToNum(capturePositions[i])])===typeId && capturePositions[i]!==move.origin){
				initPositions.push(capturePositions[i]);
			}
		}		
		pieceIds[posToNum(move.dest)] = finalPosId;
		var sameFile = false;
		var sameRank = false;
		for(var i=0; i<initPositions.length; i++){
			if(initPositions[i][0]==move.origin[0]){
				sameFile = true;
			}
			if(initPositions[i][1]==move.origin[1]){
				sameRank = true;
			}
		}
		if(initPositions.length>0){
			if(!sameFile){idLetters+=move.origin[0];}
			else if(!sameRank){idLetters+=move.origin[1];}
			else{
				idLetters+=move.origin;
			}
		}
	}
	if(pieceType==="K" && move.origin[0]=="e"){
		if(move.dest[0]=="g"){
			return "O-O";
		}else if(move.dest[0]=="c"){
			return "O-O-O";
		}
	}
	var pieceIds2 = pieceIds.slice();
	makeMove(pieceIds2, move, genControllingList(pieceIds), findValidMoves(pieceIds, false));
	if(detectCheck(pieceIds2, -side)){
		if(deepEvaluation(pieceIds2)[0.5+0.5*side]==0){
			check="#";
		}else{
			check="+";
		}
	}
	return idLetters+capture+move.dest+promotion+check;
}


function applyMove(move){
	if(currentSide==1){
		gameNotation.push([getNotation(pieceIds, move),""]);
	}else{
		gameNotation[gameNotation.length-1][1] = getNotation(pieceIds, move);
	}
	makeMove(pieceIds, move, genControllingList(pieceIds), findValidMoves(pieceIds, false));
	moveHistory.push(move);
	currentSide = - currentSide;
	game.push(pieceIds.slice());
	setupBoard(pieceIds);
	updateStatus();
	doPlay();
}

function startMove(initPos, side){
	if(side===currentSide && !pendingMove){
		pendingMove = true;
		document.getElementById("piece-"+initPos).style.WebkitFilter='drop-shadow(1px 1px 0 yellow) drop-shadow(-1px 1px 0 yellow) drop-shadow(1px -1px 0 yellow) drop-shadow(-1px -1px 0 yellow)';
		var possibleRays = findValidPieceMoves(pieceIds, initPos, true);
		highlightMoves(possibleRays);
		document.addEventListener('mouseup', function fmove() {
			var cell = getCell(event.clientX,event.clientY);
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
					applyMove({pieceId:pieceIds[posToNum(initPos)], origin:initPos, dest:cell});
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

function validMove(pieceIds,move){
	var initPos = move.origin;
	var finalPos = move.dest;
	var pieceId = move.pieceId; 
	var j = pieceIds[posToNum(finalPos)];
	var valid = true;
	
	if(j*pieceId>0){
		return false;
	}
	pieceIds[posToNum(initPos)]=noPiece;
	pieceIds[posToNum(finalPos)]=pieceId;
	
	if(detectCheck(pieceIds, Math.sign(pieceId))){
		valid = false;
	}
	pieceIds[posToNum(initPos)] = pieceId;
	pieceIds[posToNum(finalPos)] = noPiece;
	
	if(j!==noPiece){
		pieceIds[posToNum(finalPos)] = j;
	}	
	return valid;
}

function findValidKingMoves(pieceIds, position, noCheckAllowed){
	numCalls.k++;
	var positions = [[],[]];
	var pos = position;
	var pieceId = pieceIds[posToNum(position)];
	var side = Math.sign(pieceId);
	var options = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
	var p, possibleMove;
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, options[i]);
		if(possibleMove!=="--"){
			p = pieceIds[posToNum(possibleMove)];
			if(!noCheckAllowed || validMove(pieceIds, {origin:position, dest:possibleMove, pieceId:pieceId})){
				if(p===noPiece){
					positions[0].push(possibleMove);
				}else if(p*pieceId<0){
					positions[1].push(possibleMove);
				}		
			}
		}
	}	
	var row = 4.5-side*3.5;
	if(pos==='e'+row && (!noCheckAllowed || !detectCheck(pieceIds, side))){
		if(pieceIds[posToNum('b'+row)]===noPiece && pieceIds[posToNum('c'+row)]===noPiece && pieceIds[posToNum('d'+row)]===noPiece && pieceIds[posToNum('a'+row)]===pieceToNum("R", side)){
			var kingLeftPos = adjustPosition(pos, [-2, 0]);
			if(validMove(pieceIds, {pieceId:pieceId, origin:position, dest:kingLeftPos})){
				pieceIds[posToNum(position)] = noPiece;
				pieceIds[posToNum(position)-1] = pieceId;
				if(!noCheckAllowed || !detectCheck(pieceIds, side)){
					positions[0].push(kingLeftPos);
				}
				pieceIds[posToNum(position)] = pieceId;
				pieceIds[posToNum(position)-1] = noPiece;
			}
		}
		if(pieceIds[posToNum('f'+row)]===noPiece && pieceIds[posToNum('g'+row)]===noPiece && pieceIds[posToNum('h'+row)]===pieceToNum("R", side)){
			var kingRightPos = adjustPosition(pos, [2, 0]);
			if(validMove(pieceIds, {pieceId:pieceId, origin:position, dest:kingRightPos})){
				pieceIds[posToNum(position)] = noPiece;
				pieceIds[posToNum(position)+1] = pieceId;
				if(!noCheckAllowed || !detectCheck(pieceIds, side)){
					positions[0].push(kingRightPos);
				}
				pieceIds[posToNum(position)] = pieceId;
				pieceIds[posToNum(position)+1] = noPiece;
			}
		}
	}
	return positions;
}

function findValidPawnMoves(pieceIds, position, noCheckAllowed){
	numCalls.p++;
	var positions = [[],[]];
	var pos = position;
	var posId = posToNum(pos);
	var pieceId = pieceIds[posId];
	var side = pieceId > 0 ? 1 : -1;

	if(pos[0]!=='a' && pieceIds[posId+8*side-1]*side < 0){
		var leftCapturePos = file[findCol(pos[0])-1]+(~~pos[1]+side);
		if(!noCheckAllowed || validMove(pieceIds, {origin:position, dest:leftCapturePos, pieceId:pieceId})){
			positions[1].push(leftCapturePos);	
		}
	}
	if(pos[0]!=='h' && pieceIds[posId+8*side+1]*side < 0){
		var rightCapturePos = file[findCol(pos[0])+1]+(~~pos[1]+side);
		if(!noCheckAllowed || validMove(pieceIds, {origin:position, dest:rightCapturePos, pieceId:pieceId})){
			positions[1].push(rightCapturePos);	
		}
	}
	if(pos[1]==4.5 + 0.5*side){
		var move = moveHistory[moveHistory.length-1];
		if(move!==undefined){
			var moveDest = move.dest;
			var moveOrigin = move.origin;
			if(move.pieceId == pieceToNum("P", -side) && (moveOrigin[1]=='7' && side===1 || moveOrigin[1]=='2' && side===-1)){
				var enPassantLeft = file[findCol(pos[0])-1]+pos[1];
				var enPassantRight = file[findCol(pos[0])+1]+pos[1];
				var enl = pieceIds[posToNum(enPassantLeft)];
				var enr = pieceIds[posToNum(enPassantRight)];
				
				if(enPassantLeft!=="--" && enl*side<0 && moveDest===enPassantLeft){
					leftCapturePos = adjustPosition(pos, [-1, side]);
					if(!noCheckAllowed){
						positions[1].push(leftCapturePos);
					}else{
						var initPos = position;
						pieceIds[posToNum(leftCapturePos)]=pieceId;
						pieceIds[posToNum(initPos)]=noPiece;
						pieceIds[posToNum(enPassantLeft)]=noPiece;
						if(!detectCheck(pieceIds, side)){
							positions[1].push(leftCapturePos);
						}
						pieceIds[posToNum(enPassantLeft)] = enl;	
						pieceIds[posToNum(leftCapturePos)]= noPiece;
						pieceIds[posToNum(initPos)]=pieceId;
					}
				}
				
				if(enPassantRight!=="--" && enr*side<0 && moveDest===enPassantRight){
					rightCapturePos = adjustPosition(pos, [1, side]);
					if(!noCheckAllowed){
						positions[1].push(rightCapturePos);
					}else{
						var initPos = position;
						pieceIds[posToNum(rightCapturePos)]=pieceId;
						pieceIds[posToNum(initPos)]=noPiece;
						pieceIds[posToNum(enPassantRight)]=noPiece;
						if(!detectCheck(pieceIds, side)){
							positions[1].push(rightCapturePos);
						}
						pieceIds[posToNum(enPassantRight)] = enr;	
						pieceIds[posToNum(rightCapturePos)]= noPiece;
						pieceIds[posToNum(initPos)]=pieceId;
					}
				}
			}
		}
	}	
	if(pieceIds[posId+8*side]===noPiece){
		var posRank = ~~pos[1];
		var posFile = pos[0];
		var forwardPos =  posFile+(posRank+side);
		if(!noCheckAllowed || validMove(pieceIds,{origin:pos, dest:forwardPos, pieceId:pieceId}, false)){
			positions[0].push(forwardPos);	
			if(pos[1]==4.5-2.5*side && pieceIds[posId+16*side]===noPiece){
				var doubleForwardPos = posFile+(posRank+2*side); 
				if(!noCheckAllowed || validMove(pieceIds,{origin:pos, dest:doubleForwardPos, pieceId:pieceId}, false)){
					positions[0].push(doubleForwardPos);	
				}
			}
		}else{
			if(pos[1]==4.5-2.5*side && pieceIds[posId+16*side]===noPiece){
				var doubleForwardPos = posFile+(posRank+2*side); 
				if(validMove(pieceIds,{origin:pos, dest:doubleForwardPos, pieceId:pieceId}, false)){
					positions[0].push(doubleForwardPos);	
				}
			}
		}
	}
	return positions;
}

function findValidKnightMoves(pieceIds, position, noCheckAllowed){
	numCalls.n++;
	var positions = [[],[]];
	var options = [[2, 1],[1, 2],[-1, 2],[-2, 1],[-2, -1],[-1, -2],[1, -2],[2, -1]];
	var p, possibleMove;
	var pos = position;
	var pieceId = pieceIds[posToNum(position)];
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, options[i]);
		if(possibleMove!=="--"){
			p = pieceIds[posToNum(possibleMove)];
			if(!noCheckAllowed || validMove(pieceIds,{origin:position, dest:possibleMove, pieceId:pieceId})){
				if(p===noPiece){
					positions[0].push(possibleMove);		
				}else if(p*pieceId<0){
					positions[1].push(possibleMove);	
				}
			}
		}
	}	
	return positions;
}

function findValidPieceMoves(pieceIds, position, noCheckAllowed){
	numCalls.moves++;
	var positions = [];
	var pieceId = pieceIds[posToNum(position)];
	var typeId = Math.abs(pieceId);
	var side = Math.sign(pieceId);
	var pieceType = pieceTypes[typeId];
	var vectors;
	var numPaths;
	switch(pieceType){
		case 'R': vectors = [[-1, 0], [0, 1], [0, -1], [1, 0]]; numPaths = 4; break;
		case 'B': vectors = [[-1, 1], [1, 1], [-1, -1], [1, -1]]; numPaths = 4; break;
		case 'Q': vectors = [[1, 0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]; numPaths = 8; break;
	}
	
	switch(pieceType){
		case 'R':
		case 'B':
		case 'Q':
			var pos = position;
			var p;
			positions.push([]);
			positions.push([]);
			for(var i=0; i<numPaths; i++){
				pos = position;
				p = noPiece;
				while(p===noPiece && pos!=="--"){
					pos = adjustPosition(pos, vectors[i]);
					if(pos!=="--"){
						p = pieceIds[posToNum(pos)];
						if(noCheckAllowed){		
							if(p===noPiece){
								if(validMove(pieceIds,{origin:position, dest:pos, pieceId:pieceId})){
									positions[0].push(pos);
								}
							}else if(p*side<0 && validMove(pieceIds,{origin:position, dest:pos, pieceId:pieceId})){
								positions[1].push(pos);
							}					
						}else{
							if(p===noPiece){
								positions[0].push(pos);
							}else if(p*side<0){
								positions[1].push(pos);
							}	
						}
					}
				}
			}
			break;
		case 'N':
			positions = findValidKnightMoves(pieceIds,position, noCheckAllowed);
			break;
		case 'K':
			positions = findValidKingMoves(pieceIds, position, noCheckAllowed);
			break;
		case 'P':
			positions = findValidPawnMoves(pieceIds, position, noCheckAllowed);
			break;
	default: return [];
	}	
	return positions;
}

function adjustPosition(pos, delta){
	var hash = posToNum(pos) + (delta[0]+2)*numSquares+(delta[1]+2)*320;
	var newPos;
	if(posTable[hash]==undefined){
		var colNum = findCol(pos[0])+delta[0];
		var rowNum = ~~(pos[1])+delta[1];
		
		if(colNum>=8 || colNum<0 || rowNum>8 || rowNum<=0){
			newPos = "--";
		}else{
			newPos = file[colNum]+rowNum;
		}
		posTable[hash] = newPos;
		return newPos;
	}else{
		return posTable[hash];
	}
}
function pieceValue(typeId){
	var pieceValues = [0, 1, 3, 3.25, 5, 9, 39.5]; 
	return pieceValues[typeId];
}
function evaluateBoard(pieceIds, validMoves){
	var hash = pieceIds.toString();
	numCalls.eval++;
	if(boardTable[hash]===undefined){
		var scores = [0,0];
		var mobilityScore = [0,0];
		var materialScore = [0,0];
		var possibleMoves;
		var pieceId;
		for(var i=0; i<numSquares; i++){
			pieceId = pieceIds[i]; 
			if(pieceId>0){
				possibleMoves = validMoves[i];
				mobilityScore[0]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[0]+= pieceValue(Math.abs(pieceId));
			}else if(pieceId<0){
				possibleMoves = validMoves[i];
				mobilityScore[1]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[1]+= pieceValue(Math.abs(pieceId));
			}
		}
		scores[0] = mobilityScore[0]*0.05+materialScore[0];
		scores[1] = mobilityScore[1]*0.05+materialScore[1];
		numCalls.evalM++;
		boardTable[hash] = scores;
    	return scores;
	}else{
		var scores = boardTable[hash];
		return scores;
	}
}
function deepEvaluation(pieceIds){
	var scores = [0, 0];
	var mobilityScore = [0,0];
	var materialScore = [0,0];
	var possibleMoves;
	for(var i=0; i<numSquares; i++){
			if(pieceIds[i]>0){
				possibleMoves = findValidPieceMoves(pieceIds, getPosFromId(i), true);
				mobilityScore[0]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[0]+= pieceValue(Math.abs(pieceIds[i]));
			}else if(pieceIds[i]<0){
				possibleMoves = findValidPieceMoves(pieceIds, getPosFromId(i), true);
				mobilityScore[1]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[1]+= pieceValue(Math.abs(pieceIds[i]));
			}
		}
	if(mobilityScore[0]===0){
		materialScore[0] = 0;
		if(!detectCheck(pieceIds, 1)){
			mobilityScore[1]=0;
			materialScore[1]=0;
		}
	}
	if(mobilityScore[1]===0){
		materialScore[1] = 0;
		if(!detectCheck(pieceIds, -1)){
			mobilityScore[0]=0;
			materialScore[0]=0;
		}
	}
	scores[0] = mobilityScore[0]*0.05+materialScore[0];
	scores[1] = mobilityScore[1]*0.05+materialScore[1];
	return scores;
}

function findControllingPieces(pieceIds, boardTypes, position){
	var controllingPieces = [];
	var rayPieceTypes = ["R", "B", "Q"];
	numCalls.fcp++;
	var threatType, pieceType, possibleThreats, possibleThreats2, numThreats;
	var pieceId = pieceIds[posToNum(position)];
	for(var j=0; j<3; j++){
		pieceType = rayPieceTypes[j];
		var valid = false;
		var piecesOfType = boardTypes[pieceToNum(pieceType,1)];
		for(var i=0; i<piecesOfType.length; i++){
			if(checkRelations([piecesOfType[i], position], pieceType)){
				valid = true;
			}
		}
		if(valid){
			pieceIds[posToNum(position)] = pieceToNum(pieceType,1);
			possibleThreats = findValidPieceMoves(pieceIds, position,false)[1];
			pieceIds[posToNum(position)] = pieceToNum(pieceType,-1);
			possibleThreats2 = findValidPieceMoves(pieceIds, position,false)[1];
			pieceIds[posToNum(position)] = pieceId;
			numCalls.fcpm++;
			for(var i=0; i<possibleThreats.length; i++){
				pieceId = pieceIds[posToNum()];
				if(pieceId!==noPiece){
					threatType = pieceTypes[Math.abs(pieceId)];
					if(threatType===pieceType){
						controllingPieces.push(possibleThreats[i]);
					}
				}
			}
			
			for(var i=0; i<possibleThreats2.length; i++){
				pieceId = pieceIds[posToNum(possibleThreats2[i])];
				if(pieceId!==noPiece){
					threatType = pieceTypes[Math.abs(pieceId)];
					if(threatType===pieceType){
						controllingPieces.push(possibleThreats2[i]);
					}
				}
			}

		}
	}
	var neighbours = findAllPieceMoves(position, pieceToNum("K",1));
	for(var i=0; i<neighbours.length; i++){
		pieceId = pieceIds[posToNum(neighbours[i])];
		if(pieceId!==noPiece){
			threatType = pieceTypes[Math.abs(pieceId)];
			if(threatType==='K'){
				controllingPieces.push(pieceId);
			}
		}
	}

	var neighbours = findAllPieceMoves(position,pieceToNum("N",1));
	for(var i=0; i<neighbours.length; i++){
		pieceId = pieceIds[posToNum(neighbours[i])];
		if(pieceId!==noPiece){
			if(pieceTypes[Math.abs(pieceId)]==='N'){
				controllingPieces.push(pieceId);
			}
		}
	}

	var pawnMoves1 = findAllPieceMoves(position, pieceToNum("P",1));
	var pawnMoves2 = findAllPieceMoves(position, pieceToNum("P",-1));
	for(var i=0; i<pawnMoves1.length; i++){
		pieceId = pieceIds[posToNum(pawnMoves1[i])];
		if(pieceId!==noPiece){
			threatType = pieceTypes[Math.abs(pieceId)];
			if(threatType==='P' && pieceId>0){
				controllingPieces.push(pieceId);
			}
		}
	}
	for(var i=0; i<pawnMoves2.length; i++){
		pieceId = pieceIds[posToNum(pawnMoves2[i])];
		if(pieceId!==noPiece){
			threatType = pieceTypes[Math.abs(pieceId)];
			if(threatType==='P' && pieceId<0){
				controllingPieces.push(pieceId);
			}
		}
	}

	return controllingPieces;
}

function findPieceId(pieceIds, pieceId){
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]===pieceId){return i;}
	}
}

function detectCheck(pieceIds,side){
	numCalls.check++;
	var possibleThreats, numThreats;
	var posId = findPieceId(pieceIds, pieceToNum("K", side));
	if(posId==undefined){
		return false;
	}
	var pos = getPosFromId(posId);
	var pLeft = adjustPosition(pos, [-1, side]);
	var pRight = adjustPosition(pos, [1, side]);
	if((pRight!=="--" && pieceIds[posToNum(pRight)] == pieceToNum("P", -side)) || (pLeft!=="--" && pieceIds[posToNum(pLeft)] == pieceToNum("P", -side))){
		return true;
	} 
	var moves = findAllPieceMoves(pos,pieceToNum("K",side));
	for(var i=0; i<moves.length; i++){
		if(pieceIds[posToNum(moves[i])]==pieceToNum("K", -side)){
			return true;
		}
	}

	var rayPieceTypes = ["R", "B", "N"];
	var threatType, pieceId, pieceType, testPiece;
	for(var j=0; j<3; j++){
		pieceType = rayPieceTypes[j];
		pieceIds[posId] = pieceToNum(pieceType, side);
		possibleThreats = findValidPieceMoves(pieceIds, pos, false)[1];
		pieceIds[posId] = pieceToNum("K", side);
		numThreats = possibleThreats.length;
		for(var i=0; i<numThreats; i++){
			pieceId = pieceIds[posToNum(possibleThreats[i])];
			if(pieceId!==noPiece){
				threatType = pieceTypes[Math.abs(pieceId)];
				if(threatType===pieceType || (pieceType!=='N' && threatType==='Q')){
					return true;
				}
			}
		}
	}
	return false;
}

function getPosFromId(id){
	return file[id&7]+((id>>3)+1);
}

function setupBoard(pieceIds){
	document.getElementById("pieces").innerHTML="";
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]!=0){
			addPiece(pieceIds[i], getPosFromId(i));
		}
	}
}
function addPiece(pieceId, position){
	var left = (12 + 52*findCol(position[0])).toString();
	var top = (8*52 + 12 - 52*parseInt(position[1])).toString();
	var color;
	if(pieceId<0){
		color = "b";
	}else{
		color = "w";	
	}
	var image = pieceTypes[Math.abs(pieceId)].toLowerCase()+color;
	document.getElementById("pieces").innerHTML+='<img src="'+image+'.png" id="piece-'+position+'" style="position:absolute; left:'+left+'px;top:'+top+'px;'
	+'" onclick="startMove(\''+position+'\','+Math.sign(pieceId)+')"></img>';
} 