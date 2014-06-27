/* 
The MIT License (MIT)

Copyright (c) 2014 Neustar Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/



function copyObjectsToClipBoard(nodesToCopy, linksToCopy) {
    var nodeIDDict = {}; // {orignal node id: new node}
    
    lastGraphID ++;
    clipBoard = {nodes: [], links: []};

    nodesToCopy.forEach(function  (d) {
        var nd = addNode(d.name, d.shortName, lastGraphID,false);    
        clipBoard.nodes.push(nd);
        nodeIDDict[d.id] = nd;
        nd.x = d.x;
        nd.y = d.y;
    })

    if(linksToCopy==null)
    	return;
    
    var newLinks = [];
    linksToCopy.forEach(function(d) { 
        var newSource = nodeIDDict[d.source.id];
        var newTarget = nodeIDDict[d.target.id];
        
        if(!(newSource && newTarget)) //ignore the links without both of its node copied
            return;

        var nd = addLink(newSource,newTarget,d.name,d.left,d.right,d.isRelation,d.shortName,false);
        clipBoard.links.push(nd);
    })    
}

function pasteFromClipBoard () {
	jsonnodes = jsonnodes.concat(clipBoard.nodes);
	jsonlinks = jsonlinks.concat(clipBoard.links);

	clipBoard.links.forEach(function(d) { addLinkToMap(d.source,d.target,d);});
	clearClipBoard();
}

function duplicateObjects (nodesToCopy,linksToCopy) {
	copyObjectsToClipBoard(nodesToCopy,linksToCopy);
	pasteFromClipBoard();
}

function cutObjectsToClipBoard (nodesToCut,linksToCut) {
	copyObjectsToClipBoard(nodesToCut,linksToCut);
	
	if(!_.isEmpty(nodesToCut))
		nodesToCut.forEach(function(d) { removeNode(d); })
	if(!_.isEmpty(nodesToCut))
		linksToCut.forEach(function(d) { removeLink(d); })
}
function clearClipBoard () {
	clipBoard = {nodes: [], links: []};
}

function isClipBoardEmpty () {
    return _.isEmpty(clipBoard.nodes); //Can paste only when there is node. There shouldn't have only links in clipboard
}