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


function XDIElement () {
	this.id = -1;
	this.isAdded = false;
	this.isSelected = false;
	this.name = "";
	this.shortName = "";
}

function XDINode (id, name, shortName, type, graphID) {
	this.id = id;
	this.name = name;
	this.shortName = shortName;
	this.type = type;
	// this.isRoot = false;
	this.parents = [];
	this.children = [];
	this.graphID = graphID;

	this.isRoot = function(){return this.type === NodeTypes.ROOT;};
	this.isLiteral = function(){return this.type === NodeTypes.LITERAL;};
}
XDINode.prototype = new XDIElement();

function XDILink (id,name,shortName, left, right, source, target)
{
	this.id = id;
	this.name = name;
	this.shortName = shortName;
	this.left = left;
	this.right = right;
	this.source = source;
	this.target = target;
	this.isRelation = false;
}
XDILink.prototype = new XDIElement();

















