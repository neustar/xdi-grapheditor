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
function initializeCommands(){
    backupData = [null];
    currentBackupPos = 0;
    updateUndoRedoMenu();
}

//
// File
//

function clearGraphCommand () {
    if(_.isEmpty(globalNodes)&&_.isEmpty(globalLinks))
        return;
    backup();
    clearGraph();
}

//
// Edit
//

//  Undo/Redo

// Atomic operation for restore graph to a backed-up status
function restoreTo(backupPos){
    if(_.isEmpty(backupData))
        return;
    globalNodes = [];
    globalLinks = [];
    globalNodeLinkMap = {};
    pasteFrom(backupData[backupPos]);
    updateUndoRedoMenu();
    restart();
}

// Atomic operation to create a backup of current status
function backup(){
    backupData = backupData.slice(0,currentBackupPos + 1);
    backupData[currentBackupPos] = cloneNodeLinks(globalNodes,globalLinks);
    backupData.push(null);
    currentBackupPos = backupData.length - 1;
    updateUndoRedoMenu();
}


function undo(){
    if(currentBackupPos > 0)
    {
        if(backupData[currentBackupPos]==null)
            backupData[currentBackupPos] = cloneNodeLinks(globalNodes,globalLinks);
        currentBackupPos --;
        restoreTo(currentBackupPos);
    }
    
}

function redo() {
    if(currentBackupPos < backupData.length - 1)
    {
        currentBackupPos ++;
        restoreTo(currentBackupPos);
    }
}


function updateUndoRedoMenu () {
    d3.select('#undoMenuItem').classed('disabled',currentBackupPos===0);
    d3.select('#redoMenuItem').classed('disabled',currentBackupPos+1===backupData.length);
}

//  Copy & Paste

function cutSelection () {
    if(!hasSelectedNodes()) //Cannot copy links if there is no nodes
        return;
    backup();

    cutObjectsToClipBoard(selected_nodes,selected_links);
    clearAllSelection();
    
    restart();
}

function copySelection () {
    if(!hasSelectedNodes()) //Cannot copy links if there is no nodes
        return;

    copyObjectsToClipBoard(selected_nodes,selected_links);
    updateMenuItemAbility ();
}

function pasteToGraph () {
    if(_.isEmpty(clipBoard.nodes)) //Cannot paste if there is no nodes. Links cannot be pasted if there is no nodes two.
        return;
    backup();

    pasteFromClipBoard();
    clearAllSelection();
    
    restart();
}

function duplicateSelection () {
    if(!hasSelectedNodes()) //Cannot copy links if there is no nodes
        return;
    backup();
    duplicateObjects(selected_nodes,selected_links);
    restart();
}

//  Misc.

function deleteCommand () {
    var performed = hasSelectedLinks()||hasSelectedNodes();
    if(performed)
        backup();

    if (hasSelectedNodes()) {
        selected_nodes.forEach(function (d) {
            removeNode(d);
            // removeLinksOfNode(d);
        })
        clearSelectedNodes();
    }

    if (hasSelectedLinks()) {
        selected_links.forEach(function (d) {removeLink(d)});
        clearSelectedLinks();
    }

    if(performed)
        restart();
}

function editNameCommand(){
    var performed = hasSelectedLinks()||hasSelectedNodes();
    if(performed)
        backup();

    if (hasSelectedLinks()) {
        selected_links.forEach(function(d) {
            var existinglabel = d.shortName;
            var labelval = prompt("Please enter a new value for this label", existinglabel);
            setLinkLabel(d,labelval);
        });
        updateLinkElement();
    }
    if (hasSelectedNodes()) {
        selected_nodes.forEach(function(d) {
        var existingname = d.shortName;
        var nodename = prompt("Please enter a new name for this node", existingname);
        setNodeLabel(d,nodename);
        })
        updateNodeElement();
    }
}

function selectAll () {
    if(!lastDrawData)
        return;
    
    //Only select visible nodes
    setSelectedNodes(lastDrawData.nodes);
    setSelectedLinks(lastDrawData.links);
    updateSelectionClass();
}

//
// View
//

//  Layout

function changeLayoutCommand (newLayout) {
    if(currentLayout!=null)
        currentLayout.exit();
    var r = getCommonRoots()[0];
    switch (newLayout){
        case Layouts.Force:
            currentLayout = new ForceLayout();
            zoomElementToPos(r,[svgWidth/3,svgHeight/3],1);
            break;
        case Layouts.Tree:
            currentLayout = new TreeLayout();
            resetZoom();
            break;
        default:
            console.log("Change Layout Error")
    }

    restart(true,false);
}

function resetLayoutCommand () {
    if(currentLayout!=null)
    {
        currentLayout.resetLayoutParameter();
        restart(true,false);
        showMessage("Layout Reseted");
    }
}

function updateLayoutParameterCommand () {
    if(currentLayout!=null)
    {
        currentLayout.updateLayoutParameter();
        restart(true,false);
    }
    
}

//  Zoom

function zoomInCommand () {
    zoomByScaleDelta(ZOOM_COMMAND_SCALE_DELTA,[svgWidth/2,svgHeight/2],true);
}

function zoomOutCommand () {
    zoomByScaleDelta(-ZOOM_COMMAND_SCALE_DELTA,[svgWidth/2,svgHeight/2],true);
}

//  Rotation

function rotateLeftCommand () {
    rotateView(90,true);
}

function rotateRightCommand () {
    rotateView(-90,true);
}

//
// Node
//

function createNodeByClick () {
    var nodename = prompt("Please enter the node's name", "");
    if(nodename === null)
        return;
    
    var nodeFound = findNode(globalNodes, nodename, lastGraphId);
    if (nodeFound) {
        if (nodename !== "")
        // Name already taken
            showMessage("Node already exists");
        return;
    }
    backup();
    var newnode = addNode(nodename,null, lastGraphId);
    var point;
    if(d3.event instanceof MouseEvent)
        point = d3.mouse(svg.node());
    else if (d3.event && isTouchScreen)
        point = d3.touches(svg.node())[0];
    else
        point = [svgWidth/2,svgHeight/2];
    newnode.x = x.invert(point[0]);
    newnode.y = y.invert(point[1]);
    restart();

}

function fixNodeCommand () {
    if(hasSelectedNodes())
    {
        backup();
        selected_nodes.forEach(function(d) {toggleNodeFixed(d);});
        showMessage("Position fixed/unfixed");
    }
}

function setNodeFixed (node, newValue) {
    node._fixed = newValue; //Record the fixed is set intentionally
    node.fixed = newValue;
    restart(false,false);
}

function toggleNodeFixed (node) {
    setNodeFixed(node,!node.fixed);
}

function foldNodeCommand (isDirectDescendantsOnly) {
    if(hasSelectedNodes())
    {
        backup();
        selected_nodes.forEach(function(d) { return toggleFoldNode(d,isDirectDescendantsOnly);})
    }
}

function setFoldNode (node,newValue,isDirectDescendantsOnly) {
    node.isFolded = newValue;

    //Set all children folded if only expand direct descendants
    if(isDirectDescendantsOnly && !node.isFolded && node.children != null)
    {
        node.children.forEach(function (d) {
            if(!_.isEmpty(d.children)&&!findLink(node,d).isRelation)
                d.isFolded = true;
        })
    }
    
    restart();    
}

function toggleFoldNode(node,isDirectDescendantsOnly){
    setFoldNode(node,!node.isFolded,isDirectDescendantsOnly);
}

function expandAllNodes(){
    backup();
    globalNodes.forEach(function  (d) {
        d.isFolded = false;
    })
    restart();
}


// Changing the Node type to literal or back to the default contextual 
function setLiteralNodeCommand () {
    if (hasSelectedNodes()) {
        backup();
        selected_nodes.forEach(function(d) {
            setNodeIsLiteral(d,!d.isLiteral())
        })
        
        restart();
    }
}

// Setting a node as root, updating graphics too.
function setRootNodeCommand () {
    if (hasSelectedNodes()) {
        backup();
        selected_nodes.forEach(function (d) {
            setNodeIsRoot(d,!d.isRoot());
        })
        
        restart();
    }
}

//
// Link
//

//Enter the edit mode user can drag from one node to another. No need to press Shift.
function createNewLinkCommand () {
    // isCreatingDragLine = true;
    updateMode(Mode.EDIT);
    showMessage("Drag from one node to create link", 3000);
}

// Inversing the link direction
function invertLinkCommand () {
    if (hasSelectedLinks()) {
        backup();
        selected_links.forEach(function(d) {
            inverseLinkDirection(d);
        });
        
        restart();
    }
}

function setDoubleArrowCommand () {
    if (hasSelectedLinks()) {
        // set link direction to both left and right
        backup();
        selected_links.forEach(function(d) {
            if(d.left&&d.right)
                d.left = false
            else
            {
                d.left = true;
                d.right = true;
            }
        });
        
        restart();
    }
}


// Toggling a link relationship status on/off
function setRelationCommand () {
    if (hasSelectedLinks()) {
        backup();
        selected_links.forEach(function(d) {
            setLinkIsRel(d,!d.isRelation);
        });

        restart();
    }
}

//  Drag Line


function startDragLine(){
    // reposition drag line
    drag_line
        .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y) //+ 'L' + mousedown_node.x + ',' + mousedown_node.y)
        .classed("hidden",false);
    isDraggingLine = true;
    restart(true,false);
}

function updateDragLine(){
    if(isDraggingLine && mousedown_node && curMousePos != null)
    {
        var startPos = {x:mousedown_node.x,y:mousedown_node.y};
        var endPos = curMousePos;
        drag_line.attr('d', 'M' + x(startPos.x) + ',' + y(startPos.y) + 'L' +
                (endPos.x) + ',' + (endPos.y));
    }   
}


function endDragLine(){
    if (isDraggingLine) {
        drag_line.classed("hidden",true)
        isDraggingLine = false;
        // isCreatingDragLine = false;
        if(!isTouchScreen&&d3.event && !d3.event.shiftKey)
            updateMode(Mode.BROWSE);
    }
}

//
// For Mouse Hover
//

function showFullName (selector) {
    d3.select(selector)
        .select("text")
        .text(function(d) { return d.fullName; });
}

function showShortName (selector) {
    d3.select(selector)
        .select("text")
        .text(function(d) { return d.shortName; });
}

function showTrimmedName (selector) {
    d3.select(selector)
        .select("text")
        .text(function(d) { return trimString(d.shortName,NODE_TEXT_MAX_LENGTH); });
}

//
// Menu enable/disable
//

function setMenuItemAbility (classSelector,isEnabled) {
    d3.select(classSelector)
        .classed('disabled',isEnabled);
}

function updateMenuItemAbility () {
    d3.selectAll('.menu-item.selection').classed('disabled',!hasSelectedNodes()&&!hasSelectedLinks());
    d3.selectAll('.menu-item.selection.need-node').classed('disabled',!hasSelectedNodes());
    d3.selectAll('.menu-item.selection.need-link').classed('disabled',!hasSelectedLinks());

    d3.selectAll('#pasteCommand').classed('disabled',isClipBoardEmpty());
    d3.selectAll('.menu-item.need-content').classed('disabled',isGraphEmpty());
}

//
// Legend
//

function toggleVisibility (button) {
    var name = d3.select(button).attr("name");

    var value = d3.select("#mainCanvas")
        .classed("hide_"+name);
    
    d3.select("#mainCanvas")
        .classed("hide_"+name,!value);
    
    d3.select(button).classed("off",!value);
}
