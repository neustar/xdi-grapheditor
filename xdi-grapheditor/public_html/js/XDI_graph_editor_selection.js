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


//Atomic ADD Operation for add a new selection (link or node)
function addNewSelection (objToAdd, selectionSet) {
    if(selectionSet!=null&&!objToAdd.isSelected)
    {
        selectionSet.push(objToAdd);
        objToAdd.isSelected = true;
    }
}

//Atomic CLEAR Operation for clear selection set
function clearSelectionSet (selectionSet) {
    if(selectionSet!=null)
        selectionSet.forEach(function(d) { d.isSelected=false; });
    selectionSet = [];
    return selectionSet;
}

//Atomic HAS Operation for checking emptiness
function hasSelections (selectionSet) {
    return selectionSet != null && selectionSet.length > 0;
}


function setSelectedNodes (nodeSet) {
    selected_nodes = nodeSet;
    selected_nodes.forEach(function(d) { return d.isSelected = true; });
    updateMenuItemAbility();
}
function setSelectedLinks (linkSet) {
    selected_links = linkSet;
    selected_links.forEach(function(d) { return d.isSelected = true; });
    updateMenuItemAbility();
}

function initializeSelection () {
    clearAllSelection();
}

function addSeletedNode (nodeToAdd) {
    addNewSelection(nodeToAdd,selected_nodes);
    updateMenuItemAbility();
}

function addSeletedLink (linkToAdd) {
    addNewSelection(linkToAdd,selected_links);
    updateMenuItemAbility();
}

function clearAllSelection () {
    clearSelectedNodes();
    clearSelectedLinks();
}

function clearSelectedNodes (){
    selected_nodes = clearSelectionSet(selected_nodes);
    updateMenuItemAbility();
}

function clearSelectedLinks () {
    selected_links = clearSelectionSet(selected_links);
    updateMenuItemAbility();
}

function hasSelectedNodes () {
    return hasSelections(selected_nodes);
}

function hasSelectedLinks () {
    return hasSelections(selected_links);
}

function updateSelectionClass (className) {
    if(className != null)
        className = "." + className;
    else
        className = "";
    
    d3.selectAll(".selectable"+className)
        .classed("selected",function(d) { return d.isSelected; });
}

