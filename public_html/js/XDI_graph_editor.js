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




// some UI management...
var dlg;
var importedXDI;

$(function() {
    var XDIsource = $('#XDIsource');
    //Define the dialog for Import XDI
    dlg = $('#dialog-form').dialog({
        autoOpen: false,
        height: 600,
        width: 600,
        modal: true,
        buttons: {
            "Graph it!": function() {
                importedXDI = XDIsource.val();
                $(this).dialog("close");
            },
            Cancel: function() {
                suspendkeylistening = false;
                $(this).dialog("close");
            }
        },
        close: function() {
            if ((importedXDI !== undefined) && (importedXDI !== "")) {
                clearGraph();
                suspendkeylistening = false;
                initializeGraphWithXDI(importedXDI);
            }
        }
    });
    
    //Define event handler for sliders
    var $linkdistslider = $('input[name="linkdistslider"]');
    var $chargeslider = $('input[name="chargeslider"]');
    var $gravityslider = $('input[name="gravityslider"]');
    
    $linkdistslider.bind('change', function(e) {
        e.preventDefault();
        var val = parseInt($(this).val());
        updateSim(val, null, null);
    });
    $chargeslider.bind('change', function(e) {
        e.preventDefault();
        var val = parseInt($(this).val());
        updateSim(null, val, null);
    });
    $gravityslider.bind('change', function(e) {
        e.preventDefault();
        var val = parseInt($(this).val())/10;
        updateSim(null, null , val);
    });

    //Initialize SVG
    svg = d3.select("#drawing #mainCanvas")
        // .attr("width", "100%")//totalWidth)
        // .attr("height", "100%")//totalHeight)
        .on('mousedown', mousedownOnSVG) //event handlers has to be set within javascript. Otherwise d3.event will be null in handler
        .on('mousemove', mousemoveOnSVG)
        .on('mouseup', mouseupOnSVG)
        .on('mousewheel',mousewheelOnSVG)


    d3.select("body")
        .on("keydown", keydownOnSVG)
        .on('keyup', keyupOnSVG);


    //Initialize SVG Components
    x = d3.scale.linear().domain([0,svgWidth]).range([0,svgWidth]);
    y = d3.scale.linear().domain([0,svgHeight]).range([0,svgHeight]);


    // initializeGraphWithString("{\"treeData\":{},\"relData\":{}}");
    initializeGraph();
    clearGraph();

    //Only For Debug purpose
    // initializeGraphWithXDI(testData)
    initializeGraphWithXDI(attributeSingletons)

    // initializeGraphWithXDI("/$ref/=abc\n=abc/$isref/")
    // initializeGraphWithXDI("=alice<#email>&/&/\"alice@emailemailemailemailemailemailemailemailemailemailemailemail.com\"")
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
        .on("tick", tickEventHandler)

    drag_line=svg.select("#drag_line")

    selected_node = null;
    selected_link = null;
    mousedown_link = null;
    mousedown_node = null;
    mouseup_node = null;
    
    node = d3.select("#nodeCanvas").selectAll(".node");
    link = d3.select("#linkCanvas").selectAll(".link");
    labels = d3.select("#labelsCanvas").selectAll(".label");

    initializeZoom();

    restart();
}
function getLinkPathD(d){
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? 17 : 12,
        targetPadding = d.right ? 17 : 12,

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

function tickEventHandler() {
    
    
    node = svg.selectAll(".node");
    node.attr("transform", function(d) {return "translate(" + x(d.x) + "," + y(d.y) + ")";})
            .classed("selected", function(d) { return (d === selected_node); });

    linkPath = svg.selectAll(".link path");
    linkPath.attr('d', getLinkPathD);

    labels = svg.selectAll(".link text");
    labels.attr("x", function(d) {
                return x(d.source.x) + (x(d.target.x)-x(d.source.x))/3*1;
            })
            .attr("y", function(d) {
                return y(d.source.y) + (y(d.target.y)-y(d.source.y))/3*1;
            })
            
    updateDragLine();
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
    //
    // links
    //
    var linkCanvas = d3.select('#linkCanvas');
    link = linkCanvas.selectAll(".link")
        .data(drawData.links, function(d) { return d.id; });
    
    link.exit().remove();
   
    var newLinkGs = link.enter().append("g")
        .attr("class", "link namable")
        .on('mousedown', mousedownOnLinkHandler)
        .on('mouseenter',mouseenterOnLinkHandler)
        .on('mouseleave',mouseleaveOnLinkHandler)

    
    newLinkGs.append("svg:path")
        .append("title")
        .text(function(d){return d.name});
    
    newLinkGs.append("svg:text")
        .attr('class', "textLabel")
        .text(function(d) {
            return trimString(d.shortName,LINK_TEXT_MAX_LENGTH);
        });  

    
    link.classed('selected', function(d) {return d === selected_link;})
        .classed('relation', function(d) {return d.isRel === true;})
        .classed('literal', function(d) {return d.target.type === "literal";})
        .classed('left',function(d){return d.left})
        .classed('right',function(d){return d.right});


    //
    // nodes
    //

    var nodeCanvas = d3.select('#nodeCanvas');
    node = nodeCanvas.selectAll(".node")
        .data(drawData.nodes, function(d) {return d.id;});
            
    node.exit().remove();

    var newNodes = node.enter().append("svg:g")
            .attr("class", "node namable")
            .on('mouseenter',mouseenterOnNodeHandler)
            .on('mouseleave',mouseleaveOnNodeHandler)

    newNodes.append("svg:circle")
        .attr('r', NODE_RADIUS)
        .on('mousedown', mousedownOnNodeHandler)
        .on('mouseup', mouseupOnNodeHandler)
        .on('dblclick',dblclickOnNodeHandler)
        .each(function(d) {if(d.isRoot){d.x = svgWidth/2; d.y = svgHeight/2;}}) //move root to the middle of the screen only when it is created
        .append("title")
        .text(function(d){return d.name});
        

    newNodes.append("svg:text")
        .attr('class', "textLabel")
        .attr("dx", 12)
        .attr("dy", ".35em")


    node.classed("selected", function(d) { return (d === selected_node); })
        .classed("root", function(d) {return d.isRoot;})
        .classed("literal", function(d) {return (d.type === "literal");})
        .classed("folded",function(d){return d.isFolded;})
    
    node.select("text")
        .text(function(d){
            return trimString(d.shortName,NODE_TEXT_MAX_LENGTH);
        });




    // if(isFrozen)
    //     node.each(function(d){d._fixed = d.fixed; d.fixed = true;})
    // else
    //     node.each(function(d){
    //         if(d._fixed!=null)
    //         {
    //             d.fixed=d._fixed;
    //             d._fixed = null;
    //         }
    //     })

    if(startForce)
    {
        initializeLayout(drawData.nodes, drawData.links);

        startDrag();
    }
}

function updateStatus(statusMessage, isOK,isEditing){
    var indicator = svg.select("#statusIndicator");

    if(isOK != null) //When isOK is not passed, the corresponding class will remains the same 
        indicator
            .classed("ok",isOK)
            .classed("error",!isOK)
    
    if(isEditing != null)
    {
        indicator
            .classed("edit",isEditing)
            .classed("browse",!isEditing)
        var modeMessage = isEditing? "Edit Mode":"Browse Mode";
        svg.select("#modeMessage")
            .text(modeMessage);   
    }
    if(statusMessage != null)
    {
        svg.select("#statusMessage")
            .text(statusMessage);
    }
    

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
    while(jsonnodes.length !== 0) {
        var vic = jsonnodes[0];
        removeNode(vic);
        removeLinksOfNode(vic);
    }
    lastDrawData = null;
    updateStatus("Syntax OK",true);
    restart();
}


function help() {
    var helpWindow = window.open("help.html","Help","width=600,height=600");
}

function importXDI() {
    suspendkeylistening = true;
    dlg.dialog("open");
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
        isFrozen = ! isFrozen;

    restart(true,false);

    d3.select('#freezeButton')
    .classed('off', !isFrozen)
    
    d3.select('#unfreezeButton')
    .classed('off', isFrozen)    
}


// function updateSim(linkdist, charge, gravity) {
//     if (linkdist)
//         force.linkDistance(linkdist);
//     if (charge)
//         force.charge(charge);
//     if (gravity)
//         force.gravity(gravity);
//     restart(true,false);
// }

// function freezeSim(checkboxval) {
//     if (checkboxval.checked) {
//         isFrozen = true;
//     } else {
//         isFrozen = false;
//     }
//     restart(false,false);
// }



