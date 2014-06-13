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

function initializeSelection () {
	clearSelectedNodes();
    clearSelectedLinks();
}

function addSeletedNode (nodeToAdd) {
	if(selected_nodes!=null&&!nodeToAdd.isSelected)
	{
		selected_nodes.push(nodeToAdd);
		nodeToAdd.isSelected = true;
	}

}

function addSeletedLink (linkToAdd) {
	if(selected_links != null&&!linkToAdd.isSelected)
	{
		selected_links.push(linkToAdd);
		linkToAdd.isSelected = true;
	}
}

function clearAllSelection () {
    clearSelectedNodes();
    clearSelectedLinks();
}

function clearSelectedNodes (){
	if(selected_nodes!=null)
		selected_nodes.forEach(function(d) { d.isSelected=false; })
	selected_nodes = [];
}

function clearSelectedLinks () {
	if(selected_links != null)
		selected_links.forEach(function(d) { d.isSelected=false; })
	selected_links = [];
}

function hasSelectedNodes () {
	return selected_nodes != null && selected_nodes.length > 0;
}

function hasSelectedLinks () {
	return selected_links != null && selected_links.length > 0;
}
