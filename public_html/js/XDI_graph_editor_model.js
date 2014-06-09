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

// Initializing the graph with XDI statements.
function initializeGraphWithXDI(data) {
    clearGraph();
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
                addStatement(xdistmt.subject()._string, xdistmt.object()._string, xdistmt.subject()._string + xdistmt.object()._string, false,xdistmt);
            }
            else if (xdistmt.isRelationStatement()) {
                addStatement(xdistmt.subject()._string, xdistmt.predicate()._string, xdistmt.object()._string, true,xdistmt);
            }
            else if (xdistmt.isLiteralStatement()) {
                var obj = xdistmt._string.replace(xdistmt.subject()._string, "");
                obj = obj.slice(3); // removing /&/
                addStatement(xdistmt.subject()._string, null , obj, false,xdistmt);
            }
            else
                console.log("Found a weird statement of unknown type.");
        }
    });

    restart();
}


function isRootToCheck(d)
{
    if(d.parents == null || d.parents.length == 0)
        return true;
    
    for (var i = 0; i < d.parents.length;i ++)
        if(!findLinkinMap(d.parents[i],d).isRel)
            return false;
    return true;
}

function getDrawData2(root){
   return {nodes:jsonnodes,links:jsonlinks};
}
function getDrawData(root){
   if(jsonnodes==null||jsonnodes.length == 0)
        return {nodes:[],links:[]};

    console.log("getDrawData")

    var rootsToCheck = [];

    if(root!=null)
        rootsToCheck = [root]
    else
    {    
        jsonnodes.forEach(function(d){
            if(isRootToCheck(d))
                rootsToCheck.push(d);
        })
    } 
    
    var resNodes = [];
    var resLinks = [];
    var relationLinks = [];
    
    function recurse(node)
    {
        if(node.isFolded||node.isAdded||node.children==null)
            return;
        for (var i = node.children.length - 1; i >= 0; i--) {
            var child = node.children[i]
            var link = findLinkinMap(node,child);
            if(link!=null && !link.isAdded)    
            {
                if(link.isRel)
                    relationLinks.push(link)
                else
                {
                    resLinks.push(link);
                    link.isAdded = true;
                }
            }
            if(!child.isAdded&&!link.isRel)
            {
                resNodes.push(child);
                recurse(child);
                child.isAdded = true;
            }
        };
    }

    rootsToCheck.forEach(function(d){
        if(!d.isAdded)
        {
            resNodes.push(d);
            recurse(d);
            d.isAdded = true;
        }
    })
    
    relationLinks.forEach(function(item){
        if(item.source.isAdded && item.target.isAdded)
            resLinks.push(item);
    })

    resNodes.sort(function(a,b){return a.id-b.id})
    resLinks.sort(function(a,b){
        if(a.source.id!=b.source.id)
            return a.source.id-b.source.id;
        return a.target.id-b.target.id
    })

    resNodes.forEach(function(item){item.isAdded = false;})
    resLinks.forEach(function(item){item.isAdded = false;})
    
    
    // resNodes.forEach(function(item){console.log("id: "+item.id+"\t size: "+item.size+"\tisHidden: "+item.isHidden)})
    // resLinks.forEach(function(item){console.log(item.source.id+'-'+item.target.id)})
    return {nodes:resNodes,links:resLinks};
}

function toggleFoldNode(node){
    node.isFolded = !node.isFolded
    restart();
}

function addStatement(subject, predicate, object, isrel, statement) {
    var subjectnode, objectnode;
    var isLiteral = (predicate === null) ? true : false;
    if (predicate === null)
        predicate = "&";
    var searchres = findNodeIndex(jsonnodes, subject);
    if (searchres === null) {
        var isRoot = subject === "";
        subjectnode = addNode(subject,false,isRoot);
    } else
        subjectnode = jsonnodes[searchres];
    
    searchres = findNodeIndex(jsonnodes, object);
    if (searchres === null) {
        objectnode = addNode(object,isLiteral,false, statement.object()._string);
    } else
        objectnode = jsonnodes[searchres];

    addLink(subjectnode,objectnode,predicate,false,true,isrel);
}

//Atomic operation for add a node
function addNode(name,isLiteral, isRoot, shortName){
    if(shortName == null)
        shortName = name;
    var newNode = {id: ++lastNodeId, parents:[], children:[]};
    newNode.type = isLiteral ? "literal":"context";
    newNode.name = name;
    newNode.shortName = shortName;
    setNodeIsRoot(newNode,isRoot);
    jsonnodes.push(newNode);
    return newNode;
}

//Atomic operation for add a link
function addLink(sourceNode,targetNode,linkName,isLeft,isRight,isRel,shortName){
    if(shortName == null)
        shortName = linkName;

    var linkObject = findLinkinMap(sourceNode,targetNode);
    
    if(linkObject)//if link not added, then link exists, no need to add new link.
        return;

    var newlink = {name: linkName, shortName:shortName, id:++lastLinkId, source: sourceNode, target: targetNode, left: isLeft, right: isRight};    
    if (isRel)
        newlink.isRel = true;
    //TODO: defines the parent and children for XDI graph
    sourceNode.children.push(targetNode)
    targetNode.parents.push(sourceNode);
    
    jsonlinks.push(newlink);
    addLinktoMap(sourceNode, targetNode, newlink);
    return newlink;
}

function findLink(sourceNode,targetNode){
    for(var i = 0;i < jsonlinks.length;i ++)
    {   
        var link = jsonlinks[i];
        if(link.source.id === sourceNode.id && link.target.id === targetNode.id)
            return link;
    }
}


//Add link between any two selected nodes. May be against XDI rules
function addLinkBetweenNodes(sourceNode,targetNode,isLeft,isRight){
    var link = findLink(sourceNode,targetNode);
    if(link != null){ //if link exists, set direction, return;
        link.left=isLeft;
        link.right=isRight
        return link;
    }

    if(targetNode.type === "context"){
        var linkName = targetNode.name.slice(sourceNode.name.length, targetNode.name.length);
        link = addLink(sourceNode,targetNode,linkName, isLeft, isRight, false);
    }
    else if(targetNode.type === "literal"){
        var innerNode = addNode(sourceNode.name + "&", false, false);
        var linkToInnerNode = addLink(sourceNode,innerNode,"&",false,true,false);
        var linkToTargetNode = addLink(innerNode,targetNode,"&",false,true,false);
        link = linkToInnerNode;
    }
    checkLinkValidity(link);

    return link;
}

function checkLinkValidity(linkToCheck){
    // checking statement's validity
    var subject = linkToCheck.source.name;
    var predicate = linkToCheck.name;
    var object = linkToCheck.target.name;
    var statement;
    var beginpred = predicate.charAt(0);
    if (beginpred === '#' || beginpred === '$') {
        // a relational statement
        statement = subject + "/" + predicate + "/" + object;
    } else {
        if (linkToCheck.target.type === 'literal') {
            statement = subject + "/" + '&' + "/" + object;
        } else
            // a contextual statement
            statement = subject + "//" + object;
    }
    var lit = (linkToCheck.target.type === "literal") ? true : false;
    var validateMessage = validateXDI(statement, linkToCheck.isRel, lit);
    if (validateMessage === "") {
        updateStatus("Syntax OK",true);
    } else {
        updateStatus(validateMessage,false);
    }
}

//Atomic ADD operation for nodeslinkmap
function addLinktoMap(source, target,linkObject) {
    var key = source.id + '-' + target.id;
    if (!(key in nodeslinkmap)) {
        nodeslinkmap[key] = linkObject;
        return true;
    }
    //if link exists, return false;
    return false;
}

//Atomic REMOVE operation for nodeslinkmap
function delLinkfromMap(source, target) {
    var key = source.id + '-' + target.id;
    delete nodeslinkmap[key];
}

//Atomic SEARCH operation for nodeslinkmap
function findLinkinMap(source,target){
    var key = source.id + '-' + target.id;
    return nodeslinkmap[key]; //if exist, return value, else return null;
}




//Return a message if error else return "";
function validateXDI(data, isRel, isLit) {
    var graph = xdi.graph();
    try {
        var statement = xdi.parser.parseStatement(data);
    } catch (err) {
        return "Invalid XDI (syntax level) - " + err;
    }
    if (statement.isContextNodeStatement()) {
        if (isRel) {
            return "Context node with relational statement.";
        } else {
            if (isLit) {
                return "Context node with literal statement.";
            }
        }
        return "";
    }
    if (statement.isRelationStatement()) {
        if (!isRel) {
            return  "Relational statement with non-relational node.";
        } else {
            if (isLit) {
                return "Context node with literal statement.";
            }
        }
        return "";
    }
    if (statement.isLiteralStatement()) {
        if (isRel) {
            return  "Literal statement with relational context.";
        } else {
            if (!isLit) {
                return "Literal statement with non-literal node.";
            }
        }
        return "";
    }
    return "";
}

//Atomic REMOVE NODE
function removeNode(nodeToRemove) {
    //Remove all the links
    for (var i = nodeToRemove.parents.length - 1; i >= 0; i--) {
        var p = nodeToRemove.parents[i];
        removeLink(findLinkinMap(p,nodeToRemove));
    };

    for (var i = nodeToRemove.children.length - 1; i >= 0; i--) {
        var p = nodeToRemove.children[i];
        removeLink(findLinkinMap(nodeToRemove,p));
    };
    
    //Find and remove the node
    jsonnodes.splice(jsonnodes.indexOf(nodeToRemove), 1);
    
}

//Atomic REMOVE LINK
function removeLink(linkToRemove){
    if(linkToRemove == null)
        return;
    var source = linkToRemove.source;
    var target = linkToRemove.target;
    
    source_name = source.name;
    target_name = target.name;
    source_childnb = (source.children) ? source.children.length : 0;
    target_childnb = (target.children) ? target.children.length : 0;
    if (source_childnb !== 0) {
        source.children.splice(source.children.indexOf(target), 1);
    }
    target.parents.splice(target.parents.indexOf(source),1);
    var spliceret = jsonlinks.splice(jsonlinks.indexOf(linkToRemove), 1);
    if (spliceret.length !== 1) 
        console.log("Error removing the link.");
    delLinkfromMap(source, target);
}

//Recurvise remove all linkes of a node.
function removeLinksOfNode(victim) {
    var searchres = findFirstLinkIndex(jsonlinks, victim.name);
    if (searchres !== null) {
        var gone = jsonlinks.splice(searchres, 1);
        delLinkfromMap(gone[0].source, gone[0].target);
        removeLinksOfNode(victim);
    }
}


function setLinkIsRel(linkToSet,newValue){
    linkToSet.isRel = newValue;
}


function setNodeIsRoot(nodeToSet,newValue){
    nodeToSet.isRoot = newValue;
}

function setLinkLabel(linkToSet,newValue){
    if (newValue) {
        linkToSet.shortName = newValue; //TODO update the name as well
    }       
}

function setNodeLabel(nodeToSet,newValue){
    if (newValue) {
         nodeToSet.shortName = newValue;
    }
}

function inverseLinkDirection(linkToSet){
    var source_t0 = linkToSet.source;
    var target_t0 = linkToSet.target;
    
    linkToSet.source = target_t0;
    linkToSet.target = source_t0;
    
    source_t0.children.splice(source_t0.children.indexOf(target_t0), 1);
    target_t0.parents.splice(target_t0.parents.indexOf(source_t0), 1);
    // todo: prevent any action when L is pressed and the source's
    // parent is a third node. Otherwise we'll lose information if the 
    // former parent was not one of the nodes from the pair involved in the link.

    source_t0.parents.push(target_t0);
    target_t0.children.push(source_t0);
    // if ((target_t0.children) && (target_t0.children.length > 0))
    //     target_t0.children.push(source_t0);
    // else {
    //     target_t0.children = [];
    //     target_t0.children.push(source_t0);
    // }
    addLinktoMap(target_t0, source_t0,linkToSet);
    delLinkfromMap(source_t0, target_t0);
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
            predicate = d.name;
            subject = source.name;
            object = target.name;
            newstatement = subject + "/" + predicate + "/" + object;
        } else {
            if (d.name === "&") {
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