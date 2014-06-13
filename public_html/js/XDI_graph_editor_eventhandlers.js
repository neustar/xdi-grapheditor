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

function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_link = null;
}

function mousemoveOnSVG() {
    var pos = d3.mouse(svg.node()); //use svg[0][0] to get the HTML element svg, instead of the d3 element of svg.
    curMousePos = {x:pos[0],y:pos[1]};
    
    if(isDraggingLine)
        updateDragLine();
    else if (isPanning)
        updatePanView([curMousePos.x,curMousePos.y])
}

function mousedownOnSVG() {

    lastMousePos = d3.mouse(svg.node());

    if (isPanning || isDraggingLine)
        return;

    if(d3.event.altKey)
    {
        startPanView();
        return;
    }

    // if (d3.event.shiftKey || mousedown_node || mousedown_link || isPanning || isDraggingLine)
    //     return;

    if(d3.event.button == 0 && d3.event.shiftKey) // is left click with shift
    {
        createNodeByClick();
        return;
    }

    if(d3.event.srcElement == svg.node())
    {
        clearAllSelection();
    }
}

function clearAllSelection () {
    selected_node = null;
    selected_link = null;
    restart(false,false);
}

function mouseupOnSVG() {
    if(isDraggingLine)
        endDragLine();
    else if (isPanning)
        endPanView();
    

    resetMouseVars();
}


function mousewheelOnSVG () {  
    if(d3.event==null || !d3.event.altKey)
        return;
    var currentScale = zoom.scale()
    
    if(d3.event.wheelDelta > 0)
        currentScale += MOUSE_WHEEL_SCALE_DELTA;
    else if (d3.event.wheelDelta < 0)
        currentScale -= MOUSE_WHEEL_SCALE_DELTA;
    
    mousePos = d3.mouse(svg.node())
    scaleView(mousePos,currentScale)
}



function keydownOnSVG() {
    
    // Ignore if dialog box is displayed.
    if (suspendkeylistening)
        return;
    

    if(d3.event.srcElement == d3.select("#searchText").node())
        return;
    
    lastKeyDown = d3.event.keyCode;


    switch (d3.event.keyCode) {
        case 8: // backspace
        case 46: // delete
            d3.event.preventDefault(); //Otherwise will trigger "Back" in browser
            if (selected_node) {
                removeNode(selected_node);
                removeLinksOfNode(selected_node);
            } else if (selected_link) {                
                removeLink(selected_link)
            }
            selected_link = null;
            selected_node = null;

            restart();
            break;
            
        case 16://shift
            updateStatus(null,null,true);
            break;

        case 66: // B
            if (selected_link) {
                // set link direction to both left and right
                selected_link.left = true;
                selected_link.right = true;
                restart();
            }
            
            break;
            
        case 82: // R
            // toggling a link relationship status on/off
            if (selected_link) {
                setLinkIsRel(selected_link,!selected_link.isRel);
                restart();
            } else if (selected_node) {
            // or setting a node as root // updating graphics too.
                setNodeIsRoot(selected_node,!selected_node.isRoot)
                restart();
            }
            break;
            
        case 13: // Enter - update the labels of selected object
            if (selected_link) {
                var existinglabel = selected_link.name;
                var labelval = prompt("Please enter a new value for this label", existinglabel);
                setLinkLabel(selected_link,labelval);
                restart(false,false);    
            } else if (selected_node) {
                var existingname = selected_node.name;
                var nodename = prompt("Please enter a new name for this node", existingname);
                setNodeLabel(selected_node,nodename);
                restart(false,false);
            }
            
            
            break;
        case 76: // L
            // Inversing the link direction
            if (selected_link) {
                inverseLinkDirection(selected_link);
                restart();
            } else if (selected_node) {
                // changing the Node type to literal or
                // back to the default contextual  
                var newType = "";
                if (selected_node.type !== "literal") 
                    newType = "literal";
                else
                    newType = "context"
                selected_node.type = newType;
                restart();
            }
            
            break;
        case 70: // F
            if(selected_node)
                toggleNodeFixed(selected_node);
            break;
    }
}

function keyupOnSVG() {

    // shift
    switch(d3.event.keyCode){
        case 16:
            startDrag();
            updateStatus(null,null,false);
            break;
    }
}

function mousedownOnNodeHandler(d){
    if (d3.event.altKey)
        return;

    // if (d3.event.shiftKey || d3.event.altKey)
    //     return;
    mousedown_node = d;
    // if (mousedown_node === selected_node)
    //     selected_node = null;
    // else
        selected_node = mousedown_node;
    selected_link = null;

    restart(false,false);

    if(d3.event.shiftKey)
        startDragLine();
    
}

function mouseupOnNodeHandler(d) {
    if (!mousedown_node)
        return;
    
    mouseup_node = d;

    if(isDraggingLine)
    {
        endDragLine();
    
        if (mouseup_node === mousedown_node) {
            resetMouseVars();
            return;
        }
        d3.select(this).attr('transform', '');
        
        // add link to graph (update if exists)
        // NB: links are strictly source < target; arrows separately specified by booleans
        var source, target, direction;
        source = mousedown_node;
        target = mouseup_node;
        var link = addLinkBetweenNodes(source,target,false,true);
        // select new link
        selected_link = link;
        selected_node = null;
        restart();
    }
}

function mouseenterOnLinkHandler (d) {
    showShortName(this);   
}

function mouseleaveOnLinkHandler (d) {
    showTrimmedName(this);
}

function mouseenterOnNodeHandler (d) {
    showShortName(this);   
}

function mouseleaveOnNodeHandler (d) {
    showTrimmedName(this);
}



function dblclickOnNodeHandler(d){
    toggleFoldNode(d);   
}


function mousedownOnLinkHandler(d) {
    if (d3.event.shiftKey)
        return;

    // select link
    mousedown_link = d;
    if (mousedown_link === selected_link)
        selected_link = null;
    else
        selected_link = mousedown_link;
    selected_node = null;
    restart(false,false);
}




function createNodeByClick () {
    var nodename = prompt("Please enter the node's name", "");
    if(nodename === null)
        return;
    
    var ind = findNodeIndex(jsonnodes, nodename);
    if (ind !== null) {
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