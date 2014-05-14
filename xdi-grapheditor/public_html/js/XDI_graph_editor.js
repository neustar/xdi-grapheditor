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


// Global D3/SVG vars
var width = 1000;
var height = 800;
var colors = d3.scale.category20();

var svg = d3.select("#drawing").append("svg")
        .attr("width", width)
        .attr("height", height);

var force = d3.layout.force()
        .linkDistance(60)
        .charge(-1500)
        .size([width, height]);

var relData, lastNodeId;
var jsonnodes, jsonlinks, node, link, labels;
var drag_line, drag;
var indicator;
var INDICATOR_X = 8;
var INDICATOR_Y = 8;
var status;
var status_msg = "OK";
var STATUS_X = 30;
var STATUS_Y = 20;

// mouse event vars
var selected_node = null,
        selected_link = null,
        mousedown_link = null,
        mousedown_node = null,
        mouseup_node = null;

// suspending key listener when dialog box is displayed
var suspendkeylistening = false;

var lastKeyDown = -1;
var frozen = false;

var STORAGE_PREFIX = "XDI_GRAPH_EDITOR_";
lastNodeId = 0;
var nodeslinkmap = {};
initializeGraphWithString("{\"treeData\":{},\"relData\":{}}");
clearGraph();

// some UI management...
var dlg;
var importedXDI;

$(function() {
    var XDIsource = $('#XDIsource');
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
});



//
// Functions
//

function updateSim(linkdist, charge, gravity) {
    if (linkdist)
        force.linkDistance(linkdist);
    if (charge)
        force.charge(charge);
    if (gravity)
        force.gravity(gravity);
    restart();
}

function freezeSim(checkboxval) {
    if (checkboxval.checked) {
        frozen = true;
        node.classed("fixed", function(d) {d.fixed = true;});
    } else {
        frozen = false;
        node.classed("fixed", function(d) {d.fixed = false;});
        restart();
    }
}

function prepJsonData(data) {
    var tree = d3.layout.tree()
            .sort(null)
            .children(function(d) {
                return (!d.contents || d.contents.legnth === 0) ? null : d.contents;
            });
    jsonnodes = tree.nodes(data.treeData);
    jsonlinks = tree.links(jsonnodes);
    $.each(jsonlinks, function(index, val) {
        val.isRel = false;
        val.arc = val.target.arc;
    });
    lastNodeId = jsonnodes.length - 1;

    var relationdata = data.relData;
    var newrel, newrelsrc, newreltgt;
    for (var i = 0; i < relationdata.length; i++) {
        newrelsrc = null;
        newreltgt = null;
        for (var ii = 0; ii < jsonnodes.length; ii++) {
            if (relationdata[i].source === jsonnodes[ii].name) {
                newrelsrc = jsonnodes[ii];
            }
            if (relationdata[i].target === jsonnodes[ii].name) {
                newreltgt = jsonnodes[ii];
            }
        }
        if (newrelsrc !== null && newreltgt !== null) {
            //Replacing the element with proper values
            var newrelarc = relationdata[i].arc;
            relationdata[i] = {arc: newrelarc, source: newrelsrc, target: newreltgt, isRel: true};
        }
    }
    // Adding those links to the array.
    for (var i=0; i<relationdata.length; i++) {
        jsonlinks.push(relationdata[i]);
    }
}

// Initializing the graph with D3-parsed JSON data
function jsondatacallback(error, json) {
    initializeGraph(json);
    }

// Initializing the graph with XDI statements.
function initializeGraphWithXDI(data) {
    var lines = data.split(/\r\n|\r|\n/g);
    // removing empty lines etc.
    $.each(lines, function(i,d) {
        if (d === null || d === "")
            lines.splice(i, 1);
    });
    var graph = xdi.graph();
    $.each(lines, function(i, d) {
        try {
            var statement = xdi.parser.parseStatement(d);
        } catch (err) {
            console.log("Invalid XDI: " + err);
            console.log(d);
            return;
        }
        graph.statement(d);
    });
    xdistatements = xdi.io.write(graph);
    lines = xdistatements.split(/\r\n|\r|\n/g);
    $.each(lines, function(i,d) {
        if (d.length > 0) {
            var xdistmt = xdi.parser.parseStatement(d);
            if (xdistmt.isContextNodeStatement()) {
                addStatement(xdistmt.subject()._string, xdistmt.object()._string, xdistmt.subject()._string + xdistmt.object()._string, false);
            }
            else if (xdistmt.isRelationStatement()) {
                addStatement(xdistmt.subject()._string, xdistmt.predicate()._string, xdistmt.object()._string, true);
            }
            else if (xdistmt.isLiteralStatement()) {
                var obj = xdistmt._string.replace(xdistmt.subject()._string, "");
                obj = obj.slice(3); // removing /&/
                addStatement(xdistmt.subject()._string, null , obj, false);
            }
            else
                console.log("Found a weird statement of unknown type.");
        }
    });
    restart();
}

function addStatement(subject, predicate, object, isrel) {
    var subjectnode, objectnode;
    var islit = (predicate === null) ? true : false;
    if (predicate === null)
        predicate = "&";
    var searchres = findNodeIndex(jsonnodes, subject);
    if (searchres === null) {
        subjectnode = {id: ++lastNodeId};
        subjectnode.type = "context";
        subjectnode.name = subject;
        if (subject === "")
            subjectnode.root = true;
        jsonnodes.push(subjectnode);
    } else
        subjectnode = jsonnodes[searchres];
    searchres = findNodeIndex(jsonnodes, object);
    if (searchres === null) {
        objectnode = {id: ++lastNodeId};
        objectnode.type = (islit) ? "literal" : "context";
        objectnode.name = object;
        jsonnodes.push(objectnode);
    } else
        objectnode = jsonnodes[searchres];
    var newlink = {arc: predicate, source: subjectnode, target: objectnode, left: false, right: true};
    addLinktoMap(subjectnode, objectnode);
    if (isrel)
        newlink.isRel = true;
    jsonlinks.push(newlink);
    restart();
}

function addLinktoMap(source, target) {
    var key = source.id + '-' + target.id;
    if (!(key in nodeslinkmap)) {
        nodeslinkmap[key] = ""; // todo? add arc name.
    }
}

function delLinkfromMap(source, target) {
    var key = source.id + '-' + target.id;
    delete nodeslinkmap[key];
}


// Initializing the graph with a string (serialized XDI data)
function initializeGraphWithString(jsonString) {
    var root = JSON.parse(jsonString);
    initializeGraph(root);
}

function initializeGraph(json) {
    prepJsonData(json);
    
    force.nodes(jsonnodes)
            .links(jsonlinks)
            .on("tick", tictac);

    // define arrow markers for graph links
    svg.append('svg:defs')
            .append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999');

    svg.append('svg:defs')
            .append('svg:marker')
            .attr('id', 'end-relation')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', 'red');

    svg.append('svg:defs')
            .append('svg:marker')
            .attr('id', 'end-literal')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#aa0');

    svg.append('svg:defs')
            .append('svg:marker')
            .attr('id', 'start-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M10,-5L0,0L10,5')
            .attr('fill', '#999');

    // todo: remove?
    svg.append('svg:defs')
            .append('svg:marker')
            .attr('id', 'arrow-rel')
            .attr('viewBox', '0 0 100 100')
            .attr('refX', 30)
            .attr('refY', 12)
            .attr('markerUnits', 'strokeWidth')
            .attr('markerWidth', 24)
            .attr('markerHeight', 24)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M 0 0 L 24 12 L 0 24 z');

    drag_line = svg.append("svg:path")
            .attr("class", "drag_line_hidden")
            .attr("d", "M0,0L0,0");

    indicator = svg.append("svg:rect")
            .attr("class", "indicateOK")
            .attr("width", 14)
            .attr("height", 14)
            .attr("x", INDICATOR_X)
            .attr("y", INDICATOR_Y)
            .attr("rx", 2)
            .attr("ry", 2);

    status = svg.append("svg:text")
            .attr("class", "status")
            .attr("x", STATUS_X)
            .attr("y", STATUS_Y);

    selected_node = null;
    selected_link = null;
    mousedown_link = null;
    mousedown_node = null;
    mouseup_node = null;
    
    node = svg.append("svg:g").selectAll(".node");
    link = svg.append("svg:g").selectAll(".link");
    labels = svg.append("svg").selectAll(".label");

    svg.on('mousedown', mousedown)
            .on('mousemove', mousemove)
            .on('mouseup', mouseup);
    d3.select("body")
            .on("keydown", keydown)
            .on('keyup', keyup);
    restart();
}

function tictac() {
    link.attr("textContent", function(d) {return d.arc;})
            .attr('d', function(d) {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding = d.left ? 17 : 12,
                targetPadding = d.right ? 17 : 12,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY);
            var valence1 = d.source.id + "-" + d.target.id;
            var valence2 = d.target.id + "-" + d.source.id;
            if ((valence1 in nodeslinkmap) && (valence2 in nodeslinkmap)) {
                return 'M' + sourceX + ',' + sourceY + 'A' + dist + ',' + dist + ' 0 0,1 ' + targetX + ',' + targetY;
            }
            else {
                return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
            }
            });
    node.attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")";})
            .classed("selected", function(d) { return (d === selected_node); });
    labels.attr("x", function(d) {
                var tmps = d.source.id + "-" + d.target.id;
                var lelink = findLinkByRef(tmps);
                if (lelink !== null) {
                    // midpoint along the arc between the 2 nodes.
                    midpoint = lelink.getPointAtLength(lelink.getTotalLength()/2);
                    return midpoint.x + 5;
                } else {
                    return (d.source.x + d.target.x) / 2;
                }})
            .attr("y", function(d) {
                // todo: avoid doing another search
                var tmps = d.source.id + "-" + d.target.id;
                var lelink = findLinkByRef(tmps);
                if (lelink !== null) {
                    midpoint = lelink.getPointAtLength(lelink.getTotalLength()/2);
                    return midpoint.y + 5;
                } else {
                    return (d.source.y + d.target.y) / 2;
                }})
            .text(function(d) {return d.arc;});
    indicator.attr("x", INDICATOR_X)
            .attr("y", INDICATOR_Y);
    }

function findLinkByRef(val) {
    var resp = null;
    var linkss = link[0];
    for (i=0; i<linkss.length; i++) {
        if (linkss[i].getAttribute("nodesref") === val)
            return linkss[i];
    }
    return null;
}

function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_link = null;
}

function mousemove() {
    if (!mousedown_node)
        return;
    drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' +
            d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
    restart();
}

function mousedown() {
    svg.classed('active', true);

    if (d3.event.shiftKey || mousedown_node || mousedown_link)
        return;

    var point = d3.mouse(this);
    var newnode = {id: ++lastNodeId};
    newnode.x = point[0];
    newnode.y = point[1];
    var nodename = prompt("Please enter the node's name", "");
    if (nodename !== null) {
        var ind = findNodeIndex(jsonnodes, nodename);
        if (ind !== null) {
            if (nodename !== "")
            // Name already taken
                alert("Node already exists!");
            return;
        }
        newnode.name = nodename;
        var parsedname;
        try {
            parsedname = JSON.parse(nodename);
        } catch (err) {
            parsedname = null;
        }
        if (parsedname === null) {
            // not JSON
            newnode.type = "context";
        } else {
            newnode.type = "literal";
        }
        jsonnodes.push(newnode);
    } else {
        return;
    }
    restart();
}

function mouseup() {
    if (mousedown_node) {
        drag_line.attr("class", "drag_line_hidden")
                .style('marker-end', '');
    }
    svg.classed('active', false);
    resetMouseVars();
}

function keydown() {
    // Ignore if dialog box is displayed.
    if (suspendkeylistening)
        return;
    d3.event.preventDefault();
    if (lastKeyDown !== -1)
        return;
    
    lastKeyDown = d3.event.keyCode;

    // shift key was hit
    if (d3.event.keyCode === 16) {
        node.call(force.drag);
        svg.classed('shift', true);
    }

    if (!selected_node && !selected_link)
        return;
    switch (d3.event.keyCode) {
        case 8: // backspace
        case 46: // delete
            if (selected_node) {
                removeNode(selected_node);
                removeLinks(selected_node);
            } else if (selected_link) {                
                var source = selected_link.source;
                var target = selected_link.target;
                
                source_name = source.name;
                target_name = target.name;
                source_childnb = (source.children) ? source.children.length : 0;
                target_childnb = (target.children) ? target.children.length : 0;
                if (source_childnb !== 0) {
                    source.children.splice(source.children.indexOf(target), 1);
                }
                target.parent = null;
                var spliceret = jsonlinks.splice(jsonlinks.indexOf(selected_link), 1);
                if (spliceret.length !== 1) 
                    console.log("Error removing the link.");
                delLinkfromMap(source, target);
            }
            selected_link = null;
            selected_node = null;

            restart();
            break;
            
        case 66: // B
            if (selected_link) {
                // set link direction to both left and right
                selected_link.left = true;
                selected_link.right = true;
            }
            restart();
            break;
            
        case 82: // R
            // toggling a link relationship status on/off
            if (selected_link) {
                selected_link.isRel = !selected_link.isRel;
                jsonlinks.splice(jsonlinks.indexOf(selected_link), 1);
                jsonlinks.push(selected_link);
                // updating label
                var svgelems = svg.selectAll(".label");
                searchedlabel = selected_link.arc;
                len = svgelems[0].length;
                for (var i=0; i<len; i++) {
                    if (svgelems[0][i].textContent === searchedlabel) {
                        var newclass;
                        var currentclass = svgelems[0][i].getAttribute('class');
                        if (selected_link.isRel)
                            newclass = currentclass + " rel";
                        else
                            newclass = currentclass.replace("rel", "");
                        svgelems[0][i].setAttribute("class", newclass);
                        var statement = selected_link.source.name + "/" +
                                selected_link.arc + "/" + selected_link.target.name;
                        var lit = (selected_link.target.type === "literal") ? true : false;
                        if (validateXDI(statement, selected_link.isRel, lit)) {
                            indicator.attr("class", "indicateOK");
                            status_msg = "OK";
                        } else {
                            indicator.attr("class", "indicateKO");
                        }
                        updateStatus();
                        break;
                    }
                }
                restart();
            } else if (selected_node) {
            // or setting a node as root
                selected_node.root = !selected_node.root;
                // updating graphics too.
                var svgelems = svg.selectAll(".node");
                var nodekey = selected_node.name;
                $.each(svgelems[0], function(i, d) {
                    // currently <text> is the lastChild in <node>
                    if (d.lastChild.textContent === nodekey) {
                        var currentclass = d.childNodes[0].getAttribute('class');
                        if ((currentclass !== null) && (currentclass.indexOf('root') !== -1)) {
                            // remove root from class attribute
                            newclass = currentclass.replace('root', '');
                            d.childNodes[0].setAttribute('class', newclass);
                        } else {
                            // add root to the circle's class
                            d.childNodes[0].setAttribute('class', 'root');
                        }
                    }
                });
                restart();
            }
            break;
            
        case 13: // Enter - update the labels of selected object
            if (selected_link) {
                var existinglabel = selected_link.arc;
                var labelval = prompt("Please enter a new value for this label", existinglabel);
                if (labelval) {
                    selected_link.arc = labelval;
                }
            } else if (selected_node) {
                var existingname = selected_node.name;
                var nodename = prompt("Please enter a new name for this node", existingname);
                if (nodename) {
                    var oldv = selected_node.name;
                     selected_node.name = nodename;
                    // updating the visualization
                    // have to search the right node in the svg tree...
                    var svgelems = svg.selectAll(".node");
                    $.each(svgelems[0], function(i, d) {
                        // currently <text> is the lastChild in <node>
                        if (d.lastChild.textContent === oldv) {
                            d.lastChild.textContent = nodename;
                        }
                    });
                }
            }
            restart();
            
            break;
        case 76: // L
            // Inversing the link direction
            if (selected_link) {
                selected_link.left = !selected_link.left;
                selected_link.right = !selected_link.right;
                
                var source_t0 = selected_link.source;
                var target_t0 = selected_link.target;
                
                selected_link.source = target_t0;
                selected_link.target = source_t0;
                
                source_t0.children.splice(source_t0.children.indexOf(target_t0), 1);
                // todo: prevent any action when L is pressed and the source's
                // parent is a third node. Otherwise we'll lose information if the 
                // former parent was not one of the nodes from the pair involved in the link.

                source_t0.parent = target_t0;
                if ((target_t0.children) && (target_t0.children.length > 0))
                    target_t0.children.push(source_t0);
                else {
                    target_t0.children = [];
                    target_t0.children.push(source_t0);
                }
                addLinktoMap(source_t0, target_t0);
                delLinkfromMap(source_t0, target_t0);
            } else if (selected_node) {
                // changing the Node type to literal or
                // back to the default contextual 
                if (selected_node.type !== "literal") 
                    selected_node.type = "literal";
                else
                    selected_node.type = "context";
            
                // updating graphics
                var svgelems = svg.selectAll(".node");
                var nodekey = selected_node.name;
                $.each(svgelems[0], function(i, d) {
                    // currently <text> is the lastChild in <node>
                    if (d.lastChild.textContent === nodekey) {
                        var currentclass = d.childNodes[0].getAttribute('class');
                        if ((currentclass !== null) && (currentclass.indexOf('literal') !== -1)) {
                            // remove literal from class attribute
                            newclass = currentclass.replace('literal', 'context');
                            d.childNodes[0].setAttribute('class', newclass);
                        } else {
                            // add literal to the circle's class
                            d.childNodes[0].setAttribute('class', 'literal');
                        }
                    }
                });
            }
            restart();
            break;
    }
}

function keyup() {
    lastKeyDown = -1;

    // shift
    if (d3.event.keyCode === 16) {
        //circle
        node
                .on('mousedown.drag', null)
                .on('touchstart.drag', null);
        svg.classed('shift', false);
    }
}

function restart() {
    //
    // links
    //
    link = link.data(jsonlinks);
    
    link.classed('selected', function(d) {return d === selected_link;})
            .classed('rel', function(d) {return d.isRel === true;})
            .classed('lit', function(d) {return d.target.type === "literal";})
            .style('marker-start', function(d) {return d.left ? 'url(#start-arrow)' : '';})
            .style('marker-end', function(d) {
                if (d.isRel) return d.right ? 'url(#end-relation)' : '';
                else {
                    if (d.target.type === "literal")
                        return d.right ? 'url(#end-literal)' : '';
                    else
                        return d.right ? 'url(#end-arrow)' : '';
                }
            });

    link.enter().append("svg:path")
            .attr("class", "link")
            .attr("nodesref", function(d) {
                var tmpstring = d.source.id + "-" + d.target.id;
                return tmpstring;
            })
            .classed('selected', function(d) {return d === selected_link;})
            .classed('rel', function(d) {return d.isRel === true;})
            .style('marker-start', function(d) {return d.left ? 'url(#start-arrow)' : '';})
            .style('marker-end', function(d) {
                if (d.isRel) {
                    return d.right ? 'url(#end-relation)' : '';
                } else {
                    if (d.target.type === "literal")
                        return d.right ? 'url(#end-literal)' : '';
                    else
                        return d.right ? 'url(#end-arrow)' : '';
                }})
            .on('mousedown', function(d) {
                if (d3.event.shiftKey)
                    return;

                // select link
                mousedown_link = d;
                if (mousedown_link === selected_link)
                    selected_link = null;
                else
                    selected_link = mousedown_link;
                selected_node = null;
                restart();
            });

    link.exit().remove();
    
    //
    // nodes
    //
    node = node.data(jsonnodes, function(d) {return d.name;});

    // remove?
    node.selectAll("rect");
            
    var svginsertpoint = node.enter().append("svg:g")
            .attr("class", "node");
//    svginsertpoint.append("svg:rect")
    svginsertpoint.append("svg:circle")
            .attr('r', 13)
//            .attr("rx",26)
//            .attr("ry", 26)
//            .attr("width", 26)
//            .attr("height", 26)
            .attr("width", 13)
            .attr("height", 13)
            .classed("selected", function(d) { return (d === selected_node); })
            //.classed("fixed", function(d) {return d === selected_node;})
            .classed("root", function(d) {return (d.root === true);})
            .classed("literal", function(d) {return (d.type === "literal");})
            .on('mouseover', function(d) {
                if (!mousedown_node || d === mousedown_node)
                    return;
                d3.select(this).attr('transform', 'scale(1.2)');
            })
            .on('mouseout', function(d) {
                if (!mousedown_node || d === mousedown_node)
                    return;
                // unenlarge target node
                d3.select(this).attr('transform', '');
            })
            .on('mousedown', function(d) {
                if (d3.event.shiftKey)
                    return;
                mousedown_node = d;
                if (mousedown_node === selected_node)
                    selected_node = null;
                else
                    selected_node = mousedown_node;
                selected_link = null;

                // reposition drag line
                drag_line
                        .style('marker-end', 'url(#end-arrow)')
                        .attr("class", "drag_line")
                        .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);
                        //.attr("x1", mousedown_node.x)
                        //.attr("y1", mousedown_node.y)
                        //.attr("x2", mousedown_node.x)
                        //.attr("y2", mousedown_node.y);
                restart();
            })
            .on('mouseup', function(d) {
                if (!mousedown_node)
                    return;
                
                drag_line.attr("class", "drag_line")
                        .style('marker-end', '');
                
                mouseup_node = d;
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
                direction = 'right';
                var link;
                link = jsonlinks.filter(function(l) {
                    return (l.source === source && l.target === target);
                })[0];
                if (link) {
                    link[direction] = true;
                } else {
                    // New link
                    link = {source: source, target: target, left: false, right: true};
                    var labelval;
                    // Inferring the link's labels from the involved nodes.
                    if (target.type === "literal") {
                        // If this is a literal: we're adding
                        // the inner & node ourselves if it's not present.
                        link.arc = "&";
                        dealWithLiteral(link);
                    } else {
                        if (target.type === "context") {
                            labelval = "";
                            if (target.name.indexOf(source.name) !== 0) {
                                // not supposed to happen - leave labels empty.
                                // may generate a message or an error later.
                                
                            } else {
                                labelval = target.name.slice(source.name.length, target.name.length);
                            }
                        } else {
                            labelval = prompt("Please enter the value of the label", "");
                            if (labelval === null) {
                                labelval = "unnamed";
                            }
                        }
                        link.arc = labelval;
                        link.isRel = false; // by default: not a rel.
                        // updating nodes
                        if ((source.children === null) || (!source.children)) {
                            source.children = [];
                        }
                        source.children.push(target);
                        target.parent = source;
                        jsonlinks.push(link);
                        addLinktoMap(source, target);
                        // checking statement's validity
                        var subject = link.source.name;
                        var predicate = link.arc;
                        var object = link.target.name;
                        var statement;
                        var beginpred = predicate.charAt(0);
                        if (beginpred === '#' || beginpred === '$') {
                            // a relational statement
                            statement = subject + "/" + predicate + "/" + object;
                        } else {
                            if (target.type === 'literal') {
                                statement = subject + "/" + '&' + "/" + object;
                            } else
                                // a contextual statement
                                statement = subject + "//" + object;
                        }
                        var lit = (link.target.type === "literal") ? true : false;
                        if (validateXDI(statement, link.isRel, lit)) {
                            indicator.attr("class", "indicateOK");
                            status_msg = "OK";
                        } else {
                            indicator.attr("class", "indicateKO");
                        }
                        updateStatus();
                    }
                }
                // select new link
                selected_link = link;
                selected_node = null;
                restart();
            });
    
    svginsertpoint.append("svg:text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(function(d) {
                return d.name;
            });
            
    node.exit().remove();

    //
    // labels
    //
    labels = labels.data(jsonlinks);
    labels.exit().remove();
    labels.enter().append("svg:text")
            .attr("class", function(d) {if (d.isRel === true)
                {
                    return "label rel";
                } else {
                    return "label";
                }})
            .text(function(d) {
                return d.arc;
            });    
    labels.attr("x", function(d) {return (d.source.x + d.target.x) / 2;})
            .attr("y", function(d) {return (d.source.y + d.target.y) / 2;});;

    svg.on('mousedown', mousedown)
            .on('mousemove', mousemove)
            .on('mouseup', mouseup);
    d3.select("body")
            .on("keydown", keydown)
            .on('keyup', keyup);

    if (frozen) {
        node.classed("fixed", function(d) {d.fixed = true;});
    } else
        node.classed("fixed", function(d) {d.fixed = false;});
    force.start();
}

function dealWithLiteral(link) {
    try {
        var obj = JSON.parse(link.target.name);
    } catch (err) {
        console.log("Not a literal. Error is: " + err);
    }
    var tgt = link.target;

    // adding another node
    var innernode = {id: ++lastNodeId};
    innernode.name = link.source.name + "&";
    innernode.x = link.target.x + 10;
    innernode.y = link.target.y + 10;
    innernode.type = "context";
    innernode.parent = link.source;
    innernode.children = [];
    innernode.children.push(tgt);
    
    // re-directing the link that started it all  
    link.target = innernode;
    if (!link.source.children) {
        // just in case...
        link.source.children = [];
        link.source.children.push(innernode);
        tmp = link.source.children.length;
    } else {
        link.source.children.splice(link.source.children.indexOf(link.target), 1);
        link.source.children.push(innernode);
    }
    
    // add a new link
    innernode.children = [];
    innernode.children.push(tgt);
    tgt.parent = innernode;
    var label = "&";
    var nlink = {arc: label, source: innernode, target: tgt, left: false, right: true};
    jsonlinks.push(nlink);
    jsonlinks.push(link);
    addLinktoMap(innernode, tgt);
    addLinktoMap(source, target);
    
    tgt.type = "literal";
    // updating graphic rep of that node
    var svgelems = svg.selectAll(".node");
    var nodekey = tgt.name;
    $.each(svgelems[0], function(i, d) {
        // currently <text> is the lastChild in <node>
        if (d.lastChild.textContent === nodekey) {
            var currentclass = d.childNodes[0].getAttribute('class');
            if ((currentclass !== null) && (currentclass.indexOf('literal') === -1)) {
                // add literal to existing class attribute
                newclass = currentclass + ' literal';
                d.childNodes[0].setAttribute('class', newclass);
            } else {
                d.childNodes[0].setAttribute('class', 'literal');
            }
        }
    });
    jsonnodes.push(innernode);
}

function validateXDI(data, isRel, isLit) {
    var graph = xdi.graph();
    try {
        var statement = xdi.parser.parseStatement(data);
    } catch (err) {
        status_msg = "Invalid XDI (syntax level) - " + err;
        return false;
    }
    if (statement.isContextNodeStatement()) {
        if (isRel) {
            status_msg = "Context node with relational statement.";
            return false;
        } else {
            if (isLit) {
                status_msg = "Context node with literal statement.";
                return false;
            }
        }
        return true;
    }
    if (statement.isRelationStatement()) {
        if (!isRel) {
            status_msg = "Relational statement with non-relational node.";
            return false;
        } else {
            if (isLit) {
                status_msg = "Context node with literal statement.";
                return false;
            }
        }
        return true;
    }
    if (statement.isLiteralStatement()) {
        if (isRel) {
            status_msg = "Literal statement with relational context.";
            return false;
        } else {
            if (!isLit) {
                status_msg = "Literal statement with non-literal node.";
                return false;
            }
        }
        return true;
    }
    status_msg = "OK";
    return true;
}

function removeNode(victim) {
    var searchres = findNodeIndex(jsonnodes, victim.name);
    if (searchres === null) {
        console.log("Node to be removed not found.");
    } else {
        jsonnodes.splice(searchres, 1);
    }
}

function removeLinks(victim) {
    var searchres = findFirstLinkIndex(jsonlinks, victim.name);
    if (searchres !== null) {
        var gone = jsonlinks.splice(searchres, 1);
        delLinkfromMap(gone[0].source, gone[0].target);
        removeLinks(victim);
    }
}

// Returns the position/index in node collection of the node with name value name
function findNodeIndex(coll, name) {
    if (coll === null)
        return null;
    for (var i=0; i<coll.length; i++) {
        if (coll[i].name === name) {
            return i;
        }
    }
    return null;
}

// Returns the position/index of the first link matching the provided node name
function findFirstLinkIndex(coll, name) {
    if (coll === null)
        return null;
    for (var i=0; i<coll.length; i++) {
        if ((coll[i].source.name === name) || (coll[i].target.name === name))
            return i;
    }
    return null;
}

function dblclick(d) {
    d3.select(this).classed("fixed", d.fixed = false);
}

function dragstart(d) {
    d3.select(this).classed("fixed", d.fixed = true);
}

// Given a node, generate the XDI statement(s) in an array.
function parseNode(node) {
    var statements = [];
    if (node === null)
        return null;
    if (node.type === "literal") {
        res = node.parent.name + "/&/" + node.name;
        statements.push(res);
        return statements;
    } else
        if ((!node.children) || (node.children === null)) {
            return statements;
        } else {
        $.each(node.children, function(i, d) {
            if (d.root !== true) {
                var substatements = parseNode(d);
                if (substatements.length > 0) {   
                    $.each(substatements, function(ii, dd) {
                        statements.push(dd);
                    });
                }
            }
        });
        return statements;
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

function graphToString() {
    var xdisdlgraph = [];
    var xdisdlgraphforrel = [];
    var graphstr = "";

    // generating the list of triples
    $.each(jsonlinks, function(i, d) {
        var source = d.source;
        var target = d.target;
        var subject, predicate, object;
        var newstatement = null;
        
        if (isRelational(d)) {
            predicate = d.arc;
            subject = source.name;
            object = target.name;
            newstatement = subject + "/" + predicate + "/" + object;
        } else {
            if (d.arc === "&") {
                    predicate = xdi.constants.xri_literal;
                    subject = source.name;
                    object = target.name;
                    newstatement = subject + "/" + predicate + "/" + object;
            } else { // contextual statement
            subject = source.name;
            predicate = "";
            object = target.name;
            if (object.indexOf(subject) === 0)
                object = object.replace(subject, "");
            newstatement = subject + "/" + predicate + "/" + object;
            }
        }
        if (newstatement !== null)
            xdisdlgraph.push(newstatement);
    });
    return xdisdlgraph;
}

function isRelational(d) {
    if (d.isRel)
        return true;
    else
        return false;
}

function isImplied(xdistatement) {
    var graph = xdi.graph();
    try {
        var statement = xdi.parser.parseStatement(xdistatement);
    } catch (err) {
        console.log("isImplied() - Invalid XDI: " + err);
        return false;
    }
    var subsegs = statement._subject._subsegments;
    if (subsegs.length === 0 || subsegs === null) {
        console.log(xdistatement);
        console.log("This is an implied statement");
    }
}

function updateStatus() {
    var svgelem = svg.selectAll(".status");
    svgelem[0][0].textContent = status_msg;
    restart();
}

function clearGraph() {
    // todo - add disappearance effect here...
    while(jsonnodes.length !== 0) {
        var vic = jsonnodes[0];
        removeNode(vic);
        removeLinks(vic);
    }
    indicator.attr("class", "indicateOK");
    status_msg = "OK";
    updateStatus();
    restart();
}

function help() {
    var helpWindow = window.open("help.html","Help","width=600,height=600");
}

function importXDI() {
    suspendkeylistening = true;
    dlg.dialog("open");
}


// Web Storage functions
//
// test function to verify that the browser supports HTML5 local storage.
//
function supportsHTML5Storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

//
// Loading the graph from local storage
//
function loadGraph() {
    var graphname, item, keyname;
    var names = "";

    if (!supportsHTML5Storage()) {
        alert("Sorry, HTML5 Web Storage is not supported with this browser.");
        return;
    }
    // retrieving existing graphs
    for(i=0; i<localStorage.length; i++) {
        keyname = localStorage.key(i);
        if (keyname.indexOf(STORAGE_PREFIX) === 0) {
            names += keyname.substr(STORAGE_PREFIX.length);
            names += "\n";
        }
    }
    var promptString = "Graphs currently stored: \n" + names + "\n\n";
    promptString += "Please enter the graph's name";
    graphname = prompt(promptString, "");
    if ((graphname === null) || (graphname === ""))
        return;
    graphname = STORAGE_PREFIX + graphname;
    item = localStorage[graphname];
    if (!item) {
        alert("No such graph.");
        return;
    }
    item = item.replace(/,/g,'\n');
    clearGraph();
    initializeGraphWithXDI(item);
}

//
// Saving the graph to local storage
//
function saveGraph() {
    var noname = true;
    var graphname, finalgraphname;
    
    do {
        graphname = prompt("Please enter the graph's name", "");
        if ((graphname !== null) && (graphname !== "")) {
            finalgraphname = STORAGE_PREFIX + graphname;
            var item = localStorage[finalgraphname];
            if (item) {
                alert("Name already taken.");
            } else {
                noname = false;
            }
        } else {
            return;
        }
    } while (noname);
    var stringedGraph = graphToString();
    if (stringedGraph)
        localStorage.setItem(finalgraphname, stringedGraph);
    else {
        alert("Failed to export the graph and save it...");
    }
}

function DeleteStoredGraphs() {
    var keyname;
    var ack = prompt("Are you sure you want to delete all locally stored graphs?\nEnter YES to confirm", "");
    if (ack.toLowerCase() === "yes") {
        for(i=0; i<localStorage.length; i++) {
            keyname = localStorage.key(i);
            if (keyname.indexOf(STORAGE_PREFIX) === 0)
                localStorage.removeItem(keyname);
        }
    } else
        return;
}