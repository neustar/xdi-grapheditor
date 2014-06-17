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
function deleteCommand () {
    if (hasSelectedNodes()) {
        selected_nodes.forEach(function (d) {
            removeNode(d);
            removeLinksOfNode(d);
        })
        clearSelectedNodes();
        restart();
    }

    if (hasSelectedLinks()) {
        selected_links.forEach(function (d) {removeLink(d)});
        clearSelectedLinks();
        restart();
    }
}

function setDoubleArrowCommand () {
    if (hasSelectedLinks()) {
        // set link direction to both left and right
        selected_links.forEach(function(d) {
            d.left = true;
            d.right = true;
        });
        
        restart();
    }
}

// Toggling a link relationship status on/off
function setRelationCommand () {
    if (hasSelectedLinks()) {

        selected_links.forEach(function(d) {
            setLinkIsRel(d,!d.isRel);
        });
        restart();
    }
}

// Setting a node as root, updating graphics too.
function setRootNodeCommand () {
    if (hasSelectedNodes()) {
    
        selected_nodes.forEach(function (d) {
            setNodeIsRoot(d,!d.isRoot)
        })
        
        restart();
    }
}

function editNameCommand(){
    if (hasSelectedLinks()) {
        selected_links.forEach(function(d) {
            var existinglabel = d.name;
            var labelval = prompt("Please enter a new value for this label", existinglabel);
            setLinkLabel(d,labelval);
        });
        restart(false,false);
    }
    if (hasSelectedNodes()) {
        selected_nodes.forEach(function(d) {
        var existingname = d.name;
        var nodename = prompt("Please enter a new name for this node", existingname);
        setNodeLabel(d,nodename);
        })
        restart(false,false);
    }
}

// Inversing the link direction
function invertLinkCommand () {
    if (hasSelectedLinks()) {
        selected_links.forEach(function(d) {
            inverseLinkDirection(d);
        });
        restart();
    }
}

// Changing the Node type to literal or back to the default contextual 
function setLiteralNodeCommand () {
    if (hasSelectedNodes()) {
        selected_nodes.forEach(function(d) {
            var newType = "";
            if (d.type !== "literal") 
                newType = "literal";
            else
                newType = "context"
            d.type = newType;
        })
        
        restart();
    }
}


function fixNodeCommand () {
    if(hasSelectedNodes())
        selected_nodes.forEach(function(d) {toggleNodeFixed(d);});
}


function createNodeByClick () {
    var nodename = prompt("Please enter the node's name", "");
    if(nodename === null)
        return;
    
    var ind = findNodeIndex(jsonnodes, nodename);
    if (ind) {
        if (nodename !== "")
        // Name already taken
            alert("Node already exists!");
        return;
    }
    var newnode = addNode(nodename,false,false);
    var point = d3.mouse(svg.node());
    newnode.x = point[0];
    newnode.y = point[1];
    restart();

}


function startDragLine(){
    // reposition drag line
    drag_line
            .classed("hidden",false)
            .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);
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
    }
}

function startDrag(){
    d3.selectAll('.node')
    .call(nodeDrag);
}

function showShortName (HTMLElement) {
    d3.select(HTMLElement)
        .select("text")
        .text(function(d) { return d.shortName; })
}

function showTrimmedName (HTMLElement) {
    d3.select(HTMLElement)
        .select("text")
        .text(function(d) { return trimString(d.shortName,NODE_TEXT_MAX_LENGTH); })
}

function toggleNodeFixed (node) {
    setNodeFixed(node,!node.fixed);
}

function setNodeFixed (node, newValue) {
    node._fixed = newValue; //Record the fixed is set intentionally
    node.fixed =newValue;
    restart(false,false)
}