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
    detectBrowserType();
    if(currentBrowser!==BrowserTypes.Chrome && currentBrowser!==BrowserTypes.Safari)
        alert("Oops! Your are using " + currentBrowser + " to open XDI Graph Editor.\nFor best performance, we recommend you to use the latest Chrome or Safari broswer.")

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
        .on('resize',windowResizeHandler);

    //Initialize SVG Components

    //Set the range to the size of user's screen resolution.
    //Otherwise the drag select, using x and y will have boudary for dragging
    x = d3.scale.linear().domain([0,window.screen.availWidth]).range([0,window.screen.availWidth]);
    y = d3.scale.linear().domain([0,window.screen.availHeight]).range([0,window.screen.availHeight]);

    initializeGraph();
    
    clearGraph();

    //Only For Debug purpose
    
    if (inputurl.length > 1) {
        $.get(inputurl, "", function(data, textStatus, jqXHR) {
            if(jqXHR.getResponseHeader("Content-Type").match(/^text/))
                initializeGraphWithXDI(data);
        });
    } else {
        initializeGraphWithXDI("/$ref/=abc\n=abc/$isref/");
    }

    initializeGraphWithXDI(attributeSingletons);
    
    // initializeGraphWithXDI("/$ref/=abc\n=abc/$isref/")
    // initializeGraphWithXDI("/$ref/=def\n=def/$isref/")
    // initializeGraphWithXDI("=alice<#email>&/&/\"alice@email.com\"")
    // initializeGraphWithXDI("=alice<#email>&/&/32")
    // initializeGraphWithXDI("[=]!:uuid:f642b891-4130-404a-925e-a65735bceed0/$all/")

    // initializeGraphWithXDI("=alice/#friend/=bob\n=bob/#friend/=alice")
    report("Loaded");
});



//
// Functions
//


function initializeGraph() 
{
    globalNodes=[];
    globalLinks=[];
    lastNodeId = -1;
    lastLinkId = -1;
    globalNodeLinkMap={};
    
    currentLayout = new ForceLayout();
    // currentLayout = new TreeLayout();

    drag_line=svg.select("#drag_line");

    initializeSelection();

    mousedown_link = null;
    mousedown_node = null;
    mouseup_node = null;
    
    initializeZoom();
    initializeDragSelect();
    initializeMenu();
    initializeCommands();
    windowResizeHandler();
    restart();
}

function updateLinkElement () {
    if(lastDrawData==null || lastDrawData.links == null)
        return;
    var linksData = lastDrawData.links;
    //// Add new elements
    var linkCanvas = d3.select('#linkCanvas');
    var linkGs = linkCanvas.selectAll(".link")
        .data(linksData, function(d) { return d.id; });
    
    linkGs.exit().remove();
   
    var newLinkGs = linkGs.enter().append("g")
        .attr("class", "link selectable")
        .on('mousedown', mousedownOnLinkHandler)
        .on('mouseenter',mouseenterOnLinkHandler)
        .on('mouseleave',mouseleaveOnLinkHandler);
    
    newLinkGs.append("svg:path")
        .append("title")
        .text(function(d){return d.shortName});
    
    newLinkGs.append("svg:text")
        .attr('class', "textLabel")
        

    //// Adjust Classes
    linkGs.classed('selected', function(d) {return d.isSelected;})
        .classed('relation', function(d) {return d.isRelation;})
        .classed('literal', function(d) {return d.isLiteral()})
        .classed('left',function(d){return d.left})
        .classed('right',function(d){return d.right});
    linkGs.select('text')
        .text(function(d) {return trimString(d.shortName,LINK_TEXT_MAX_LENGTH);});  
}

function updateNodeElement () {
    if(lastDrawData==null || lastDrawData.nodes== null)
        return;
    var nodesData = lastDrawData.nodes;
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
        .on('touchstart',mousedownOnNodeHandler)
        .append("title")
        .text(function(d){return d.fullName});
        
    newNodes.append("svg:text")
        .attr('class', "textLabel")
        .attr("dx", "1em")
        .attr("dy", "0.35em");

    //// Adjust Classes    
    nodeGs
        .attr("class", function(d) { return "node selectable " + d.type;})
        .classed("selected", function(d) { return (d.isSelected); })
        .classed("folded",function(d){return d.isFolded;})
        .classed("fixed",function(d){return d._fixed;}); //_fixed is set when a node is fixed by user.

    nodeGs.select("text")
        .text(function(d){return trimString(d.shortName,NODE_TEXT_MAX_LENGTH);});

    nodeGs.select("path")
        .attr('d', function(d) { return getNodeShape(d.type); });
}

//Render all SVG Elements based on globalNodes, globalLinks
function restart(startLayout,getNewData,centerRootNodes) {
    if(startLayout == null)
        startLayout = true;
    if(getNewData == null)
        getNewData = true;

    // var drawData = null;
    if(getNewData || lastDrawData === null)
    {
        lastDrawData = getDrawData();
    }
    // drawData = lastDrawData;

    updateLinkElement(); 

    updateNodeElement();    

    //
    // Layout
    //
    if(startLayout)
    {
        currentLayout.updateLayout(lastDrawData.nodes, lastDrawData.links,centerRootNodes,true,true);
        startDrag();
    }    

    updateMenuItemAbility();
}

function getNodeShape (type) {
    var symbol = d3.svg.symbol();
    var scale = currentLayout.settings.nodeSize || 1;
    switch(type){
        case xdi.constants.nodetypes.LITERAL:
            symbol.type("square").size(500 * scale);
            break;
        case xdi.constants.nodetypes.CONTEXT:
        case xdi.constants.nodetypes.ROOT:
        case xdi.constants.nodetypes.ENTITY:
            symbol.type("circle").size(500 * scale);
            break;
        
        case xdi.constants.nodetypes.ATTRIBUTE:
        case xdi.constants.nodetypes.VALUE:
            symbol.type("diamond").size(400 * scale);
            break;
    }
    return symbol();
}

function updateSyntaxStatus(statusMessage, isOK,isEditing){
    var indicator = svg.select("#statusIndicator");

    if(isOK != null) //When isOK is not passed, the corresponding class will remains the same 
        indicator
            .classed("ok",isOK)
            .classed("error",!isOK);
    
    
    
    if(statusMessage != null)
    {
        svg.select("#statusMessage")
            .text(statusMessage);
    }

    if(isEditing != null)
    {
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
    globalNodes = [];
    globalLinks = [];
    globalNodeLinkMap = {};
    lastGraphId = -1;
    lastNodeId = -1;
    lastLinkId = -1;
    lastDrawData = null;
    clearAllSelection();
    updateSyntaxStatus("Syntax OK",true);
    restart();
}

function isGraphEmpty () {
    return _.isEmpty(d3.selectAll('.selectable').node());//.node() is necessary. .selectAll() produce an array with an empty array in it
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
        .classed("hide_"+name);
    
    d3.select("#mainCanvas")
        .classed("hide_"+name,!value);
    
    d3.select(button).classed("off",!value);
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
        .classed('off', !isFrozen);
    
    d3.select('#unfreezeButton')
        .classed('off', isFrozen);
}

function detectBrowserType () {
    var agent = window.navigator.userAgent;
    if(agent.indexOf("Firefox")>-1)
        currentBrowser = BrowserTypes.Firefox;
    else if (agent.indexOf("Chrome")>-1)
        currentBrowser = BrowserTypes.Chrome;
    else if (agent.indexOf("Safari")>-1)
        currentBrowser = BrowserTypes.Safari;
    else
        currentBrowser = BrowserTypes.Other;
}

function report (text) {
    // var log = d3.select('#log');
    // var newText = log.html() + text + "<br>";
    // log.html(newText);
}
