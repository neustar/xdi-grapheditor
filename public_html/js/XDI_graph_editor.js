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


$(function() {
    
    initializeDialogs();

    //Initialize SVG
    svg = d3.select("#drawing #mainCanvas")
        .on('mousedown', mousedownOnSVG) //event handlers has to be set within javascript. Otherwise d3.event will be null in handler
        .on('mousemove', mousemoveOnSVG)
        .on('mouseup', mouseupOnSVG)
        .on('mousewheel',mousewheelOnSVG)


    d3.select("body")
        .on("keydown", keydownOnSVG)
        .on('keyup', keyupOnSVG);

    d3.select(window)
        .on('resize',windowResizeHandler)

    //Initialize SVG Components

    //Set the range to the size of user's screen resolution.
    //Otherwise the drag select, using x and y will have boudary for dragging
    x = d3.scale.linear().domain([0,window.screen.availWidth]).range([0,window.screen.availWidth]);
    y = d3.scale.linear().domain([0,window.screen.availHeight]).range([0,window.screen.availHeight]);

    initializeGraph();
    
    clearGraph();

    //Only For Debug purpose
    // initializeGraphWithXDI(attributeSingletons)

    // initializeGraphWithXDI("/$ref/=abc\n=abc/$isref/")
    // initializeGraphWithXDI("/$ref/=def\n=def/$isref/")
    initializeGraphWithXDI("=alice<#email>&/&/\"alice@email.com\"")
    // initializeGraphWithXDI("[=]!:uuid:f642b891-4130-404a-925e-a65735bceed0/$all/")

    // initializeGraphWithXDI("=alice/#friend/=bob\n=bob/#friend/=alice")
    // searchOperation("=");
});



//
// Functions
//


function initializeGraph() 
{
    jsonnodes=[];
    jsonlinks=[];
    lastNodeId = -1;
    lastLinkId = -1;
    nodeslinkmap={};

     force = d3.layout.force()
        .size([svgWidth, svgHeight])
        .on("tick", forceTickEventHandler)
        .on('end',forceEndEventHandler)

    drag_line=svg.select("#drag_line")

    initializeSelection();

    mousedown_link = null;
    mousedown_node = null;
    mouseup_node = null;
    
    initializeZoom();
    initializeDragSelect();
    windowResizeHandler();

    restart();
}

function getLinkPathD(d){
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? 17 : 2,
        targetPadding = d.right ? 17 : 2,

        sourcePadding =  sourcePadding / zoom.scale();
        targetPadding = targetPadding / zoom.scale();

        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
    var valence1 = d.source.id + "-" + d.target.id;
    var valence2 = d.target.id + "-" + d.source.id;

    var tmpMap = lastDrawData ? lastDrawData.map : nodeslinkmap; //Use the lastest map that only has the visible links

    if ((valence1 in tmpMap) && (valence2 in tmpMap)) {
        return 'M' + x(sourceX) + ',' + y(sourceY) + 'A' + (dist) * getScaleRatio()+ ',' + (dist)* getScaleRatio() + ' 0 0,1 ' + x(targetX) + ',' + y(targetY);
    }
    else {
        return 'M' + x(sourceX) + ',' + y(sourceY) + 'L' + x(targetX) + ',' + y(targetY);
    }
}

function forceTickEventHandler() {
    
    
    svg.selectAll(".node")
        .attr("transform", function(d) {return "translate(" + x(d.x) + "," + y(d.y) + ")";})
        .classed("selected", function(d) { return (d.isSelected); });

    var linkPath = svg.selectAll(".link path");
    linkPath.attr('d', getLinkPathD);

    svg.selectAll(".link text")
        .attr("x", function(d) {
            return x(d.source.x) + (x(d.target.x)-x(d.source.x))/3*1;
        })
        .attr("y", function(d) {
            return y(d.source.y) + (y(d.target.y)-y(d.source.y))/3*1;
        })
            
    updateDragLine();
    updateViewPortRect(); //Remove this if the refresh of navigator make it slow;
}


function forceEndEventHandler () {
    updateViewPortRect();
}

function updateLinkElement (linksData) {
    //// Add new elements
    var linkCanvas = d3.select('#linkCanvas');
    var linkGs = linkCanvas.selectAll(".link")
        .data(linksData, function(d) { return d.id; });
    
    linkGs.exit().remove();
   
    var newLinkGs = linkGs.enter().append("g")
        .attr("class", "link selectable")
        .on('mousedown', mousedownOnLinkHandler)
        .on('mouseenter',mouseenterOnLinkHandler)
        .on('mouseleave',mouseleaveOnLinkHandler)
    
    newLinkGs.append("svg:path")
        .append("title")
        .text(function(d){return d.name});
    
    newLinkGs.append("svg:text")
        .attr('class', "textLabel")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(function(d) {
            return trimString(d.shortName,LINK_TEXT_MAX_LENGTH);
        });  

    //// Adjust Classes
    linkGs.classed('selected', function(d) {return d.isSelected;})
        .classed('relation', function(d) {return d.isRelation;})
        .classed('literal', function(d) {return d.target.type === NodeTypes.LITERAL;})
        .classed('left',function(d){return d.left})
        .classed('right',function(d){return d.right});
}

function updateNodeElement (nodesData) {
    //// Add new elements
    var nodeCanvas = d3.select('#nodeCanvas');
    var nodeGs = nodeCanvas.selectAll(".node")
        .data(nodesData, function(d) {return d.id;});
            
    nodeGs.exit().remove();

    var newNodes = nodeGs.enter().append("g")
        .on('mouseenter',mouseenterOnNodeHandler)
        .on('mouseleave',mouseleaveOnNodeHandler)

    newNodes.append("path")
        .on('mousedown', mousedownOnNodeHandler)
        .on('mouseup', mouseupOnNodeHandler)
        .on('dblclick',dblclickOnNodeHandler)
        .each(function(d) {if(d.isRoot()){d.x = window.innerWidth/2; d.y = window.innerHeight/2;}}) //move root to the middle of the screen only when it is created
        .append("title")
        .text(function(d){return d.name});
        
    newNodes.append("svg:text")
        .attr('class', "textLabel")
        .attr("dx", 12)
        .attr("dy", ".35em")

    //// Adjust Classes    
    nodeGs
        .attr("class", function(d) { return "node selectable " + d.type;})
        .classed("selected", function(d) { return (d.isSelected); })
        .classed("folded",function(d){return d.isFolded;})
        .classed("fixed",function(d){return d._fixed;}) //_fixed is set when a node is fixed by user.

    nodeGs.select("text")
        .text(function(d){return trimString(d.shortName,NODE_TEXT_MAX_LENGTH);});

    nodeGs.select("path")
        .attr('d', function(d) { return getNodeShape(d.type); })
}

//Render all SVG Elements based on jsonnodes, jsonlinks
function restart(startForce,getNewData) {
    if(startForce == null)
        startForce = true;
    if(getNewData == null)
        getNewData = true;

    var drawData = null;
    if(getNewData || lastDrawData == null)
    {
        lastDrawData = getDrawData();
    }
    drawData = lastDrawData;

    updateLinkElement(drawData.links); 

    updateNodeElement(drawData.nodes);    

    //
    // Layout
    //
    if(startForce)
    {
        initializeLayout(drawData.nodes, drawData.links);
        startDrag();
    }    

}

function getNodeShape (type) {
    var symbol = d3.svg.symbol();
    switch(type){
        case NodeTypes.LITERAL:
            symbol.type("square").size(500);
            break;
        case NodeTypes.CONTEXT:
        case NodeTypes.ROOT:
        case NodeTypes.ENTITY:
            symbol.type("circle").size(500);
            break;
        
        case NodeTypes.ATTRIBUTE:
        case NodeTypes.VALUE:
            symbol.type("diamond").size(400);
            break;
    }
    return symbol();
}

function updateSyntaxStatus(statusMessage, isOK,isEditing){
    var indicator = svg.select("#statusIndicator");

    if(isOK != null) //When isOK is not passed, the corresponding class will remains the same 
        indicator
            .classed("ok",isOK)
            .classed("error",!isOK)
    
    
    
    if(statusMessage != null)
    {
        svg.select("#statusMessage")
            .text(statusMessage);
    }

    if(isEditing != null)
    {
        // indicator
        //     .classed("edit",isEditing)
        //     .classed("browse",!isEditing)
        var modeMessage = isEditing? "Edit Mode":"Browse Mode";
        svg.select("#modeMessage")
            .text(modeMessage);   
    }
}

function updateMode (newMode) {
    var modeMessage = newMode;
    svg.select("#modeMessage")
        .text(modeMessage);

    var cursor = "default";
    switch(newMode)
    {
        case Mode.BROWSE:
            cursor = "default";
            break;
        case Mode.EDIT:
            cursor = "crosshair";
            break;
        case Mode.VIEW:
            cursor = "-webkit-grab";
            break;
        case Mode.ZOOM_IN:
            cursor = "-webkit-zoom-in";
            break;
        case Mode.ZOOM_OUT:
            cursor = "-webkit-zoom-out";
            break;
        case Mode.PAN:
            cursor = "-webkit-grabbing";
            break;
    }
    d3.select('#mainCanvas')
    .style('cursor', cursor);
}

//
// UI functions
//

function loadJson(event) {
    console.log("load JSON");
}

function exportGraph() {
    var graphstring = "";
    var xdigraph = graphToString();
    $.each(xdigraph, function(i,d) {
        isImplied(d);
        if (i > 0)
            graphstring += '<br>';
        graphstring +=d;
    });
    
    var statementsWindow = window.open("","XDI_Statements","width=600,height=400");
    var dispstring = "<p>" + graphstring + "</p>";
    statementsWindow.document.write(dispstring);
}

function clearGraph() {
    // todo - add disappearance effect here...
    // while(jsonnodes.length !== 0) {
    //     var vic = jsonnodes[0];
    //     removeNode(vic);
    //     // removeLinksOfNode(vic);
    // }

    jsonnodes = [];
    jsonlinks = [];
    nodeslinkmap = {};
    lastGraphId = -1;
    lastNodeId = -1;
    lastLinkId = -1;
    lastDrawData = null;
    updateSyntaxStatus("Syntax OK",true);
    restart();
}

function help() {
    var helpWindow = window.open("help.html","Help","width=600,height=600");
}

function importXDI() {
    openImportDialog();
}

function setNodeLabelsVisibility(newValue){
    d3.select('#nodeCanvas').classed("hide_text",newValue);
}

function setLinkLabelsVisibility(newValue){
    d3.select('#linkCanvas').classed("hide_text",newValue);   
}

function toggleNodeLabelsVisibility(){
    var value = d3.select('#nodeCanvas').classed("hide_text");
    setNodeLabelsVisibility(!value)

    d3.select('#toggleNodeButton').classed("off",!value);
}
function toggleLinkLabelsVisibility(){
    var value = d3.select('#linkCanvas').classed("hide_text");
    setLinkLabelsVisibility(!value)
    d3.select('#toggleLinkButton').classed("off",!value);
}

function toggleVisibility (button) {
    var name = d3.select(button).attr("name");

    var value = d3.select("#mainCanvas")
    .classed("hide_"+name)
    
    d3.select("#mainCanvas")
    .classed("hide_"+name,!value);
    d3.select(button).classed("off",!value)
}

function trimString(string,length){
    var str = string.substr(0,length)

    if(str.length<string.length)
        str = str+ "..."
    return str;
}

function toggleFreeze (newValue) {
    if(newValue != null)
        isFrozen = newValue;
    else
        isFrozen = !isFrozen;

    restart(true,false);

    d3.select('#freezeButton')
    .classed('off', !isFrozen)
    
    d3.select('#unfreezeButton')
    .classed('off', isFrozen)    
}

