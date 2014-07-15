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
        updatePanView([curMousePos.x,curMousePos.y]);
}

function mousedownOnSVG() {
    // console.log("mousedownOnNodeHandler");
    // d3.event.stopPropagation();
    if(!d3.event.button === 0 ) //Only react to left click
        return;

    lastMousePos = d3.mouse(svg.node());

    if (isPanning || isDraggingLine)
        return;

    if(d3.event.altKey)
    {
        startPanView();
        return;
    }

    if(d3.event.srcElement === svg.node())
    {
        if(d3.event.shiftKey)
        {
            createNodeByClick();
            setDragSelectAbility(true); //The window will not trigger shift key up events to enable drag select
        }
    }
}



function mouseupOnSVG() {
    if(isDraggingLine)
        endDragLine();
    else if (isPanning)
        endPanView();

    resetMouseVars();
}


function mousewheelOnSVG () {  
    if(d3.event===null || !d3.event.altKey)
        return;
    
    var mousePos = d3.mouse(svg.node());
    
    var delta = 0;
    
    if(d3.event.wheelDelta > 0)
        delta = MOUSE_WHEEL_SCALE_DELTA;
    else if (d3.event.wheelDelta < 0)
        delta = -MOUSE_WHEEL_SCALE_DELTA;

    zoomByScaleDelta(delta,mousePos);
}


function keydownOnSVG() {
    // Ignore if dialog box is displayed.
    if (isDialogVisible)
        return;
    
    if(d3.event.srcElement === d3.select("#searchText").node())
        return;

    lastKeyDown = d3.event.keyCode;
    // console.log(lastKeyDown)
    // console.log(d3.mouse(svg.node()))
    switch (d3.event.keyCode) {
        case 8: // backspace
        case 46: // delete
            d3.event.preventDefault(); //Otherwise will trigger "Back" in browser
            deleteCommand();
            break;
            
        case 16://shift
            updateMode(Mode.EDIT);
            setDragSelectAbility(false);
            break;
            
        case 18://opt/alt
            updateMode(Mode.VIEW);
            setDragSelectAbility(false);
            break;

        // case 66: // B
        //     setDoubleArrowCommand();
        //     break;
            
        case 82: // R
            setRelationCommand();
            setRootNodeCommand();
            break;
            
        case 13: // Enter - update the labels of selected object
            editNameCommand();
            break;

        case 76: // L
            invertLinkCommand();
            setLiteralNodeCommand();
            break;

        case 70: // F
            fixNodeCommand();
            break;

        case 65: //A
            selectAll();
            break;
        case 90: //Z
            if(d3.event.shiftKey)
                redo();
            else
                undo();
            break;
        case 88: //X
            cutSelection();
            break;
        case 67: //C
            copySelection();
            break;
        case 86: //V
            pasteToGraph();
            break;    
        case 68: //D
            duplicateSelection();
            break;
        case 78: //N
            createNodeByClick();
            break;
        case 57: //9
            zoomToFit();
            break;
        case 48: //0
            zoomToActualSize();
            break;
        case 187: //+
            zoomInCommand();
            break;
        case 189: //-
            zoomOutCommand();
            break;

    }
}

function keyupOnSVG() {

    // shift
    switch(d3.event.keyCode){
        case 16:
            startDrag();
            updateMode(Mode.BROWSE);
            setDragSelectAbility(true);
            break;
        case 18://opt/alt
            setDragSelectAbility(true);
            updateMode(Mode.BROWSE);
            break;
    }
}

function mousedownOnNodeHandler(d){
    // console.log("mousedownOnNodeHandler");

    if (d3.event.altKey)
        return;

    mousedown_node = d;
    
    if(!d3.event.shiftKey&&!d.isSelected) //If shift not press and the nodes is not part of the selection
        clearAllSelection();
    addSeletedNode(mousedown_node);

    updateSelectionClass();

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
        clearAllSelection();
        addSeletedLink(link);
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
    showFullName(this);   
}

function mouseleaveOnNodeHandler (d) {
    showTrimmedName(this);
}

function dblclickOnNodeHandler(d){
    foldNodeCommand(d3.event.shiftKey);   
}


function mousedownOnLinkHandler(d) {
    // select link
    mousedown_link = d;
    if (!d3.event.shiftKey&&!d.isSelected)
        clearAllSelection();

    addSeletedLink(mousedown_link);

    updateSelectionClass();
}

function windowResizeHandler () {
    svgHeight = d3.select('#mainCanvas').node().offsetHeight;
    svgWidth = d3.select('#mainCanvas').node().offsetWidth;
    if(svgHeight == undefined || svgWidth == undefined) //This happens in Firefox
    {
        svgHeight = d3.select('#drawing').node().offsetHeight;
        svgWidth = d3.select('#drawing').node().offsetWidth;
    }

    if(currentLayout)
        currentLayout.setLayoutSize(svgWidth, svgHeight);
    
    updateViewPortRect();
}
