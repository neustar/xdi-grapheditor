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

//Atomic CLONE operation for cut, copy, paste, duplicate
//Clone node and links and redirect links to connect new nodes
function cloneNodeLinks (nodes,links, willKeepSameId) {             
     var nodeIdDict = {}; // {orignal node id: new node}
    
    var result = {nodes: [], links: []};
    var oldLastNodeId = lastNodeId, oldLastLinkId = lastLinkId;
    nodes.forEach(function  (d) {
        var nd = addNode(d.name, d.shortName, lastGraphId,true);
        if(willKeepSameId)
            nd.id = d.id;
        nd.x = d.x;
        nd.y = d.y;
        result.nodes.push(nd);
        nodeIdDict[d.id] = nd;
    })

    if(willKeepSameId)
        lastNodeId = oldLastNodeId;

    if(links==null)
        return;
    
    var newLinks = [];
    links.forEach(function(d) { 
        var newSource = nodeIdDict[d.source.id];
        var newTarget = nodeIdDict[d.target.id];
        
        if(!(newSource && newTarget)) //ignore the links without both of its node copied
            return;

        var nd = addLink(newSource,newTarget,d.name,d.left,d.right,d.isRelation,d.shortName,true);

        if(willKeepSameId)
            nd.id = d.id;
        result.links.push(nd);
    })    

    if(willKeepSameId)
        lastLinkId = oldLastLinkId;

    return result;
}

function copyObjectsToClipBoard(nodesToCopy, linksToCopy) {
   clearClipBoard();
   clipBoard = cloneNodeLinks(nodesToCopy,linksToCopy,true);
}

function pasteFrom(source, willKeepSameId)
{   
    //Clone new copies from clipboard to support multiple paste.
    var res = cloneNodeLinks(source.nodes,source.links,willKeepSameId);

    //Add nodes and links to the global arrays
    globalNodes = globalNodes.concat(res.nodes);
    globalLinks = globalLinks.concat(res.links);
    res.links.forEach(function(d) { addLinkToMap(d.source,d.target,d);});
}

function pasteFromClipBoard () {
    lastGraphId ++;
    pasteFrom(clipBoard)
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
