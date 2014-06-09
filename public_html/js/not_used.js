// Initializing the graph with JSON  (serialized XDI data)
function initializeGraphWithString(jsonString) {
    var root = JSON.parse(jsonString);
    initializeGraph(root);
}


//Saved for import json function. 
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

function dblclick(d) {
    d3.select(this).classed("fixed", d.fixed = false);
}

function dragstart(d) {
    d3.select(this).classed("fixed", d.fixed = true);
}

function mouseupOnNodeHandler(d) {
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
    var link = addLinkBetweenNodes(source,target,false,true);
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
}


function dealWithLiteral(link) {
    try {
        var obj = JSON.parse(link.target.name);
    } catch (err) {
        console.log("Not a literal. Error is: " + err);
    }
    var targetNode = link.target;

    // adding another node
    var innernode = {id: ++lastNodeId};
    innernode.name = link.source.name + "&";
    innernode.x = link.target.x + 10;
    innernode.y = link.target.y + 10;
    innernode.type = "context";
    innernode.parent = link.source;
    innernode.children = [];
    innernode.children.push(targetNode);
    
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
    innernode.children.push(targetNode);
    targetNode.parent = innernode;
    var label = "&";
    var nlink = {arc: label, source: innernode, target: targetNode, left: false, right: true};
    jsonlinks.push(nlink);
    jsonlinks.push(link);
    addLinktoMap(innernode, targetNode);
    addLinktoMap(source, target);
    
    targetNode.type = "literal";
    // updating graphic rep of that node
    var svgelems = svg.selectAll(".node");
    var nodekey = targetNode.name;
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
            if (d.isRoot !== true) {
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