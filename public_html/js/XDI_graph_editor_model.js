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
function initializeGraphWithXDI(data,willClearGraph,willJoinGraph,willFoldRoot) {
    if (willClearGraph == null)
        willClearGraph = true;
    
    if(willClearGraph)
    {
        clearGraph();
    }
    
    if (!willJoinGraph)
        lastGraphId++;

    var lines = data.split(/\r\n|\r|\n/g);
    // removing empty lines etc.
    lines.forEach(function(d,i) {
        if (d === null || d === "")
            lines.splice(i, 1);
    });
    var graph = xdi.graph();
    lines.forEach(function(d,i) {
        try {
            var statement = xdi.parser.parseStatement(d);
            graph.statement(d);
        } catch (err) {
            console.log("Invalid XDI: " + err);
            console.log(d);
            openErrorDialog(d,i);
            return;
        }
        
    });
    
    xdistatements = xdi.io.write(graph);
    lines = xdistatements.split(/\r\n|\r|\n/g);
    lines.forEach(function(d,i) {
        if (d.length > 0) {
            var xdistmt = xdi.parser.parseStatement(d);
            if (xdistmt.isContextNodeStatement()) {
                addStatement(xdistmt.subject()._string, xdistmt.object()._string, xdistmt.subject()._string + xdistmt.object()._string, false,xdistmt, willJoinGraph);
            }
            else if (xdistmt.isRelationStatement()) {
                addStatement(xdistmt.subject()._string, xdistmt.predicate()._string, xdistmt.object()._string, true,xdistmt, willJoinGraph);
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

    if(willFoldRoot)
        jsonnodes.forEach(function (d) {
            d.isFolded = d.isRoot();
        });

    restart();
}


function isRootToCheck(d)
{
    if (d.parents == null || d.parents.length === 0)
        return true;
    
    for (var i = 0; i < d.parents.length;i ++)
        if (!findLink(d.parents[i],d).isRelation)
            return false;
    return true;
}

function getDrawData2(root){
   return {nodes:jsonnodes,links:jsonlinks,map:nodeslinkmap};
}
function getDrawData(root){
    if (jsonnodes == null || jsonnodes.length === 0)
        return {nodes:[],links:[]};

    console.log("getDrawData");

    var rootsToCheck = [];

    if (root != null)
        rootsToCheck = [root];
    else
    {    
        jsonnodes.forEach(function(d){
            if(isRootToCheck(d))
                rootsToCheck.push(d);
        });
    }
    if (rootsToCheck.length === 0 && jsonnodes != null && jsonnodes.length > 0)
        rootsToCheck = [jsonnodes[0]];//Every node has parent.
    
    var resNodes = [];
    var resLinks = [];
    var relationLinks = [];
    var resMap = {};
    
    function checkCollection (node,collection,isParent) {
        if (collection == null)
            return;
        for (var i = collection.length - 1; i >= 0; i--) {
            var adjnode = collection[i];
            var link = isParent? findLink(adjnode,node):findLink(node,adjnode);
            if (!isParent && link != null && !link.isAdded)    
            {   
                if(link.isRelation)
                    relationLinks.push(link);
                else
                    resLinks.push(link);
                link.isAdded = true;
            }
            if (!adjnode.isAdded && !link.isRelation)
            {
                resNodes.push(adjnode);
                
                adjnode.isAdded = true;
                recurse(adjnode);
            }
        }
    }

    function recurse(node)
    {
        if(node.isFolded)
            return;
        checkCollection(node,node.children, false);
        checkCollection(node,node.parents, true);
    }

    rootsToCheck.forEach(function(d){
        if (!d.isAdded)
        {
            resNodes.push(d);
            d.isAdded = true;
            recurse(d);
            
        }
    });

    relationLinks.forEach(function(item){
        item.isAdded = false;
        if (item.source.isAdded && item.target.isAdded)
            resLinks.push(item);
    });
    
    resNodes.forEach(function(item){item.isAdded = false;});
    resLinks.forEach(function(item){item.isAdded = false;
        resMap[item.source.id + '-' + item.target.id] = item;
    });
    
    // resNodes.sort(function(a,b){return a.id-b.id})
    // resLinks.sort(function(a,b){
    //     if(a.source.id!=b.source.id)
    //         return a.source.id-b.source.id;
    //     return a.target.id-b.target.id
    // })

    // resNodes.forEach(function(item){console.log("id: "+item.id+"\t size: "+item.size+"\tisFolded: "+item.isFolded)})
    // resLinks.forEach(function(item){console.log(item.source.id+'-'+item.target.id)})
    // console.log(resNodes.length + " Nodes")
    // console.log(resLinks.length + " Links")
    
    return {nodes:resNodes,links:resLinks,map:resMap};
}



function addStatement(subject, predicate, object, isRelation, statement, willJoinGraph) {
    var subjectnode, objectnode;
    var targetGraphId = willJoinGraph? null:lastGraphId;
    var isLiteral = predicate === null;
    if (predicate === null)
        predicate = "&";
    var nodeFound = findNode(jsonnodes, subject, targetGraphId);
    if (nodeFound == null) {
        var isRoot = subject === "";
        subjectnode = addNode(subject,false,isRoot,null, lastGraphId);
    } else
        subjectnode = nodeFound;
    
    nodeFound = findNode(jsonnodes, object, targetGraphId);
    if (nodeFound == null) {
        objectnode = addNode(object,isLiteral,false, statement.object()._string, lastGraphId);
    } else
        objectnode = nodeFound;

    addLink(subjectnode,objectnode,predicate,false,true,isRelation);
}

//Atomic operation for add a node
function addNode(name,isLiteral, isRoot, shortName, graphID){
    if (shortName == null)
        shortName = name;
    var nodeType = getNodeType(name);
    var newNode = new XDINode(++lastNodeId,name,shortName,nodeType, graphID);
    // var newNode = new XDINode(++lastNodeId,name,shortName,isLiteral ? NodeTypes.LITERAL:NodeTypes.CONTEXT, graphID);
    setNodeIsRoot(newNode,isRoot);
    jsonnodes.push(newNode);
    return newNode;
}

//Atomic operation for add a link
function addLink(sourceNode,targetNode,linkName,isLeft,isRight,isRelation,shortName){
    if (shortName == null)
        shortName = linkName;

    var linkObject = findLink(sourceNode,targetNode);
    
    if (linkObject)//if link exists, then don't add a new one.
        return;

    var newlink = new XDILink(++lastLinkId,linkName,shortName,isLeft, isRight, sourceNode, targetNode);
    if (isRelation)
        newlink.isRelation = true;
    
    sourceNode.children.push(targetNode);
    targetNode.parents.push(sourceNode);
    
    jsonlinks.push(newlink);
    addLinktoMap(sourceNode, targetNode, newlink);
    return newlink;
}


//Add link between any two selected nodes. May be against XDI rules
function addLinkBetweenNodes(sourceNode,targetNode,isLeft,isRight){
    var link = findLink(sourceNode,targetNode);
    if (link != null){ //if link exists, set direction, return;
        link.left=isLeft;
        link.right=isRight;
        return link;
    }

    if (targetNode.type === NodeTypes.LITERAL){
        var innerNode = addNode(sourceNode.name + "&", false, false, null, Math.max(sourceNode.graphID,targetNode.graphID));
        var linkToInnerNode = addLink(sourceNode,innerNode,"&",false,true,false);
        var linkToTargetNode = addLink(innerNode,targetNode,"&",false,true,false);
        link = linkToInnerNode;
    }
    else {
        var linkName = targetNode.name.slice(sourceNode.name.length, targetNode.name.length);
        link = addLink(sourceNode,targetNode,linkName, isLeft, isRight, false);
    }
    checkLinkValidity(link);

    return link;
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
function findLink(source,target){
    var key = source.id + '-' + target.id;
    return nodeslinkmap[key]; //if exist, return value, else return null;
}

// Returns the position/index in node collection of the node with name value name
function findNode(nodeCollection, name, graphID) {
    return _.find(nodeCollection,function(d) { 
        if (graphID != null)
            return d.name === name 
            && d.graphID === graphID; 
        else
            return d.name === name;
    });
}

// Returns the position/index of the first link matching the provided node name
// function findLinkToNode(linkCollection, node) {
//     return _.find(linkCollection,function(d) { return d.source==node || d.target == node; })
// }

//Atomic REMOVE NODE
function removeNode(nodeToRemove) {
    //Remove all the links
    for (var i = nodeToRemove.parents.length - 1; i >= 0; i--) {
        var p = nodeToRemove.parents[i];
        removeLink(findLink(p,nodeToRemove));
    };

    for (var i = nodeToRemove.children.length - 1; i >= 0; i--) {
        var p = nodeToRemove.children[i];
        removeLink(findLink(nodeToRemove,p));
    };
    
    //Find and remove the node
    jsonnodes.splice(jsonnodes.indexOf(nodeToRemove), 1);
    
}

//Atomic REMOVE LINK
function removeLink(linkToRemove){
    if (linkToRemove == null)
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

// //Recursively remove all links of a node.
// function removeLinksOfNode(victim) {
//     var linkFound = findLinkToNode(jsonlinks, victim);
//     if (linkFound) {
//         var gone = jsonlinks.splice(linkFound, 1);
//         delLinkfromMap(gone[0].source, gone[0].target);
//         removeLinksOfNode(victim);
//     }
// }

function getNodeType (name) {
    if (name === "")
        return NodeTypes.ROOT;
    if(_.contains(name,"\""))
        return NodeTypes.LITERAL;

    if(_.last(name) === "&")
        return NodeTypes.VALUE;
    if(_.contains(name,"<"))
        return NodeTypes.ATTRIBUTE;

    return NodeTypes.ENTITY;
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
    var lit = linkToCheck.target.type === NodeTypes.LITERAL;
    var validateMessage = validateXDI(statement, linkToCheck.isRelation, lit);
    if (validateMessage === "") {
        updateSyntaxStatus("Syntax OK",true);
    } else {
        updateSyntaxStatus(validateMessage,false);
    }
}

//Return a message if error else return "";
function validateXDI(data, isRelation, isLit) {
    var graph = xdi.graph();
    try {
        var statement = xdi.parser.parseStatement(data);
    } catch (err) {
        return "Invalid XDI (syntax level) - " + err;
    }
    if (statement.isContextNodeStatement()) {
        if (isRelation) {
            return "Context node with relational statement.";
        } else {
            if (isLit) {
                return "Context node with literal statement.";
            }
        }
        return "";
    }
    if (statement.isRelationStatement()) {
        if (!isRelation) {
            return  "Relational statement with non-relational node.";
        } else {
            if (isLit) {
                return "Context node with literal statement.";
            }
        }
        return "";
    }
    if (statement.isLiteralStatement()) {
        if (isRelation) {
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




function setLinkIsRel(linkToSet,newValue){
    linkToSet.isRelation = newValue;
}


function setNodeIsRoot(nodeToSet,newValue){
    if(newValue)
    {   
        // nodeToSet._type = nodeToSet.type;
        nodeToSet.type = NodeTypes.ROOT;
    }
    else if (nodeToSet.type === NodeTypes.ROOT)
    {
        nodeToSet.type = getNodeType(nodeToSet.name);
        // nodeToSet.type = nodeToSet._type;
        // nodeToSet._type = null;
    }
}

function setNodeIsLiteral (nodeToSet,newValue) {
    if(newValue)
        nodeToSet.type = NodeTypes.LITERAL;
    else
        nodeToSet.type = getNodeType(nodeToSet.name);
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
    if (d.isRelation)
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